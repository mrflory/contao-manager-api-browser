/**
 * Frontend storage types and interfaces for browser storage support
 */

export enum StorageType {
  JSON_FILE = 'json_file',
  BROWSER = 'browser',
  DATABASE = 'database'
}

export interface StorageInfo {
  usedSpace: number;
  availableSpace: number;
  totalSpace?: number;
  usagePercentage: number;
}

export interface StorageState {
  type: StorageType;
  isInitialized: boolean;
  isAvailable: boolean;
  error?: string;
}

export interface StorageConfig {
  type: StorageType;
  namespace?: string;
  options?: Record<string, any>;
}

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

export interface StorageMigrationOptions {
  fromType: StorageType;
  toType: StorageType;
  preserveOriginal: boolean;
  validateMigration: boolean;
}

export interface StorageMigrationResult {
  success: boolean;
  sitesCount: number;
  error?: string;
  warnings?: string[];
}

export interface BrowserStorageService {
  // Storage detection and management
  detectStorageType(): Promise<StorageType>;
  isStorageAvailable(type: StorageType): Promise<boolean>;
  getStorageCapabilities(type: StorageType): StorageCapabilities;
  
  // Storage information
  getStorageInfo(): Promise<StorageInfo>;
  getStorageState(): StorageState;
  
  // Configuration management
  loadConfig(): Promise<any>;
  saveConfig(config: any): Promise<boolean>;
  clearConfig(): Promise<boolean>;
  
  // Import/Export functionality
  exportConfig(): Promise<string>;
  importConfig(data: string): Promise<boolean>;
  
  // Migration functionality
  migrateStorage(options: StorageMigrationOptions): Promise<StorageMigrationResult>;
  
  // Event listeners
  addEventListener(event: 'storageChange' | 'migrationProgress', callback: Function): void;
  removeEventListener(event: 'storageChange' | 'migrationProgress', callback: Function): void;
}

export interface StoragePreferences {
  preferredType: StorageType;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  maxBackupCount: number;
  enableMigrationWarnings: boolean;
}

// Event types for storage changes
export interface StorageChangeEvent {
  type: 'storage-change';
  oldType: StorageType;
  newType: StorageType;
  timestamp: Date;
}

export interface StorageMigrationProgressEvent {
  type: 'migration-progress';
  fromType: StorageType;
  toType: StorageType;
  progress: number; // 0-100
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
}

// Storage backend availability
export interface StorageBackend {
  type: StorageType;
  name: string;
  description: string;
  isAvailable: boolean;
  capabilities: StorageCapabilities;
  icon?: string;
  privacyLevel: 'high' | 'medium' | 'low';
  networkRequired: boolean;
}