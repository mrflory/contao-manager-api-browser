import { TimelineItem, WorkflowConfig } from '../engine/types';
import {
  CreateSafetySnapshotTimelineItem,
  CreateSafetyDatabaseBackupTimelineItem,
  RestoreComposerFilesTimelineItem,
  RestoreDatabaseTimelineItem,
  ComposerInstallTimelineItem
} from '../items';

/**
 * Configuration for restore workflow
 */
export interface RestoreWorkflowConfig extends WorkflowConfig {
  /** Whether to restore composer files */
  restoreComposer: boolean;
  /** Whether to restore database */
  restoreDatabase: boolean;
  /** Snapshot ID for composer file restoration */
  snapshotId?: string;
  /** Database backup filename for restoration */
  databaseBackupFilename?: string;
}

/**
 * Factory function to create the restore workflow timeline
 */
export function createRestoreWorkflow(config: RestoreWorkflowConfig): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Step 1: Create safety backup of current composer files (if we're restoring composer files)
  if (config.restoreComposer && config.snapshotId) {
    items.push(new CreateSafetySnapshotTimelineItem());
  }

  // Step 2: Create safety backup of current database (if we're restoring database)
  if (config.restoreDatabase && config.databaseBackupFilename) {
    items.push(new CreateSafetyDatabaseBackupTimelineItem());
  }

  // Step 3: Restore composer files (if requested and snapshot available)
  if (config.restoreComposer && config.snapshotId) {
    items.push(new RestoreComposerFilesTimelineItem(config.snapshotId));
  }

  // Step 4: Restore database (if requested and backup available)
  if (config.restoreDatabase && config.databaseBackupFilename) {
    items.push(new RestoreDatabaseTimelineItem(config.databaseBackupFilename));
  }

  // Step 5: Run composer install (only if composer files were restored)
  if (config.restoreComposer && config.snapshotId) {
    items.push(new ComposerInstallTimelineItem());
  }

  return items;
}

/**
 * Get default restore workflow configuration
 */
export function getDefaultRestoreConfig(): RestoreWorkflowConfig {
  return {
    performDryRun: false, // Inherited from WorkflowConfig, not used in restore
    restoreComposer: true,
    restoreDatabase: true
  };
}
