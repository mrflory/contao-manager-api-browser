import { AppConfig, SiteConfig, VersionInfo, AuthMethod } from '../types';

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
 * Core storage interface that all storage backends must implement
 */
export interface SiteConfigStorage {
  /**
   * Load the complete application configuration
   */
  loadConfig(): Promise<StorageResult<AppConfig>>;

  /**
   * Save the complete application configuration
   */
  saveConfig(config: AppConfig): Promise<StorageResult<boolean>>;

  /**
   * Add a new site or update existing site
   */
  addSite(params: AddSiteParams): Promise<StorageResult<boolean>>;

  /**
   * Remove a site by URL
   */
  removeSite(url: string): Promise<StorageResult<boolean>>;

  /**
   * Update site configuration
   */
  updateSite(params: UpdateSiteParams): Promise<StorageResult<boolean>>;

  /**
   * Set the active site
   */
  setActiveSite(url: string): Promise<StorageResult<boolean>>;

  /**
   * Get the currently active site
   */
  getActiveSite(): Promise<StorageResult<SiteConfig | null>>;

  /**
   * Get all sites
   */
  getAllSites(): Promise<StorageResult<Record<string, SiteConfig>>>;

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
  abstract loadConfig(): Promise<StorageResult<AppConfig>>;
  abstract saveConfig(config: AppConfig): Promise<StorageResult<boolean>>;
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
  async addSite(params: AddSiteParams): Promise<StorageResult<boolean>> {
    try {
      const configResult = await this.loadConfig();
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

      return await this.saveConfig(config);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async removeSite(url: string): Promise<StorageResult<boolean>> {
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
        
        return await this.saveConfig(config);
      }
      
      return this.createStorageResult(false, false, 'Site not found');
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async updateSite(params: UpdateSiteParams): Promise<StorageResult<boolean>> {
    try {
      const configResult = await this.loadConfig();
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
      
      return await this.saveConfig(config);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async setActiveSite(url: string): Promise<StorageResult<boolean>> {
    try {
      const configResult = await this.loadConfig();
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, false, configResult.error || 'Failed to load config');
      }

      const config = configResult.data;
      
      if (config.sites[url]) {
        config.activeSite = url;
        config.sites[url].lastUsed = new Date().toISOString();
        return await this.saveConfig(config);
      }
      
      return this.createStorageResult(false, false, 'Site not found');
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async getActiveSite(): Promise<StorageResult<SiteConfig | null>> {
    try {
      const configResult = await this.loadConfig();
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

  async getAllSites(): Promise<StorageResult<Record<string, SiteConfig>>> {
    try {
      const configResult = await this.loadConfig();
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, {}, configResult.error || 'Failed to load config');
      }

      return this.createStorageResult(true, configResult.data.sites);
    } catch (error) {
      return this.createStorageResult(false, {}, error instanceof Error ? error.message : 'Unknown error');
    }
  }
}