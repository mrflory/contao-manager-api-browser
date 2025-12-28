import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';
import { ComposerOperations } from '../../components/workflow/ComposerOperations';

/**
 * Timeline item for running composer install after restore
 */
export class ComposerInstallTimelineItem extends BaseTimelineItem {
  private pollingInterval?: NodeJS.Timeout;
  private isCancelled = false;

  constructor() {
    super(
      'composer-install',
      'Composer Install',
      'Install dependencies from composer.lock'
    );
  }

  canSkip(): boolean {
    return false; // Cannot skip composer install after restore
  }

  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();

    try {
      // Start the composer install task
      const siteUrl = this.getSiteUrl();
      await api.setTaskData(siteUrl, {
        name: 'composer/install',
        config: {}
      });

      // Emit progress update for composer install start
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, {
          status: 'active',
          message: 'Starting composer install...',
          type: 'composer_install_start'
        });
      }

      // Start polling for task completion
      return this.startPolling();

    } catch (error) {
      return this.setEnhancedError({
        category: 'composer',
        summary: 'Failed to start composer install',
        message: error instanceof Error ? error.message : 'Failed to start composer install',
        operationType: 'composer'
      });
    }
  }

  private startPolling(): Promise<TimelineResult> {
    return new Promise((resolve) => {
      const pollTask = async () => {
        // Check if cancelled
        if (this.isCancelled) {
          this.stopPolling();
          resolve(this.setCancelled());
          return;
        }

        try {
          const siteUrl = this.getSiteUrl();
          const taskData = await api.getTaskData(siteUrl);

          // Check if cancelled again after API call
          if (this.isCancelled) {
            this.stopPolling();
            resolve(this.setCancelled());
            return;
          }

          if (!taskData || Object.keys(taskData).length === 0) {
            // Task completed - clean up and resolve
            this.stopPolling();

            try {
              await api.deleteTaskData(siteUrl);
            } catch (cleanupError) {
              console.warn('Failed to clean up task data:', cleanupError);
            }

            resolve(this.setComplete());
            return;
          }

          // Emit progress update with current task data
          if (this.context?.engine) {
            this.context.engine.emitProgress(this, taskData);
          }

          // Check task status
          if (taskData.status === 'complete') {
            this.stopPolling();

            try {
              await api.deleteTaskData(siteUrl);
            } catch (cleanupError) {
              console.warn('Failed to clean up task data:', cleanupError);
            }

            // Create UI content showing the composer operations
            const uiContent = taskData.operations ? (
              <ComposerOperations data={taskData} />
            ) : null;

            // Set the item status to complete and return proper result
            this.status = 'complete';
            this.endTime = new Date();

            resolve({
              status: 'success',
              data: taskData,
              uiContent
            });

          } else if (taskData.status === 'error') {
            this.stopPolling();

            // Create error result
            const errorResult = this.createEnhancedErrorFromConsole(
              taskData.console || 'Composer install failed',
              'composer',
              'Composer install failed'
            );

            resolve(errorResult);
          }
          // If status is 'active', continue polling

        } catch (error) {
          // Check if cancelled during error handling
          if (this.isCancelled) {
            this.stopPolling();
            resolve(this.setCancelled());
            return;
          }

          console.error('Error polling composer install status:', error);
          // Don't resolve yet, keep polling unless it's a critical error
        }
      };

      // Start polling immediately, then every 2 seconds
      pollTask();
      this.pollingInterval = setInterval(pollTask, 2000);

      // Set timeout for 30 minutes (same as composer update)
      setTimeout(() => {
        if (this.pollingInterval) {
          this.stopPolling();
          resolve(this.setEnhancedError({
            category: 'composer',
            summary: 'Composer install timeout',
            message: 'Composer install took too long (30 minutes)',
            details: 'The composer install operation did not complete within the expected timeframe',
            operationType: 'composer'
          }));
        }
      }, 30 * 60 * 1000); // 30 minutes
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
      console.warn('Could not abort composer install task:', error);
    }

    await super.onCancel();
  }

  customContent(): React.ReactElement | null {
    return <ComposerOperations data={this.data || {}} />;
  }
}
