import { TimelineItem } from '../engine/types';
import { CreateSnapshotTimelineItem } from '../items/CreateSnapshotTimelineItem';
import { CreateDatabaseBackupTimelineItem } from '../items/CreateDatabaseBackupTimelineItem';

export interface WorkflowConfig {
  siteUrl: string;
}

export interface BackupWorkflowConfig extends WorkflowConfig {
  // Currently no additional config needed for backup
  // Both composer files and database backup are always created
}

export function createBackupWorkflow(_config?: BackupWorkflowConfig): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Step 1: Create composer snapshot
  items.push(new CreateSnapshotTimelineItem());

  // Step 2: Create database backup
  items.push(new CreateDatabaseBackupTimelineItem());

  return items;
}

export function getDefaultBackupConfig(): BackupWorkflowConfig {
  return {
    siteUrl: ''
  };
}
