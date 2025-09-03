# Workflow Abstraction Implementation Plan

## Overview

This document outlines the plan to refactor the current rigid update workflow system into a flexible, timeline-based workflow abstraction. The goal is to separate workflow orchestration from business logic and UI concerns, making the system more maintainable and extensible.

## Current Architecture Problems

The existing workflow system has several issues:

1. **Tight Coupling**: The `useWorkflow` hook (~900 lines) contains tightly coupled logic mixing:
   - Hard-coded step definitions and execution order
   - Complex state management with manual step progression
   - Embedded business logic for each step type
   - Direct API calls and polling management
   - Complex migration cycle handling

2. **Rigid Structure**: Steps are hard-coded with fixed execution flow, making it difficult to:
   - Add dynamic steps during execution
   - Handle complex conditional logic
   - Implement retry mechanisms
   - Support different workflow types

3. **Mixed Concerns**: Business logic, UI rendering, and workflow orchestration are intermingled

## Proposed Solution: Timeline-Based Workflow Abstraction

### Core Concept

Replace the rigid step-based system with an **Abstract Workflow History** that is rendered as a timeline. This timeline is essentially a list of timeline items that:

1. Execute independently and return structured results
2. Can provide custom UI content for rendering
3. Can request user interaction through structured actions
4. Can dynamically add new timeline items during execution
5. Are completely decoupled from the workflow engine

### Core Interfaces

```typescript
// Core timeline item interface
interface TimelineItem {
  id: string;
  title: string;
  description: string;
  status: TimelineItemStatus;
  startTime?: Date;
  endTime?: Date;
  
  // Main execution method
  execute(): Promise<TimelineResult>;
  
  // Optional lifecycle methods
  onSkip?(): Promise<void>;
  onRetry?(): Promise<void>;
  canSkip(): boolean;
  canRetry(): boolean;
}

// Result of timeline item execution
interface TimelineResult {
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

// User action definition
interface UserAction {
  id: string;
  label: string;
  description?: string;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  
  // Action handler
  execute(): Promise<TimelineActionResult>;
}

// Result of user action
interface TimelineActionResult {
  // Continue workflow, skip current item, or stop
  action: 'continue' | 'skip' | 'stop' | 'retry';
  
  // Additional timeline items to inject
  additionalItems?: TimelineItem[];
  
  // Data to store with the timeline item
  data?: any;
}

// Timeline item status
type TimelineItemStatus = 'pending' | 'active' | 'complete' | 'error' | 'skipped' | 'user_action_required';

// Execution record for history
interface TimelineExecutionRecord {
  item: TimelineItem;
  result?: TimelineResult;
  userActions: Array<{
    actionId: string;
    timestamp: Date;
    result: TimelineActionResult;
  }>;
  executionTime?: number;
}
```

### Workflow Engine

```typescript
class WorkflowEngine {
  private timeline: TimelineItem[] = [];
  private currentIndex = 0;
  private executionHistory: TimelineExecutionRecord[] = [];
  private isRunning = false;
  private isPaused = false;
  
  // Timeline management
  addItems(items: TimelineItem[]): void;
  insertItems(items: TimelineItem[], index?: number): void;
  removeItem(itemId: string): void;
  
  // Execution control
  start(): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  stop(): void;
  
  // Execute specific item
  executeNext(): Promise<void>;
  executeItem(index: number): Promise<void>;
  retryItem(index: number): Promise<void>;
  skipItem(index: number): Promise<void>;
  
  // User interaction
  handleUserAction(itemId: string, actionId: string): Promise<void>;
  
  // State access
  getCurrentItem(): TimelineItem | null;
  getTimeline(): TimelineItem[];
  getExecutionHistory(): TimelineExecutionRecord[];
  isComplete(): boolean;
  getProgress(): number;
  
  // Event system
  on(event: WorkflowEvent, handler: EventHandler): void;
  off(event: WorkflowEvent, handler: EventHandler): void;
}

type WorkflowEvent = 'started' | 'paused' | 'resumed' | 'stopped' | 'completed' | 'item_started' | 'item_completed' | 'item_error' | 'user_action_required';
```

### Base Timeline Item Implementation

```typescript
abstract class BaseTimelineItem implements TimelineItem {
  public readonly id: string;
  public readonly title: string;
  public readonly description: string;
  public status: TimelineItemStatus = 'pending';
  public startTime?: Date;
  public endTime?: Date;
  
  constructor(id: string, title: string, description: string) {
    this.id = id;
    this.title = title;
    this.description = description;
  }
  
  // Abstract methods to implement
  abstract execute(): Promise<TimelineResult>;
  
  // Default implementations
  async onSkip(): Promise<void> {
    this.status = 'skipped';
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
  
  // Helper methods
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
  
  protected requireUserAction(actions: UserAction[], uiContent?: React.ReactNode): TimelineResult {
    this.status = 'user_action_required';
    return {
      status: 'user_action_required',
      userActions: actions,
      uiContent,
      pauseWorkflow: true
    };
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure

1. **Create Directory Structure**
   ```
   src/workflow/
   ├── engine/
   │   ├── WorkflowEngine.ts
   │   ├── BaseTimelineItem.ts
   │   └── types.ts
   ├── items/
   │   ├── CheckTasksTimelineItem.ts
   │   ├── CheckManagerTimelineItem.ts
   │   ├── UpdateManagerTimelineItem.ts
   │   ├── ComposerDryRunTimelineItem.ts
   │   ├── ComposerUpdateTimelineItem.ts
   │   ├── CheckMigrationsTimelineItem.ts
   │   ├── ExecuteMigrationsTimelineItem.ts
   │   └── UpdateVersionsTimelineItem.ts
   ├── ui/
   │   ├── WorkflowTimeline.tsx
   │   ├── TimelineItemRenderer.tsx
   │   └── UserActionPanel.tsx
   └── definitions/
       └── UpdateWorkflowDefinition.ts
   ```

2. **Implement Core Types and Interfaces**
   - Create `types.ts` with all interface definitions
   - Implement `BaseTimelineItem` abstract class
   - Build `WorkflowEngine` class with event system

### Phase 2: Timeline Item Implementations

Convert each existing workflow step to a timeline item:

1. **CheckTasksTimelineItem**
   - Check for pending tasks and database migrations
   - Provide user actions to clear tasks or cancel workflow
   - Handle both regular tasks and migration tasks

2. **CheckManagerTimelineItem**
   - Check if Contao Manager needs updating
   - Skip update step if no update needed

3. **UpdateManagerTimelineItem**
   - Execute manager self-update
   - Handle task polling and progress display

4. **ComposerDryRunTimelineItem** (conditional)
   - Execute composer dry-run
   - Display package changes
   - Pause for user confirmation

5. **ComposerUpdateTimelineItem**
   - Execute actual composer update
   - Display operation details and progress
   - Handle package summaries

6. **CheckMigrationsTimelineItem**
   - Check for pending database migrations
   - Display migration details
   - Handle migration cycles by injecting new check/execute pairs

7. **ExecuteMigrationsTimelineItem**
   - Execute database migrations with user-specified options
   - Display migration progress and results
   - Support DELETE permission options

8. **UpdateVersionsTimelineItem**
   - Update version information
   - Mark workflow as complete

### Phase 3: UI Components

1. **WorkflowTimeline Component**
   - Render timeline items with status indicators
   - Display execution history
   - Handle user interactions
   - Support collapsible content areas

2. **TimelineItemRenderer Component**
   - Render individual timeline items
   - Display custom UI content from timeline results
   - Handle user action buttons
   - Show progress and timing information

3. **UserActionPanel Component**
   - Render user action buttons
   - Handle action confirmations
   - Display action descriptions and warnings

### Phase 4: Workflow Definition

1. **UpdateWorkflowDefinition**
   - Factory function to create timeline items in correct order
   - Handle conditional steps (dry-run, manager update)
   - Support configuration options

```typescript
export function createUpdateWorkflow(config: WorkflowConfig): TimelineItem[] {
  const items: TimelineItem[] = [];
  
  items.push(new CheckTasksTimelineItem());
  items.push(new CheckManagerTimelineItem());
  items.push(new UpdateManagerTimelineItem()); // Conditional
  
  if (config.performDryRun) {
    items.push(new ComposerDryRunTimelineItem());
  }
  
  items.push(new ComposerUpdateTimelineItem());
  items.push(new CheckMigrationsTimelineItem());
  items.push(new ExecuteMigrationsTimelineItem()); // Conditional
  items.push(new UpdateVersionsTimelineItem());
  
  return items;
}
```

### Phase 5: Integration

1. **Refactor UpdateWorkflow Component**
   - Replace useWorkflow hook with WorkflowEngine
   - Update UI to use new timeline components
   - Maintain existing functionality and user experience

2. **Update Routing and Context**
   - Ensure new workflow integrates with existing site management
   - Maintain API compatibility
   - Update any dependent components

## Key Benefits

1. **Separation of Concerns**: Each timeline item is self-contained with its own logic, UI, and state management

2. **Dynamic Workflow**: Timeline items can inject new items during execution, enabling complex workflows like migration cycles

3. **User Interaction**: Structured user actions allow for rich interactions without coupling UI to business logic

4. **Extensibility**: New workflow types can be created by simply defining new timeline items

5. **Testability**: Each timeline item can be tested independently

6. **Maintainability**: Business logic is isolated and easier to understand and modify

7. **Reusability**: Workflow engine can be used for other processes beyond updates

## Migration Strategy

1. **Parallel Implementation**: Build new abstraction alongside existing system
2. **Feature Flag**: Use configuration to switch between old and new systems
3. **Gradual Migration**: Convert one timeline item at a time
4. **Testing**: Comprehensive testing of each phase
5. **Cleanup**: Remove old workflow code after successful migration

## Examples

### Simple Timeline Item
```typescript
class CheckTasksTimelineItem extends BaseTimelineItem {
  constructor() {
    super('check-tasks', 'Check Pending Tasks', 'Verify no other tasks are running');
  }
  
  async execute(): Promise<TimelineResult> {
    this.setActive();
    
    try {
      const taskData = await api.getTaskData();
      
      if (taskData && Object.keys(taskData).length > 0) {
        return this.requireUserAction([
          {
            id: 'clear-tasks',
            label: 'Clear Tasks & Continue',
            variant: 'primary',
            execute: async () => {
              await api.deleteTaskData();
              return { action: 'continue' };
            }
          },
          {
            id: 'cancel',
            label: 'Cancel',
            variant: 'secondary',
            execute: async () => ({ action: 'stop' })
          }
        ], <TaskDisplayComponent data={taskData} />);
      }
      
      return this.setComplete();
    } catch (error) {
      return this.setError(error.message);
    }
  }
}
```

### Complex Timeline Item with Dynamic Steps
```typescript
class CheckMigrationsTimelineItem extends BaseTimelineItem {
  private cycle: number;
  
  constructor(cycle: number = 1) {
    super(
      `check-migrations-${cycle}`,
      `Check Database Migrations (Cycle ${cycle})`,
      `Checking for pending database migrations in cycle ${cycle}`
    );
    this.cycle = cycle;
  }
  
  async execute(): Promise<TimelineResult> {
    this.setActive();
    
    try {
      const migrationStatus = await api.getDatabaseMigrationStatus();
      
      if (!migrationStatus.hash) {
        // No migrations needed
        return this.setComplete(migrationStatus);
      }
      
      // Migrations needed - create next cycle items
      const nextItems = [
        new ExecuteMigrationsTimelineItem(this.cycle),
        new CheckMigrationsTimelineItem(this.cycle + 1)
      ];
      
      return {
        status: 'user_action_required',
        data: migrationStatus,
        uiContent: <MigrationDisplayComponent data={migrationStatus} />,
        userActions: [
          {
            id: 'confirm',
            label: 'Run Migrations',
            variant: 'primary',
            execute: async () => ({
              action: 'continue',
              additionalItems: nextItems
            })
          },
          {
            id: 'skip',
            label: 'Skip Migrations',
            variant: 'secondary',
            execute: async () => ({ action: 'skip' })
          }
        ],
        pauseWorkflow: true
      };
    } catch (error) {
      return this.setError(error.message);
    }
  }
}
```

This abstraction will transform the rigid workflow system into a flexible, maintainable, and extensible architecture that can handle complex scenarios while keeping concerns properly separated.