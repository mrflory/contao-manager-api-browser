import { 
  TimelineItem, 
  TimelineExecutionRecord, 
  WorkflowEvent, 
  EventHandler, 
  WorkflowEngineState,
  WorkflowContext,
  WorkflowEngineInterface,
  TimelineItemStatus
} from './types';
import { HistoryService, CreateHistoryEntryRequest, UpdateHistoryEntryRequest } from '../../services/historyService';
import { HistoryEntry, HistoryStep, WorkflowStepStatus } from '../../types';

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
  private currentHistoryEntry: HistoryEntry | null = null;
  
  constructor() {
    // Initialize event handler sets
    const events: WorkflowEvent[] = [
      'started', 'paused', 'resumed', 'stopped', 'cancelled', 'completed',
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
  
  async stop(): Promise<void> {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.endTime = new Date();
    
    // Update history entry with error status since stop() is usually called on error
    await this.updateHistoryEntry('error', this.state.endTime);
    
    this.emit('stopped');
  }

  async cancel(): Promise<void> {
    // Prevent multiple concurrent cancellation calls
    if (this.state.isCancelling) {
      return;
    }
    
    this.state.isCancelling = true;
    
    try {
      // Set state to cancelled/stopped
      this.state.isRunning = false;
      this.state.isPaused = false;
      this.state.endTime = new Date();
      
      // Cancel all timeline items that might have background processes, are active, pending, or waiting for user action
      const cancelPromises = this.state.timeline.map(async (item) => {
        // Call onCancel for active, pending, or user_action_required items
        if (item.onCancel && (item.status === 'active' || item.status === 'pending' || item.status === 'user_action_required')) {
          try {
            console.log(`Cancelling timeline item: ${item.id} (status: ${item.status})`);
            await item.onCancel();
          } catch (error) {
            console.warn(`Error cancelling item ${item.id}:`, error);
          }
        }
        
        // Mark non-complete items as cancelled
        if (item.status !== 'complete' && item.status !== 'skipped') {
          item.status = 'cancelled';
          item.endTime = new Date();
        }
      });
      
      // Wait for all cancellations to complete before emitting cancelled event
      await Promise.all(cancelPromises);
      
      // Update history entry with cancelled status
      await this.updateHistoryEntry('cancelled', new Date());
      
      this.emit('cancelled');
    } finally {
      this.state.isCancelling = false;
    }
  }
  
  // Execute specific item
  async executeNext(): Promise<void> {
    if (this.state.isPaused || (!this.state.isRunning && !this.state.isPaused) || this.state.currentIndex >= this.state.timeline.length) {
      if (this.state.currentIndex >= this.state.timeline.length) {
        await this.complete();
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
        await this.stop();
        
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
      await this.stop();
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
          
        case 'skip': {
          // Mark current item as complete (it was already done when user clicked skip)
          if (item) {
            item.status = 'complete';
            item.endTime = new Date();
            this.emit('item_completed', item, record?.result);
          }
          
          // Skip the NEXT item in the workflow
          const nextIndex = this.state.currentIndex + 1;
          if (nextIndex < this.state.timeline.length) {
            const nextItem = this.state.timeline[nextIndex];
            nextItem.status = 'skipped';
            nextItem.startTime = new Date();
            nextItem.endTime = new Date();
            this.emit('item_completed', nextItem, { status: 'success', data: null });
          }
          
          // Move to the item after the skipped one
          this.state.currentIndex = nextIndex + 1;
          
          // Continue workflow
          await this.resume();
          break;
        }
          
        case 'stop':
          await this.stop();
          break;
          
        case 'cancel':
          await this.cancel();
          break;
          
        case 'retry':
          await this.retryItem(this.state.currentIndex);
          break;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'User action failed';
      this.state.error = errorMessage;
      this.emit('item_error', item, errorMessage);
      await this.stop();
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
  
  hasCancelledItems(): boolean {
    return this.state.timeline.some(item => item.status === 'cancelled');
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
  
  private async complete(): Promise<void> {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.isComplete = true;
    this.state.endTime = new Date();
    
    // Update history entry with completion status
    await this.updateHistoryEntry('finished', this.state.endTime);
    
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
    this.currentHistoryEntry = null;
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
  
  // History tracking methods
  async startHistoryTracking(siteUrl: string, workflowType: 'update' | 'migration' | 'composer'): Promise<void> {
    try {
      const request: CreateHistoryEntryRequest = {
        siteUrl,
        workflowType
      };
      
      this.currentHistoryEntry = await HistoryService.createHistoryEntry(request);
    } catch (error) {
      console.warn('Failed to create history entry:', error);
    }
  }
  
  async updateHistoryEntry(status?: 'started' | 'finished' | 'cancelled' | 'error', endTime?: Date): Promise<void> {
    if (!this.currentHistoryEntry) {
      return;
    }
    
    try {
      const historySteps = this.generateHistorySteps();
      
      const request: UpdateHistoryEntryRequest = {
        siteUrl: this.currentHistoryEntry.siteUrl,
        ...(status && { status }),
        ...(endTime && { endTime: endTime.toISOString() }),
        steps: historySteps.map(step => ({
          id: step.id,
          title: step.title,
          summary: step.summary,
          startTime: typeof step.startTime === 'string' ? step.startTime : step.startTime.toISOString(),
          ...(step.endTime && { endTime: typeof step.endTime === 'string' ? step.endTime : step.endTime.toISOString() }),
          status: step.status as string,
          ...(step.error && { error: step.error })
        }))
      };
      
      this.currentHistoryEntry = await HistoryService.updateHistoryEntry(
        this.currentHistoryEntry.id, 
        request
      );
    } catch (error) {
      console.error('Failed to update history entry:', error);
      console.error('History entry ID:', this.currentHistoryEntry?.id);
      console.error('Timeline items:', this.state.timeline.length);
    }
  }
  
  private generateHistorySteps(): HistoryStep[] {
    return this.state.timeline
      .map(item => ({
        id: item.id,
        title: item.title,
        summary: this.generateStepSummary(item),
        startTime: item.startTime || new Date(),
        endTime: item.endTime,
        status: this.mapTimelineStatusToHistoryStatus(item.status),
        error: this.getTimelineItemError(item)
      }))
      .filter(step => step.summary !== ''); // Filter out steps with empty summaries
  }

  private mapTimelineStatusToHistoryStatus(status: TimelineItemStatus): WorkflowStepStatus {
    switch (status) {
      case 'user_action_required':
        return 'active'; // Map user_action_required to active for history display
      default:
        return status as WorkflowStepStatus;
    }
  }

  private getTimelineItemError(item: TimelineItem): string | undefined {
    // Get error from execution record if available
    const record = this.state.executionHistory.find(r => r.item.id === item.id);
    return record?.result?.error;
  }
  
  private generateStepSummary(item: TimelineItem): string {
    // Generate meaningful summaries based on step type and data
    if (item.status === 'error') {
      const error = this.getTimelineItemError(item);
      return `Error: ${error || 'Unknown error occurred'}`;
    }
    
    if (item.status === 'skipped') {
      return 'Step skipped';
    }
    
    // Get execution record to access result data
    const record = this.state.executionHistory.find(r => r.item.id === item.id);
    const data = record?.result?.data;
    
    switch (true) {
      // (1) Check pending tasks - No summary needed, not relevant for history
      case item.id.includes('check-tasks'):
        return ''; // Return empty string for tasks that don't need history summaries
        
      // (2) Check Manager Update - State if update is available or not
      case item.id.includes('check-manager'):
        if (data?.selfUpdate) {
          const current = data.selfUpdate.current_version;
          const latest = data.selfUpdate.latest_version;
          if (current && latest && current !== latest) {
            return `Manager update available: ${current} → ${latest}`;
          }
          return `Manager up to date (${current})`;
        }
        // Also check for versionComparison data structure
        if (data?.versionComparison) {
          const current = data.versionComparison.currentVersion;
          const latest = data.versionComparison.latestVersion;
          if (data.versionComparison.needsUpdate) {
            return `Manager update available: ${current} → ${latest}`;
          }
          return `Manager up to date (${current})`;
        }
        return 'Manager version check completed';
        
      // (3) Update Manager - State if update was performed successfully
      case item.id.includes('update-manager') || item.id.includes('manager-update'):
        if (data?.selfUpdate) {
          const version = data.selfUpdate.latest_version || data.version;
          return `Manager updated to ${version}`;
        }
        return 'Manager update completed';
        
      // (4) Composer dry-run - State number of packages to be installed/updated
      case item.id.includes('composer-dry-run') || (item.id.includes('dry-run') && item.id.includes('composer')):
        if (data?.operations?.length > 0) {
          // Try different possible operation field structures
          const installCount = data.operations.filter((op: any) => 
            op.summary?.includes('install') || op.summary?.includes('Installing') ||
            op.details?.includes('install') || op.details?.includes('Installing') ||
            op.type === 'install'
          ).length;
          const updateCount = data.operations.filter((op: any) => 
            op.summary?.includes('update') || op.summary?.includes('Updating') ||
            op.details?.includes('update') || op.details?.includes('Updating') ||
            op.type === 'update'
          ).length;
          
          const parts = [];
          if (installCount > 0) parts.push(`${installCount} to install`);
          if (updateCount > 0) parts.push(`${updateCount} to update`);
          
          if (parts.length > 0) {
            return `Dry-run: ${parts.join(', ')}`;
          }
          return 'Dry-run: no changes needed';
        }
        return 'Dry-run completed';
        
      // (5) Composer update - Same summary as dry-run but past tense
      case item.id.includes('composer-update') || item.id.includes('update-packages'):
        if (data?.operations?.length > 0) {
          // Try to filter by completed operations first
          const completedOps = data.operations.filter((op: any) => op.status === 'complete');
          const opsToCount = completedOps.length > 0 ? completedOps : data.operations; // Fallback to all operations
          
          const installCount = opsToCount.filter((op: any) => 
            op.summary?.includes('install') || op.summary?.includes('Installing') ||
            op.details?.includes('install') || op.details?.includes('Installing') ||
            op.type === 'install'
          ).length;
          const updateCount = opsToCount.filter((op: any) => 
            op.summary?.includes('update') || op.summary?.includes('Updating') ||
            op.details?.includes('update') || op.details?.includes('Updating') ||
            op.type === 'update'
          ).length;
          
          const parts = [];
          if (installCount > 0) parts.push(`${installCount} installed`);
          if (updateCount > 0) parts.push(`${updateCount} updated`);
          
          if (parts.length > 0) {
            return `Packages: ${parts.join(', ')}`;
          }
          return 'No package changes made';
        }
        return 'Package update completed';
        
      // (6) Check database migrations - State number of operations or "no migration needed"
      case item.id.includes('check-migrations'):
        if (data?.operations?.length > 0) {
          const operationCount = data.operations.length;
          return `${operationCount} database operations pending`;
        }
        return 'No database migrations needed';
        
      // (7) Execute database migrations - Same as check but past tense
      case item.id.includes('execute-migrations') || (item.id.includes('migrations') && !item.id.includes('check')):
        if (data?.operations?.length > 0) {
          const completedOps = data.operations.filter((op: any) => op.status === 'complete');
          return `${completedOps.length} database operations executed`;
        }
        return 'No database migrations executed';
        
      // (8) Update version info - State new version numbers
      case item.id.includes('update-versions') || item.id.includes('version-info'):
        if (data?.versionInfo) {
          const parts = [];
          if (data.versionInfo.contaoVersion) {
            parts.push(`Contao ${data.versionInfo.contaoVersion}`);
          }
          if (data.versionInfo.contaoManagerVersion) {
            parts.push(`Manager ${data.versionInfo.contaoManagerVersion}`);
          }
          if (data.versionInfo.phpVersion) {
            parts.push(`PHP ${data.versionInfo.phpVersion}`);
          }
          
          if (parts.length > 0) {
            return `Version info updated: ${parts.join(', ')}`;
          }
        }
        return 'Version information updated';
        
      // Legacy catch-all patterns for backward compatibility
      case item.id.includes('update-contao') || item.id.includes('contao-update'):
        if (data?.operations?.length > 0) {
          const update = data.operations[0];
          return `Contao updated to ${update.version || 'latest version'}`;
        }
        return 'Contao update completed';
        
      default:
        if (item.status === 'complete') {
          return `${item.title} completed`;
        }
        return item.title;
    }
  }
  
  getCurrentHistoryEntry(): HistoryEntry | null {
    return this.currentHistoryEntry;
  }
}