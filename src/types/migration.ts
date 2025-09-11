import { StorageType } from '../storage/interfaces';

/**
 * Migration types and interfaces for data migration between storage backends
 */

export enum MigrationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export enum MigrationType {
  FULL_MIGRATION = 'full_migration',
  CONFIG_ONLY = 'config_only',
  INCREMENTAL = 'incremental',
  SELECTIVE = 'selective'
}

export enum DataCategory {
  CONFIG = 'config',
  LOGS = 'logs',
  HISTORY = 'history',
  SNAPSHOTS = 'snapshots'
}

export interface MigrationOptions {
  fromStorageType: StorageType;
  toStorageType: StorageType;
  migrationType: MigrationType;
  dataCategories: DataCategory[];
  preserveOriginal: boolean;
  validateMigration: boolean;
  createBackup: boolean;
  batchSize?: number;
  maxRetries?: number;
  continueOnError?: boolean;
  siteFilter?: string[]; // Only migrate specific sites
}

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  category: DataCategory;
  startTime?: string;
  endTime?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  progress: number; // 0-100
  itemsTotal: number;
  itemsProcessed: number;
  error?: string;
  warnings?: string[];
}

export interface MigrationProgress {
  migrationId: string;
  status: MigrationStatus;
  startTime: string;
  endTime?: string;
  totalSteps: number;
  completedSteps: number;
  currentStep?: MigrationStep;
  steps: MigrationStep[];
  overallProgress: number; // 0-100
  estimatedTimeRemaining?: number; // milliseconds
  throughputMetrics: {
    itemsPerSecond: number;
    averageItemSize: number;
  };
}

export interface MigrationResult {
  success: boolean;
  migrationId: string;
  status: MigrationStatus;
  startTime: string;
  endTime: string;
  duration: number; // milliseconds
  statistics: {
    totalItems: number;
    migratedItems: number;
    failedItems: number;
    skippedItems: number;
    totalDataSize: number; // bytes
    migratedDataSize: number; // bytes
    errorCount: number;
    warningCount: number;
  };
  dataBreakdown: Record<DataCategory, {
    items: number;
    size: number;
    errors: number;
    warnings: number;
  }>;
  rollbackInfo?: {
    available: boolean;
    backupLocation?: string;
    backupId?: string;
  };
  error?: string;
  warnings?: string[];
  recommendations?: string[];
}

export interface FileSystemEntry {
  path: string;
  type: 'file' | 'directory';
  size: number;
  lastModified: string;
  category: DataCategory;
  siteUrl?: string;
}

export interface DetectedData {
  configFile: FileSystemEntry | null;
  logFiles: FileSystemEntry[];
  historyFiles: FileSystemEntry[];
  snapshotDirectories: FileSystemEntry[];
  totalSize: number;
  lastActivity: string;
  siteUrls: string[];
}

export interface BackupInfo {
  id: string;
  createdAt: string;
  storageType: StorageType;
  dataCategories: DataCategory[];
  location: string;
  size: number; // bytes
  checksum: string;
  isValid: boolean;
  metadata: {
    sitesCount: number;
    version: string;
    description?: string;
  };
}

export interface MigrationValidationError {
  type: 'data_loss' | 'corruption' | 'format_error' | 'size_limit' | 'permission_error';
  category: DataCategory;
  message: string;
  affectedItems: string[];
  severity: 'error' | 'warning';
}

export interface MigrationValidationResult {
  isValid: boolean;
  errors: MigrationValidationError[];
  warnings: MigrationValidationError[];
  statistics: {
    sourceItems: Record<DataCategory, number>;
    targetItems: Record<DataCategory, number>;
    dataSizeComparison: {
      source: number;
      target: number;
      difference: number;
      percentageDifference: number;
    };
  };
  recommendations: string[];
}

export interface RollbackOptions {
  migrationId: string;
  restoreFromBackup: boolean;
  cleanupTarget: boolean;
  validateRollback: boolean;
}

export interface RollbackResult {
  success: boolean;
  rollbackId: string;
  startTime: string;
  endTime: string;
  duration: number;
  restoredItems: Record<DataCategory, number>;
  error?: string;
  warnings?: string[];
}

export interface MigrationEvent {
  type: 'migration_started' | 'step_started' | 'step_completed' | 'step_failed' | 
        'migration_completed' | 'migration_failed' | 'migration_paused' | 'migration_resumed' |
        'validation_started' | 'validation_completed' | 'backup_started' | 'backup_completed' |
        'rollback_started' | 'rollback_completed';
  migrationId: string;
  timestamp: string;
  data?: any;
}

export interface MigrationConfig {
  // Default settings for migrations
  defaultBatchSize: number;
  defaultMaxRetries: number;
  defaultTimeoutMs: number;
  backupRetentionDays: number;
  validationEnabled: boolean;
  parallelProcessing: boolean;
  maxConcurrentSteps: number;
  compressionEnabled: boolean;
  checksumValidation: boolean;
}

// Migration strategy interfaces for different storage combinations
export interface MigrationStrategy {
  name: string;
  fromType: StorageType;
  toType: StorageType;
  supportedCategories: DataCategory[];
  estimateTime(detectedData: DetectedData): number; // milliseconds
  estimateSpace(detectedData: DetectedData): number; // bytes
  getSteps(options: MigrationOptions, detectedData: DetectedData): MigrationStep[];
  canRollback: boolean;
  requiresBackup: boolean;
  supportsIncremental: boolean;
}

export interface MigrationEventCallback {
  (event: MigrationEvent): void;
}

// Error types for migration failures
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly category: DataCategory,
    public readonly retryable: boolean = false,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: MigrationValidationError[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RollbackError extends Error {
  constructor(
    message: string,
    public readonly migrationId: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'RollbackError';
  }
}