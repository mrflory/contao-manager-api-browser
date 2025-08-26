import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';

/**
 * Timeline item for updating Contao Manager
 */
export class UpdateManagerTimelineItem extends BaseTimelineItem {
  private pollingInterval?: NodeJS.Timeout;
  
  constructor() {
    super(
      'update-manager',
      'Update Manager',
      'Update Contao Manager to latest version'
    );
  }
  
  canSkip(): boolean {
    return true; // Manager update can be skipped
  }
  
  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();
    
    try {
      // Emit initial progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, { 
          status: 'active', 
          message: 'Starting Contao Manager update...' 
        });
      }
      
      // Start the manager self-update task
      await api.setTaskData({ name: 'manager/self-update' });
      
      // Emit progress update after starting task
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, { 
          status: 'active', 
          message: 'Manager update task started, polling for results...' 
        });
      }
      
      // Start polling for task completion
      return this.startPolling();
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to start manager update');
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
              // Log but don't fail for cleanup errors
              console.warn('Failed to clean up task data:', cleanupError);
            }
            
            resolve(this.setComplete());
            return;
          }
          
          // Emit progress update with current task data
          if (this.context?.engine) {
            this.context.engine.emitProgress(this, {
              status: 'active',
              message: `Updating manager... (status: ${taskData.status})`,
              taskData
            });
          }
          
          // Check task status
          if (taskData.status === 'complete') {
            this.stopPolling();
            
            try {
              await api.deleteTaskData();
            } catch (cleanupError) {
              console.warn('Failed to clean up task data:', cleanupError);
            }
            
            // Emit completion progress update
            if (this.context?.engine) {
              this.context.engine.emitProgress(this, {
                status: 'complete',
                message: 'Manager update completed successfully',
                taskData
              });
            }
            
            resolve(this.setComplete(taskData));
            
          } else if (taskData.status === 'error') {
            this.stopPolling();
            resolve(this.setError(taskData.console || 'Manager update failed'));
            
          }
          // If status is 'active', continue polling
          
        } catch (error) {
          // 204 No Content means task completed
          if (error instanceof Error && error.message.includes('204')) {
            this.stopPolling();
            // Emit completion progress update
            if (this.context?.engine) {
              this.context.engine.emitProgress(this, {
                status: 'complete',
                message: 'Manager update completed successfully'
              });
            }
            resolve(this.setComplete());
          } else {
            this.stopPolling();
            resolve(this.setError(error instanceof Error ? error.message : 'Manager update failed'));
          }
        }
      };
      
      // Start immediate poll, then set interval
      pollTask();
      this.pollingInterval = setInterval(pollTask, 2000); // Poll every 2 seconds
      
      // Set timeout after 10 minutes
      setTimeout(() => {
        if (this.pollingInterval) {
          this.stopPolling();
          resolve(this.setError('Manager update timeout after 10 minutes'));
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
  
  // Clean up polling if the item is skipped or workflow is stopped
  async onSkip(): Promise<void> {
    this.stopPolling();
    await super.onSkip();
  }
}