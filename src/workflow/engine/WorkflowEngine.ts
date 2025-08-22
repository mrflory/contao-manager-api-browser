import { 
  TimelineItem, 
  TimelineExecutionRecord, 
  WorkflowEvent, 
  EventHandler, 
  WorkflowEngineState,
  WorkflowContext,
  WorkflowEngineInterface
} from './types';

/**
 * Generic workflow engine that manages timeline-based execution
 */
export class WorkflowEngine implements WorkflowEngineInterface {
  private state: WorkflowEngineState = {
    timeline: [],
    currentIndex: 0,
    executionHistory: [],
    isRunning: false,
    isPaused: false,
    isComplete: false
  };
  
  private eventHandlers: Map<WorkflowEvent, Set<EventHandler>> = new Map();
  private context: Map<string, any> = new Map();
  
  constructor() {
    // Initialize event handler sets
    const events: WorkflowEvent[] = [
      'started', 'paused', 'resumed', 'stopped', 'completed',
      'item_started', 'item_completed', 'item_error', 'user_action_required', 'item_progress'
    ];
    
    events.forEach(event => {
      this.eventHandlers.set(event, new Set());
    });
  }
  
  // Timeline management
  addItems(items: TimelineItem[]): void {
    this.state.timeline.push(...items);
  }
  
  insertItems(items: TimelineItem[], index?: number): void {
    const insertIndex = index ?? this.state.currentIndex + 1;
    this.state.timeline.splice(insertIndex, 0, ...items);
  }
  
  removeItem(itemId: string): void {
    const index = this.state.timeline.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.state.timeline.splice(index, 1);
      // Adjust current index if needed
      if (index <= this.state.currentIndex && this.state.currentIndex > 0) {
        this.state.currentIndex--;
      }
    }
  }
  
  // Execution control
  async start(): Promise<void> {
    if (this.state.isRunning || this.state.timeline.length === 0) {
      return;
    }
    
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.isComplete = false;
    this.state.error = undefined;
    this.state.startTime = new Date();
    this.state.endTime = undefined;
    this.state.currentIndex = 0;
    
    this.emit('started');
    
    // Start execution
    await this.executeNext();
  }
  
  async startFromStep(stepIndex: number): Promise<void> {
    if (this.state.isRunning || this.state.timeline.length === 0 || stepIndex < 0 || stepIndex >= this.state.timeline.length) {
      return;
    }
    
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.isComplete = false;
    this.state.error = undefined;
    this.state.startTime = new Date();
    this.state.endTime = undefined;
    this.state.currentIndex = stepIndex;
    
    // Mark all previous steps as skipped
    for (let i = 0; i < stepIndex; i++) {
      this.state.timeline[i].status = 'skipped';
      this.state.timeline[i].endTime = new Date();
    }
    
    this.emit('started');
    
    // Start execution from the specified step
    await this.executeNext();
  }
  
  pause(): void {
    if (!this.state.isRunning || this.state.isPaused) {
      return;
    }
    
    this.state.isRunning = false;
    this.state.isPaused = true;
    
    this.emit('paused');
  }
  
  async resume(): Promise<void> {
    if (!this.state.isPaused) {
      return;
    }
    
    this.state.isRunning = true;
    this.state.isPaused = false;
    
    this.emit('resumed');
    
    // Continue from current position
    await this.executeNext();
  }
  
  stop(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.endTime = new Date();
    
    this.emit('stopped');
  }
  
  // Execute specific item
  async executeNext(): Promise<void> {
    if (this.state.isPaused || (!this.state.isRunning && !this.state.isPaused) || this.state.currentIndex >= this.state.timeline.length) {
      if (this.state.currentIndex >= this.state.timeline.length) {
        this.complete();
      }
      return;
    }
    
    await this.executeItem(this.state.currentIndex);
  }
  
  async executeItem(index: number): Promise<void> {
    if (index < 0 || index >= this.state.timeline.length) {
      return;
    }
    
    const item = this.state.timeline[index];
    
    // Create execution record
    const record: TimelineExecutionRecord = {
      item,
      userActions: [],
      executionTime: undefined
    };
    
    // Add to execution history immediately so progress updates can find it
    // Initialize with a default result for progress updates
    record.result = {
      status: 'success',
      data: null
    };
    this.state.executionHistory.push(record);
    
    try {
      this.emit('item_started', item);
      
      const startTime = Date.now();
      const result = await item.execute(this.getWorkflowContext());
      const endTime = Date.now();
      
      // Update the record in the execution history array, not the local reference
      const recordIndex = this.state.executionHistory.findIndex(r => r.item.id === item.id);
      if (recordIndex !== -1) {
        this.state.executionHistory[recordIndex] = {
          ...this.state.executionHistory[recordIndex],
          result: result,
          executionTime: endTime - startTime
        };
      }
      
      // Handle result
      if (result.status === 'success') {
        this.emit('item_completed', item, result);
        
        // Insert next items if provided
        if (result.nextItems && result.nextItems.length > 0) {
          this.insertItems(result.nextItems, index + 1);
        }
        
        // Move to next item
        this.state.currentIndex = index + 1;
        
        // Continue execution if not paused
        if (!result.pauseWorkflow && this.state.isRunning) {
          setTimeout(() => this.executeNext(), 100);
        } else if (result.pauseWorkflow) {
          this.pause();
        }
        
      } else if (result.status === 'error') {
        this.state.error = result.error;
        this.emit('item_error', item, result.error);
        this.stop();
        
      } else if (result.status === 'user_action_required') {
        this.emit('user_action_required', item, result);
        if (result.pauseWorkflow) {
          this.pause();
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.state.error = errorMessage;
      record.result = {
        status: 'error',
        error: errorMessage
      };
      
      this.emit('item_error', item, errorMessage);
      this.stop();
    }
    
    // Record is already in execution history, no need to add again
  }
  
  async retryItem(index: number): Promise<void> {
    if (index < 0 || index >= this.state.timeline.length) {
      return;
    }
    
    const item = this.state.timeline[index];
    
    if (item.canRetry()) {
      await item.onRetry?.();
      this.state.currentIndex = index;
      
      if (!this.state.isRunning) {
        await this.resume();
      } else {
        await this.executeItem(index);
      }
    }
  }
  
  async skipItem(index: number): Promise<void> {
    if (index < 0 || index >= this.state.timeline.length) {
      return;
    }
    
    const item = this.state.timeline[index];
    
    if (item.canSkip()) {
      await item.onSkip?.();
      
      // Move to next item if this is the current item
      if (index === this.state.currentIndex) {
        this.state.currentIndex = index + 1;
        
        if (this.state.isRunning) {
          await this.executeNext();
        } else if (this.state.isPaused) {
          // If workflow is paused (e.g., due to user action), resume it
          await this.resume();
        }
      }
    }
  }
  
  // User interaction
  async handleUserAction(itemId: string, actionId: string): Promise<void> {
    // Find the item by ID instead of just checking current item
    const item = this.state.timeline.find(t => t.id === itemId);
    if (!item) {
      return;
    }
    
    const record = this.state.executionHistory.find(r => r.item.id === itemId);
    const userActions = record?.result?.userActions;
    
    if (!userActions) {
      return;
    }
    
    const action = userActions.find(a => a.id === actionId);
    if (!action) {
      return;
    }
    
    try {
      const result = await action.execute();
      
      // Record user action
      if (record) {
        record.userActions.push({
          actionId,
          timestamp: new Date(),
          result
        });
      }
      
      // Handle action result
      switch (result.action) {
        case 'continue':
          // Insert additional items if provided
          if (result.additionalItems && result.additionalItems.length > 0) {
            this.insertItems(result.additionalItems);
          }
          
          // Update item data if provided
          if (result.data !== undefined && record?.result) {
            record.result.data = result.data;
          }
          
          // Mark current item as complete and update its end time
          if (item) {
            item.status = 'complete';
            item.endTime = new Date();
            this.emit('item_completed', item, record?.result);
          }
          
          // Move to next item and continue
          this.state.currentIndex++;
          await this.resume();
          break;
          
        case 'skip':
          await this.skipItem(this.state.currentIndex);
          break;
          
        case 'stop':
          this.stop();
          break;
          
        case 'retry':
          await this.retryItem(this.state.currentIndex);
          break;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'User action failed';
      this.state.error = errorMessage;
      this.emit('item_error', item, errorMessage);
      this.stop();
    }
  }
  
  // State access
  getCurrentItem(): TimelineItem | null {
    if (this.state.currentIndex >= 0 && this.state.currentIndex < this.state.timeline.length) {
      return this.state.timeline[this.state.currentIndex];
    }
    return null;
  }
  
  getTimeline(): TimelineItem[] {
    return [...this.state.timeline];
  }
  
  getExecutionHistory(): TimelineExecutionRecord[] {
    return [...this.state.executionHistory];
  }
  
  isComplete(): boolean {
    return this.state.isComplete;
  }
  
  isRunning(): boolean {
    return this.state.isRunning;
  }
  
  isPaused(): boolean {
    return this.state.isPaused;
  }
  
  getError(): string | undefined {
    return this.state.error;
  }
  
  getProgress(): number {
    if (this.state.timeline.length === 0) {
      return 0;
    }
    
    const completedCount = this.state.timeline
      .slice(0, this.state.currentIndex)
      .filter(item => item.status === 'complete' || item.status === 'skipped')
      .length;
    
    return (completedCount / this.state.timeline.length) * 100;
  }
  
  getCurrentIndex(): number {
    return this.state.currentIndex;
  }
  
  getStartTime(): Date | undefined {
    return this.state.startTime;
  }
  
  getEndTime(): Date | undefined {
    return this.state.endTime;
  }
  
  // Event system
  on(event: WorkflowEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }
  
  off(event: WorkflowEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  private emit(event: WorkflowEvent, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  // Public method for timeline items to emit progress
  public emitProgress(item: TimelineItem, data: any): void {
    // Update execution record with progress data - create new objects to trigger React re-renders
    const recordIndex = this.state.executionHistory.findIndex(r => r.item.id === item.id);
    if (recordIndex !== -1) {
      const oldRecord = this.state.executionHistory[recordIndex];
      const oldResult = oldRecord.result;
      
      if (oldResult) {
        // Don't overwrite final results like 'user_action_required', 'error', etc.
        // Only update progress data for 'success' status (which is the initial placeholder)
        if (oldResult.status === 'success' && (!oldResult.userActions || oldResult.userActions.length === 0)) {
          // Create new record with updated data
          const newRecord: TimelineExecutionRecord = {
            ...oldRecord,
            result: {
              status: oldResult.status,
              data: data,  // New progress data
              error: oldResult.error,
              uiContent: oldResult.uiContent,
              userActions: oldResult.userActions,
              nextItems: oldResult.nextItems,
              pauseWorkflow: oldResult.pauseWorkflow
            }
          };
          
          // Replace the record in the array
          this.state.executionHistory[recordIndex] = newRecord;
        }
      }
    }
    
    this.emit('item_progress', item, data);
  }
  
  private complete(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.isComplete = true;
    this.state.endTime = new Date();
    
    this.emit('completed');
  }
  
  // Utility methods
  reset(): void {
    this.state = {
      timeline: [],
      currentIndex: 0,
      executionHistory: [],
      isRunning: false,
      isPaused: false,
      isComplete: false
    };
    this.context.clear();
  }
  
  // Get a snapshot of the current state
  getState(): Readonly<WorkflowEngineState> {
    return Object.freeze({ ...this.state });
  }
  
  // Context management
  private getWorkflowContext(): WorkflowContext {
    return {
      get: (key: string) => this.context.get(key),
      set: (key: string, value: any) => {
        this.context.set(key, value);
      },
      has: (key: string) => this.context.has(key),
      delete: (key: string) => this.context.delete(key),
      clear: () => this.context.clear(),
      keys: () => Array.from(this.context.keys()),
      engine: this
    };
  }
  
  // Public context access
  getContext(): WorkflowContext {
    return this.getWorkflowContext();
  }
}