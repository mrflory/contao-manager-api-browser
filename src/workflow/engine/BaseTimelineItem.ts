import { TimelineItem, TimelineItemStatus, TimelineResult, UserAction, WorkflowContext } from './types';
import { EnhancedError, ErrorCategory, ErrorSeverity, ErrorRecoveryAction } from '../../types/errorTypes';
import { ConsoleOutputParser, ErrorCategorizer } from '../../utils/consoleOutputParser';

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
  protected data?: any;
  
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

  async onCancel(): Promise<void> {
    // Default implementation - subclasses should override for cleanup
    this.status = 'cancelled';
    this.endTime = new Date();
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

    // Store error on item for access without execution history
    (this as any).lastError = error;

    return {
      status: 'error',
      error
    };
  }

  protected setEnhancedError(options: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    summary: string;
    message: string;
    details?: string;
    context?: Record<string, any>;
    consoleOutput?: string;
    operationType?: string;
    recoveryActions?: ErrorRecoveryAction[];
  }): TimelineResult {
    this.status = 'error';
    this.endTime = new Date();

    const category = options.category || ErrorCategorizer.categorizeFromOutput(
      options.consoleOutput || options.message,
      options.operationType
    );

    const severity = options.severity || ErrorCategorizer.getSeverityFromCategory(category);

    const parsedConsoleOutput = options.consoleOutput
      ? ConsoleOutputParser.parse(options.consoleOutput, options.operationType)
      : undefined;

    const enhancedError: EnhancedError = {
      category,
      severity,
      summary: options.summary,
      message: options.message,
      details: options.details,
      context: options.context,
      consoleOutput: parsedConsoleOutput,
      recoveryActions: options.recoveryActions || this.getDefaultRecoveryActions(category),
      timestamp: new Date(),
      operationType: options.operationType
    };

    // Store enhanced error on item for access without execution history
    (this as any).lastError = options.summary;
    (this as any).lastEnhancedError = enhancedError;

    return {
      status: 'error',
      error: options.summary,
      enhancedError
    };
  }

  protected createEnhancedErrorFromConsole(
    consoleOutput: string,
    operationType?: string,
    customSummary?: string
  ): TimelineResult {
    const parsedOutput = ConsoleOutputParser.parse(consoleOutput, operationType);
    const mainError = ConsoleOutputParser.extractMainError(parsedOutput);
    const category = ErrorCategorizer.categorizeFromOutput(consoleOutput, operationType);

    const summary = customSummary || this.generateErrorSummary(category, mainError);
    const message = mainError || 'Operation failed with errors in console output';

    return this.setEnhancedError({
      category,
      summary,
      message,
      consoleOutput,
      operationType
    });
  }

  private generateErrorSummary(category: ErrorCategory, mainError?: string): string {
    if (mainError && mainError.length < 80) {
      return mainError;
    }

    switch (category) {
      case 'composer':
        return 'Composer operation failed';
      case 'network':
        return 'Network connection failed';
      case 'authentication':
        return 'Authentication failed';
      case 'migration':
        return 'Database migration failed';
      case 'manager':
        return 'Contao Manager operation failed';
      case 'validation':
        return 'Validation error occurred';
      case 'system':
        return 'System error occurred';
      default:
        return 'Operation failed';
    }
  }

  private getDefaultRecoveryActions(category: ErrorCategory): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    if (this.canRetry()) {
      actions.push({
        label: 'Retry',
        description: 'Try the operation again',
        action: 'retry'
      });
    }

    if (this.canSkip()) {
      actions.push({
        label: 'Skip',
        description: 'Skip this step and continue',
        action: 'skip'
      });
    }

    switch (category) {
      case 'network':
        actions.push({
          label: 'Check Connection',
          description: 'Verify your network connection and try again',
          action: 'manual'
        });
        break;
      case 'authentication':
        actions.push({
          label: 'Re-authenticate',
          description: 'Update your authentication credentials',
          action: 'external',
          url: '/auth'
        });
        break;
      case 'composer':
        actions.push({
          label: 'View Composer Docs',
          description: 'Check Composer documentation for help',
          action: 'external',
          url: 'https://getcomposer.org/doc/'
        });
        break;
    }

    return actions;
  }
  
  protected setCancelled(): TimelineResult {
    this.status = 'cancelled';
    this.endTime = new Date();
    return {
      status: 'error',
      error: 'Operation was cancelled'
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

  // Helper method to get siteUrl from context
  protected getSiteUrl(): string {
    const activeSite = this.getContextData('activeSite');
    if (!activeSite?.url) {
      throw new Error('No active site URL found in workflow context');
    }
    return activeSite.url;
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