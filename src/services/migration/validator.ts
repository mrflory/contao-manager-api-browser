import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  DetectedData,
  MigrationValidationResult,
  MigrationValidationError,
  MigrationOptions,
  DataCategory
} from '../../types/migration';
import { StorageType, getStorageCapabilities } from '../../storage/interfaces';

/**
 * Migration validation service for data integrity and compatibility checks
 */
export class MigrationValidator {
  constructor(private dataDir: string) {}

  /**
   * Perform comprehensive validation before migration
   */
  async validatePreMigration(
    options: MigrationOptions,
    detectedData: DetectedData
  ): Promise<MigrationValidationResult> {
    const errors: MigrationValidationError[] = [];
    const warnings: MigrationValidationError[] = [];
    const recommendations: string[] = [];

    try {
      // Validate source data integrity
      await this.validateSourceData(detectedData, errors, warnings);
      
      // Validate target storage capabilities
      await this.validateTargetCapabilities(options, errors, warnings);
      
      // Check for data compatibility issues
      await this.validateDataCompatibility(options, detectedData, errors, warnings);
      
      // Generate recommendations
      this.generateMigrationRecommendations(options, detectedData, recommendations);
      
      // Validate storage requirements
      await this.validateStorageRequirements(options, detectedData, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics: {
          sourceItems: {
            [DataCategory.CONFIG]: detectedData.configFile ? 1 : 0,
            [DataCategory.LOGS]: detectedData.logFiles.length,
            [DataCategory.HISTORY]: detectedData.historyFiles.length,
            [DataCategory.SNAPSHOTS]: detectedData.snapshotDirectories.length
          },
          targetItems: {
            [DataCategory.CONFIG]: 0, // Will be populated after migration
            [DataCategory.LOGS]: 0,
            [DataCategory.HISTORY]: 0,
            [DataCategory.SNAPSHOTS]: 0
          },
          dataSizeComparison: {
            source: detectedData.totalSize,
            target: 0, // Will be calculated after migration
            difference: 0,
            percentageDifference: 0
          }
        },
        recommendations
      };
    } catch (error) {
      errors.push({
        type: 'corruption',
        category: DataCategory.CONFIG,
        message: `Validation failed: ${error}`,
        affectedItems: [],
        severity: 'error'
      });

      return {
        isValid: false,
        errors,
        warnings,
        statistics: {
          sourceItems: {
            [DataCategory.CONFIG]: 0,
            [DataCategory.LOGS]: 0,
            [DataCategory.HISTORY]: 0,
            [DataCategory.SNAPSHOTS]: 0
          },
          targetItems: {
            [DataCategory.CONFIG]: 0,
            [DataCategory.LOGS]: 0,
            [DataCategory.HISTORY]: 0,
            [DataCategory.SNAPSHOTS]: 0
          },
          dataSizeComparison: {
            source: 0,
            target: 0,
            difference: 0,
            percentageDifference: 0
          }
        },
        recommendations: []
      };
    }
  }

  /**
   * Validate source data integrity
   */
  private async validateSourceData(
    detectedData: DetectedData,
    errors: MigrationValidationError[],
    warnings: MigrationValidationError[]
  ): Promise<void> {
    // Validate config file
    if (detectedData.configFile) {
      try {
        const configContent = await fs.readFile(detectedData.configFile.path, 'utf-8');
        const config = JSON.parse(configContent);
        
        // Validate config structure
        if (!config.sites || typeof config.sites !== 'object') {
          warnings.push({
            type: 'format_error',
            category: DataCategory.CONFIG,
            message: 'Config file missing sites object',
            affectedItems: [detectedData.configFile.path],
            severity: 'warning'
          });
        }

        // Check for encrypted tokens
        for (const [siteUrl, siteConfig] of Object.entries(config.sites)) {
          if (typeof siteConfig === 'object' && siteConfig !== null) {
            const site = siteConfig as any;
            if (site.token && !site.encryptedToken && !process.env.TOKEN_MASTER_KEY) {
              warnings.push({
                type: 'format_error',
                category: DataCategory.CONFIG,
                message: `Site ${siteUrl} has unencrypted token but no master key configured`,
                affectedItems: [siteUrl],
                severity: 'warning'
              });
            }
          }
        }
      } catch (error) {
        errors.push({
          type: 'corruption',
          category: DataCategory.CONFIG,
          message: 'Config file is corrupted or invalid JSON',
          affectedItems: [detectedData.configFile.path],
          severity: 'error'
        });
      }
    }

    // Validate log files
    for (const logFile of detectedData.logFiles) {
      try {
        const logContent = await fs.readFile(logFile.path, 'utf-8');
        const lines = logContent.trim().split('\n').filter(line => line.trim());
        
        let invalidLines = 0;
        let totalEntries = 0;
        
        for (const line of lines) {
          totalEntries++;
          try {
            const logEntry = JSON.parse(line);
            
            // Validate log entry structure
            if (!logEntry.timestamp || !logEntry.method || !logEntry.endpoint) {
              invalidLines++;
            }
          } catch {
            invalidLines++;
          }
        }
        
        if (invalidLines > 0) {
          const errorRate = (invalidLines / totalEntries) * 100;
          const severity = errorRate > 50 ? 'error' : 'warning';
          
          const validationError: MigrationValidationError = {
            type: 'format_error',
            category: DataCategory.LOGS,
            message: `${invalidLines}/${totalEntries} (${errorRate.toFixed(1)}%) invalid log entries in ${path.basename(logFile.path)}`,
            affectedItems: [logFile.path],
            severity
          };
          
          if (severity === 'error') {
            errors.push(validationError);
          } else {
            warnings.push(validationError);
          }
        }
      } catch (error) {
        errors.push({
          type: 'corruption',
          category: DataCategory.LOGS,
          message: `Cannot read log file: ${path.basename(logFile.path)}`,
          affectedItems: [logFile.path],
          severity: 'error'
        });
      }
    }

    // Validate history files
    for (const historyFile of detectedData.historyFiles) {
      try {
        const historyContent = await fs.readFile(historyFile.path, 'utf-8');
        const historyEntries = JSON.parse(historyContent);
        
        if (!Array.isArray(historyEntries)) {
          errors.push({
            type: 'format_error',
            category: DataCategory.HISTORY,
            message: `History file is not an array: ${path.basename(historyFile.path)}`,
            affectedItems: [historyFile.path],
            severity: 'error'
          });
          continue;
        }

        // Validate history entry structure
        let invalidEntries = 0;
        for (const entry of historyEntries) {
          if (!entry.id || !entry.startTime || !entry.status) {
            invalidEntries++;
          }
        }

        if (invalidEntries > 0) {
          warnings.push({
            type: 'format_error',
            category: DataCategory.HISTORY,
            message: `${invalidEntries}/${historyEntries.length} invalid history entries in ${path.basename(historyFile.path)}`,
            affectedItems: [historyFile.path],
            severity: 'warning'
          });
        }
      } catch (error) {
        errors.push({
          type: 'corruption',
          category: DataCategory.HISTORY,
          message: `Cannot read or parse history file: ${path.basename(historyFile.path)}`,
          affectedItems: [historyFile.path],
          severity: 'error'
        });
      }
    }

    // Validate snapshot directories
    for (const snapshotDir of detectedData.snapshotDirectories) {
      const metadataPath = path.join(snapshotDir.path, 'metadata.json');
      
      try {
        await fs.access(metadataPath);
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        
        // Validate metadata structure
        if (!metadata.id || !metadata.timestamp || !metadata.siteUrl) {
          warnings.push({
            type: 'format_error',
            category: DataCategory.SNAPSHOTS,
            message: `Invalid metadata in snapshot: ${path.basename(snapshotDir.path)}`,
            affectedItems: [snapshotDir.path],
            severity: 'warning'
          });
        }

        // Validate referenced files exist
        if (metadata.files) {
          for (const [fileName, fileInfo] of Object.entries(metadata.files)) {
            if (typeof fileInfo === 'object' && fileInfo !== null) {
              const info = fileInfo as any;
              if (info.exists) {
                const filePath = path.join(snapshotDir.path, fileName);
                try {
                  await fs.access(filePath);
                } catch {
                  warnings.push({
                    type: 'data_loss',
                    category: DataCategory.SNAPSHOTS,
                    message: `Referenced file missing in snapshot: ${fileName}`,
                    affectedItems: [snapshotDir.path],
                    severity: 'warning'
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        warnings.push({
          type: 'format_error',
          category: DataCategory.SNAPSHOTS,
          message: `Missing or invalid metadata.json in snapshot: ${path.basename(snapshotDir.path)}`,
          affectedItems: [snapshotDir.path],
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Validate target storage capabilities
   */
  private async validateTargetCapabilities(
    options: MigrationOptions,
    errors: MigrationValidationError[],
    warnings: MigrationValidationError[]
  ): Promise<void> {
    const targetCapabilities = getStorageCapabilities(options.toStorageType);
    
    // Check if requested data categories are supported
    for (const category of options.dataCategories) {
      const isSupported = this.isDataCategorySupported(category, targetCapabilities);
      if (!isSupported) {
        errors.push({
          type: 'format_error',
          category,
          message: `Target storage ${options.toStorageType} does not support ${category}`,
          affectedItems: [],
          severity: 'error'
        });
      }
    }
    
    // Check storage limitations
    if (options.toStorageType === StorageType.BROWSER) {
      // Browser storage limitations
      warnings.push({
        type: 'size_limit',
        category: DataCategory.CONFIG,
        message: 'Browser storage has limited capacity (typically 5-10MB). Large configurations may fail.',
        affectedItems: [],
        severity: 'warning'
      });

      // Browser doesn't support server-side data
      const serverSideCategories = [DataCategory.LOGS, DataCategory.HISTORY, DataCategory.SNAPSHOTS];
      const requestedServerSide = options.dataCategories.filter(cat => serverSideCategories.includes(cat));
      
      if (requestedServerSide.length > 0) {
        errors.push({
          type: 'format_error',
          category: DataCategory.LOGS,
          message: 'Browser storage cannot store server-side data (logs, history, snapshots)',
          affectedItems: requestedServerSide,
          severity: 'error'
        });
      }
    }

    // Database storage requirements
    if (options.toStorageType === StorageType.DATABASE) {
      if (!process.env.DATABASE_URL) {
        errors.push({
          type: 'permission_error',
          category: DataCategory.CONFIG,
          message: 'DATABASE_URL environment variable is required for database storage',
          affectedItems: [],
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate data compatibility between storage types
   */
  private async validateDataCompatibility(
    options: MigrationOptions,
    detectedData: DetectedData,
    errors: MigrationValidationError[],
    warnings: MigrationValidationError[]
  ): Promise<void> {
    // Check for potential data loss scenarios
    if (options.fromStorageType === StorageType.JSON_FILE && options.toStorageType === StorageType.BROWSER) {
      if (detectedData.logFiles.length > 0) {
        warnings.push({
          type: 'data_loss',
          category: DataCategory.LOGS,
          message: `${detectedData.logFiles.length} log files will not be migrated to browser storage`,
          affectedItems: detectedData.logFiles.map(f => f.path),
          severity: 'warning'
        });
      }

      if (detectedData.historyFiles.length > 0) {
        warnings.push({
          type: 'data_loss',
          category: DataCategory.HISTORY,
          message: `${detectedData.historyFiles.length} history files will not be migrated to browser storage`,
          affectedItems: detectedData.historyFiles.map(f => f.path),
          severity: 'warning'
        });
      }

      if (detectedData.snapshotDirectories.length > 0) {
        warnings.push({
          type: 'data_loss',
          category: DataCategory.SNAPSHOTS,
          message: `${detectedData.snapshotDirectories.length} snapshots will not be migrated to browser storage`,
          affectedItems: detectedData.snapshotDirectories.map(d => d.path),
          severity: 'warning'
        });
      }
    }

    // Check for feature compatibility
    if (options.fromStorageType === StorageType.DATABASE && options.toStorageType === StorageType.JSON_FILE) {
      warnings.push({
        type: 'data_loss',
        category: DataCategory.CONFIG,
        message: 'Database metadata and relationships may be lost when migrating to JSON files',
        affectedItems: [],
        severity: 'warning'
      });
    }

    // Check for encryption compatibility
    if (detectedData.configFile) {
      try {
        const configContent = await fs.readFile(detectedData.configFile.path, 'utf-8');
        const config = JSON.parse(configContent);
        
        let hasEncryptedTokens = false;
        for (const [_, siteConfig] of Object.entries(config.sites || {})) {
          if (typeof siteConfig === 'object' && siteConfig !== null) {
            const site = siteConfig as any;
            if (site.encryptedToken) {
              hasEncryptedTokens = true;
              break;
            }
          }
        }

        if (hasEncryptedTokens && options.toStorageType === StorageType.BROWSER) {
          warnings.push({
            type: 'format_error',
            category: DataCategory.CONFIG,
            message: 'Encrypted tokens will be removed when migrating to browser storage for security',
            affectedItems: [],
            severity: 'warning'
          });
        }
      } catch {
        // Config validation already handled above
      }
    }
  }

  /**
   * Validate storage requirements (disk space, permissions, etc.)
   */
  private async validateStorageRequirements(
    options: MigrationOptions,
    detectedData: DetectedData,
    errors: MigrationValidationError[],
    warnings: MigrationValidationError[]
  ): Promise<void> {
    try {
      // Check available disk space
      const stats = await fs.statfs(this.dataDir);
      const availableSpace = stats.bavail * stats.bsize;
      const requiredSpace = detectedData.totalSize * 2; // Account for backup and migration

      if (availableSpace < requiredSpace) {
        errors.push({
          type: 'size_limit',
          category: DataCategory.CONFIG,
          message: `Insufficient disk space. Required: ${this.formatBytes(requiredSpace)}, Available: ${this.formatBytes(availableSpace)}`,
          affectedItems: [],
          severity: 'error'
        });
      } else if (availableSpace < requiredSpace * 1.5) {
        warnings.push({
          type: 'size_limit',
          category: DataCategory.CONFIG,
          message: `Low disk space. Consider cleaning up before migration.`,
          affectedItems: [],
          severity: 'warning'
        });
      }

      // Check write permissions
      try {
        const testFile = path.join(this.dataDir, '.migration-test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
      } catch {
        errors.push({
          type: 'permission_error',
          category: DataCategory.CONFIG,
          message: 'No write permission to data directory',
          affectedItems: [this.dataDir],
          severity: 'error'
        });
      }
    } catch (error) {
      warnings.push({
        type: 'permission_error',
        category: DataCategory.CONFIG,
        message: 'Cannot check storage requirements',
        affectedItems: [],
        severity: 'warning'
      });
    }
  }

  /**
   * Generate migration recommendations
   */
  private generateMigrationRecommendations(
    options: MigrationOptions,
    detectedData: DetectedData,
    recommendations: string[]
  ): void {
    // Size-based recommendations
    const sizeMB = detectedData.totalSize / (1024 * 1024);
    if (sizeMB > 100) {
      recommendations.push('Consider cleaning up old log files and snapshots before migration to improve performance');
    }
    
    if (sizeMB > 500) {
      recommendations.push('Large data set detected. Consider using incremental migration or smaller batch sizes');
    }

    // Storage type recommendations
    if (options.toStorageType === StorageType.BROWSER) {
      recommendations.push('Browser storage is ideal for privacy-focused deployments but limited to configuration only');
      recommendations.push('Users will need to re-authenticate with Contao Manager after migration');
    }
    
    if (options.toStorageType === StorageType.DATABASE) {
      recommendations.push('Database storage provides best performance and scalability for multi-user environments');
      recommendations.push('Ensure database backups are configured before migration');
    }

    if (options.fromStorageType === options.toStorageType) {
      recommendations.push('Same storage type migration typically updates data format or structure');
    }
    
    // Backup recommendations
    if (!options.createBackup) {
      recommendations.push('Enable backup creation for safer migration with rollback capability');
    }
    
    // Performance recommendations
    if (detectedData.logFiles.length > 20) {
      recommendations.push('Consider using smaller batch sizes for log migration to reduce memory usage');
    }

    if (detectedData.snapshotDirectories.length > 50) {
      recommendations.push('Large number of snapshots detected. Consider archiving old snapshots before migration');
    }

    // Site filter recommendations
    if (!options.siteFilter && detectedData.siteUrls.length > 10) {
      recommendations.push('Consider migrating sites individually using site filters for better control');
    }
  }

  /**
   * Check if data category is supported by storage capabilities
   */
  private isDataCategorySupported(category: DataCategory, capabilities: any): boolean {
    switch (category) {
      case DataCategory.CONFIG:
        return capabilities.supportsSiteConfig;
      case DataCategory.LOGS:
        return capabilities.supportsLogs;
      case DataCategory.HISTORY:
        return capabilities.supportsHistory;
      case DataCategory.SNAPSHOTS:
        return capabilities.supportsSnapshots;
      default:
        return false;
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate migration result after completion
   */
  async validatePostMigration(
    options: MigrationOptions,
    sourceData: DetectedData,
    targetStorage: any
  ): Promise<MigrationValidationResult> {
    const errors: MigrationValidationError[] = [];
    const warnings: MigrationValidationError[] = [];
    const recommendations: string[] = [];

    try {
      // Count target items (implementation depends on storage interface)
      const targetStats = {
        [DataCategory.CONFIG]: 0,
        [DataCategory.LOGS]: 0,
        [DataCategory.HISTORY]: 0,
        [DataCategory.SNAPSHOTS]: 0
      };

      // Basic validation - check if data exists in target
      if (options.dataCategories.includes(DataCategory.CONFIG) && sourceData.configFile) {
        // Try to read config from target storage
        try {
          if (sourceData.siteUrls.length > 0) {
            const firstSite = sourceData.siteUrls[0];
            const siteConfig = await targetStorage.getSiteConfig?.(firstSite);
            if (siteConfig) {
              targetStats[DataCategory.CONFIG] = sourceData.siteUrls.length;
            } else {
              errors.push({
                type: 'data_loss',
                category: DataCategory.CONFIG,
                message: 'Configuration not found in target storage',
                affectedItems: [firstSite],
                severity: 'error'
              });
            }
          }
        } catch (error) {
          errors.push({
            type: 'corruption',
            category: DataCategory.CONFIG,
            message: 'Cannot validate configuration in target storage',
            affectedItems: [],
            severity: 'error'
          });
        }
      }

      // Generate post-migration recommendations
      if (errors.length === 0) {
        recommendations.push('Migration completed successfully');
        if (options.createBackup) {
          recommendations.push('Original data backup is available for rollback if needed');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics: {
          sourceItems: {
            [DataCategory.CONFIG]: sourceData.configFile ? 1 : 0,
            [DataCategory.LOGS]: sourceData.logFiles.length,
            [DataCategory.HISTORY]: sourceData.historyFiles.length,
            [DataCategory.SNAPSHOTS]: sourceData.snapshotDirectories.length
          },
          targetItems: targetStats,
          dataSizeComparison: {
            source: sourceData.totalSize,
            target: 0, // Would need to calculate from target storage
            difference: 0,
            percentageDifference: 0
          }
        },
        recommendations
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'corruption',
          category: DataCategory.CONFIG,
          message: `Post-migration validation failed: ${error}`,
          affectedItems: [],
          severity: 'error'
        }],
        warnings: [],
        statistics: {
          sourceItems: {
            [DataCategory.CONFIG]: 0,
            [DataCategory.LOGS]: 0,
            [DataCategory.HISTORY]: 0,
            [DataCategory.SNAPSHOTS]: 0
          },
          targetItems: {
            [DataCategory.CONFIG]: 0,
            [DataCategory.LOGS]: 0,
            [DataCategory.HISTORY]: 0,
            [DataCategory.SNAPSHOTS]: 0
          },
          dataSizeComparison: {
            source: 0,
            target: 0,
            difference: 0,
            percentageDifference: 0
          }
        },
        recommendations: []
      };
    }
  }
}