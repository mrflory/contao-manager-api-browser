/**
 * Storage abstraction layer for Contao Manager API
 * 
 * This module provides a pluggable storage system that supports different backends:
 * - JSON file storage (default, Phase 0)
 * - Browser localStorage (client-side)
 * - PostgreSQL database (Phase 1 SaaS)
 */

// Core interfaces and types
export {
  SiteConfigStorage,
  StorageType,
  StorageConfig,
  StorageResult,
  AddSiteParams,
  UpdateSiteParams,
  BaseStorage
} from './interfaces';

// Storage implementations
export { JsonFileStorage } from './JsonFileStorage';
export { BrowserStorage } from './BrowserStorage';
export { DatabaseStorage } from './DatabaseStorage';

// Factory for storage creation
export { StorageFactory } from './StorageFactory';

// Re-export config types for convenience
export {
  AppConfig,
  SiteConfig,
  VersionInfo,
  AuthMethod
} from '../types';

/**
 * Default factory function for quick storage creation
 * 
 * @example
 * ```typescript
 * import { createDefaultStorage } from './storage';
 * 
 * const storage = createDefaultStorage();
 * await storage.initialize();
 * ```
 */
export function createDefaultStorage(): SiteConfigStorage {
  return StorageFactory.createFromEnvironment();
}

/**
 * Auto-detect storage function for smart storage selection
 * 
 * @example
 * ```typescript
 * import { createAutoDetectedStorage } from './storage';
 * 
 * const storage = await createAutoDetectedStorage();
 * const config = await storage.loadConfig();
 * ```
 */
export function createAutoDetectedStorage(): Promise<SiteConfigStorage> {
  return StorageFactory.createAutoDetected();
}

/**
 * Storage migration utility
 * 
 * @example
 * ```typescript
 * import { migrateStorage, StorageFactory, StorageType } from './storage';
 * 
 * const fromStorage = StorageFactory.createStorage({ type: StorageType.JSON_FILE });
 * const toStorage = StorageFactory.createStorage({ type: StorageType.DATABASE, connectionString: 'postgresql://...' });
 * 
 * const result = await migrateStorage(fromStorage, toStorage);
 * if (!result.success) {
 *   console.error('Migration failed:', result.error);
 * }
 * ```
 */
export function migrateStorage(
  fromStorage: SiteConfigStorage,
  toStorage: SiteConfigStorage
): Promise<{ success: boolean; error?: string }> {
  return StorageFactory.migrateStorage(fromStorage, toStorage);
}

/**
 * Environment-based storage type detection
 * 
 * @example
 * ```typescript
 * import { getStorageTypeFromEnvironment } from './storage';
 * 
 * const storageType = getStorageTypeFromEnvironment();
 * console.log('Detected storage type:', storageType);
 * ```
 */
export function getStorageTypeFromEnvironment(): StorageType {
  const envType = process.env.STORAGE_TYPE as StorageType;
  
  if (envType && Object.values(StorageType).includes(envType)) {
    return envType;
  }
  
  // Auto-detect based on available environment variables
  if (process.env.DATABASE_URL) {
    return StorageType.DATABASE;
  }
  
  if (typeof window !== 'undefined') {
    return StorageType.BROWSER;
  }
  
  return StorageType.JSON_FILE;
}

/**
 * Validate storage configuration helper
 * 
 * @example
 * ```typescript
 * import { validateStorageConfig, StorageType } from './storage';
 * 
 * const config = { type: StorageType.DATABASE, connectionString: 'postgresql://...' };
 * const validation = validateStorageConfig(config);
 * 
 * if (!validation.valid) {
 *   console.error('Invalid config:', validation.errors);
 * }
 * ```
 */
export function validateStorageConfig(config: StorageConfig): { valid: boolean; errors: string[] } {
  return StorageFactory.validateConfig(config);
}

/**
 * Get available storage types in current environment
 * 
 * @example
 * ```typescript
 * import { getAvailableStorageTypes } from './storage';
 * 
 * const availableTypes = await getAvailableStorageTypes();
 * console.log('Available storage backends:', availableTypes);
 * ```
 */
export function getAvailableStorageTypes(): Promise<StorageType[]> {
  return StorageFactory.getAvailableStorageTypes();
}