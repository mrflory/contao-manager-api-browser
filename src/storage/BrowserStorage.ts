import { BaseStorage, StorageConfig, StorageResult } from './interfaces';
import { AppConfig, AuthMethod } from '../types';

/**
 * Browser localStorage-based storage implementation
 * For client-side applications and offline functionality
 */
export class BrowserStorage extends BaseStorage {
  private readonly storageKey: string;
  private readonly namespace: string;

  constructor(config: StorageConfig) {
    super(config);
    this.namespace = config.namespace || 'contao-manager';
    this.storageKey = `${this.namespace}:config`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }

      // Test localStorage functionality
      const testKey = `${this.namespace}:test`;
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      console.error('localStorage is not available:', error);
      return false;
    }
  }

  async initialize(): Promise<StorageResult<boolean>> {
    try {
      if (!(await this.isAvailable())) {
        return this.createStorageResult(false, false, 'localStorage is not available');
      }
      
      // Check if config exists, if not create empty one
      const existingConfig = localStorage.getItem(this.storageKey);
      if (!existingConfig) {
        const emptyConfig: AppConfig = { sites: {}, activeSite: null };
        const saveResult = await this.saveConfig(emptyConfig);
        if (!saveResult.success) {
          return this.createStorageResult(false, false, saveResult.error);
        }
      }
      
      return this.createStorageResult(true, true);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for browser storage
    return Promise.resolve();
  }

  async loadConfig(): Promise<StorageResult<AppConfig>> {
    try {
      if (!(await this.isAvailable())) {
        return this.createStorageResult(false, { sites: {}, activeSite: null }, 'localStorage is not available');
      }

      const configData = localStorage.getItem(this.storageKey);
      
      if (configData) {
        const config = JSON.parse(configData);
        
        // Handle basic migrations
        const migratedConfig = this.handleBasicMigrations(config);
        
        return this.createStorageResult(true, migratedConfig);
      }
      
      // Return empty config if no data exists
      return this.createStorageResult(true, { sites: {}, activeSite: null });
    } catch (error) {
      console.error('Error loading config from localStorage:', error instanceof Error ? error.message : 'Unknown error');
      return this.createStorageResult(false, { sites: {}, activeSite: null }, 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async saveConfig(config: AppConfig): Promise<StorageResult<boolean>> {
    try {
      if (!(await this.isAvailable())) {
        return this.createStorageResult(false, false, 'localStorage is not available');
      }

      // Note: Browser storage doesn't encrypt tokens as they're already in the client environment
      // Token security is handled at the transport/server level
      const configToSave = JSON.parse(JSON.stringify(config));
      
      localStorage.setItem(this.storageKey, JSON.stringify(configToSave, null, 2));
      return this.createStorageResult(true, true);
    } catch (error) {
      console.error('Error saving config to localStorage:', error instanceof Error ? error.message : 'Unknown error');
      
      // Check for quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        return this.createStorageResult(false, false, 'localStorage quota exceeded. Please clear some data.');
      }
      
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle basic configuration migrations for browser storage
   * Less complex than server-side migrations since browser storage is typically shorter-lived
   */
  private handleBasicMigrations(config: any): AppConfig {
    // Migrate old format to new format
    if (config.token && config.managerUrl) {
      console.log('Migrating old browser config format to multi-site format');
      return {
        sites: {
          [config.managerUrl]: {
            name: this.extractSiteName(config.managerUrl),
            url: config.managerUrl,
            token: config.token,
            authMethod: 'token' as AuthMethod,
            lastUsed: new Date().toISOString()
          }
        },
        activeSite: config.managerUrl
      };
    }
    
    // Ensure sites have authMethod
    if (config.sites) {
      Object.keys(config.sites).forEach(siteUrl => {
        const site = config.sites[siteUrl];
        if (!site.authMethod && site.token) {
          site.authMethod = 'token';
        }
        
        // Set default scope if missing
        if (!site.scope) {
          site.scope = site.authMethod === 'cookie' ? 'admin' : 'read';
        }
      });
    }
    
    return config as AppConfig;
  }

  /**
   * Browser-specific method to clear all stored data
   */
  async clearAllData(): Promise<StorageResult<boolean>> {
    try {
      if (!(await this.isAvailable())) {
        return this.createStorageResult(false, false, 'localStorage is not available');
      }

      // Remove all keys related to this namespace
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.namespace}:`)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      return this.createStorageResult(true, true);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Browser-specific method to get storage usage information
   */
  async getStorageInfo(): Promise<StorageResult<{usedSpace: number, availableSpace: number}>> {
    try {
      if (!(await this.isAvailable())) {
        return this.createStorageResult(false, { usedSpace: 0, availableSpace: 0 }, 'localStorage is not available');
      }

      // Calculate used space for our namespace
      let usedSpace = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.namespace}:`)) {
          const value = localStorage.getItem(key);
          if (value) {
            usedSpace += key.length + value.length;
          }
        }
      }

      // Estimate available space (this is approximate as different browsers have different limits)
      const estimatedTotalSpace = 5 * 1024 * 1024; // 5MB typical localStorage limit
      const availableSpace = Math.max(0, estimatedTotalSpace - usedSpace);

      return this.createStorageResult(true, { usedSpace, availableSpace });
    } catch (error) {
      return this.createStorageResult(false, { usedSpace: 0, availableSpace: 0 }, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Browser-specific method to export config for backup
   */
  async exportConfig(): Promise<StorageResult<string>> {
    try {
      const configResult = await this.loadConfig();
      if (!configResult.success || !configResult.data) {
        return this.createStorageResult(false, '', configResult.error || 'Failed to load config');
      }

      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        config: configResult.data
      };

      return this.createStorageResult(true, JSON.stringify(exportData, null, 2));
    } catch (error) {
      return this.createStorageResult(false, '', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Browser-specific method to import config from backup
   */
  async importConfig(exportedData: string): Promise<StorageResult<boolean>> {
    try {
      const importData = JSON.parse(exportedData);
      
      if (!importData.config || typeof importData.config !== 'object') {
        return this.createStorageResult(false, false, 'Invalid export data format');
      }

      return await this.saveConfig(importData.config);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Invalid JSON format');
    }
  }
}