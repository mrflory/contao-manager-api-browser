import React from 'react';
import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { BackupApiService, TaskApiService } from '../../services/apiCallService';
import { api } from '../../utils/api';

/**
 * Timeline item for creating a safety database backup before restoration
 * Duplicates CreateDatabaseBackupTimelineItem logic with different title/description
 */
export class CreateSafetyDatabaseBackupTimelineItem extends BaseTimelineItem {
  private pollingInterval?: NodeJS.Timeout;
  private isCancelled = false;

  constructor() {
    super(
      'create-safety-database-backup',
      'Create Safety Backup (Database)',
      'Backup current database before restoration'
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
        summary: 'Failed to start safety backup',
        message: error instanceof Error ? error.message : 'Failed to start safety database backup',
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
              summary: 'Safety backup task not found',
              message: 'Safety database backup task was not found or was deleted unexpectedly',
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
                summary: 'Safety backup completed but file not found',
                message: 'Safety database backup task completed but no backup file was created',
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
              summary: 'Safety database backup failed',
              message: taskData.console || 'Safety database backup task failed',
              consoleOutput: taskData.console,
              operationType: 'backup'
            }));
          }

          // Task still running, continue polling
        } catch (error) {
          this.stopPolling();
          resolve(this.setEnhancedError({
            category: 'database',
            summary: 'Error polling safety backup status',
            message: error instanceof Error ? error.message : 'Failed to poll safety backup status',
            operationType: 'backup'
          }));
        }
      };

      // Start polling immediately
      pollTask();

      // Set up interval for subsequent polls
      this.pollingInterval = setInterval(pollTask, 2000);

      // Set timeout (10 minutes max)
      setTimeout(() => {
        if (this.pollingInterval) {
          this.stopPolling();
          resolve(this.setEnhancedError({
            category: 'database',
            summary: 'Safety backup timeout',
            message: 'Safety database backup operation timed out after 10 minutes',
            operationType: 'backup'
          }));
        }
      }, 10 * 60 * 1000);
    });
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  async onCancel(): Promise<void> {
    this.isCancelled = true;
    this.stopPolling();

    // Try to abort the running task
    try {
      const siteUrl = this.getSiteUrl();
      await TaskApiService.patchTaskStatus(siteUrl, 'aborting');
    } catch (error) {
      console.warn('Could not abort safety database backup task:', error);
    }

    await super.onCancel();
  }

  customContent(): React.ReactElement | null {
    return null;
  }
}
