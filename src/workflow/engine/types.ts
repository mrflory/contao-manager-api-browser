import React from 'react';

// Timeline item status
export type TimelineItemStatus = 'pending' | 'active' | 'complete' | 'error' | 'skipped' | 'cancelled' | 'user_action_required';

// Workflow event types
export type WorkflowEvent = 'started' | 'paused' | 'resumed' | 'stopped' | 'cancelled' | 'completed' | 'item_started' | 'item_completed' | 'item_error' | 'user_action_required' | 'item_progress';

// User action definition
export interface UserAction {
  id: string;
  label: string;
  description?: string;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  
  // Action handler
  execute(): Promise<TimelineActionResult>;
}

// Result of user action
export interface TimelineActionResult {
  // Continue workflow, skip current item, or stop
  action: 'continue' | 'skip' | 'stop' | 'retry';
  
  // Additional timeline items to inject
  additionalItems?: TimelineItem[];
  
  // Data to store with the timeline item
  data?: any;
}

// Result of timeline item execution
export interface TimelineResult {
  status: 'success' | 'error' | 'user_action_required';
  data?: any;
  error?: string;
  
  // UI content to display in timeline
  uiContent?: React.ReactNode;
  
  // User actions if interaction is required
  userActions?: UserAction[];
  
  // Additional timeline items to inject
  nextItems?: TimelineItem[];
  
  // Whether to pause workflow for user decision
  pauseWorkflow?: boolean;
}

// Forward declaration for WorkflowEngine
export interface WorkflowEngineInterface {
  emitProgress(item: TimelineItem, data: any): void;
}

// Workflow context interface for sharing data between timeline items
export interface WorkflowContext {
  get(key: string): any;
  set(key: string, value: any): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  keys(): string[];
  engine?: WorkflowEngineInterface;
}

// Core timeline item interface
export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  status: TimelineItemStatus;
  startTime?: Date;
  endTime?: Date;
  
  // Main execution method
  execute(context?: WorkflowContext): Promise<TimelineResult>;
  
  // Optional lifecycle methods
  onSkip?(): Promise<void>;
  onRetry?(): Promise<void>;
  onCancel?(): Promise<void>;
  canSkip(): boolean;
  canRetry(): boolean;
}

// Execution record for history
export interface TimelineExecutionRecord {
  item: TimelineItem;
  result?: TimelineResult;
  userActions: Array<{
    actionId: string;
    timestamp: Date;
    result: TimelineActionResult;
  }>;
  executionTime?: number;
}

// Event handler type
export type EventHandler = (...args: any[]) => void;

// Workflow configuration
export interface WorkflowConfig {
  performDryRun: boolean;
}

// Workflow engine state
export interface WorkflowEngineState {
  timeline: TimelineItem[];
  currentIndex: number;
  executionHistory: TimelineExecutionRecord[];
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  isCancelling?: boolean;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}