import { AppConfig, SiteConfig, VersionInfo, AuthMethod, LogEntry, HistoryEntry, SnapshotMetadata } from '../types';

/**
 * Storage type enumeration for different backend implementations
 */
export enum StorageType {
  JSON_FILE = 'json_file',
  BROWSER = 'browser',
  DATABASE = 'database'
}

/**
 * Configuration options for storage backends
 */
export interface StorageConfig {
  type: StorageType;
  dataDir?: string;          // For JSON_FILE storage
  connectionString?: string;  // For DATABASE storage
  tableName?: string;        // For DATABASE storage
  namespace?: string;        // For BROWSER storage
}

/**
 * Result interface for storage operations
 */
export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Enhanced storage capabilities interface indicating what each storage type supports
 */
export interface StorageCapabilities {
  // Basic capabilities
  canExport: boolean;
  canImport: boolean;
  canMigrate: boolean;
  supportsBackup: boolean;
  isClientSide: boolean;
  maxStorageSize?: number;
  
  // Data type support capabilities
  supportsSiteConfig: boolean;
  supportsLogs: boolean;
  supportsHistory: boolean;
  supportsSnapshots: boolean;
  
  // Advanced capabilities
  supportsTransactions: boolean;
  supportsIndexing: boolean;
  supportsConcurrency: boolean;
  supportsCompression: boolean;
  supportsEncryption: boolean;
  
  // Performance and limitations
  maxFileSize?: number;
  maxEntriesPerType?: number;
  queryCapabilities: {
    canFilter: boolean;
    canSort: boolean;
    canPaginate: boolean;
    canAggregate: boolean;
  };
}

/**
 * Parameters for site operations
 */
export interface AddSiteParams {
  url: string;
  token?: string;
  name?: string;
  authMethod?: AuthMethod;
  user?: any;
  scope?: string;
}

export interface UpdateSiteParams {
  url: string;
  name?: string;
  token?: string;
  authMethod?: AuthMethod;
  user?: any;
  scope?: string;
  versionInfo?: Omit<VersionInfo, 'lastUpdated'>;
}

/**
 * Query parameters for filtering and pagination
 */
export interface QueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
  startDate?: string;
  endDate?: string;
}

/**
 * Parameters for log operations
 * Phase 4: Added userId for multi-tenant user isolation
 */
export interface LogParams {
  siteUrl: string;
  userId?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  requestData?: any;
  responseData?: any;
  error?: string;
}

/**
 * Parameters for history operations
 * Phase 4: Added userId for multi-tenant user isolation
 */
export interface HistoryParams {
  siteUrl: string;
  userId?: string;
  workflowType?: string;
  status?: HistoryEntry['status'];
  startTime?: string;
  endTime?: string;
  steps?: HistoryEntry['steps'];
}

/**
 * Parameters for snapshot operations
 * Phase 4: Added userId for multi-tenant user isolation
 */
export interface SnapshotParams {
  siteUrl: string;
  userId?: string;
  composerJson?: string;
  composerLock?: string;
  workflowId?: string;
  stepId?: string;
}

/**
 * Cleanup parameters for data maintenance
 * Phase 4: Added userId for multi-tenant user isolation
 */
export interface CleanupParams {
  siteUrl: string;
  userId?: string;
  olderThan?: string; // ISO date string
  keepLast?: number;
  dryRun?: boolean;
}

/**
 * Logs storage interface for API request/response logging
 * Phase 4: Updated to support user isolation
 */
export interface LogsStorage {
  /**
   * Add a new log entry
   */
  addLogEntry(params: LogParams): Promise<StorageResult<boolean>>;

  /**
   * Get logs for a specific site with optional filtering
   * Phase 4: userId parameter added for user isolation
   */
  getLogs(siteUrl: string, userId?: string, query?: QueryParams): Promise<StorageResult<LogEntry[]>>;

  /**
   * Get log statistics
   * Phase 4: userId parameter added for user isolation
   */
  getLogStats(siteUrl: string, userId?: string): Promise<StorageResult<{
    total: number;
    errorCount: number;
    lastActivity?: string;
  }>>;

  /**
   * Clean up old logs
   */
  cleanupLogs(params: CleanupParams): Promise<StorageResult<{
    deletedCount: number;
    message: string;
  }>>;

  /**
   * Delete all logs for a site
   * Phase 4: userId parameter added for user isolation
   */
  clearLogs(siteUrl: string, userId?: string): Promise<StorageResult<boolean>>;
}

/**
 * History storage interface for workflow execution history
 * Phase 4: Updated to support user isolation
 */
export interface HistoryStorage {
  /**
   * Create a new history entry
   */
  createHistoryEntry(params: HistoryParams): Promise<StorageResult<HistoryEntry>>;

  /**
   * Update an existing history entry
   */
  updateHistoryEntry(id: string, params: HistoryParams): Promise<StorageResult<HistoryEntry>>;

  /**
   * Get history entry by ID
   * Phase 4: userId parameter added for user isolation
   */
  getHistoryEntry(siteUrl: string, id: string, userId?: string): Promise<StorageResult<HistoryEntry | null>>;

  /**
   * Get history for a specific site with optional filtering
   * Phase 4: userId parameter added for user isolation
   */
  getHistory(siteUrl: string, userId?: string, query?: QueryParams): Promise<StorageResult<HistoryEntry[]>>;

  /**
   * Get history statistics
   * Phase 4: userId parameter added for user isolation
   */
  getHistoryStats(siteUrl: string, userId?: string): Promise<StorageResult<{
    total: number;
    completed: number;
    failed: number;
    running: number;
    lastActivity?: string;
  }>>;

  /**
   * Delete a history entry
   * Phase 4: userId parameter added for user isolation
   */
  deleteHistoryEntry(siteUrl: string, id: string, userId?: string): Promise<StorageResult<boolean>>;

  /**
   * Clear all history for a site
   * Phase 4: userId parameter added for user isolation
   */
  clearHistory(siteUrl: string, userId?: string): Promise<StorageResult<boolean>>;
}

/**
 * Snapshots storage interface for file state snapshots
 * Phase 4: Updated to support user isolation
 */
export interface SnapshotsStorage {
  /**
   * Create a new snapshot
   */
  createSnapshot(params: SnapshotParams): Promise<StorageResult<SnapshotMetadata>>;

  /**
   * Get snapshot metadata by ID
   * Phase 4: userId parameter added for user isolation
   */
  getSnapshotMetadata(id: string, userId?: string): Promise<StorageResult<SnapshotMetadata | null>>;

  /**
   * Get snapshot file content
   * Phase 4: userId parameter added for user isolation
   */
  getSnapshotFile(id: string, filename: string, userId?: string): Promise<StorageResult<{
    content: string;
    size: number;
    mimeType?: string;
  } | null>>;

  /**
   * Get snapshots for a specific site
   * Phase 4: userId parameter added for user isolation
   */
  getSnapshots(siteUrl: string, userId?: string, query?: QueryParams): Promise<StorageResult<SnapshotMetadata[]>>;

  /**
   * Delete a snapshot
   * Phase 4: userId parameter added for user isolation
   */
  deleteSnapshot(id: string, userId?: string): Promise<StorageResult<boolean>>;

  /**
   * Clean up old snapshots
   */
  cleanupSnapshots(params: CleanupParams): Promise<StorageResult<{
    deletedCount: number;
    freedSpace: number;
  }>>;

  /**
   * Get snapshot storage statistics
   * Phase 4: userId parameter added for user isolation
   */
  getSnapshotStats(siteUrl: string, userId?: string): Promise<StorageResult<{
    total: number;
    totalSize: number;
    oldestSnapshot?: string;
    newestSnapshot?: string;
  }>>;
}

/**
 * Core storage interface that all storage backends must implement
 * Phase 3: Updated to support user isolation
 */
export interface SiteConfigStorage {
  /**
   * Load the complete application configuration for a specific user
   * Phase 3: userId parameter added for user isolation
   */
  loadConfig(userId?: string): Promise<StorageResult<AppConfig>>;

  /**
   * Save the complete application configuration for a specific user
   * Phase 3: userId parameter added for user isolation
   */
  saveConfig(config: AppConfig, userId?: string): Promise<StorageResult<boolean>>;

  /**
   * Add a new site or update existing site
   * Phase 3: userId parameter added for user isolation
   */
  addSite(params: AddSiteParams, userId?: string): Promise<StorageResult<boolean>>;

  /**
   * Remove a site by URL
   * Phase 3: userId parameter added for user isolation
   */
  removeSite(url: string, userId?: string): Promise<StorageResult<boolean>>;

  /**
   * Update site configuration
   * Phase 3: userId parameter added for user isolation
   */
  updateSite(params: UpdateSiteParams, userId?: string): Promise<StorageResult<boolean>>;

  /**
   * Set the active site
   * Phase 3: userId parameter added for user isolation
   */
  setActiveSite(url: string, userId?: string): Promise<StorageResult<boolean>>;

  /**
   * Get the currently active site
   * Phase 3: userId parameter added for user isolation
   */
  getActiveSite(userId?: string): Promise<StorageResult<SiteConfig | null>>;

  /**
   * Get all sites
   * Phase 3: userId parameter added for user isolation
   */
  getAllSites(userId?: string): Promise<StorageResult<Record<string, SiteConfig>>>;

  /**
   * Check if storage is available and functional
   */
  isAvailable(): Promise<boolean>;

  /**
   * Initialize storage backend (create directories, tables, etc.)
   */
  initialize(): Promise<StorageResult<boolean>>;

  /**
   * Clean up resources (close connections, etc.)
   */
  cleanup(): Promise<void>;
}

/**
 * Abstract base class providing common functionality for storage backends
 */
export abstract class BaseStorage implements SiteConfigStorage {
  protected config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  // Abstract methods that must be implemented by concrete storage classes
  // Phase 3: Updated to support user isolation
  abstract loadConfig(userId?: string): Promise<StorageResult<AppConfig>>;
  abstract saveConfig(config: AppConfig, userId?: string): Promise<StorageResult<boolean>>;
  abstract isAvailable(): Promise<boolean>;
  abstract initialize(): Promise<StorageResult<boolean>>;
  abstract cleanup(): Promise<void>;

  // Common utility methods that can be used by all storage backends
  protected extractSiteName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  protected createStorageResult<T>(success: boolean, data?: T, error?: string): StorageResult<T> {
    return { success, data, error };
  }

  // Default implementations that use loadConfig/saveConfig
  // Phase 3: Updated to support user isolation
  async addSite(params: AddSiteParams, userId?: string): Promise<StorageResult<boolean>> {
    try {
      const configResult = await this.loadConfig(userId);
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, false, configResult.error || 'Failed to load config');
      }

      const config = configResult.data;
      const { url, token, name, authMethod = 'token', user, scope } = params;

      // Check if site already exists to preserve its data
      if (config.sites[url]) {
        // Site exists - preserve existing data, update authentication info
        if (authMethod === 'token') {
          if (token) config.sites[url].token = token;
          if (scope) config.sites[url].scope = scope;
          if (user) config.sites[url].user = user; // Update user info for token auth
        } else {
          config.sites[url].user = user;
          config.sites[url].scope = scope || 'admin'; // Set scope for cookie auth
          delete config.sites[url].token; // Remove token for cookie auth
        }
        config.sites[url].authMethod = authMethod;
        config.sites[url].lastUsed = new Date().toISOString();
        
        // Only update name if explicitly provided
        if (name) {
          config.sites[url].name = name;
        }
        
        // Set as active site when updating authentication (reauthentication)
        config.activeSite = url;
      } else {
        // New site - create complete entry
        const siteName = name || this.extractSiteName(url);
        const siteConfig: SiteConfig = {
          name: siteName,
          url: url,
          authMethod: authMethod,
          lastUsed: new Date().toISOString()
        };

        // Add authentication-specific fields
        if (authMethod === 'token') {
          if (token) siteConfig.token = token;
          if (scope) siteConfig.scope = scope; // For token auth, scope might come from OAuth flow
          if (user) siteConfig.user = user; // Store user info for token auth (username from session)
        } else {
          siteConfig.user = user;
          siteConfig.scope = scope || 'admin'; // Default to admin for cookie auth
        }

        config.sites[url] = siteConfig;
        
        // Set as active site if it's the first one or no active site
        if (!config.activeSite || Object.keys(config.sites).length === 1) {
          config.activeSite = url;
        }
      }

      return await this.saveConfig(config, userId);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async removeSite(url: string, userId?: string): Promise<StorageResult<boolean>> {
    try {
      const configResult = await this.loadConfig();
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, false, configResult.error || 'Failed to load config');
      }

      const config = configResult.data;
      
      if (config.sites[url]) {
        delete config.sites[url];
        
        // If this was the active site, set a new active site or none
        if (config.activeSite === url) {
          const remainingSites = Object.keys(config.sites);
          config.activeSite = remainingSites.length > 0 ? remainingSites[0] : null;
        }
        
        return await this.saveConfig(config, userId);
      }

      return this.createStorageResult(false, false, 'Site not found');
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async updateSite(params: UpdateSiteParams, userId?: string): Promise<StorageResult<boolean>> {
    try {
      const configResult = await this.loadConfig(userId);
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, false, configResult.error || 'Failed to load config');
      }

      const config = configResult.data;
      const { url, name, token, authMethod, user, scope, versionInfo } = params;
      
      if (!config.sites[url]) {
        return this.createStorageResult(false, false, 'Site not found');
      }
      
      // Update fields if provided
      if (name !== undefined) config.sites[url].name = name;
      if (token !== undefined) config.sites[url].token = token;
      if (authMethod !== undefined) config.sites[url].authMethod = authMethod;
      if (user !== undefined) config.sites[url].user = user;
      if (scope !== undefined) config.sites[url].scope = scope;
      if (versionInfo !== undefined) {
        config.sites[url].versionInfo = {
          ...versionInfo,
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Update lastUsed timestamp
      config.sites[url].lastUsed = new Date().toISOString();

      return await this.saveConfig(config, userId);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async setActiveSite(url: string, userId?: string): Promise<StorageResult<boolean>> {
    try {
      const configResult = await this.loadConfig(userId);
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, false, configResult.error || 'Failed to load config');
      }

      const config = configResult.data;
      
      if (config.sites[url]) {
        config.activeSite = url;
        config.sites[url].lastUsed = new Date().toISOString();
        return await this.saveConfig(config, userId);
      }

      return this.createStorageResult(false, false, 'Site not found');
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getActiveSite(userId?: string): Promise<StorageResult<SiteConfig | null>> {
    try {
      const configResult = await this.loadConfig(userId);
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, null, configResult.error || 'Failed to load config');
      }

      const config = configResult.data;
      
      if (config.activeSite && config.sites[config.activeSite]) {
        return this.createStorageResult(true, config.sites[config.activeSite]);
      }
      
      return this.createStorageResult(true, null);
    } catch (error) {
      return this.createStorageResult(false, null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getAllSites(userId?: string): Promise<StorageResult<Record<string, SiteConfig>>> {
    try {
      const configResult = await this.loadConfig(userId);
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, {}, configResult.error || 'Failed to load config');
      }

      return this.createStorageResult(true, configResult.data.sites);
    } catch (error) {
      return this.createStorageResult(false, {}, error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Unified storage interface combining all data types
 * Storage backends can implement only the interfaces they support
 */
export interface UnifiedStorage extends SiteConfigStorage {
  /**
   * Get storage type and capabilities
   */
  getCapabilities(): StorageCapabilities;

  /**
   * Optional logs storage implementation
   */
  logs?: LogsStorage;

  /**
   * Optional history storage implementation
   */
  history?: HistoryStorage;

  /**
   * Optional snapshots storage implementation
   */
  snapshots?: SnapshotsStorage;

  /**
   * Batch operations for efficiency
   */
  batch?: {
    /**
     * Execute multiple operations in a transaction (if supported)
     */
    transaction<T>(operations: (() => Promise<T>)[]): Promise<StorageResult<T[]>>;

    /**
     * Bulk delete operations across data types
     */
    bulkDelete(operations: Array<{
      type: 'config' | 'logs' | 'history' | 'snapshots';
      siteUrl: string;
      id?: string;
    }>): Promise<StorageResult<{ deletedCount: number }>>;

    /**
     * Bulk export for backup/migration
     */
    bulkExport(siteUrl: string, types: ('config' | 'logs' | 'history' | 'snapshots')[]): Promise<StorageResult<{
      data: Record<string, any>;
      metadata: {
        exportedAt: string;
        version: string;
        storageType: StorageType;
      };
    }>>;

    /**
     * Bulk import for restoration/migration
     */
    bulkImport(data: {
      data: Record<string, any>;
      metadata: {
        exportedAt: string;
        version: string;
        storageType: StorageType;
      };
    }): Promise<StorageResult<{ importedCount: number }>>;
  };
}

/**
 * Storage type capability definitions
 * These define what each storage type supports
 */
export const STORAGE_TYPE_CAPABILITIES: Record<StorageType, StorageCapabilities> = {
  [StorageType.JSON_FILE]: {
    // Basic capabilities
    canExport: true,
    canImport: true,
    canMigrate: true,
    supportsBackup: true,
    isClientSide: false,
    maxStorageSize: undefined, // Limited by disk space
    
    // Data type support
    supportsSiteConfig: true,
    supportsLogs: true,
    supportsHistory: true,
    supportsSnapshots: true,
    
    // Advanced capabilities
    supportsTransactions: false,
    supportsIndexing: false,
    supportsConcurrency: false,
    supportsCompression: false,
    supportsEncryption: false,
    
    // Performance and limitations
    maxFileSize: 100 * 1024 * 1024, // 100MB per file
    maxEntriesPerType: 10000,
    queryCapabilities: {
      canFilter: true,  // Can filter in memory
      canSort: true,    // Can sort in memory
      canPaginate: true, // Can paginate in memory
      canAggregate: true // Can aggregate in memory
    }
  },

  [StorageType.BROWSER]: {
    // Basic capabilities
    canExport: true,
    canImport: true,
    canMigrate: true,
    supportsBackup: false,
    isClientSide: true,
    maxStorageSize: 10 * 1024 * 1024, // ~10MB typical browser storage limit
    
    // Data type support (LIMITED - no logs/history/snapshots in browser)
    supportsSiteConfig: true,
    supportsLogs: false,      // Too much data for browser storage
    supportsHistory: false,   // Too much data for browser storage
    supportsSnapshots: false, // Too much data for browser storage
    
    // Advanced capabilities
    supportsTransactions: false,
    supportsIndexing: false,
    supportsConcurrency: false,
    supportsCompression: false,
    supportsEncryption: false,
    
    // Performance and limitations
    maxFileSize: 5 * 1024 * 1024, // 5MB per entry
    maxEntriesPerType: 100,
    queryCapabilities: {
      canFilter: true,   // Can filter in memory
      canSort: true,     // Can sort in memory
      canPaginate: true, // Can paginate in memory
      canAggregate: true // Can aggregate in memory
    }
  },

  [StorageType.DATABASE]: {
    // Basic capabilities
    canExport: true,
    canImport: true,
    canMigrate: true,
    supportsBackup: true,
    isClientSide: false,
    maxStorageSize: undefined, // Limited by database configuration
    
    // Data type support (FULL SUPPORT)
    supportsSiteConfig: true,
    supportsLogs: true,
    supportsHistory: true,
    supportsSnapshots: true,
    
    // Advanced capabilities
    supportsTransactions: true,
    supportsIndexing: true,
    supportsConcurrency: true,
    supportsCompression: true,
    supportsEncryption: true,
    
    // Performance and limitations
    maxFileSize: 1024 * 1024 * 1024, // 1GB per entry (configurable)
    maxEntriesPerType: 1000000, // 1M entries per type
    queryCapabilities: {
      canFilter: true,   // Native SQL filtering
      canSort: true,     // Native SQL sorting
      canPaginate: true, // Native SQL pagination
      canAggregate: true // Native SQL aggregation
    }
  }
};

/**
 * Helper function to get capabilities for a storage type
 */
export function getStorageCapabilities(type: StorageType): StorageCapabilities {
  return STORAGE_TYPE_CAPABILITIES[type];
}

/**
 * Helper function to check if a storage type supports a specific data type
 */
export function supportsDataType(storageType: StorageType, dataType: 'config' | 'logs' | 'history' | 'snapshots'): boolean {
  const capabilities = getStorageCapabilities(storageType);
  
  switch (dataType) {
    case 'config':
      return capabilities.supportsSiteConfig;
    case 'logs':
      return capabilities.supportsLogs;
    case 'history':
      return capabilities.supportsHistory;
    case 'snapshots':
      return capabilities.supportsSnapshots;
    default:
      return false;
  }
}

/**
 * Helper function to get supported data types for a storage type
 */
export function getSupportedDataTypes(storageType: StorageType): string[] {
  const capabilities = getStorageCapabilities(storageType);
  const supported: string[] = [];
  
  if (capabilities.supportsSiteConfig) supported.push('config');
  if (capabilities.supportsLogs) supported.push('logs');
  if (capabilities.supportsHistory) supported.push('history');
  if (capabilities.supportsSnapshots) supported.push('snapshots');
  
  return supported;
}