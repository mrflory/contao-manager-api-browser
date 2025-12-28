import React from 'react';
import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { BackupApiService, TaskApiService } from '../../services/apiCallService';
import { api } from '../../utils/api';

/**
 * Timeline item for creating a database backup with polling
 */
export class CreateDatabaseBackupTimelineItem extends BaseTimelineItem {
  private pollingInterval?: NodeJS.Timeout;
  private isCancelled = false;

  constructor() {
    super(
      'create-database-backup',
      'Create Database Backup',
      'Create a backup of the database'
    );
  }

  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();

    try {
      const siteUrl = this.getSiteUrl();

      // Start the database backup task
      await BackupApiService.createDatabaseBackup(siteUrl);

      // Start polling for completion
      return this.startPolling();
    } catch (error) {
      return this.setEnhancedError({
        category: 'database',
        summary: 'Failed to start database backup',
        message: error instanceof Error ? error.message : 'Failed to start database backup',
        operationType: 'backup'
      });
    }
  }

  private startPolling(): Promise<TimelineResult> {
    const siteUrl = this.getSiteUrl();

    return new Promise((resolve) => {
      const pollTask = async () => {
        if (this.isCancelled) {
          this.stopPolling();
          resolve(this.setCancelled());
          return;
        }

        try {
          const taskData = await TaskApiService.getTaskData(siteUrl);

          // If no task data, the task was deleted or doesn't exist
          if (!taskData || Object.keys(taskData).length === 0) {
            this.stopPolling();
            resolve(this.setEnhancedError({
              category: 'database',
              summary: 'Database backup task not found',
              message: 'Database backup task was not found or was deleted unexpectedly',
              operationType: 'backup'
            }));
            return;
          }

          // Check if task completed successfully
          if (taskData.status === 'complete') {
            this.stopPolling();

            // Delete the completed task
            try {
              await TaskApiService.deleteTaskData(siteUrl);
            } catch (error) {
              console.warn('Failed to delete completed task:', error);
            }

            // Get the latest backup filename
            const backups = await api.getDatabaseBackups(siteUrl);
            const latestBackup = backups?.[0]?.name;

            if (!latestBackup) {
              resolve(this.setEnhancedError({
                category: 'database',
                summary: 'Backup completed but file not found',
                message: 'Database backup task completed but no backup file was created',
                operationType: 'backup'
              }));
              return;
            }

            // Store backup filename for later use
            this.data = {
              databaseBackup: latestBackup
            };

            resolve(this.setComplete({
              databaseBackup: latestBackup
            }));
            return;
          }

          // Check for errors
          if (taskData.status === 'error') {
            this.stopPolling();
            resolve(this.setEnhancedError({
              category: 'database',
              summary: 'Database backup failed',
              message: taskData.console || 'Database backup task failed',
              consoleOutput: taskData.console,
              operationType: 'backup'
            }));
          }

          // Task still running, continue polling
        } catch (error) {
          this.stopPolling();
          resolve(this.setEnhancedError({
            category: 'database',
            summary: 'Error polling backup status',
            message: error instanceof Error ? error.message : 'Failed to check backup status',
            operationType: 'backup'
          }));
        }
      };

      // Start immediate poll
      pollTask();

      // Then poll every 2 seconds
      this.pollingInterval = setInterval(pollTask, 2000);

      // Set timeout for 10 minutes
      setTimeout(() => {
        if (this.pollingInterval) {
          this.stopPolling();
          resolve(this.setEnhancedError({
            category: 'database',
            summary: 'Database backup timeout',
            message: 'Database backup operation timed out after 10 minutes',
            operationType: 'backup'
          }));
        }
      }, 10 * 60 * 1000);
    });
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  protected getSiteUrl(): string {
    const activeSite = this.context?.get('activeSite');
    if (!activeSite?.url) {
      throw new Error('No active site configured in workflow context');
    }
    return activeSite.url;
  }

  async onCancel(): Promise<void> {
    this.isCancelled = true;
    this.stopPolling();

    // Try to abort the running task
    try {
      const siteUrl = this.getSiteUrl();
      await TaskApiService.patchTaskStatus(siteUrl, 'aborting');
    } catch (error) {
      console.warn('Could not abort database backup task:', error);
    }

    await super.onCancel();
  }

  customContent(): React.ReactElement | null {
    return null;
  }
}
