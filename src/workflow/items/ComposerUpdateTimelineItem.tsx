import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';
import { ComposerOperations } from '../../components/workflow/ComposerOperations';

/**
 * Timeline item for running actual composer update
 */
export class ComposerUpdateTimelineItem extends BaseTimelineItem {
  private pollingInterval?: NodeJS.Timeout;
  
  constructor() {
    super(
      'composer-update',
      'Composer Update',
      'Update all Composer packages'
    );
  }
  
  canSkip(): boolean {
    return true; // Composer update can be skipped
  }
  
  
  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();
    
    try {
      // Start the composer update task
      await api.setTaskData({ 
        name: 'composer/update', 
        config: { dry_run: false } 
      });
      
      // Start polling for task completion
      return this.startPolling();
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to start composer update');
    }
  }
  
  private startPolling(): Promise<TimelineResult> {
    return new Promise((resolve) => {
      const pollTask = async () => {
        try {
          const taskData = await api.getTaskData();
          
          if (!taskData || Object.keys(taskData).length === 0) {
            // Task completed - clean up and resolve
            this.stopPolling();
            
            try {
              await api.deleteTaskData();
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
              await api.deleteTaskData();
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
            resolve(this.setError(taskData.console || 'Composer update failed'));
          }
          // If status is 'active', continue polling
          
        } catch (error) {
          // 204 No Content means task completed
          if (error instanceof Error && error.message.includes('204')) {
            this.stopPolling();
            resolve(this.setComplete());
          } else {
            this.stopPolling();
            resolve(this.setError(error instanceof Error ? error.message : 'Composer update failed'));
          }
        }
      };
      
      // Start immediate poll, then set interval
      pollTask();
      this.pollingInterval = setInterval(pollTask, 2000);
      
      // Set timeout after 30 minutes (composer updates can take long)
      setTimeout(() => {
        if (this.pollingInterval) {
          this.stopPolling();
          resolve(this.setError('Composer update timeout after 30 minutes'));
        }
      }, 30 * 60 * 1000);
    });
  }
  
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }
  
  async onSkip(): Promise<void> {
    this.stopPolling();
    await super.onSkip();
  }

  async onCancel(): Promise<void> {
    // Stop any ongoing polling
    this.stopPolling();
    
    // Try to abort the active task if one exists
    try {
      const taskData = await api.getTaskData();
      if (taskData && taskData.status === 'active') {
        console.log('Cancelling active composer update task');
        await api.patchTaskStatus('aborting');
      }
    } catch (error) {
      // Ignore errors when checking/aborting task during cancellation
      console.warn('Could not abort composer update task during cancellation:', error);
    }
    
    // Call parent implementation to set cancelled status
    await super.onCancel();
  }
}