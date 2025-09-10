import {
  BrowserStorageService as IBrowserStorageService,
  StorageType,
  StorageInfo,
  StorageState,
  StorageCapabilities,
  StorageMigrationOptions,
  StorageMigrationResult,
  StorageBackend,
  StorageChangeEvent,
  StorageMigrationProgressEvent
} from '../types/storage';
import { AppConfig } from '../types';

/**
 * Frontend browser storage service implementation
 * Handles client-side storage operations and integrates with backend storage abstraction
 */
export class BrowserStorageService implements IBrowserStorageService {
  private readonly namespace: string = 'contao-manager';
  private readonly storageKey: string;
  private eventListeners: Map<string, Function[]> = new Map();
  private currentStorageType: StorageType = StorageType.JSON_FILE;
  private storageState: StorageState;

  constructor() {
    this.storageKey = `${this.namespace}:config`;
    this.storageState = {
      type: this.currentStorageType,
      isInitialized: false,
      isAvailable: false
    };
    
    this.initializeStorageType();
  }

  /**
   * Initialize storage type based on environment and availability
   */
  private async initializeStorageType(): Promise<void> {
    try {
      // First try to detect from current environment
      const detectedType = await this.detectStorageType();
      this.currentStorageType = detectedType;
      
      // Update storage state
      this.storageState = {
        type: detectedType,
        isInitialized: true,
        isAvailable: await this.isStorageAvailable(detectedType)
      };
    } catch (error) {
      this.storageState = {
        type: StorageType.JSON_FILE,
        isInitialized: true,
        isAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect current storage type based on environment and data availability
   */
  async detectStorageType(): Promise<StorageType> {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return StorageType.JSON_FILE;
    }

    // First, try to check backend storage type by making an API call
    // This prioritizes server storage over browser storage
    try {
      const response = await fetch('/api/storage/type');
      if (response.ok) {
        const result = await response.json();
        console.log(`[BROWSER_STORAGE] Server storage type detected:`, result.storageType);
        return result.storageType || StorageType.JSON_FILE;
      }
    } catch (error) {
      console.log('[BROWSER_STORAGE] Backend storage type detection failed, checking browser storage');
    }

    // Fall back to browser storage if available and has data
    if (await this.isStorageAvailable(StorageType.BROWSER)) {
      const browserData = localStorage.getItem(this.storageKey);
      console.log(`[BROWSER_STORAGE] Checking localStorage for key '${this.storageKey}':`, browserData ? 'FOUND DATA' : 'NO DATA');
      if (browserData) {
        console.log(`[BROWSER_STORAGE] Using browser storage mode as fallback`);
        return StorageType.BROWSER;
      }
    }
    
    // Default to JSON file storage
    console.log(`[BROWSER_STORAGE] Defaulting to JSON file storage`);
    return StorageType.JSON_FILE;
  }

  /**
   * Check if a specific storage type is available
   */
  async isStorageAvailable(type: StorageType): Promise<boolean> {
    switch (type) {
      case StorageType.BROWSER:
        return this.isBrowserStorageAvailable();
      
      case StorageType.JSON_FILE:
        // Check if backend is available
        try {
          const response = await fetch('/api/config');
          return response.ok || response.status === 404; // 404 is OK, means server is running
        } catch (error) {
          return false;
        }
      
      case StorageType.DATABASE:
        // Check if database storage is available via backend
        try {
          const response = await fetch('/api/storage/database/status');
          if (response.ok) {
            const result = await response.json();
            return result.available || false;
          }
        } catch (error) {
          return false;
        }
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Check if browser localStorage is available and functional
   */
  private isBrowserStorageAvailable(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      
      const testKey = `${this.namespace}:test`;
      localStorage.setItem(testKey, 'test');
      const result = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return result === 'test';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get capabilities of a storage type
   */
  getStorageCapabilities(type: StorageType): StorageCapabilities {
    switch (type) {
      case StorageType.BROWSER:
        return {
          canExport: true,
          canImport: true,
          canMigrate: true,
          supportsBackup: true,
          isClientSide: true,
          maxStorageSize: 5 * 1024 * 1024 // 5MB typical localStorage limit
        };
      
      case StorageType.JSON_FILE:
        return {
          canExport: true,
          canImport: true,
          canMigrate: true,
          supportsBackup: true,
          isClientSide: false
        };
      
      case StorageType.DATABASE:
        return {
          canExport: true,
          canImport: true,
          canMigrate: true,
          supportsBackup: true,
          isClientSide: false
        };
      
      default:
        return {
          canExport: false,
          canImport: false,
          canMigrate: false,
          supportsBackup: false,
          isClientSide: false
        };
    }
  }

  /**
   * Get current storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    if (this.currentStorageType === StorageType.BROWSER) {
      return this.getBrowserStorageInfo();
    } else {
      // Get storage info from backend
      try {
        const response = await fetch('/api/storage/info');
        if (response.ok) {
          const info = await response.json();
          return {
            usedSpace: info.usedSpace || 0,
            availableSpace: info.availableSpace || 0,
            totalSpace: info.totalSpace,
            usagePercentage: info.usedSpace && info.totalSpace 
              ? (info.usedSpace / info.totalSpace) * 100 
              : 0
          };
        }
      } catch (error) {
        console.error('Failed to get backend storage info:', error);
      }
    }

    return {
      usedSpace: 0,
      availableSpace: 0,
      usagePercentage: 0
    };
  }

  /**
   * Get browser storage information
   */
  private getBrowserStorageInfo(): StorageInfo {
    try {
      let usedSpace = 0;
      
      // Calculate space used by our namespace
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.namespace}:`)) {
          const value = localStorage.getItem(key);
          if (value) {
            usedSpace += key.length + value.length;
          }
        }
      }

      const estimatedTotalSpace = 5 * 1024 * 1024; // 5MB
      const availableSpace = Math.max(0, estimatedTotalSpace - this.getTotalLocalStorageSize());
      
      return {
        usedSpace,
        availableSpace,
        totalSpace: estimatedTotalSpace,
        usagePercentage: (usedSpace / estimatedTotalSpace) * 100
      };
    } catch (error) {
      return {
        usedSpace: 0,
        availableSpace: 0,
        usagePercentage: 0
      };
    }
  }

  /**
   * Get total localStorage size (all data, not just ours)
   */
  private getTotalLocalStorageSize(): number {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    return totalSize;
  }

  /**
   * Get current storage state
   */
  getStorageState(): StorageState {
    return { ...this.storageState };
  }

  /**
   * Load configuration from current storage
   */
  async loadConfig(): Promise<AppConfig> {
    if (this.currentStorageType === StorageType.BROWSER) {
      return this.loadBrowserConfig();
    } else {
      // Load from backend
      const response = await fetch('/api/config');
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Failed to load config: ${response.statusText}`);
    }
  }

  /**
   * Load configuration from browser storage
   */
  private loadBrowserConfig(): AppConfig {
    try {
      const configData = localStorage.getItem(this.storageKey);
      if (configData) {
        return JSON.parse(configData);
      }
    } catch (error) {
      console.error('Error loading browser config:', error);
    }
    
    return { sites: {}, activeSite: null };
  }

  /**
   * Save configuration to current storage
   */
  async saveConfig(config: AppConfig): Promise<boolean> {
    if (this.currentStorageType === StorageType.BROWSER) {
      return this.saveBrowserConfig(config);
    } else {
      // Save via backend
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return response.ok;
    }
  }

  /**
   * Save configuration to browser storage
   */
  private saveBrowserConfig(config: AppConfig): boolean {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving browser config:', error);
      return false;
    }
  }

  /**
   * Clear all configuration data
   */
  async clearConfig(): Promise<boolean> {
    if (this.currentStorageType === StorageType.BROWSER) {
      try {
        // Remove all keys for our namespace
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`${this.namespace}:`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        return true;
      } catch (error) {
        return false;
      }
    } else {
      // Clear via backend
      const response = await fetch('/api/config', { method: 'DELETE' });
      return response.ok;
    }
  }

  /**
   * Export configuration as JSON string
   */
  async exportConfig(): Promise<string> {
    const config = await this.loadConfig();
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      storageType: this.currentStorageType,
      config
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  async importConfig(data: string): Promise<boolean> {
    try {
      const importData = JSON.parse(data);
      
      if (!importData.config || typeof importData.config !== 'object') {
        throw new Error('Invalid export data format');
      }

      return await this.saveConfig(importData.config);
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  /**
   * Migrate storage between different types
   */
  async migrateStorage(options: StorageMigrationOptions): Promise<StorageMigrationResult> {
    const oldStorageType = this.currentStorageType;
    
    try {
      this.emitEvent('migration-progress', {
        type: 'migration-progress',
        fromType: options.fromType,
        toType: options.toType,
        progress: 0,
        currentStep: 'Starting migration',
        totalSteps: 4,
        completedSteps: 0
      });

      // Step 1: Load data from source storage
      // oldStorageType variable is already declared above
      this.currentStorageType = options.fromType;
      const config = await this.loadConfig();
      
      this.emitEvent('migration-progress', {
        type: 'migration-progress',
        fromType: options.fromType,
        toType: options.toType,
        progress: 25,
        currentStep: 'Loading source data',
        totalSteps: 4,
        completedSteps: 1
      });

      // Step 2: Switch to target storage
      this.currentStorageType = options.toType;
      
      this.emitEvent('migration-progress', {
        type: 'migration-progress',
        fromType: options.fromType,
        toType: options.toType,
        progress: 50,
        currentStep: 'Switching storage type',
        totalSteps: 4,
        completedSteps: 2
      });

      // Step 3: Save to target storage
      const saveSuccess = await this.saveConfig(config);
      if (!saveSuccess) {
        throw new Error('Failed to save to target storage');
      }

      this.emitEvent('migration-progress', {
        type: 'migration-progress',
        fromType: options.fromType,
        toType: options.toType,
        progress: 75,
        currentStep: 'Saving to target storage',
        totalSteps: 4,
        completedSteps: 3
      });

      // Step 4: Validation and cleanup
      if (options.validateMigration) {
        const validationConfig = await this.loadConfig();
        const sitesCount = Object.keys(config.sites || {}).length;
        const validationSitesCount = Object.keys(validationConfig.sites || {}).length;
        
        if (sitesCount !== validationSitesCount) {
          throw new Error('Migration validation failed: site count mismatch');
        }
      }

      // Clear source storage if requested
      if (!options.preserveOriginal) {
        const oldType = this.currentStorageType;
        this.currentStorageType = options.fromType;
        await this.clearConfig();
        this.currentStorageType = oldType;
      }

      // Update storage state
      this.storageState = {
        type: options.toType,
        isInitialized: true,
        isAvailable: await this.isStorageAvailable(options.toType)
      };

      this.emitEvent('migration-progress', {
        type: 'migration-progress',
        fromType: options.fromType,
        toType: options.toType,
        progress: 100,
        currentStep: 'Migration completed',
        totalSteps: 4,
        completedSteps: 4
      });

      // Emit storage change event
      this.emitEvent('storageChange', {
        type: 'storage-change',
        oldType: options.fromType,
        newType: options.toType,
        timestamp: new Date()
      });

      return {
        success: true,
        sitesCount: Object.keys(config.sites || {}).length
      };

    } catch (error) {
      // Restore original storage type on failure
      this.currentStorageType = oldStorageType;
      
      return {
        success: false,
        sitesCount: 0,
        error: error instanceof Error ? error.message : 'Unknown migration error'
      };
    }
  }

  /**
   * Get available storage backends with their status
   */
  async getAvailableStorageBackends(): Promise<StorageBackend[]> {
    const backends: StorageBackend[] = [
      {
        type: StorageType.BROWSER,
        name: 'Browser Storage',
        description: 'Store data locally in your browser for complete privacy',
        isAvailable: await this.isStorageAvailable(StorageType.BROWSER),
        capabilities: this.getStorageCapabilities(StorageType.BROWSER),
        icon: '🛡️',
        privacyLevel: 'high',
        networkRequired: false
      },
      {
        type: StorageType.JSON_FILE,
        name: 'Server Storage',
        description: 'Store data on the server using JSON files',
        isAvailable: await this.isStorageAvailable(StorageType.JSON_FILE),
        capabilities: this.getStorageCapabilities(StorageType.JSON_FILE),
        icon: '🖥️',
        privacyLevel: 'medium',
        networkRequired: true
      },
      {
        type: StorageType.DATABASE,
        name: 'Database Storage',
        description: 'Store data in a PostgreSQL database',
        isAvailable: await this.isStorageAvailable(StorageType.DATABASE),
        capabilities: this.getStorageCapabilities(StorageType.DATABASE),
        icon: '🗄️',
        privacyLevel: 'low',
        networkRequired: true
      }
    ];

    return backends;
  }

  /**
   * Switch to a different storage type
   */
  async switchStorageType(newType: StorageType, migrateData: boolean = true): Promise<boolean> {
    const oldType = this.currentStorageType;
    
    if (oldType === newType) {
      return true; // Already using this type
    }

    if (migrateData) {
      const migrationResult = await this.migrateStorage({
        fromType: oldType,
        toType: newType,
        preserveOriginal: false,
        validateMigration: true
      });
      
      return migrationResult.success;
    } else {
      // Just switch without migrating data
      this.currentStorageType = newType;
      this.storageState = {
        type: newType,
        isInitialized: true,
        isAvailable: await this.isStorageAvailable(newType)
      };
      
      this.emitEvent('storageChange', {
        type: 'storage-change',
        oldType,
        newType,
        timestamp: new Date()
      });
      
      return true;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event: 'storageChange' | 'migrationProgress', callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: 'storageChange' | 'migrationProgress', callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: string, data: StorageChangeEvent | StorageMigrationProgressEvent): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Storage event listener error:', error);
        }
      });
    }
  }
}

// Create and export singleton instance
export const browserStorageService = new BrowserStorageService();