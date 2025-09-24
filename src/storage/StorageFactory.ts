import { SiteConfigStorage, StorageType, StorageConfig } from './interfaces';
import { JsonFileStorage } from './JsonFileStorage';
import { BrowserStorage } from './BrowserStorage';
import { DatabaseStorage } from './DatabaseStorage';

/**
 * Factory class for creating storage backend instances
 * Supports configuration-driven storage selection
 */
export class StorageFactory {
  /**
   * Create a storage backend instance based on the provided configuration
   */
  static createStorage(config: StorageConfig): SiteConfigStorage {
    switch (config.type) {
      case StorageType.JSON_FILE:
        return new JsonFileStorage(config);
      
      case StorageType.BROWSER:
        return new BrowserStorage(config);
      
      case StorageType.DATABASE:
        return new DatabaseStorage(config);
      
      default:
        throw new Error(`Unsupported storage type: ${config.type}`);
    }
  }

  /**
   * Create storage from environment variables
   * Provides a convenient way to configure storage through environment
   */
  static createFromEnvironment(): SiteConfigStorage {
    const storageType = (process.env.STORAGE_TYPE as StorageType) || StorageType.JSON_FILE;

    // Special case: When browser storage is requested on server-side (Node.js),
    // create a no-op storage that fails gracefully
    if (storageType === StorageType.BROWSER && typeof window === 'undefined') {
      return this.createServerSideBrowserStorageStub();
    }

    const config: StorageConfig = {
      type: storageType,
      dataDir: process.env.DATA_DIR,
      connectionString: process.env.DATABASE_URL,
      tableName: process.env.DATABASE_TABLE,
      namespace: process.env.STORAGE_NAMESPACE
    };

    return this.createStorage(config);
  }

  /**
   * Create a no-op storage for browser storage on server-side
   * This allows services to initialize without crashing, they'll handle missing capabilities gracefully
   */
  private static createServerSideBrowserStorageStub(): SiteConfigStorage {
    return {
      async loadConfig() { return { success: false, error: 'Browser storage not available on server' }; },
      async saveConfig() { return { success: false, error: 'Browser storage not available on server' }; },
      async addSite() { return { success: false, error: 'Browser storage not available on server' }; },
      async removeSite() { return { success: false, error: 'Browser storage not available on server' }; },
      async updateSite() { return { success: false, error: 'Browser storage not available on server' }; },
      async setActiveSite() { return { success: false, error: 'Browser storage not available on server' }; },
      async getActiveSite() { return { success: true, data: null }; },
      async getAllSites() { return { success: true, data: {} }; },
      async isAvailable() { return false; },
      async initialize() { return { success: true }; }, // No-op initialization
      async cleanup() { }
    };
  }

  /**
   * Auto-detect the best storage backend for the current environment
   */
  static async createAutoDetected(): Promise<SiteConfigStorage> {
    // Priority order for auto-detection
    const detectionOrder = [
      StorageType.JSON_FILE,
      StorageType.BROWSER,
      StorageType.DATABASE
    ];

    for (const storageType of detectionOrder) {
      try {
        const config: StorageConfig = { type: storageType };
        
        // Add type-specific configuration
        switch (storageType) {
          case StorageType.JSON_FILE:
            config.dataDir = process.env.DATA_DIR;
            break;
          case StorageType.DATABASE:
            config.connectionString = process.env.DATABASE_URL;
            config.tableName = process.env.DATABASE_TABLE;
            break;
          case StorageType.BROWSER:
            config.namespace = process.env.STORAGE_NAMESPACE || 'contao-manager';
            break;
        }

        const storage = this.createStorage(config);
        
        // Test if storage is available
        if (await storage.isAvailable()) {
          console.log(`Auto-detected storage backend: ${storageType}`);
          return storage;
        }
      } catch (error) {
        console.warn(`Storage backend ${storageType} not available:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Fallback to JSON file storage if nothing else works
    console.warn('No storage backend auto-detected, falling back to JSON file storage');
    return new JsonFileStorage({ type: StorageType.JSON_FILE });
  }

  /**
   * Validate storage configuration
   */
  static validateConfig(config: StorageConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.type || !Object.values(StorageType).includes(config.type)) {
      errors.push('Invalid or missing storage type');
    }

    switch (config.type) {
      case StorageType.JSON_FILE:
        // dataDir is optional, defaults to process.cwd()/data
        break;
      
      case StorageType.BROWSER:
        // namespace is optional, defaults to 'contao-manager'
        if (typeof window === 'undefined') {
          errors.push('Browser storage cannot be used in non-browser environments');
        }
        break;
      
      case StorageType.DATABASE:
        if (!config.connectionString && !process.env.DATABASE_URL) {
          errors.push('Database storage requires connectionString or DATABASE_URL environment variable');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all available storage types in current environment
   */
  static async getAvailableStorageTypes(): Promise<StorageType[]> {
    const available: StorageType[] = [];

    for (const storageType of Object.values(StorageType)) {
      try {
        const config: StorageConfig = { type: storageType };
        const storage = this.createStorage(config);
        
        if (await storage.isAvailable()) {
          available.push(storageType);
        }
        
        // Cleanup the test storage
        await storage.cleanup();
      } catch (error) {
        // Storage type not available
      }
    }

    return available;
  }

  /**
   * Create storage with fallback strategy
   * Attempts to create the preferred storage, falls back to alternatives if not available
   */
  static async createWithFallback(
    preferredConfig: StorageConfig,
    fallbackTypes: StorageType[] = [StorageType.JSON_FILE, StorageType.BROWSER]
  ): Promise<SiteConfigStorage> {
    // Try preferred storage first
    try {
      const preferredStorage = this.createStorage(preferredConfig);
      if (await preferredStorage.isAvailable()) {
        console.log(`Using preferred storage: ${preferredConfig.type}`);
        return preferredStorage;
      }
      await preferredStorage.cleanup();
    } catch (error) {
      console.warn(`Preferred storage ${preferredConfig.type} failed:`, error instanceof Error ? error.message : 'Unknown error');
    }

    // Try fallback options
    for (const fallbackType of fallbackTypes) {
      try {
        const fallbackConfig: StorageConfig = { type: fallbackType };
        const fallbackStorage = this.createStorage(fallbackConfig);
        
        if (await fallbackStorage.isAvailable()) {
          console.log(`Using fallback storage: ${fallbackType}`);
          return fallbackStorage;
        }
        
        await fallbackStorage.cleanup();
      } catch (error) {
        console.warn(`Fallback storage ${fallbackType} failed:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Last resort: JSON file storage
    console.warn('All storage options failed, using JSON file storage as last resort');
    return new JsonFileStorage({ type: StorageType.JSON_FILE });
  }

}