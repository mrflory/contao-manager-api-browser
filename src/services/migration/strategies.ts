import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import {
  MigrationOptions,
  MigrationStep,
  DetectedData,
  DataCategory,
  MigrationError
} from '../../types/migration';
import { StorageType, UnifiedStorage } from '../../storage/interfaces';
import { LogEntry, HistoryEntry, SnapshotMetadata, AppConfig } from '../../types';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

/**
 * Concrete implementations of migration strategies for different storage type combinations
 */

export class JsonToJsonMigrationStrategy {
  constructor(
    private sourceStorage: UnifiedStorage,
    private targetStorage: UnifiedStorage,
    private dataDir: string
  ) {}

  /**
   * Migrate configuration with format updates
   */
  async migrateConfig(step: MigrationStep, options: MigrationOptions): Promise<void> {
    try {
      const configPath = path.join(this.dataDir, 'config.json');
      
      if (!fs.existsSync(configPath)) {
        throw new MigrationError('Config file not found', 'CONFIG_NOT_FOUND', DataCategory.CONFIG, false);
      }

      // Read current config
      const configContent = await readFile(configPath, 'utf8');
      const currentConfig = JSON.parse(configContent);

      // Apply any format updates/migrations needed
      const updatedConfig = await this.updateConfigFormat(currentConfig);

      // Validate updated config
      await this.validateConfigStructure(updatedConfig);

      // Write updated config
      const configBackupPath = path.join(this.dataDir, `config.backup-${Date.now()}.json`);
      await writeFile(configBackupPath, configContent); // Backup original
      await writeFile(configPath, JSON.stringify(updatedConfig, null, 2));

      step.itemsProcessed = 1;
      step.progress = 100;

    } catch (error) {
      throw new MigrationError(
        `Config migration failed: ${error}`,
        'CONFIG_MIGRATION_FAILED',
        DataCategory.CONFIG,
        false,
        error
      );
    }
  }

  /**
   * Migrate log files with format updates
   */
  async migrateLogs(step: MigrationStep, options: MigrationOptions, detectedData: DetectedData): Promise<void> {
    let processedCount = 0;
    const totalLogs = detectedData.logFiles.length;

    for (const logFile of detectedData.logFiles) {
      try {
        // Read log file
        const logContent = await readFile(logFile.path!, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());

        // Parse and migrate log entries
        const migratedEntries: LogEntry[] = [];
        for (const line of logLines) {
          try {
            const entry = JSON.parse(line);
            const migratedEntry = await this.migrateLogEntry(entry);
            migratedEntries.push(migratedEntry);
          } catch (parseError) {
            console.warn(`Skipping invalid log line: ${line}`);
          }
        }

        // Write migrated log file
        if (migratedEntries.length > 0) {
          const migratedContent = migratedEntries.map(entry => JSON.stringify(entry)).join('\n');
          const backupPath = logFile.path + `.backup-${Date.now()}`;
          await writeFile(backupPath, logContent); // Backup original
          await writeFile(logFile.path!, migratedContent);
        }

        processedCount++;
        step.itemsProcessed = processedCount;
        step.progress = (processedCount / totalLogs) * 100;

      } catch (error) {
        console.error(`Failed to migrate log file ${logFile.path}:`, error);
        if (!options.continueOnError) {
          throw new MigrationError(
            `Log migration failed: ${error}`,
            'LOG_MIGRATION_FAILED',
            DataCategory.LOGS,
            true,
            error
          );
        }
      }
    }
  }

  /**
   * Migrate history files with format updates
   */
  async migrateHistory(step: MigrationStep, options: MigrationOptions, detectedData: DetectedData): Promise<void> {
    let processedCount = 0;
    const totalHistory = detectedData.historyFiles.length;

    for (const historyFile of detectedData.historyFiles) {
      try {
        // Read history file
        const historyContent = await readFile(historyFile.path!, 'utf8');
        const historyEntries = JSON.parse(historyContent);

        // Migrate history entries
        const migratedEntries: HistoryEntry[] = [];
        for (const entry of historyEntries) {
          const migratedEntry = await this.migrateHistoryEntry(entry);
          migratedEntries.push(migratedEntry);
        }

        // Write migrated history file
        const backupPath = historyFile.path + `.backup-${Date.now()}`;
        await writeFile(backupPath, historyContent); // Backup original
        await writeFile(historyFile.path!, JSON.stringify(migratedEntries, null, 2));

        processedCount++;
        step.itemsProcessed = processedCount;
        step.progress = (processedCount / totalHistory) * 100;

      } catch (error) {
        console.error(`Failed to migrate history file ${historyFile.path}:`, error);
        if (!options.continueOnError) {
          throw new MigrationError(
            `History migration failed: ${error}`,
            'HISTORY_MIGRATION_FAILED',
            DataCategory.HISTORY,
            true,
            error
          );
        }
      }
    }
  }

  /**
   * Update config format with any necessary migrations
   */
  private async updateConfigFormat(config: AppConfig): Promise<AppConfig> {
    const updatedConfig = { ...config };

    // Example: Add version field if missing
    if (!updatedConfig.version) {
      updatedConfig.version = '1.0';
    }

    // Example: Ensure all sites have required fields
    if (updatedConfig.sites) {
      for (const [url, siteConfig] of Object.entries(updatedConfig.sites)) {
        if (!siteConfig.authMethod) {
          siteConfig.authMethod = 'token'; // Default to token auth
        }
        if (!siteConfig.lastUsed) {
          siteConfig.lastUsed = new Date().toISOString();
        }
        if (!siteConfig.scope && siteConfig.authMethod === 'cookie') {
          siteConfig.scope = 'admin'; // Default scope for cookie auth
        }
      }
    }

    return updatedConfig;
  }

  /**
   * Validate config structure
   */
  private async validateConfigStructure(config: AppConfig): Promise<void> {
    if (!config.sites || typeof config.sites !== 'object') {
      throw new MigrationError('Invalid config structure: missing sites object', 'INVALID_CONFIG', DataCategory.CONFIG, false);
    }

    for (const [url, siteConfig] of Object.entries(config.sites)) {
      if (!siteConfig.name || !siteConfig.url) {
        throw new MigrationError(`Invalid site config for ${url}: missing required fields`, 'INVALID_SITE_CONFIG', DataCategory.CONFIG, false);
      }
    }
  }

  /**
   * Migrate individual log entry
   */
  private async migrateLogEntry(entry: any): Promise<LogEntry> {
    return {
      timestamp: entry.timestamp || new Date().toISOString(),
      method: entry.method || 'GET',
      endpoint: entry.endpoint || entry.url || '',
      statusCode: entry.statusCode || entry.status || 200,
      responseTime: entry.responseTime || 0,
      requestData: entry.requestData || null,
      responseData: entry.responseData || null,
      error: entry.error || null,
      siteUrl: entry.siteUrl || 'unknown'
    };
  }

  /**
   * Migrate individual history entry
   */
  private async migrateHistoryEntry(entry: any): Promise<HistoryEntry> {
    return {
      id: entry.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      siteUrl: entry.siteUrl || 'unknown',
      workflowType: entry.workflowType || 'unknown',
      startTime: entry.startTime || new Date().toISOString(),
      endTime: entry.endTime || null,
      status: entry.status || 'unknown',
      steps: entry.steps || [],
      totalSteps: entry.totalSteps || 0,
      completedSteps: entry.completedSteps || 0,
      context: entry.context || {}
    };
  }
}

export class JsonToDatabaseMigrationStrategy {
  constructor(
    private sourceStorage: UnifiedStorage,
    private targetStorage: UnifiedStorage,
    private dataDir: string
  ) {}

  /**
   * Migrate config to database
   */
  async migrateConfig(step: MigrationStep, options: MigrationOptions): Promise<void> {
    try {
      // Load config from source storage
      const configResult = await this.sourceStorage.loadConfig();
      if (!configResult.success || !configResult.data) {
        throw new MigrationError('Failed to load source config', 'SOURCE_CONFIG_LOAD_FAILED', DataCategory.CONFIG, false);
      }

      // Save config to target storage (database)
      const saveResult = await this.targetStorage.saveConfig(configResult.data);
      if (!saveResult.success) {
        throw new MigrationError('Failed to save config to database', 'TARGET_CONFIG_SAVE_FAILED', DataCategory.CONFIG, false);
      }

      step.itemsProcessed = 1;
      step.progress = 100;

    } catch (error) {
      throw new MigrationError(
        `Database config migration failed: ${error}`,
        'DB_CONFIG_MIGRATION_FAILED',
        DataCategory.CONFIG,
        false,
        error
      );
    }
  }

  /**
   * Migrate logs to database
   */
  async migrateLogs(step: MigrationStep, options: MigrationOptions, detectedData: DetectedData): Promise<void> {
    if (!this.targetStorage.logs) {
      throw new MigrationError('Target storage does not support logs', 'LOGS_NOT_SUPPORTED', DataCategory.LOGS, false);
    }

    let processedCount = 0;
    const totalLogs = detectedData.logFiles.length;

    for (const logFile of detectedData.logFiles) {
      try {
        // Read and parse log file
        const logContent = await readFile(logFile.path!, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());

        // Process each log entry
        for (const line of logLines) {
          try {
            const entry = JSON.parse(line);
            
            // Add log entry to database
            await this.targetStorage.logs.addLogEntry({
              siteUrl: entry.siteUrl || logFile.siteUrl || 'unknown',
              method: entry.method,
              endpoint: entry.endpoint,
              statusCode: entry.statusCode,
              requestData: entry.requestData,
              responseData: entry.responseData,
              error: entry.error
            });

          } catch (parseError) {
            console.warn(`Skipping invalid log line: ${line}`);
          }
        }

        processedCount++;
        step.itemsProcessed = processedCount;
        step.progress = (processedCount / totalLogs) * 100;

      } catch (error) {
        console.error(`Failed to migrate log file ${logFile.path}:`, error);
        if (!options.continueOnError) {
          throw new MigrationError(
            `Database log migration failed: ${error}`,
            'DB_LOG_MIGRATION_FAILED',
            DataCategory.LOGS,
            true,
            error
          );
        }
      }
    }
  }

  /**
   * Migrate history to database
   */
  async migrateHistory(step: MigrationStep, options: MigrationOptions, detectedData: DetectedData): Promise<void> {
    if (!this.targetStorage.history) {
      throw new MigrationError('Target storage does not support history', 'HISTORY_NOT_SUPPORTED', DataCategory.HISTORY, false);
    }

    let processedCount = 0;
    const totalHistory = detectedData.historyFiles.length;

    for (const historyFile of detectedData.historyFiles) {
      try {
        // Read and parse history file
        const historyContent = await readFile(historyFile.path!, 'utf8');
        const historyEntries = JSON.parse(historyContent);

        // Process each history entry
        for (const entry of historyEntries) {
          // Create history entry in database
          await this.targetStorage.history.createHistoryEntry({
            siteUrl: entry.siteUrl || historyFile.siteUrl || 'unknown',
            workflowType: entry.workflowType,
            status: entry.status,
            startTime: entry.startTime,
            endTime: entry.endTime,
            steps: entry.steps
          });
        }

        processedCount++;
        step.itemsProcessed = processedCount;
        step.progress = (processedCount / totalHistory) * 100;

      } catch (error) {
        console.error(`Failed to migrate history file ${historyFile.path}:`, error);
        if (!options.continueOnError) {
          throw new MigrationError(
            `Database history migration failed: ${error}`,
            'DB_HISTORY_MIGRATION_FAILED',
            DataCategory.HISTORY,
            true,
            error
          );
        }
      }
    }
  }

  /**
   * Migrate snapshots to database
   */
  async migrateSnapshots(step: MigrationStep, options: MigrationOptions, detectedData: DetectedData): Promise<void> {
    if (!this.targetStorage.snapshots) {
      throw new MigrationError('Target storage does not support snapshots', 'SNAPSHOTS_NOT_SUPPORTED', DataCategory.SNAPSHOTS, false);
    }

    let processedCount = 0;
    const totalSnapshots = detectedData.snapshotDirectories.length;

    for (const snapshotDir of detectedData.snapshotDirectories) {
      try {
        // Read snapshot metadata
        const metadataPath = path.join(snapshotDir.path!, 'metadata.json');
        const metadataContent = await readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);

        // Read snapshot files
        const composerJsonPath = path.join(snapshotDir.path!, 'composer.json');
        const composerLockPath = path.join(snapshotDir.path!, 'composer.lock');
        
        let composerJson = '';
        let composerLock = '';
        
        if (fs.existsSync(composerJsonPath)) {
          composerJson = await readFile(composerJsonPath, 'utf8');
        }
        
        if (fs.existsSync(composerLockPath)) {
          composerLock = await readFile(composerLockPath, 'utf8');
        }

        // Create snapshot in database
        await this.targetStorage.snapshots.createSnapshot({
          siteUrl: metadata.siteUrl || snapshotDir.siteUrl || 'unknown',
          composerJson,
          composerLock,
          workflowId: metadata.workflowId,
          stepId: metadata.stepId
        });

        processedCount++;
        step.itemsProcessed = processedCount;
        step.progress = (processedCount / totalSnapshots) * 100;

      } catch (error) {
        console.error(`Failed to migrate snapshot ${snapshotDir.path}:`, error);
        if (!options.continueOnError) {
          throw new MigrationError(
            `Database snapshot migration failed: ${error}`,
            'DB_SNAPSHOT_MIGRATION_FAILED',
            DataCategory.SNAPSHOTS,
            true,
            error
          );
        }
      }
    }
  }
}

export class JsonToBrowserMigrationStrategy {
  constructor(
    private sourceStorage: UnifiedStorage,
    private targetStorage: UnifiedStorage,
    private dataDir: string
  ) {}

  /**
   * Migrate config to browser storage (config only - browser doesn't support logs/history/snapshots)
   */
  async migrateConfig(step: MigrationStep, options: MigrationOptions): Promise<void> {
    try {
      // Load config from source storage
      const configResult = await this.sourceStorage.loadConfig();
      if (!configResult.success || !configResult.data) {
        throw new MigrationError('Failed to load source config', 'SOURCE_CONFIG_LOAD_FAILED', DataCategory.CONFIG, false);
      }

      // Filter out unsupported data for browser storage
      const browserConfig = this.filterConfigForBrowser(configResult.data);

      // Save config to target storage (browser)
      const saveResult = await this.targetStorage.saveConfig(browserConfig);
      if (!saveResult.success) {
        throw new MigrationError('Failed to save config to browser', 'TARGET_CONFIG_SAVE_FAILED', DataCategory.CONFIG, false);
      }

      step.itemsProcessed = 1;
      step.progress = 100;

    } catch (error) {
      throw new MigrationError(
        `Browser config migration failed: ${error}`,
        'BROWSER_CONFIG_MIGRATION_FAILED',
        DataCategory.CONFIG,
        false,
        error
      );
    }
  }

  /**
   * Filter config for browser storage (remove large/unsupported data)
   */
  private filterConfigForBrowser(config: AppConfig): AppConfig {
    const filteredConfig = { ...config };

    // Remove any large data that shouldn't be in browser storage
    if (filteredConfig.sites) {
      for (const [url, siteConfig] of Object.entries(filteredConfig.sites)) {
        // Remove potentially large fields
        const filteredSiteConfig = { ...siteConfig };
        delete (filteredSiteConfig as any).logs;
        delete (filteredSiteConfig as any).history;
        delete (filteredSiteConfig as any).snapshots;
        filteredConfig.sites[url] = filteredSiteConfig;
      }
    }

    return filteredConfig;
  }
}

export class DatabaseToJsonMigrationStrategy {
  constructor(
    private sourceStorage: UnifiedStorage,
    private targetStorage: UnifiedStorage,
    private dataDir: string
  ) {}

  /**
   * Export config from database to JSON
   */
  async migrateConfig(step: MigrationStep, options: MigrationOptions): Promise<void> {
    try {
      // Load config from database
      const configResult = await this.sourceStorage.loadConfig();
      if (!configResult.success || !configResult.data) {
        throw new MigrationError('Failed to load database config', 'DB_CONFIG_LOAD_FAILED', DataCategory.CONFIG, false);
      }

      // Save config to JSON file
      const configPath = path.join(this.dataDir, 'config.json');
      await writeFile(configPath, JSON.stringify(configResult.data, null, 2));

      step.itemsProcessed = 1;
      step.progress = 100;

    } catch (error) {
      throw new MigrationError(
        `Database to JSON config migration failed: ${error}`,
        'DB_TO_JSON_CONFIG_MIGRATION_FAILED',
        DataCategory.CONFIG,
        false,
        error
      );
    }
  }

  /**
   * Export logs from database to JSON files
   */
  async migrateLogs(step: MigrationStep, options: MigrationOptions, detectedData: DetectedData): Promise<void> {
    if (!this.sourceStorage.logs) {
      throw new MigrationError('Source storage does not support logs', 'LOGS_NOT_SUPPORTED', DataCategory.LOGS, false);
    }

    let processedCount = 0;
    const siteUrls = detectedData.siteUrls;

    for (const siteUrl of siteUrls) {
      try {
        // Get logs from database
        const logsResult = await this.sourceStorage.logs.getLogs(siteUrl);
        if (!logsResult.success || !logsResult.data) {
          console.warn(`No logs found for site ${siteUrl}`);
          continue;
        }

        // Write logs to file
        const logFilePath = path.join(this.dataDir, `${this.sanitizeFilename(siteUrl)}.log`);
        const logContent = logsResult.data.map(entry => JSON.stringify(entry)).join('\n');
        await writeFile(logFilePath, logContent);

        processedCount++;
        step.itemsProcessed = processedCount;
        step.progress = (processedCount / siteUrls.length) * 100;

      } catch (error) {
        console.error(`Failed to export logs for site ${siteUrl}:`, error);
        if (!options.continueOnError) {
          throw new MigrationError(
            `Database logs export failed: ${error}`,
            'DB_LOGS_EXPORT_FAILED',
            DataCategory.LOGS,
            true,
            error
          );
        }
      }
    }
  }

  /**
   * Export history from database to JSON files
   */
  async migrateHistory(step: MigrationStep, options: MigrationOptions, detectedData: DetectedData): Promise<void> {
    if (!this.sourceStorage.history) {
      throw new MigrationError('Source storage does not support history', 'HISTORY_NOT_SUPPORTED', DataCategory.HISTORY, false);
    }

    let processedCount = 0;
    const siteUrls = detectedData.siteUrls;

    for (const siteUrl of siteUrls) {
      try {
        // Get history from database
        const historyResult = await this.sourceStorage.history.getHistory(siteUrl);
        if (!historyResult.success || !historyResult.data) {
          console.warn(`No history found for site ${siteUrl}`);
          continue;
        }

        // Write history to file
        const historyFilePath = path.join(this.dataDir, `${this.sanitizeFilename(siteUrl)}.history.json`);
        await writeFile(historyFilePath, JSON.stringify(historyResult.data, null, 2));

        processedCount++;
        step.itemsProcessed = processedCount;
        step.progress = (processedCount / siteUrls.length) * 100;

      } catch (error) {
        console.error(`Failed to export history for site ${siteUrl}:`, error);
        if (!options.continueOnError) {
          throw new MigrationError(
            `Database history export failed: ${error}`,
            'DB_HISTORY_EXPORT_FAILED',
            DataCategory.HISTORY,
            true,
            error
          );
        }
      }
    }
  }

  /**
   * Export snapshots from database to directories
   */
  async migrateSnapshots(step: MigrationStep, options: MigrationOptions, detectedData: DetectedData): Promise<void> {
    if (!this.sourceStorage.snapshots) {
      throw new MigrationError('Source storage does not support snapshots', 'SNAPSHOTS_NOT_SUPPORTED', DataCategory.SNAPSHOTS, false);
    }

    const snapshotsDir = path.join(this.dataDir, 'snapshots');
    await mkdir(snapshotsDir, { recursive: true });

    let processedCount = 0;
    const siteUrls = detectedData.siteUrls;

    for (const siteUrl of siteUrls) {
      try {
        // Get snapshots from database
        const snapshotsResult = await this.sourceStorage.snapshots.getSnapshots(siteUrl);
        if (!snapshotsResult.success || !snapshotsResult.data) {
          console.warn(`No snapshots found for site ${siteUrl}`);
          continue;
        }

        // Process each snapshot
        for (const snapshot of snapshotsResult.data) {
          const snapshotDirName = `${this.sanitizeFilename(siteUrl)}-${snapshot.createdAt?.replace(/[:.]/g, '-')}`;
          const snapshotDir = path.join(snapshotsDir, snapshotDirName);
          await mkdir(snapshotDir, { recursive: true });

          // Write metadata
          const metadataPath = path.join(snapshotDir, 'metadata.json');
          await writeFile(metadataPath, JSON.stringify(snapshot, null, 2));

          // Get and write composer.json
          const composerJsonResult = await this.sourceStorage.snapshots.getSnapshotFile(snapshot.id, 'composer.json');
          if (composerJsonResult.success && composerJsonResult.data) {
            const composerJsonPath = path.join(snapshotDir, 'composer.json');
            await writeFile(composerJsonPath, composerJsonResult.data.content);
          }

          // Get and write composer.lock
          const composerLockResult = await this.sourceStorage.snapshots.getSnapshotFile(snapshot.id, 'composer.lock');
          if (composerLockResult.success && composerLockResult.data) {
            const composerLockPath = path.join(snapshotDir, 'composer.lock');
            await writeFile(composerLockPath, composerLockResult.data.content);
          }
        }

        processedCount++;
        step.itemsProcessed = processedCount;
        step.progress = (processedCount / siteUrls.length) * 100;

      } catch (error) {
        console.error(`Failed to export snapshots for site ${siteUrl}:`, error);
        if (!options.continueOnError) {
          throw new MigrationError(
            `Database snapshots export failed: ${error}`,
            'DB_SNAPSHOTS_EXPORT_FAILED',
            DataCategory.SNAPSHOTS,
            true,
            error
          );
        }
      }
    }
  }

  /**
   * Sanitize filename for filesystem use
   */
  private sanitizeFilename(input: string): string {
    return input.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
}

export class BrowserToJsonMigrationStrategy {
  constructor(
    private sourceStorage: UnifiedStorage,
    private targetStorage: UnifiedStorage,
    private dataDir: string
  ) {}

  /**
   * Export config from browser to JSON file
   */
  async migrateConfig(step: MigrationStep, options: MigrationOptions): Promise<void> {
    try {
      // Load config from browser storage
      const configResult = await this.sourceStorage.loadConfig();
      if (!configResult.success || !configResult.data) {
        throw new MigrationError('Failed to load browser config', 'BROWSER_CONFIG_LOAD_FAILED', DataCategory.CONFIG, false);
      }

      // Save config to JSON file
      const configPath = path.join(this.dataDir, 'config.json');
      await writeFile(configPath, JSON.stringify(configResult.data, null, 2));

      step.itemsProcessed = 1;
      step.progress = 100;

    } catch (error) {
      throw new MigrationError(
        `Browser to JSON config migration failed: ${error}`,
        'BROWSER_TO_JSON_CONFIG_MIGRATION_FAILED',
        DataCategory.CONFIG,
        false,
        error
      );
    }
  }
}

/**
 * Factory function to create appropriate migration strategy
 */
export function createMigrationStrategy(
  fromType: StorageType,
  toType: StorageType,
  sourceStorage: UnifiedStorage,
  targetStorage: UnifiedStorage,
  dataDir: string
): {
  migrateConfig?: (step: MigrationStep, options: MigrationOptions) => Promise<void>;
  migrateLogs?: (step: MigrationStep, options: MigrationOptions, detectedData: DetectedData) => Promise<void>;
  migrateHistory?: (step: MigrationStep, options: MigrationOptions, detectedData: DetectedData) => Promise<void>;
  migrateSnapshots?: (step: MigrationStep, options: MigrationOptions, detectedData: DetectedData) => Promise<void>;
} {
  if (fromType === StorageType.JSON_FILE && toType === StorageType.JSON_FILE) {
    return new JsonToJsonMigrationStrategy(sourceStorage, targetStorage, dataDir);
  } else if (fromType === StorageType.JSON_FILE && toType === StorageType.DATABASE) {
    return new JsonToDatabaseMigrationStrategy(sourceStorage, targetStorage, dataDir);
  } else if (fromType === StorageType.JSON_FILE && toType === StorageType.BROWSER) {
    return new JsonToBrowserMigrationStrategy(sourceStorage, targetStorage, dataDir);
  } else if (fromType === StorageType.DATABASE && toType === StorageType.JSON_FILE) {
    return new DatabaseToJsonMigrationStrategy(sourceStorage, targetStorage, dataDir);
  } else if (fromType === StorageType.BROWSER && toType === StorageType.JSON_FILE) {
    return new BrowserToJsonMigrationStrategy(sourceStorage, targetStorage, dataDir);
  }

  throw new MigrationError(
    `Unsupported migration combination: ${fromType} -> ${toType}`,
    'UNSUPPORTED_MIGRATION',
    DataCategory.CONFIG,
    false
  );
}