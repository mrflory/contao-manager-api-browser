import React from 'react';
import { TimelineItem, TimelineItemStatus, TimelineResult, UserAction, WorkflowContext } from './types';

/**
 * Abstract base class for timeline items providing common functionality
 */
export abstract class BaseTimelineItem implements TimelineItem {
  public readonly id: string;
  public readonly title: string;
  public readonly description: string;
  public status: TimelineItemStatus = 'pending';
  public startTime?: Date;
  public endTime?: Date;
  protected context?: WorkflowContext;
  
  constructor(id: string, title: string, description: string) {
    this.id = id;
    this.title = title;
    this.description = description;
  }
  
  // Abstract methods to implement
  abstract execute(context?: WorkflowContext): Promise<TimelineResult>;
  
  // Default implementations
  async onSkip(): Promise<void> {
    this.status = 'skipped';
    this.endTime = new Date();
  }
  
  async onRetry(): Promise<void> {
    this.status = 'pending';
    this.startTime = undefined;
    this.endTime = undefined;
  }
  
  canSkip(): boolean {
    return true;
  }
  
  canRetry(): boolean {
    return this.status === 'error';
  }
  
  // Helper methods for subclasses
  protected setActive(): void {
    this.status = 'active';
    this.startTime = new Date();
  }
  
  protected setComplete(data?: any): TimelineResult {
    this.status = 'complete';
    this.endTime = new Date();
    return {
      status: 'success',
      data
    };
  }
  
  protected setError(error: string): TimelineResult {
    this.status = 'error';
    this.endTime = new Date();
    return {
      status: 'error',
      error
    };
  }
  
  protected requireUserAction(
    actions: UserAction[], 
    uiContent?: React.ReactNode,
    data?: any
  ): TimelineResult {
    this.status = 'user_action_required';
    return {
      status: 'user_action_required',
      userActions: actions,
      uiContent,
      data,
      pauseWorkflow: true
    };
  }
  
  protected injectNextItems(items: TimelineItem[], data?: any): TimelineResult {
    this.status = 'complete';
    this.endTime = new Date();
    return {
      status: 'success',
      data,
      nextItems: items
    };
  }
  
  // Context helper methods
  protected setContextData(key: string, value: any): void {
    if (this.context) {
      this.context.set(key, value);
    }
  }
  
  protected getContextData(key: string): any {
    return this.context?.get(key);
  }
  
  protected hasContextData(key: string): boolean {
    return this.context?.has(key) ?? false;
  }
  
  // Utility method to calculate execution time
  getExecutionTime(): number | undefined {
    if (this.startTime && this.endTime) {
      return this.endTime.getTime() - this.startTime.getTime();
    }
    return undefined;
  }
  
  // Utility method to get duration string
  getDurationString(): string {
    const duration = this.getExecutionTime();
    if (duration === undefined) {
      return '';
    }
    
    if (duration < 1000) {
      return `${duration}ms`;
    }
    
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}