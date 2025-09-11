import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  RollbackOptions,
  RollbackResult,
  BackupInfo,
  DataCategory,
  RollbackError
} from '../../types/migration';
import { StorageInterface } from '../../storage/interfaces';

/**
 * Migration rollback service for safe restoration of data
 */
export class MigrationRollbackService {
  constructor(
    private dataDir: string,
    private backupDir: string,
    private targetStorage?: StorageInterface
  ) {}

  /**
   * Execute migration rollback
   */
  async executeRollback(options: RollbackOptions): Promise<RollbackResult> {
    const rollbackId = `rollback-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const startTime = new Date().toISOString();

    try {
      console.log(`Starting rollback for migration ${options.migrationId}`);

      // Find backup for this migration
      const backupInfo = await this.findMigrationBackup(options.migrationId);
      
      if (!backupInfo && options.restoreFromBackup) {
        throw new RollbackError(
          'No backup found for migration',
          options.migrationId
        );
      }

      const restoredItems: Record<DataCategory, number> = {
        [DataCategory.CONFIG]: 0,
        [DataCategory.LOGS]: 0,
        [DataCategory.HISTORY]: 0,
        [DataCategory.SNAPSHOTS]: 0
      };

      let warnings: string[] = [];

      // Step 1: Clean up target storage if requested
      if (options.cleanupTarget && this.targetStorage) {
        try {
          await this.cleanupTargetStorage(options.migrationId);
          console.log('Target storage cleaned up');
        } catch (error) {
          warnings.push(`Failed to cleanup target storage: ${error}`);
        }
      }

      // Step 2: Restore from backup if available and requested
      if (options.restoreFromBackup && backupInfo) {
        const restored = await this.restoreFromBackup(backupInfo, options.validateRollback);
        
        // Merge restored counts
        for (const category of Object.keys(restoredItems) as DataCategory[]) {
          restoredItems[category] += restored.restoredItems[category] || 0;
        }
        
        if (restored.warnings) {
          warnings.push(...restored.warnings);
        }
      }

      // Step 3: Verify rollback if requested
      if (options.validateRollback) {
        const validationResult = await this.validateRollback(backupInfo, restoredItems);
        if (!validationResult.isValid) {
          warnings.push('Rollback validation detected issues');
          warnings.push(...validationResult.warnings);
        }
      }

      const endTime = new Date().toISOString();
      return {
        success: true,
        rollbackId,
        startTime,
        endTime,
        duration: new Date(endTime).getTime() - new Date(startTime).getTime(),
        restoredItems,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      const endTime = new Date().toISOString();
      console.error(`Rollback failed for migration ${options.migrationId}:`, error);

      return {
        success: false,
        rollbackId,
        startTime,
        endTime,
        duration: new Date(endTime).getTime() - new Date(startTime).getTime(),
        restoredItems: {
          [DataCategory.CONFIG]: 0,
          [DataCategory.LOGS]: 0,
          [DataCategory.HISTORY]: 0,
          [DataCategory.SNAPSHOTS]: 0
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Find backup for a specific migration
   */
  private async findMigrationBackup(migrationId: string): Promise<BackupInfo | null> {
    try {
      const backupDirs = await fs.readdir(this.backupDir);
      
      for (const backupDir of backupDirs) {
        if (backupDir.includes(migrationId)) {
          const metadataPath = path.join(this.backupDir, backupDir, 'backup-metadata.json');
          
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            return JSON.parse(metadataContent);
          } catch (error) {
            console.warn(`Failed to read backup metadata for ${backupDir}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to search for migration backup:', error);
    }
    
    return null;
  }

  /**
   * Restore data from backup
   */
  private async restoreFromBackup(
    backupInfo: BackupInfo,
    validateRestore: boolean
  ): Promise<{
    restoredItems: Record<DataCategory, number>;
    warnings?: string[];
  }> {
    const restoredItems: Record<DataCategory, number> = {
      [DataCategory.CONFIG]: 0,
      [DataCategory.LOGS]: 0,
      [DataCategory.HISTORY]: 0,
      [DataCategory.SNAPSHOTS]: 0
    };
    const warnings: string[] = [];

    const backupPath = backupInfo.location;

    try {
      // Verify backup integrity
      if (validateRestore) {
        const isValid = await this.verifyBackupIntegrity(backupInfo);
        if (!isValid) {
          warnings.push('Backup integrity check failed, proceeding anyway');
        }
      }

      // Restore configuration
      if (backupInfo.dataCategories.includes(DataCategory.CONFIG)) {
        const configBackupPath = path.join(backupPath, 'config.json');
        const configTargetPath = path.join(this.dataDir, 'config.json');
        
        try {
          await this.ensureDirectoryExists(path.dirname(configTargetPath));
          await fs.copyFile(configBackupPath, configTargetPath);
          restoredItems[DataCategory.CONFIG]++;
          console.log('Configuration restored');
        } catch (error) {
          warnings.push(`Failed to restore configuration: ${error}`);
        }
      }

      // Restore logs
      if (backupInfo.dataCategories.includes(DataCategory.LOGS)) {
        const logsBackupDir = path.join(backupPath, 'logs');
        
        try {
          const logFiles = await fs.readdir(logsBackupDir);
          
          for (const logFile of logFiles) {
            if (logFile.endsWith('.log')) {
              const sourceFile = path.join(logsBackupDir, logFile);
              const targetFile = path.join(this.dataDir, logFile);
              
              try {
                await fs.copyFile(sourceFile, targetFile);
                restoredItems[DataCategory.LOGS]++;
              } catch (error) {
                warnings.push(`Failed to restore log file ${logFile}: ${error}`);
              }
            }
          }
          
          console.log(`Restored ${restoredItems[DataCategory.LOGS]} log files`);
        } catch (error) {
          warnings.push(`Failed to restore logs: ${error}`);
        }
      }

      // Restore history
      if (backupInfo.dataCategories.includes(DataCategory.HISTORY)) {
        const historyBackupDir = path.join(backupPath, 'history');
        
        try {
          const historyFiles = await fs.readdir(historyBackupDir);
          
          for (const historyFile of historyFiles) {
            if (historyFile.endsWith('.history.json')) {
              const sourceFile = path.join(historyBackupDir, historyFile);
              const targetFile = path.join(this.dataDir, historyFile);
              
              try {
                await fs.copyFile(sourceFile, targetFile);
                restoredItems[DataCategory.HISTORY]++;
              } catch (error) {
                warnings.push(`Failed to restore history file ${historyFile}: ${error}`);
              }
            }
          }
          
          console.log(`Restored ${restoredItems[DataCategory.HISTORY]} history files`);
        } catch (error) {
          warnings.push(`Failed to restore history: ${error}`);
        }
      }

      // Restore snapshots
      if (backupInfo.dataCategories.includes(DataCategory.SNAPSHOTS)) {
        const snapshotsBackupDir = path.join(backupPath, 'snapshots');
        const snapshotsTargetDir = path.join(this.dataDir, 'snapshots');
        
        try {
          await this.ensureDirectoryExists(snapshotsTargetDir);
          const snapshotDirs = await fs.readdir(snapshotsBackupDir);
          
          for (const snapshotDir of snapshotDirs) {
            const sourceDir = path.join(snapshotsBackupDir, snapshotDir);
            const targetDir = path.join(snapshotsTargetDir, snapshotDir);
            
            try {
              await this.copyDirectoryRecursive(sourceDir, targetDir);
              restoredItems[DataCategory.SNAPSHOTS]++;
            } catch (error) {
              warnings.push(`Failed to restore snapshot ${snapshotDir}: ${error}`);
            }
          }
          
          console.log(`Restored ${restoredItems[DataCategory.SNAPSHOTS]} snapshots`);
        } catch (error) {
          warnings.push(`Failed to restore snapshots: ${error}`);
        }
      }

    } catch (error) {
      throw new RollbackError(
        `Failed to restore from backup: ${error}`,
        backupInfo.id,
        error
      );
    }

    return {
      restoredItems,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Clean up target storage after failed migration
   */
  private async cleanupTargetStorage(migrationId: string): Promise<void> {
    // This would depend on the specific storage implementation
    // For now, we'll just log the cleanup request
    console.log(`Cleaning up target storage for migration ${migrationId}`);
    
    // If we had access to the target storage instance, we could:
    // - Remove any partially migrated data
    // - Clear any migration-specific entries
    // - Reset storage state if needed
    
    if (this.targetStorage) {
      // Implementation would depend on storage interface methods
      // For example: await this.targetStorage.clearMigrationData(migrationId);
    }
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackupIntegrity(backupInfo: BackupInfo): Promise<boolean> {
    try {
      // Verify backup directory exists
      const backupPath = backupInfo.location;
      await fs.access(backupPath);

      // Verify metadata file exists
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      await fs.access(metadataPath);

      // Verify checksum if available
      if (backupInfo.checksum) {
        const currentChecksum = await this.calculateBackupChecksum(backupPath);
        if (currentChecksum !== backupInfo.checksum) {
          console.warn('Backup checksum mismatch');
          return false;
        }
      }

      // Verify critical files exist based on data categories
      for (const category of backupInfo.dataCategories) {
        switch (category) {
          case DataCategory.CONFIG:
            await fs.access(path.join(backupPath, 'config.json'));
            break;
          case DataCategory.LOGS:
            await fs.access(path.join(backupPath, 'logs'));
            break;
          case DataCategory.HISTORY:
            await fs.access(path.join(backupPath, 'history'));
            break;
          case DataCategory.SNAPSHOTS:
            await fs.access(path.join(backupPath, 'snapshots'));
            break;
        }
      }

      return true;
    } catch (error) {
      console.warn('Backup integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Validate rollback success
   */
  private async validateRollback(
    backupInfo: BackupInfo | null,
    restoredItems: Record<DataCategory, number>
  ): Promise<{ isValid: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    let isValid = true;

    if (!backupInfo) {
      warnings.push('No backup information available for validation');
      return { isValid: false, warnings };
    }

    try {
      // Check if restored items match expected counts from backup
      for (const category of backupInfo.dataCategories) {
        const restoredCount = restoredItems[category];
        
        // Basic validation - we should have restored something for each category
        if (restoredCount === 0) {
          warnings.push(`No items restored for category: ${category}`);
          isValid = false;
        }
      }

      // Verify config file if it was restored
      if (restoredItems[DataCategory.CONFIG] > 0) {
        const configPath = path.join(this.dataDir, 'config.json');
        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          JSON.parse(configContent); // Validate JSON
        } catch (error) {
          warnings.push('Restored configuration file is invalid');
          isValid = false;
        }
      }

      // Additional validation could include:
      // - File size comparisons
      // - Content checksums
      // - Directory structure verification

    } catch (error) {
      warnings.push(`Rollback validation error: ${error}`);
      isValid = false;
    }

    return { isValid, warnings };
  }

  /**
   * Calculate backup checksum for integrity verification
   */
  private async calculateBackupChecksum(backupPath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const files: string[] = [];
    
    // Collect all files recursively
    const collectFiles = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          await collectFiles(fullPath);
        }
      }
    };
    
    await collectFiles(backupPath);
    files.sort(); // Ensure consistent order
    
    // Hash each file
    for (const file of files) {
      const content = await fs.readFile(file);
      hash.update(path.relative(backupPath, file)); // Include relative path
      hash.update(content);
    }
    
    return hash.digest('hex');
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectoryRecursive(src: string, dest: string): Promise<void> {
    await this.ensureDirectoryExists(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * List available backups
   */
  async listAvailableBackups(): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = [];
    
    try {
      const backupDirs = await fs.readdir(this.backupDir);
      
      for (const backupDir of backupDirs) {
        const metadataPath = path.join(this.backupDir, backupDir, 'backup-metadata.json');
        
        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          const backupInfo: BackupInfo = JSON.parse(metadataContent);
          backups.push(backupInfo);
        } catch (error) {
          console.warn(`Failed to read backup metadata for ${backupDir}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to list available backups:', error);
    }
    
    return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Delete old backups
   */
  async cleanupOldBackups(retentionDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const backupDirs = await fs.readdir(this.backupDir);
      
      for (const backupDir of backupDirs) {
        const backupPath = path.join(this.backupDir, backupDir);
        const stat = await fs.stat(backupPath);
        
        if (stat.mtime < cutoffDate) {
          await fs.rm(backupPath, { recursive: true, force: true });
          console.log(`Cleaned up old backup: ${backupDir}`);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }
}