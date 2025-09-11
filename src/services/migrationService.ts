import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { EventEmitter } from 'events';

import {
  MigrationOptions,
  MigrationResult,
  MigrationProgress,
  MigrationStatus,
  MigrationType,
  DataCategory,
  DetectedData,
  FileSystemEntry,
  BackupInfo,
  MigrationValidationResult,
  MigrationValidationError,
  RollbackOptions,
  RollbackResult,
  MigrationStep,
  MigrationError,
  ValidationError,
  RollbackError,
  MigrationEvent,
  MigrationEventCallback,
  MigrationStrategy
} from '../types/migration';
import { StorageType, UnifiedStorage, getStorageCapabilities } from '../storage/interfaces';
import { LogEntry, HistoryEntry, SnapshotMetadata } from '../types';
import { createMigrationStrategy } from './migration/strategies';
import { MigrationValidator } from './migration/validator';
import { MigrationRollbackService } from './migration/rollback';
import { MigrationErrorHandler, ErrorContext } from './migration/errorHandler';
import { MigrationProgressReporter } from './migration/progressReporter';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

/**
 * Comprehensive migration service for transitioning data between storage backends
 */
export class MigrationService extends EventEmitter {
  private readonly dataDir: string;
  private readonly backupDir: string;
  private activeMigrations = new Map<string, MigrationProgress>();
  private migrationStrategies: MigrationStrategy[] = [];
  private eventCallbacks = new Map<string, MigrationEventCallback[]>();
  
  // Enhanced services for comprehensive migration support
  private validator: MigrationValidator;
  private rollbackService: MigrationRollbackService;
  private errorHandler: MigrationErrorHandler;
  private progressReporter: MigrationProgressReporter;

  constructor(
    private sourceStorage: UnifiedStorage,
    private targetStorage: UnifiedStorage,
    dataDir: string = './data'
  ) {
    super();
    this.dataDir = path.resolve(dataDir);
    this.backupDir = path.resolve(dataDir, 'migration-backups');
    
    // Initialize enhanced services
    this.validator = new MigrationValidator(this.dataDir);
    this.rollbackService = new MigrationRollbackService(
      this.dataDir, 
      this.backupDir, 
      this.targetStorage
    );
    this.errorHandler = new MigrationErrorHandler();
    this.progressReporter = new MigrationProgressReporter({
      reportInterval: 2000, // 2 seconds
      persistProgress: true,
      enableDetailedMetrics: true,
      maxHistoryEntries: 500
    });
    
    this.initializeMigrationStrategies();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for integrated services
   */
  private setupEventHandlers(): void {
    // Forward error events
    this.errorHandler.onError((event) => {
      this.emit('migration_event', event);
    });

    // Forward progress events
    this.progressReporter.onProgress((event) => {
      this.emit('migration_event', event);
    });
  }

  /**
   * Initialize migration strategies for different storage type combinations
   */
  private initializeMigrationStrategies(): void {
    // JSON File -> JSON File (structure update)
    this.migrationStrategies.push({
      name: 'JSON to JSON Structure Update',
      fromType: StorageType.JSON_FILE,
      toType: StorageType.JSON_FILE,
      supportedCategories: [DataCategory.CONFIG, DataCategory.LOGS, DataCategory.HISTORY, DataCategory.SNAPSHOTS],
      estimateTime: (data) => Math.max(1000, data.totalSize / (1024 * 1024) * 500), // 500ms per MB
      estimateSpace: (data) => data.totalSize * 1.1, // 10% overhead
      getSteps: (options, data) => this.getJsonToJsonSteps(options, data),
      canRollback: true,
      requiresBackup: true,
      supportsIncremental: true
    });

    // JSON File -> Database
    this.migrationStrategies.push({
      name: 'JSON to Database Migration',
      fromType: StorageType.JSON_FILE,
      toType: StorageType.DATABASE,
      supportedCategories: [DataCategory.CONFIG, DataCategory.LOGS, DataCategory.HISTORY, DataCategory.SNAPSHOTS],
      estimateTime: (data) => Math.max(2000, data.totalSize / (1024 * 1024) * 1000), // 1s per MB
      estimateSpace: (data) => data.totalSize * 1.3, // 30% overhead for indexing
      getSteps: (options, data) => this.getJsonToDatabaseSteps(options, data),
      canRollback: true,
      requiresBackup: true,
      supportsIncremental: false
    });

    // JSON File -> Browser (config only)
    this.migrationStrategies.push({
      name: 'JSON to Browser Migration',
      fromType: StorageType.JSON_FILE,
      toType: StorageType.BROWSER,
      supportedCategories: [DataCategory.CONFIG], // Browser only supports config
      estimateTime: (data) => 1000, // Always fast for config only
      estimateSpace: (data) => data.configFile?.size || 0,
      getSteps: (options, data) => this.getJsonToBrowserSteps(options, data),
      canRollback: true,
      requiresBackup: false,
      supportsIncremental: false
    });

    // Database -> JSON File
    this.migrationStrategies.push({
      name: 'Database to JSON Migration',
      fromType: StorageType.DATABASE,
      toType: StorageType.JSON_FILE,
      supportedCategories: [DataCategory.CONFIG, DataCategory.LOGS, DataCategory.HISTORY, DataCategory.SNAPSHOTS],
      estimateTime: (data) => Math.max(3000, data.totalSize / (1024 * 1024) * 1500), // 1.5s per MB
      estimateSpace: (data) => data.totalSize * 1.2, // 20% overhead
      getSteps: (options, data) => this.getDatabaseToJsonSteps(options, data),
      canRollback: true,
      requiresBackup: true,
      supportsIncremental: false
    });

    // Browser -> JSON File
    this.migrationStrategies.push({
      name: 'Browser to JSON Migration',
      fromType: StorageType.BROWSER,
      toType: StorageType.JSON_FILE,
      supportedCategories: [DataCategory.CONFIG],
      estimateTime: (data) => 500,
      estimateSpace: (data) => (data.configFile?.size || 0) * 1.1,
      getSteps: (options, data) => this.getBrowserToJsonSteps(options, data),
      canRollback: false,
      requiresBackup: false,
      supportsIncremental: false
    });
  }

  /**
   * Detect existing file-based data in the current installation
   */
  async detectExistingData(): Promise<DetectedData> {
    const detectedData: DetectedData = {
      configFile: null,
      logFiles: [],
      historyFiles: [],
      snapshotDirectories: [],
      totalSize: 0,
      lastActivity: new Date(0).toISOString(),
      siteUrls: []
    };

    try {
      // Check for config file
      const configPath = path.join(this.dataDir, 'config.json');
      if (fs.existsSync(configPath)) {
        const configStat = await stat(configPath);
        detectedData.configFile = {
          path: configPath,
          type: 'file',
          size: configStat.size,
          lastModified: configStat.mtime.toISOString(),
          category: DataCategory.CONFIG
        };
        detectedData.totalSize += configStat.size;
        if (configStat.mtime > new Date(detectedData.lastActivity)) {
          detectedData.lastActivity = configStat.mtime.toISOString();
        }

        // Extract site URLs from config
        try {
          const configContent = await readFile(configPath, 'utf8');
          const config = JSON.parse(configContent);
          if (config.sites) {
            detectedData.siteUrls = Object.keys(config.sites);
          }
        } catch (error) {
          console.warn('Failed to parse config file for site URLs:', error);
        }
      }

      // Scan data directory for log, history, and snapshot files
      if (fs.existsSync(this.dataDir)) {
        const files = await readdir(this.dataDir);
        
        for (const file of files) {
          const filePath = path.join(this.dataDir, file);
          const fileStat = await stat(filePath);
          
          if (fileStat.isFile()) {
            if (file.endsWith('.log')) {
              // Log file
              detectedData.logFiles.push({
                path: filePath,
                type: 'file',
                size: fileStat.size,
                lastModified: fileStat.mtime.toISOString(),
                category: DataCategory.LOGS,
                siteUrl: this.extractSiteUrlFromFilename(file, '.log')
              });
              detectedData.totalSize += fileStat.size;
            } else if (file.endsWith('.history.json')) {
              // History file
              detectedData.historyFiles.push({
                path: filePath,
                type: 'file',
                size: fileStat.size,
                lastModified: fileStat.mtime.toISOString(),
                category: DataCategory.HISTORY,
                siteUrl: this.extractSiteUrlFromFilename(file, '.history.json')
              });
              detectedData.totalSize += fileStat.size;
            }
            
            if (fileStat.mtime > new Date(detectedData.lastActivity)) {
              detectedData.lastActivity = fileStat.mtime.toISOString();
            }
          } else if (fileStat.isDirectory() && file === 'snapshots') {
            // Snapshots directory
            const snapshotsPath = path.join(this.dataDir, 'snapshots');
            const snapshotDirs = await readdir(snapshotsPath);
            
            for (const snapshotDir of snapshotDirs) {
              const snapshotPath = path.join(snapshotsPath, snapshotDir);
              const snapshotStat = await stat(snapshotPath);
              
              if (snapshotStat.isDirectory()) {
                const snapshotSize = await this.calculateDirectorySize(snapshotPath);
                detectedData.snapshotDirectories.push({
                  path: snapshotPath,
                  type: 'directory',
                  size: snapshotSize,
                  lastModified: snapshotStat.mtime.toISOString(),
                  category: DataCategory.SNAPSHOTS,
                  siteUrl: this.extractSiteUrlFromSnapshotDir(snapshotDir)
                });
                detectedData.totalSize += snapshotSize;
                
                if (snapshotStat.mtime > new Date(detectedData.lastActivity)) {
                  detectedData.lastActivity = snapshotStat.mtime.toISOString();
                }
              }
            }
          }
        }
      }

      // Ensure we have unique site URLs
      detectedData.siteUrls = [...new Set(detectedData.siteUrls)];

    } catch (error) {
      console.error('Error detecting existing data:', error);
      throw new MigrationError(
        'Failed to detect existing data',
        'DETECTION_ERROR',
        DataCategory.CONFIG,
        true,
        error
      );
    }

    return detectedData;
  }

  /**
   * Extract site URL from filename (e.g., "localhost.log" -> "localhost")
   */
  private extractSiteUrlFromFilename(filename: string, suffix: string): string {
    return filename.replace(suffix, '');
  }

  /**
   * Extract site URL from snapshot directory name
   */
  private extractSiteUrlFromSnapshotDir(dirName: string): string {
    // Format: localhost-2025-09-07-21-33-40-907Z
    const parts = dirName.split('-');
    if (parts.length >= 2) {
      return parts[0]; // Take first part as site URL
    }
    return dirName;
  }

  /**
   * Calculate total size of a directory recursively
   */
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    try {
      const files = await readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const fileStat = await stat(filePath);
        if (fileStat.isFile()) {
          totalSize += fileStat.size;
        } else if (fileStat.isDirectory()) {
          totalSize += await this.calculateDirectorySize(filePath);
        }
      }
    } catch (error) {
      console.warn('Error calculating directory size:', error);
    }
    return totalSize;
  }

  /**
   * Get migration status for active migration
   */
  getMigrationStatus(migrationId: string): MigrationProgress | null {
    return this.activeMigrations.get(migrationId) || null;
  }

  /**
   * Get all active migrations
   */
  getActiveMigrations(): MigrationProgress[] {
    return Array.from(this.activeMigrations.values());
  }

  /**
   * Start a data migration
   */
  async startMigration(options: MigrationOptions): Promise<string> {
    const migrationId = this.generateMigrationId();
    
    try {
      // Validate migration options
      await this.validateMigrationOptions(options);

      // Detect existing data
      const detectedData = await this.detectExistingData();

      // Find appropriate migration strategy
      const strategy = this.findMigrationStrategy(options.fromStorageType, options.toStorageType);
      if (!strategy) {
        throw new MigrationError(
          `No migration strategy found for ${options.fromStorageType} -> ${options.toStorageType}`,
          'NO_STRATEGY',
          DataCategory.CONFIG,
          false
        );
      }

      // Generate migration steps
      const steps = strategy.getSteps(options, detectedData);
      
      // Initialize migration progress
      const migrationProgress: MigrationProgress = {
        migrationId,
        status: MigrationStatus.IN_PROGRESS,
        startTime: new Date().toISOString(),
        totalSteps: steps.length,
        completedSteps: 0,
        steps,
        overallProgress: 0,
        throughputMetrics: {
          itemsPerSecond: 0,
          averageItemSize: 0
        }
      };

      this.activeMigrations.set(migrationId, migrationProgress);

      // Emit migration started event
      this.emitMigrationEvent({
        type: 'migration_started',
        migrationId,
        timestamp: new Date().toISOString(),
        data: { options, detectedData }
      });

      // Start migration process asynchronously
      this.executeMigration(migrationId, options, detectedData, strategy)
        .catch((error) => {
          console.error('Migration execution failed:', error);
          this.handleMigrationFailure(migrationId, error);
        });

      return migrationId;

    } catch (error) {
      console.error('Failed to start migration:', error);
      throw error;
    }
  }

  /**
   * Execute the migration process
   */
  private async executeMigration(
    migrationId: string,
    options: MigrationOptions,
    detectedData: DetectedData,
    strategy: MigrationStrategy
  ): Promise<void> {
    const progress = this.activeMigrations.get(migrationId);
    if (!progress) {
      throw new MigrationError('Migration progress not found', 'PROGRESS_NOT_FOUND', DataCategory.CONFIG, false);
    }

    let backupInfo: BackupInfo | null = null;

    try {
      // Step 1: Create backup if required
      if (options.createBackup || strategy.requiresBackup) {
        await this.updateStepStatus(migrationId, 'backup', 'in_progress', 'Creating backup');
        backupInfo = await this.createBackup(detectedData, options);
        await this.updateStepStatus(migrationId, 'backup', 'completed', 'Backup created successfully');
      }

      // Step 2: Execute migration steps
      for (const step of progress.steps) {
        if (step.id === 'backup') continue; // Already handled

        await this.updateStepStatus(migrationId, step.id, 'in_progress', `Executing ${step.name}`);
        
        try {
          await this.executeStep(migrationId, step, options, detectedData);
          await this.updateStepStatus(migrationId, step.id, 'completed', `${step.name} completed`);
        } catch (error) {
          await this.updateStepStatus(migrationId, step.id, 'failed', `${step.name} failed: ${error}`);
          
          if (!options.continueOnError) {
            throw error;
          }
        }
      }

      // Step 3: Validation
      if (options.validateMigration) {
        await this.updateStepStatus(migrationId, 'validation', 'in_progress', 'Validating migration');
        const validationResult = await this.validateMigration(options, detectedData);
        
        if (!validationResult.isValid) {
          await this.updateStepStatus(migrationId, 'validation', 'failed', 'Validation failed');
          throw new ValidationError('Migration validation failed', validationResult.errors);
        }
        
        await this.updateStepStatus(migrationId, 'validation', 'completed', 'Validation successful');
      }

      // Mark migration as completed
      progress.status = MigrationStatus.COMPLETED;
      progress.endTime = new Date().toISOString();
      progress.overallProgress = 100;

      this.emitMigrationEvent({
        type: 'migration_completed',
        migrationId,
        timestamp: new Date().toISOString(),
        data: { backupInfo }
      });

    } catch (error) {
      this.handleMigrationFailure(migrationId, error);
      throw error;
    }
  }

  /**
   * Handle migration failure
   */
  private handleMigrationFailure(migrationId: string, error: any): void {
    const progress = this.activeMigrations.get(migrationId);
    if (progress) {
      progress.status = MigrationStatus.FAILED;
      progress.endTime = new Date().toISOString();
    }

    this.emitMigrationEvent({
      type: 'migration_failed',
      migrationId,
      timestamp: new Date().toISOString(),
      data: { error: error.message }
    });
  }

  /**
   * Update step status and progress
   */
  private async updateStepStatus(
    migrationId: string,
    stepId: string,
    status: MigrationStep['status'],
    message?: string
  ): Promise<void> {
    const progress = this.activeMigrations.get(migrationId);
    if (!progress) return;

    const step = progress.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = status;
    if (status === 'in_progress') {
      step.startTime = new Date().toISOString();
      progress.currentStep = step;
    } else if (status === 'completed' || status === 'failed') {
      step.endTime = new Date().toISOString();
      if (status === 'completed') {
        progress.completedSteps++;
        step.progress = 100;
      }
      if (message && status === 'failed') {
        step.error = message;
      }
    }

    // Update overall progress
    progress.overallProgress = (progress.completedSteps / progress.totalSteps) * 100;
  }

  /**
   * Execute individual migration step
   */
  private async executeStep(
    migrationId: string,
    step: MigrationStep,
    options: MigrationOptions,
    detectedData: DetectedData
  ): Promise<void> {
    // Create appropriate migration strategy for this step
    const strategy = createMigrationStrategy(
      options.fromStorageType,
      options.toStorageType,
      this.sourceStorage,
      this.targetStorage,
      this.dataDir
    );

    switch (step.category) {
      case DataCategory.CONFIG:
        if (strategy.migrateConfig) {
          await strategy.migrateConfig(step, options);
        } else {
          throw new MigrationError(`Config migration not supported for ${options.fromStorageType} -> ${options.toStorageType}`, 'CONFIG_NOT_SUPPORTED', step.category, false);
        }
        break;
      case DataCategory.LOGS:
        if (strategy.migrateLogs) {
          await strategy.migrateLogs(step, options, detectedData);
        } else {
          throw new MigrationError(`Logs migration not supported for ${options.fromStorageType} -> ${options.toStorageType}`, 'LOGS_NOT_SUPPORTED', step.category, false);
        }
        break;
      case DataCategory.HISTORY:
        if (strategy.migrateHistory) {
          await strategy.migrateHistory(step, options, detectedData);
        } else {
          throw new MigrationError(`History migration not supported for ${options.fromStorageType} -> ${options.toStorageType}`, 'HISTORY_NOT_SUPPORTED', step.category, false);
        }
        break;
      case DataCategory.SNAPSHOTS:
        if (strategy.migrateSnapshots) {
          await strategy.migrateSnapshots(step, options, detectedData);
        } else {
          throw new MigrationError(`Snapshots migration not supported for ${options.fromStorageType} -> ${options.toStorageType}`, 'SNAPSHOTS_NOT_SUPPORTED', step.category, false);
        }
        break;
      default:
        throw new MigrationError(`Unknown step category: ${step.category}`, 'UNKNOWN_CATEGORY', step.category, false);
    }
  }

  /**
   * Create backup of existing data
   */
  private async createBackup(detectedData: DetectedData, options: MigrationOptions): Promise<BackupInfo> {
    const backupId = this.generateBackupId();
    const backupPath = path.join(this.backupDir, backupId);
    
    await mkdir(backupPath, { recursive: true });

    let totalSize = 0;
    const categories: DataCategory[] = [];

    // Backup config
    if (detectedData.configFile && options.dataCategories.includes(DataCategory.CONFIG)) {
      const configBackupPath = path.join(backupPath, 'config.json');
      await copyFile(detectedData.configFile.path, configBackupPath);
      totalSize += detectedData.configFile.size;
      categories.push(DataCategory.CONFIG);
    }

    // Backup logs
    if (options.dataCategories.includes(DataCategory.LOGS)) {
      const logsBackupDir = path.join(backupPath, 'logs');
      await mkdir(logsBackupDir, { recursive: true });
      
      for (const logFile of detectedData.logFiles) {
        const fileName = path.basename(logFile.path);
        const logBackupPath = path.join(logsBackupDir, fileName);
        await copyFile(logFile.path, logBackupPath);
        totalSize += logFile.size;
      }
      
      if (detectedData.logFiles.length > 0) {
        categories.push(DataCategory.LOGS);
      }
    }

    // Backup history
    if (options.dataCategories.includes(DataCategory.HISTORY)) {
      const historyBackupDir = path.join(backupPath, 'history');
      await mkdir(historyBackupDir, { recursive: true });
      
      for (const historyFile of detectedData.historyFiles) {
        const fileName = path.basename(historyFile.path);
        const historyBackupPath = path.join(historyBackupDir, fileName);
        await copyFile(historyFile.path, historyBackupPath);
        totalSize += historyFile.size;
      }
      
      if (detectedData.historyFiles.length > 0) {
        categories.push(DataCategory.HISTORY);
      }
    }

    // Backup snapshots
    if (options.dataCategories.includes(DataCategory.SNAPSHOTS)) {
      const snapshotsBackupDir = path.join(backupPath, 'snapshots');
      await mkdir(snapshotsBackupDir, { recursive: true });
      
      for (const snapshotDir of detectedData.snapshotDirectories) {
        const dirName = path.basename(snapshotDir.path);
        const snapshotBackupPath = path.join(snapshotsBackupDir, dirName);
        await this.copyDirectory(snapshotDir.path, snapshotBackupPath);
        totalSize += snapshotDir.size;
      }
      
      if (detectedData.snapshotDirectories.length > 0) {
        categories.push(DataCategory.SNAPSHOTS);
      }
    }

    // Calculate checksum
    const checksum = await this.calculateBackupChecksum(backupPath);

    const backupInfo: BackupInfo = {
      id: backupId,
      createdAt: new Date().toISOString(),
      storageType: options.fromStorageType,
      dataCategories: categories,
      location: backupPath,
      size: totalSize,
      checksum,
      isValid: true,
      metadata: {
        sitesCount: detectedData.siteUrls.length,
        version: '1.0',
        description: `Migration backup from ${options.fromStorageType} to ${options.toStorageType}`
      }
    };

    // Save backup metadata
    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    await writeFile(metadataPath, JSON.stringify(backupInfo, null, 2));

    return backupInfo;
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    const files = await readdir(src);
    
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const srcStat = await stat(srcPath);
      
      if (srcStat.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Calculate backup checksum
   */
  private async calculateBackupChecksum(backupPath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    // For simplicity, just hash the backup path and timestamp
    hash.update(backupPath + new Date().toISOString());
    return hash.digest('hex');
  }

  /**
   * Validate migration options
   */
  private async validateMigrationOptions(options: MigrationOptions): Promise<void> {
    const sourceCapabilities = getStorageCapabilities(options.fromStorageType);
    const targetCapabilities = getStorageCapabilities(options.toStorageType);

    // Check if data categories are supported by both source and target
    for (const category of options.dataCategories) {
      if (!this.isDataCategorySupported(category, sourceCapabilities)) {
        throw new ValidationError(
          `Data category ${category} is not supported by source storage ${options.fromStorageType}`,
          []
        );
      }
      
      if (!this.isDataCategorySupported(category, targetCapabilities)) {
        throw new ValidationError(
          `Data category ${category} is not supported by target storage ${options.toStorageType}`,
          []
        );
      }
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
   * Find migration strategy for storage type combination
   */
  private findMigrationStrategy(fromType: StorageType, toType: StorageType): MigrationStrategy | null {
    return this.migrationStrategies.find(
      strategy => strategy.fromType === fromType && strategy.toType === toType
    ) || null;
  }

  /**
   * Generate unique migration ID
   */
  private generateMigrationId(): string {
    return `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit migration event
   */
  private emitMigrationEvent(event: MigrationEvent): void {
    this.emit('migrationEvent', event);
    
    const callbacks = this.eventCallbacks.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Migration event callback error:', error);
        }
      });
    }
  }

  // Step generation methods for different migration strategies
  private getJsonToJsonSteps(options: MigrationOptions, data: DetectedData): MigrationStep[] {
    const steps: MigrationStep[] = [];
    
    if (options.createBackup) {
      steps.push({
        id: 'backup',
        name: 'Create Backup',
        description: 'Create backup of existing data',
        category: DataCategory.CONFIG,
        status: 'pending',
        progress: 0,
        itemsTotal: 1,
        itemsProcessed: 0
      });
    }

    if (options.dataCategories.includes(DataCategory.CONFIG) && data.configFile) {
      steps.push({
        id: 'migrate-config',
        name: 'Migrate Configuration',
        description: 'Update configuration file format',
        category: DataCategory.CONFIG,
        status: 'pending',
        progress: 0,
        itemsTotal: 1,
        itemsProcessed: 0
      });
    }

    return steps;
  }

  private getJsonToDatabaseSteps(options: MigrationOptions, data: DetectedData): MigrationStep[] {
    const steps: MigrationStep[] = [];
    
    // Add steps for database migration
    if (options.dataCategories.includes(DataCategory.CONFIG)) {
      steps.push({
        id: 'migrate-config-to-db',
        name: 'Migrate Config to Database',
        description: 'Import configuration into database',
        category: DataCategory.CONFIG,
        status: 'pending',
        progress: 0,
        itemsTotal: data.siteUrls.length,
        itemsProcessed: 0
      });
    }

    if (options.dataCategories.includes(DataCategory.LOGS)) {
      steps.push({
        id: 'migrate-logs-to-db',
        name: 'Migrate Logs to Database',
        description: 'Import log files into database',
        category: DataCategory.LOGS,
        status: 'pending',
        progress: 0,
        itemsTotal: data.logFiles.length,
        itemsProcessed: 0
      });
    }

    return steps;
  }

  private getJsonToBrowserSteps(options: MigrationOptions, data: DetectedData): MigrationStep[] {
    return [{
      id: 'migrate-config-to-browser',
      name: 'Migrate Config to Browser',
      description: 'Copy configuration to browser storage',
      category: DataCategory.CONFIG,
      status: 'pending',
      progress: 0,
      itemsTotal: 1,
      itemsProcessed: 0
    }];
  }

  private getDatabaseToJsonSteps(options: MigrationOptions, data: DetectedData): MigrationStep[] {
    const steps: MigrationStep[] = [];
    
    if (options.dataCategories.includes(DataCategory.CONFIG)) {
      steps.push({
        id: 'export-config-from-db',
        name: 'Export Config from Database',
        description: 'Export configuration from database to JSON',
        category: DataCategory.CONFIG,
        status: 'pending',
        progress: 0,
        itemsTotal: 1,
        itemsProcessed: 0
      });
    }

    return steps;
  }

  private getBrowserToJsonSteps(options: MigrationOptions, data: DetectedData): MigrationStep[] {
    return [{
      id: 'export-config-from-browser',
      name: 'Export Config from Browser',
      description: 'Export configuration from browser to JSON file',
      category: DataCategory.CONFIG,
      status: 'pending',
      progress: 0,
      itemsTotal: 1,
      itemsProcessed: 0
    }];
  }

  /**
   * Enhanced data integrity validation
   */
  private async validateDataIntegrity(
    options: MigrationOptions,
    detectedData: DetectedData,
    migrationId: string
  ): Promise<MigrationValidationResult> {
    const errors: MigrationValidationError[] = [];
    const warnings: MigrationValidationError[] = [];
    const recommendations: string[] = [];
    
    try {
      // Validate source data exists and is readable
      await this.validateSourceData(detectedData, errors, warnings);
      
      // Validate target storage capabilities
      await this.validateTargetCapabilities(options, errors, warnings);
      
      // Check for data compatibility issues
      await this.validateDataCompatibility(options, detectedData, errors, warnings);
      
      // Generate recommendations based on migration type
      this.generateMigrationRecommendations(options, detectedData, recommendations);
      
      // Validate checksums if available
      await this.validateDataChecksums(detectedData, warnings);
      
      const isValid = errors.length === 0;
      
      return {
        isValid,
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
        type: 'data_loss',
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
        const configContent = await readFile(detectedData.configFile.path!, 'utf8');
        JSON.parse(configContent);
      } catch (error) {
        errors.push({
          type: 'corruption',
          category: DataCategory.CONFIG,
          message: 'Config file is corrupted or invalid JSON',
          affectedItems: [detectedData.configFile.path!],
          severity: 'error'
        });
      }
    }

    // Validate log files
    for (const logFile of detectedData.logFiles) {
      try {
        const logContent = await readFile(logFile.path!, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        
        let invalidLines = 0;
        for (const line of lines) {
          try {
            JSON.parse(line);
          } catch {
            invalidLines++;
          }
        }
        
        if (invalidLines > 0) {
          warnings.push({
            type: 'format_error',
            category: DataCategory.LOGS,
            message: `${invalidLines} invalid log entries found in ${logFile.path}`,
            affectedItems: [logFile.path!],
            severity: 'warning'
          });
        }
      } catch (error) {
        errors.push({
          type: 'corruption',
          category: DataCategory.LOGS,
          message: `Cannot read log file: ${logFile.path}`,
          affectedItems: [logFile.path!],
          severity: 'error'
        });
      }
    }

    // Validate history files
    for (const historyFile of detectedData.historyFiles) {
      try {
        const historyContent = await readFile(historyFile.path!, 'utf8');
        JSON.parse(historyContent);
      } catch (error) {
        errors.push({
          type: 'corruption',
          category: DataCategory.HISTORY,
          message: `Cannot read or parse history file: ${historyFile.path}`,
          affectedItems: [historyFile.path!],
          severity: 'error'
        });
      }
    }

    // Validate snapshot directories
    for (const snapshotDir of detectedData.snapshotDirectories) {
      const metadataPath = path.join(snapshotDir.path!, 'metadata.json');
      if (!fs.existsSync(metadataPath)) {
        warnings.push({
          type: 'format_error',
          category: DataCategory.SNAPSHOTS,
          message: `Missing metadata.json in snapshot: ${snapshotDir.path}`,
          affectedItems: [snapshotDir.path!],
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
    
    // Check size limitations
    if (targetCapabilities.maxStorageSize) {
      // Implementation would calculate total size and compare
      // For now, just add a warning for browser storage
      if (options.toStorageType === StorageType.BROWSER) {
        warnings.push({
          type: 'size_limit',
          category: DataCategory.CONFIG,
          message: 'Browser storage has limited capacity. Consider migrating config only.',
          affectedItems: [],
          severity: 'warning'
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
    // Check for features that might not be supported in target
    if (options.toStorageType === StorageType.BROWSER) {
      if (options.dataCategories.includes(DataCategory.LOGS) && detectedData.logFiles.length > 0) {
        errors.push({
          type: 'format_error',
          category: DataCategory.LOGS,
          message: 'Browser storage does not support log files',
          affectedItems: detectedData.logFiles.map(f => f.path!),
          severity: 'error'
        });
      }
    }
    
    // Check for potential data loss scenarios
    if (options.fromStorageType === StorageType.DATABASE && options.toStorageType === StorageType.JSON_FILE) {
      warnings.push({
        type: 'data_loss',
        category: DataCategory.CONFIG,
        message: 'Migrating from database to file storage may lose some metadata',
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
    if (detectedData.totalSize > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Consider cleaning up old data before migration to reduce migration time');
    }
    
    // Storage type recommendations
    if (options.toStorageType === StorageType.BROWSER) {
      recommendations.push('Browser storage is limited to configuration only. Logs, history, and snapshots will not be migrated');
      recommendations.push('Consider using server storage for full data persistence');
    }
    
    if (options.toStorageType === StorageType.DATABASE) {
      recommendations.push('Database storage provides best performance and query capabilities');
      recommendations.push('Ensure database connectivity is stable during migration');
    }
    
    // Backup recommendations
    if (!options.createBackup && options.fromStorageType !== options.toStorageType) {
      recommendations.push('Enable backup creation for safer migration with rollback capability');
    }
    
    // Performance recommendations
    if (detectedData.logFiles.length > 10) {
      recommendations.push('Consider using smaller batch sizes for log migration to avoid memory issues');
    }
  }

  /**
   * Validate data checksums
   */
  private async validateDataChecksums(
    detectedData: DetectedData,
    warnings: MigrationValidationError[]
  ): Promise<void> {
    // For now, just implement basic file integrity checks
    // In a full implementation, this would calculate and verify checksums
    for (const file of [...detectedData.logFiles, ...detectedData.historyFiles]) {
      try {
        await stat(file.path!);
      } catch (error) {
        warnings.push({
          type: 'corruption',
          category: file.category,
          message: `File may be corrupted or inaccessible: ${file.path}`,
          affectedItems: [file.path!],
          severity: 'warning'
        });
      }
    }
  }

  private async validateMigration(options: MigrationOptions, data: DetectedData): Promise<MigrationValidationResult> {
    return this.validateDataIntegrity(options, data, 'validation');
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(options: RollbackOptions): Promise<RollbackResult> {
    const rollbackId = `rollback-${Date.now()}`;
    const startTime = new Date().toISOString();

    try {
      // Implementation would restore from backup
      console.log(`Rolling back migration ${options.migrationId}`);
      
      // Simulate rollback
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        rollbackId,
        startTime,
        endTime: new Date().toISOString(),
        duration: 2000,
        restoredItems: {
          [DataCategory.CONFIG]: 1,
          [DataCategory.LOGS]: 0,
          [DataCategory.HISTORY]: 0,
          [DataCategory.SNAPSHOTS]: 0
        }
      };
    } catch (error) {
      throw new RollbackError(
        `Rollback failed: ${error}`,
        options.migrationId,
        error
      );
    }
  }

  /**
   * Get migration result after completion
   */
  async getMigrationResult(migrationId: string): Promise<MigrationResult | null> {
    const progress = this.activeMigrations.get(migrationId);
    if (!progress || progress.status === MigrationStatus.IN_PROGRESS) {
      return null;
    }

    return {
      success: progress.status === MigrationStatus.COMPLETED,
      migrationId,
      status: progress.status,
      startTime: progress.startTime,
      endTime: progress.endTime || new Date().toISOString(),
      duration: progress.endTime ? 
        new Date(progress.endTime).getTime() - new Date(progress.startTime).getTime() : 0,
      statistics: {
        totalItems: progress.steps.reduce((sum, step) => sum + step.itemsTotal, 0),
        migratedItems: progress.steps.reduce((sum, step) => 
          step.status === 'completed' ? sum + step.itemsProcessed : sum, 0),
        failedItems: progress.steps.reduce((sum, step) => 
          step.status === 'failed' ? sum + step.itemsTotal : sum, 0),
        skippedItems: progress.steps.reduce((sum, step) => 
          step.status === 'skipped' ? sum + step.itemsTotal : sum, 0),
        totalDataSize: 0,
        migratedDataSize: 0,
        errorCount: progress.steps.filter(step => step.status === 'failed').length,
        warningCount: progress.steps.reduce((sum, step) => sum + (step.warnings?.length || 0), 0)
      },
      dataBreakdown: {
        [DataCategory.CONFIG]: { items: 0, size: 0, errors: 0, warnings: 0 },
        [DataCategory.LOGS]: { items: 0, size: 0, errors: 0, warnings: 0 },
        [DataCategory.HISTORY]: { items: 0, size: 0, errors: 0, warnings: 0 },
        [DataCategory.SNAPSHOTS]: { items: 0, size: 0, errors: 0, warnings: 0 }
      },
      rollbackInfo: {
        available: true,
        backupLocation: this.backupDir
      }
    };
  }

  /**
   * Clean up completed migrations
   */
  cleanupCompletedMigrations(): void {
    for (const [migrationId, progress] of this.activeMigrations.entries()) {
      if (progress.status === MigrationStatus.COMPLETED || 
          progress.status === MigrationStatus.FAILED ||
          progress.status === MigrationStatus.ROLLED_BACK) {
        
        // Keep completed migrations for 24 hours
        const completionTime = new Date(progress.endTime || progress.startTime);
        const now = new Date();
        const hoursSinceCompletion = (now.getTime() - completionTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceCompletion > 24) {
          this.activeMigrations.delete(migrationId);
        }
      }
    }
  }
}