import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';

/**
 * Timeline item for restoring database from backup file
 */
export class RestoreDatabaseTimelineItem extends BaseTimelineItem {
  private pollingInterval?: NodeJS.Timeout;
  private isCancelled = false;
  private backupFilename: string;

  constructor(backupFilename: string) {
    super(
      'restore-database',
      'Restore Database',
      'Restore database from backup file'
    );
    this.backupFilename = backupFilename;
  }

  canSkip(): boolean {
    return false; // Cannot skip database restore if user requested it
  }

  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();

    try {
      const siteUrl = this.getSiteUrl();

      // Emit progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, {
          status: 'active',
          message: `Starting database restoration from ${this.backupFilename}...`,
          type: 'restore_database_start'
        });
      }

      // Start database restoration (createBackup: false to skip creating a backup before restore)
      await api.restoreDatabaseBackup(siteUrl, this.backupFilename, false);

      // Start polling for task completion
      return this.startPolling();

    } catch (error) {
      return this.setEnhancedError({
        category: 'database',
        summary: 'Failed to start database restoration',
        message: error instanceof Error ? error.message : 'Failed to start database restoration',
        details: `Could not restore database from backup file: ${this.backupFilename}`,
        operationType: 'restore'
      });
    }
  }

  private startPolling(): Promise<TimelineResult> {
    return new Promise((resolve) => {
      const pollTask = async () => {
        // Check if workflow was cancelled
        if (this.isCancelled) {
          this.stopPolling();
          resolve(this.setCancelled());
          return;
        }

        try {
          const siteUrl = this.getSiteUrl();
          const taskData = await api.getTaskData(siteUrl);

          // Emit progress updates
          if (this.context?.engine) {
            this.context.engine.emitProgress(this, taskData);
          }

          // If no task data, the task was deleted or doesn't exist
          if (!taskData || Object.keys(taskData).length === 0) {
            this.stopPolling();
            resolve(this.setEnhancedError({
              category: 'database',
              summary: 'Database restoration task not found',
              message: 'Database restoration task was not found or was deleted unexpectedly',
              operationType: 'restore'
            }));
            return;
          }

          // Check if task completed successfully
          if (taskData.status === 'complete') {
            this.stopPolling();

            // Delete the completed task
            try {
              await api.deleteTaskData(siteUrl);
            } catch (error) {
              console.warn('Failed to delete completed task:', error);
            }

            // Fetch new database backup info after restoration
            let newBackupFilename: string | null = null;
            try {
              const backups = await api.getDatabaseBackups(siteUrl);
              if (backups && backups.length > 0) {
                const sorted = backups.sort((a: any, b: any) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                newBackupFilename = sorted[0].name;
              }
            } catch (backupError) {
              console.warn('Could not fetch database backup info after restoration:', backupError);
            }

            if (this.context?.engine) {
              this.context.engine.emitProgress(this, {
                status: 'complete',
                message: 'Database restored successfully',
                type: 'restore_database_complete'
              });
            }

            resolve(this.setComplete({
              restoredFrom: this.backupFilename,
              databaseBackup: newBackupFilename
            }));
            return;
          }

          // Check for errors
          if (taskData.status === 'error') {
            this.stopPolling();
            resolve(this.setEnhancedError({
              category: 'database',
              summary: 'Database restoration failed',
              message: 'The database restoration task encountered an error',
              details: taskData.message || 'Unknown error during database restoration',
              consoleOutput: taskData.console || taskData.output,
              operationType: 'restore'
            }));
            return;
          }

          // Continue polling if task is still active
        } catch (error) {
          console.error('Error polling database restoration status:', error);
          // Don't resolve yet, keep polling unless it's a critical error
        }
      };

      // Start polling immediately, then every 2 seconds
      pollTask();
      this.pollingInterval = setInterval(pollTask, 2000);

      // Set timeout for 10 minutes (database operations are typically faster than composer)
      setTimeout(() => {
        if (this.pollingInterval) {
          this.stopPolling();
          resolve(this.setEnhancedError({
            category: 'database',
            summary: 'Database restoration timeout',
            message: 'Database restoration took too long (10 minutes)',
            details: `The restoration of ${this.backupFilename} did not complete within the expected timeframe`,
            operationType: 'restore'
          }));
        }
      }, 10 * 60 * 1000); // 10 minutes
    });
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  async onCancel(): Promise<void> {
    this.isCancelled = true;
    this.stopPolling();

    // Try to abort the active task
    try {
      const siteUrl = this.getSiteUrl();
      await api.patchTaskStatus(siteUrl, 'aborting');
    } catch (error) {
      console.warn('Could not abort database restoration task:', error);
    }

    await super.onCancel();
  }
}
