import React from 'react';
import { Alert, VStack } from '@chakra-ui/react';
import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, UserAction, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';
import { ComposerOperations } from '../../components/workflow/ComposerOperations';

/**
 * Timeline item for running composer dry-run
 */
export class ComposerDryRunTimelineItem extends BaseTimelineItem {
  private pollingInterval?: NodeJS.Timeout;
  private isCancelled = false;
  private lastTaskData?: any;
  
  constructor() {
    super(
      'composer-dry-run',
      'Composer Dry Run',
      'Test composer update without making changes'
    );
  }
  
  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();
    
    try {
      // Start the composer dry-run task
      await api.setTaskData({ 
        name: 'composer/update', 
        config: { dry_run: true } 
      });
      
      // Start polling for task completion
      const result = await this.startPolling();
      return result;
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to start composer dry-run');
    }
  }
  
  private startPolling(): Promise<TimelineResult> {
    return new Promise((resolve) => {
      let resolved = false; // Prevent multiple resolutions
      
      const safeResolve = (result: TimelineResult) => {
        if (!resolved) {
          resolved = true;
          this.stopPolling();
          resolve(result);
        }
      };
      
      const pollTask = async () => {
        if (resolved) return; // Don't poll if already resolved
        
        // Check if cancelled - stop polling immediately if so
        if (this.isCancelled) {
          safeResolve(this.setCancelled());
          return;
        }
        
        try {
          const taskData = await api.getTaskData();
          
          // Check if cancelled again after API call
          if (this.isCancelled) {
            safeResolve(this.setCancelled());
            return;
          }
          
          if (!taskData || Object.keys(taskData).length === 0) {
            // Task completed - clean up and resolve
            try {
              await api.deleteTaskData();
            } catch (cleanupError) {
              console.warn('Failed to clean up task data:', cleanupError);
            }
            
            const result = this.handleDryRunComplete(this.lastTaskData);
            safeResolve(result);
            return;
          }
          
          // Store the last known task data
          this.lastTaskData = taskData;
          
          // Emit progress update with current task data (only if not resolved)
          if (!resolved && this.context?.engine) {
            this.context.engine.emitProgress(this, taskData);
          }
          
          // Check task status
          if (taskData.status === 'complete') {
            try {
              await api.deleteTaskData();
            } catch (cleanupError) {
              console.warn('Failed to clean up task data:', cleanupError);
            }
            
            const result = this.handleDryRunComplete(taskData);
            safeResolve(result);
            
          } else if (taskData.status === 'error') {
            safeResolve(this.setError(taskData.console || 'Composer dry-run failed'));
          }
          // If status is 'active', continue polling
          
        } catch (error) {
          // 204 No Content means task completed
          if (error instanceof Error && error.message.includes('204')) {
            const result = this.handleDryRunComplete(this.lastTaskData);
            safeResolve(result);
          } else {
            safeResolve(this.setError(error instanceof Error ? error.message : 'Composer dry-run failed'));
          }
        }
      };
      
      // Start immediate poll, then set interval
      pollTask();
      this.pollingInterval = setInterval(pollTask, 2000);
      
      // Set timeout after 10 minutes
      setTimeout(() => {
        if (!resolved) {
          safeResolve(this.setError('Composer dry-run timeout after 10 minutes'));
        }
      }, 10 * 60 * 1000);
    });
  }
  
  private handleDryRunComplete(taskData?: any): TimelineResult {
    // Store the task data for later use (when step completes/is skipped)
    if (taskData) {
      this.data = taskData;
    }
    
    const actions: UserAction[] = [
      {
        id: 'continue',
        label: 'Run Composer Update',
        description: 'Proceed with the actual composer update',
        variant: 'primary',
        execute: async () => ({ action: 'continue' })
      },
      {
        id: 'skip',
        label: 'Skip Composer Update',
        description: 'Skip composer update and proceed to database migrations',
        variant: 'secondary',
        execute: async () => ({ action: 'skip' })
      },
      {
        id: 'cancel',
        label: 'Cancel Workflow',
        description: 'Cancel the entire workflow',
        variant: 'danger',
        execute: async () => ({ action: 'cancel' })
      }
    ];
    
    const uiContent = this.renderDryRunResults(taskData);
    const result = this.requireUserAction(actions, uiContent, taskData);
    
    return result;
  }
  
  private renderDryRunResults(taskData?: any): React.ReactNode {
    return (
      <VStack align="stretch" gap={4}>
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Dry-run completed successfully!</Alert.Title>
            <Alert.Description>
              The composer dry-run has finished. You can review the results below to see what changes would be made.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
        
        {/* Show composer operations if available */}
        {taskData?.operations && (
          <ComposerOperations data={taskData} stepId={this.id} />
        )}
      </VStack>
    );
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
    console.log(`Cancelling composer dry-run timeline item: ${this.id}`);
    
    // Set cancellation flag to stop polling loops
    this.isCancelled = true;
    
    // Stop any ongoing polling immediately
    this.stopPolling();
    
    // Try to abort the active task if one exists
    try {
      const taskData = await api.getTaskData();
      if (taskData && taskData.status === 'active') {
        console.log('Aborting active composer dry-run task');
        await api.patchTaskStatus('aborting');
        
        // Wait a short time for the task to acknowledge the abort
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      // Ignore errors when checking/aborting task during cancellation
      console.warn('Could not abort composer dry-run task during cancellation:', error);
    }
    
    // Call parent implementation to set cancelled status
    await super.onCancel();
  }
}