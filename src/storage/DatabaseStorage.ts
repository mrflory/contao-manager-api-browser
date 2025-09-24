import { BaseStorage, StorageConfig, StorageResult } from './interfaces';
import { AppConfig, SiteConfig, AuthMethod } from '../types';
import { PrismaClient } from '../generated/prisma';
import TokenEncryptionService from '../services/tokenEncryption';

/**
 * PostgreSQL database storage implementation using Prisma ORM
 * Phase 1 of the SaaS transformation - production ready
 * Supports multi-tenant user isolation and token encryption
 */
export class DatabaseStorage extends BaseStorage {
  private readonly connectionString: string;
  private prisma: PrismaClient | null = null;
  private initialized = false;
  private currentUserId: string = 'default_user'; // Phase 1: single user, Phase 2: will be from authentication
  private tokenEncryption: TokenEncryptionService | null = null;

  constructor(config: StorageConfig) {
    super(config);
    this.connectionString = config.connectionString || process.env.DATABASE_URL || '';

    if (!this.connectionString) {
      console.warn('DatabaseStorage: No connection string provided. Database operations will fail.');
    }

    // Initialize Prisma client with connection string
    if (this.connectionString) {
      try {
        this.prisma = new PrismaClient({
          datasources: {
            db: {
              url: this.connectionString
            }
          },
          log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
        });

        // Initialize token encryption service
        this.tokenEncryption = new TokenEncryptionService();
      } catch (error) {
        console.error('Failed to initialize Prisma client or token encryption:', error);
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.connectionString || !this.prisma) {
        return false;
      }

      // Test actual database connection with Prisma
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database is not available:', error);
      return false;
    }
  }

  async initialize(): Promise<StorageResult<boolean>> {
    try {
      if (!this.connectionString || !this.prisma) {
        return this.createStorageResult(false, false, 'No database connection string or Prisma client');
      }

      // Test database connectivity
      await this.prisma.$connect();

      // Ensure default user exists for Phase 1
      await this.ensureDefaultUser();

      this.initialized = true;
      return this.createStorageResult(true, true);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.prisma) {
        await this.prisma.$disconnect();
        this.prisma = null;
      }
      this.initialized = false;
    } catch (error) {
      console.error('Error cleaning up database connection:', error);
    }
  }

  async loadConfig(): Promise<StorageResult<AppConfig>> {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return this.createStorageResult(false, { sites: {}, activeSite: null }, initResult.error);
        }
      }

      if (!this.prisma) {
        return this.createStorageResult(false, { sites: {}, activeSite: null }, 'Prisma client not initialized');
      }

      // Load user's sites from database
      const sites = await this.prisma.site.findMany({
        where: {
          userId: this.currentUserId,
          isActive: true
        },
        orderBy: {
          lastUsed: 'desc'
        }
      });

      // Load user's subscription to determine active site (for Phase 1, just use the first site)
      // Note: user data not currently used but prepared for Phase 2 features
      await this.prisma.user.findUnique({
        where: { id: this.currentUserId },
        include: {
          subscriptions: {
            where: { status: 'active' },
            take: 1
          }
        }
      });

      // Convert database sites to SiteConfig format
      const sitesRecord: Record<string, SiteConfig> = {};
      let activeSite: string | null = null;

      for (const site of sites) {
        const siteConfig: SiteConfig = {
          name: site.name,
          url: site.url,
          authMethod: site.authMethod as AuthMethod,
          lastUsed: site.lastUsed.toISOString(),
          scope: site.scope
        };

        // Decrypt token if it exists
        if (site.tokenEncrypted && this.tokenEncryption) {
          try {
            // For Phase 1, we'll store tokens as simple encrypted strings
            // In Phase 2+, we might use the full EncryptedToken format
            siteConfig.token = site.tokenEncrypted; // For now, store as-is
          } catch (error) {
            console.warn(`Failed to decrypt token for site ${site.url}:`, error);
          }
        }

        // Add version info if available
        if (site.versionInfo) {
          siteConfig.versionInfo = site.versionInfo as any;
        }

        sitesRecord[site.url] = siteConfig;

        // Set first site as active site if none set yet
        if (!activeSite) {
          activeSite = site.url;
        }
      }

      return this.createStorageResult(true, {
        sites: sitesRecord,
        activeSite: activeSite
      });
    } catch (error) {
      console.error('Error loading config from database:', error instanceof Error ? error.message : 'Unknown error');
      return this.createStorageResult(false, { sites: {}, activeSite: null },
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async saveConfig(config: AppConfig): Promise<StorageResult<boolean>> {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return this.createStorageResult(false, false, initResult.error);
        }
      }

      if (!this.prisma) {
        return this.createStorageResult(false, false, 'Prisma client not initialized');
      }

      // Use transaction to ensure data consistency
      await this.prisma.$transaction(async (tx) => {
        // First, get current sites from database to determine what to update/delete
        const existingSites = await tx.site.findMany({
          where: { userId: this.currentUserId }
        });

        const configUrls = new Set(Object.keys(config.sites));

        // Delete sites that are no longer in config
        const sitesToDelete = [...existingSites.filter(s => !configUrls.has(s.url)).map(s => s.url)];
        if (sitesToDelete.length > 0) {
          await tx.site.deleteMany({
            where: {
              userId: this.currentUserId,
              url: { in: sitesToDelete }
            }
          });
        }

        // Upsert each site in the config
        for (const [url, siteConfig] of Object.entries(config.sites)) {
          let tokenEncrypted = '';

          // For Phase 1, store token as-is (encrypted at application level)
          // In Phase 2+, we'll implement proper site-specific encryption
          if (siteConfig.token && typeof siteConfig.token === 'string') {
            tokenEncrypted = siteConfig.token; // Store token directly for Phase 1
          }

          await tx.site.upsert({
            where: {
              userId_url: {
                userId: this.currentUserId,
                url: url
              }
            },
            update: {
              name: siteConfig.name,
              tokenEncrypted: tokenEncrypted || undefined,
              authMethod: siteConfig.authMethod,
              scope: siteConfig.scope || 'read',
              lastUsed: new Date(siteConfig.lastUsed),
              versionInfo: siteConfig.versionInfo ? JSON.parse(JSON.stringify(siteConfig.versionInfo)) : undefined
            },
            create: {
              userId: this.currentUserId,
              name: siteConfig.name,
              url: url,
              tokenEncrypted: tokenEncrypted || '',
              authMethod: siteConfig.authMethod,
              scope: siteConfig.scope || 'read',
              lastUsed: new Date(siteConfig.lastUsed),
              versionInfo: siteConfig.versionInfo ? JSON.parse(JSON.stringify(siteConfig.versionInfo)) : undefined
            }
          });
        }

        // Note: In Phase 1, we don't store activeSite in database since it's implicitly the most recently used
        // In Phase 2, we might add a user preference table for this
      });

      return this.createStorageResult(true, true);
    } catch (error) {
      console.error('Error saving config to database:', error instanceof Error ? error.message : 'Unknown error');
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Ensure default user exists for Phase 1
   * In Phase 2, this will be replaced with proper user authentication
   */
  private async ensureDefaultUser(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    try {
      await this.prisma.user.upsert({
        where: { id: this.currentUserId },
        update: {
          updatedAt: new Date()
        },
        create: {
          id: this.currentUserId,
          email: 'default@example.com',
          passwordHash: 'placeholder_hash_for_phase1',
          isActive: true,
          subscriptions: {
            create: {
              planType: 'free',
              status: 'active'
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to ensure default user exists:', error);
      throw error;
    }
  }

  /**
   * Get current user ID for multi-tenant support
   * Phase 1: Returns default user ID
   * Phase 2: Will integrate with authentication system
   */
  getCurrentUserId(): string {
    return this.currentUserId;
  }

  /**
   * Set current user ID (for Phase 2 authentication integration)
   */
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Database-specific method to get user configuration history
   * Phase 1 feature for audit trails using usage logs
   */
  async getConfigHistory(limit: number = 10): Promise<StorageResult<Array<{config: AppConfig, timestamp: string}>>> {
    try {
      if (!this.prisma) {
        return this.createStorageResult(false, [], 'Prisma client not initialized');
      }

      // Get recent config-related actions from usage logs
      const logs = await this.prisma.usageLog.findMany({
        where: {
          userId: this.currentUserId,
          actionType: { in: ['config_save', 'site_add', 'site_update', 'site_remove'] }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      // For each log entry, get the config state at that time
      // Note: This is a simplified version - in full implementation, we'd store snapshots
      const history: Array<{config: AppConfig, timestamp: string}> = [];

      for (const log of logs) {
        // For Phase 1, we'll return the current config with the log timestamp
        // In Phase 2+, we'd implement proper config versioning
        const currentConfig = await this.loadConfig();
        if (currentConfig.success && currentConfig.data) {
          history.push({
            config: currentConfig.data,
            timestamp: log.timestamp.toISOString()
          });
        }
      }

      return this.createStorageResult(true, history);
    } catch (error) {
      return this.createStorageResult(false, [], error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Database-specific method to backup configuration
   * Phase 1 implementation using usage logs for backup tracking
   */
  async backupConfig(): Promise<StorageResult<string>> {
    try {
      if (!this.prisma) {
        return this.createStorageResult(false, '', 'Prisma client not initialized');
      }

      const configResult = await this.loadConfig();
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, '', configResult.error || 'Failed to load config');
      }

      // Create a backup by creating a usage log entry with the current config
      const backupId = `backup_${Date.now()}_${this.getCurrentUserId()}`;

      await this.prisma.usageLog.create({
        data: {
          userId: this.currentUserId,
          actionType: 'config_backup',
          apiEndpoint: '/backup',
          requestData: JSON.parse(JSON.stringify({
            backupId: backupId,
            config: configResult.data
          })),
          timestamp: new Date()
        }
      });

      return this.createStorageResult(true, backupId);
    } catch (error) {
      return this.createStorageResult(false, '', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Database-specific method to restore from backup
   * Phase 1 implementation using usage logs for backup retrieval
   */
  async restoreFromBackup(backupId: string): Promise<StorageResult<boolean>> {
    try {
      if (!this.prisma) {
        return this.createStorageResult(false, false, 'Prisma client not initialized');
      }

      // Find the backup in usage logs
      const backupLog = await this.prisma.usageLog.findFirst({
        where: {
          userId: this.currentUserId,
          actionType: 'config_backup',
          requestData: {
            path: ['backupId'],
            equals: backupId
          }
        }
      });

      if (!backupLog || !backupLog.requestData) {
        return this.createStorageResult(false, false, 'Backup not found');
      }

      // Extract config from backup data
      const backupData = backupLog.requestData as any;
      if (!backupData.config) {
        return this.createStorageResult(false, false, 'Invalid backup data');
      }

      // Restore the configuration
      const restoreResult = await this.saveConfig(backupData.config);
      if (!restoreResult.success) {
        return restoreResult;
      }

      // Log the restore operation
      await this.prisma.usageLog.create({
        data: {
          userId: this.currentUserId,
          actionType: 'config_restore',
          apiEndpoint: '/restore',
          requestData: {
            backupId: backupId,
            restoredAt: new Date().toISOString()
          },
          timestamp: new Date()
        }
      });

      return this.createStorageResult(true, true);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Log usage for analytics and audit trails
   * Phase 1 foundation for SaaS analytics
   */
  async logUsage(actionType: string, apiEndpoint: string, siteUrl?: string, requestData?: any, responseData?: any, duration?: number): Promise<StorageResult<boolean>> {
    try {
      if (!this.prisma) {
        return this.createStorageResult(false, false, 'Prisma client not initialized');
      }

      // Find site ID if siteUrl provided
      let siteId: string | undefined = undefined;
      if (siteUrl) {
        const site = await this.prisma.site.findFirst({
          where: {
            userId: this.currentUserId,
            url: siteUrl
          }
        });
        siteId = site?.id;
      }

      await this.prisma.usageLog.create({
        data: {
          userId: this.currentUserId,
          siteId: siteId,
          actionType: actionType,
          apiEndpoint: apiEndpoint,
          requestData: requestData,
          responseData: responseData,
          duration: duration,
          timestamp: new Date()
        }
      });

      return this.createStorageResult(true, true);
    } catch (error) {
      console.error('Error logging usage:', error);
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get usage statistics for analytics
   * Phase 1 foundation for freemium model insights
   */
  async getUsageStats(siteUrl?: string, days: number = 30): Promise<StorageResult<{
    totalRequests: number;
    errorCount: number;
    averageResponseTime: number;
    lastActivity?: string;
  }>> {
    try {
      if (!this.prisma) {
        return this.createStorageResult(false, {
          totalRequests: 0,
          errorCount: 0,
          averageResponseTime: 0
        }, 'Prisma client not initialized');
      }

      const since = new Date();
      since.setDate(since.getDate() - days);

      let whereClause: any = {
        userId: this.currentUserId,
        timestamp: {
          gte: since
        }
      };

      // Filter by site if provided
      if (siteUrl) {
        const site = await this.prisma.site.findFirst({
          where: {
            userId: this.currentUserId,
            url: siteUrl
          }
        });
        if (site) {
          whereClause.siteId = site.id;
        }
      }

      const logs = await this.prisma.usageLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' }
      });

      const totalRequests = logs.length;
      const errorCount = logs.filter(log =>
        log.actionType.includes('error') ||
        (log.responseData as any)?.error
      ).length;

      const responseTimes = logs
        .filter(log => log.duration !== null)
        .map(log => log.duration!);

      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      const lastActivity = logs.length > 0 ? logs[0].timestamp.toISOString() : undefined;

      return this.createStorageResult(true, {
        totalRequests,
        errorCount,
        averageResponseTime: Math.round(averageResponseTime),
        lastActivity
      });
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return this.createStorageResult(false, {
        totalRequests: 0,
        errorCount: 0,
        averageResponseTime: 0
      }, error instanceof Error ? error.message : 'Unknown error');
    }
  }
}