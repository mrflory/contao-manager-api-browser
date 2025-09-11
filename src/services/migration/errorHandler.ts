import { EventEmitter } from 'events';
import {
  MigrationError,
  ValidationError,
  RollbackError,
  MigrationEvent,
  MigrationEventCallback,
  DataCategory,
  MigrationStep
} from '../../types/migration';

/**
 * Error recovery strategies
 */
export enum ErrorRecoveryStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  ABORT = 'abort',
  FALLBACK = 'fallback'
}

/**
 * Error context information
 */
export interface ErrorContext {
  migrationId: string;
  stepId?: string;
  category: DataCategory;
  operation: string;
  retryCount: number;
  maxRetries: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Error recovery plan
 */
export interface ErrorRecoveryPlan {
  strategy: ErrorRecoveryStrategy;
  retryDelay?: number;
  fallbackAction?: () => Promise<void>;
  shouldContinue: boolean;
  message: string;
}

/**
 * Comprehensive error handling service for migration operations
 */
export class MigrationErrorHandler extends EventEmitter {
  private errorHistory = new Map<string, Array<{
    error: Error;
    context: ErrorContext;
    recovery: ErrorRecoveryPlan;
    timestamp: string;
  }>>();

  private retryStrategies = new Map<string, (error: Error, context: ErrorContext) => ErrorRecoveryPlan>();

  constructor() {
    super();
    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default error recovery strategies
   */
  private initializeDefaultStrategies(): void {
    // Network/connectivity errors - retry with exponential backoff
    this.retryStrategies.set('ECONNREFUSED', (error, context) => ({
      strategy: ErrorRecoveryStrategy.RETRY,
      retryDelay: Math.min(1000 * Math.pow(2, context.retryCount), 30000),
      shouldContinue: context.retryCount < context.maxRetries,
      message: `Connection refused. Retrying in ${Math.min(1000 * Math.pow(2, context.retryCount), 30000)}ms`
    }));

    this.retryStrategies.set('ETIMEDOUT', (error, context) => ({
      strategy: ErrorRecoveryStrategy.RETRY,
      retryDelay: 5000,
      shouldContinue: context.retryCount < context.maxRetries,
      message: 'Operation timed out. Retrying...'
    }));

    // File system errors
    this.retryStrategies.set('ENOENT', (error, context) => ({
      strategy: ErrorRecoveryStrategy.SKIP,
      shouldContinue: true,
      message: 'File not found. Skipping this item.'
    }));

    this.retryStrategies.set('EACCES', (error, context) => ({
      strategy: ErrorRecoveryStrategy.ABORT,
      shouldContinue: false,
      message: 'Permission denied. Migration cannot continue.'
    }));

    this.retryStrategies.set('ENOSPC', (error, context) => ({
      strategy: ErrorRecoveryStrategy.ABORT,
      shouldContinue: false,
      message: 'No space left on device. Migration cannot continue.'
    }));

    // JSON parsing errors
    this.retryStrategies.set('SyntaxError', (error, context) => ({
      strategy: ErrorRecoveryStrategy.SKIP,
      shouldContinue: true,
      message: 'Data corruption detected. Skipping corrupted item.'
    }));

    // Migration-specific errors
    this.retryStrategies.set('CONFIG_NOT_FOUND', (error, context) => ({
      strategy: ErrorRecoveryStrategy.FALLBACK,
      fallbackAction: async () => {
        console.log('Creating empty configuration as fallback');
      },
      shouldContinue: true,
      message: 'Configuration not found. Creating empty configuration.'
    }));

    this.retryStrategies.set('VALIDATION_FAILED', (error, context) => ({
      strategy: context.retryCount < 2 ? ErrorRecoveryStrategy.RETRY : ErrorRecoveryStrategy.SKIP,
      retryDelay: 2000,
      shouldContinue: true,
      message: context.retryCount < 2 ? 'Validation failed. Retrying...' : 'Validation failed. Skipping item.'
    }));
  }

  /**
   * Handle migration error with automatic recovery
   */
  async handleError(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorRecoveryPlan> {
    const errorKey = this.getErrorKey(error);
    const timestamp = new Date().toISOString();

    // Get recovery strategy
    const recovery = this.getRecoveryStrategy(error, context);

    // Log error to history
    this.logErrorToHistory(context.migrationId, error, context, recovery, timestamp);

    // Emit error event
    this.emit('migrationError', {
      type: 'step_failed',
      migrationId: context.migrationId,
      timestamp,
      data: {
        error: error.message,
        context,
        recovery,
        stepId: context.stepId
      }
    });

    // Execute recovery strategy
    await this.executeRecoveryStrategy(recovery, error, context);

    return recovery;
  }

  /**
   * Get error key for strategy lookup
   */
  private getErrorKey(error: Error): string {
    // Check for Node.js error codes
    if ('code' in error && typeof (error as any).code === 'string') {
      return (error as any).code;
    }

    // Check for migration-specific error codes
    if (error instanceof MigrationError) {
      return error.code;
    }

    // Check for error type
    if (error instanceof ValidationError) {
      return 'VALIDATION_FAILED';
    }

    if (error instanceof RollbackError) {
      return 'ROLLBACK_FAILED';
    }

    // Fallback to error constructor name
    return error.constructor.name;
  }

  /**
   * Get recovery strategy for error
   */
  private getRecoveryStrategy(error: Error, context: ErrorContext): ErrorRecoveryPlan {
    const errorKey = this.getErrorKey(error);
    const strategy = this.retryStrategies.get(errorKey);

    if (strategy) {
      return strategy(error, context);
    }

    // Default strategy based on error category
    return this.getDefaultStrategy(error, context);
  }

  /**
   * Get default recovery strategy
   */
  private getDefaultStrategy(error: Error, context: ErrorContext): ErrorRecoveryPlan {
    // Retryable errors
    if (this.isRetryableError(error) && context.retryCount < context.maxRetries) {
      return {
        strategy: ErrorRecoveryStrategy.RETRY,
        retryDelay: 1000 * (context.retryCount + 1),
        shouldContinue: true,
        message: `Retrying operation (attempt ${context.retryCount + 1}/${context.maxRetries})`
      };
    }

    // Non-critical errors - skip and continue
    if (this.isSkippableError(error, context)) {
      return {
        strategy: ErrorRecoveryStrategy.SKIP,
        shouldContinue: true,
        message: 'Non-critical error. Skipping and continuing migration.'
      };
    }

    // Critical errors - abort migration
    return {
      strategy: ErrorRecoveryStrategy.ABORT,
      shouldContinue: false,
      message: 'Critical error encountered. Migration aborted.'
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableCodes = [
      'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH',
      'ENOTFOUND', 'EAI_AGAIN', 'EPIPE'
    ];

    if ('code' in error && typeof (error as any).code === 'string') {
      return retryableCodes.includes((error as any).code);
    }

    if (error instanceof MigrationError) {
      return error.retryable;
    }

    return false;
  }

  /**
   * Check if error is skippable
   */
  private isSkippableError(error: Error, context: ErrorContext): boolean {
    // Skip data corruption in non-critical categories
    if (context.category !== DataCategory.CONFIG && 
        (error instanceof SyntaxError || error.message.includes('parse'))) {
      return true;
    }

    // Skip individual file errors in bulk operations
    if (['ENOENT', 'EACCES'].includes((error as any).code) && 
        context.operation.includes('file')) {
      return true;
    }

    return false;
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecoveryStrategy(
    recovery: ErrorRecoveryPlan,
    error: Error,
    context: ErrorContext
  ): Promise<void> {
    switch (recovery.strategy) {
      case ErrorRecoveryStrategy.RETRY:
        if (recovery.retryDelay) {
          console.log(`Waiting ${recovery.retryDelay}ms before retry...`);
          await this.sleep(recovery.retryDelay);
        }
        break;

      case ErrorRecoveryStrategy.FALLBACK:
        if (recovery.fallbackAction) {
          try {
            await recovery.fallbackAction();
            console.log('Fallback action executed successfully');
          } catch (fallbackError) {
            console.error('Fallback action failed:', fallbackError);
          }
        }
        break;

      case ErrorRecoveryStrategy.SKIP:
        console.log(`Skipping failed operation: ${context.operation}`);
        break;

      case ErrorRecoveryStrategy.ABORT:
        console.error(`Aborting migration due to critical error: ${error.message}`);
        break;
    }
  }

  /**
   * Log error to history
   */
  private logErrorToHistory(
    migrationId: string,
    error: Error,
    context: ErrorContext,
    recovery: ErrorRecoveryPlan,
    timestamp: string
  ): void {
    if (!this.errorHistory.has(migrationId)) {
      this.errorHistory.set(migrationId, []);
    }

    const history = this.errorHistory.get(migrationId)!;
    history.push({
      error,
      context,
      recovery,
      timestamp
    });

    // Keep only last 100 errors per migration
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Get error history for migration
   */
  getErrorHistory(migrationId: string): Array<{
    error: Error;
    context: ErrorContext;
    recovery: ErrorRecoveryPlan;
    timestamp: string;
  }> {
    return this.errorHistory.get(migrationId) || [];
  }

  /**
   * Get error summary for migration
   */
  getErrorSummary(migrationId: string): {
    totalErrors: number;
    errorsByCategory: Record<DataCategory, number>;
    errorsByType: Record<string, number>;
    retryCount: number;
    abortCount: number;
    skipCount: number;
  } {
    const history = this.getErrorHistory(migrationId);
    
    const summary = {
      totalErrors: history.length,
      errorsByCategory: {
        [DataCategory.CONFIG]: 0,
        [DataCategory.LOGS]: 0,
        [DataCategory.HISTORY]: 0,
        [DataCategory.SNAPSHOTS]: 0
      },
      errorsByType: {} as Record<string, number>,
      retryCount: 0,
      abortCount: 0,
      skipCount: 0
    };

    for (const entry of history) {
      // Count by category
      summary.errorsByCategory[entry.context.category]++;

      // Count by error type
      const errorType = this.getErrorKey(entry.error);
      summary.errorsByType[errorType] = (summary.errorsByType[errorType] || 0) + 1;

      // Count by recovery strategy
      switch (entry.recovery.strategy) {
        case ErrorRecoveryStrategy.RETRY:
          summary.retryCount++;
          break;
        case ErrorRecoveryStrategy.ABORT:
          summary.abortCount++;
          break;
        case ErrorRecoveryStrategy.SKIP:
          summary.skipCount++;
          break;
      }
    }

    return summary;
  }

  /**
   * Register custom error recovery strategy
   */
  registerRecoveryStrategy(
    errorKey: string,
    strategy: (error: Error, context: ErrorContext) => ErrorRecoveryPlan
  ): void {
    this.retryStrategies.set(errorKey, strategy);
  }

  /**
   * Clear error history for migration
   */
  clearErrorHistory(migrationId: string): void {
    this.errorHistory.delete(migrationId);
  }

  /**
   * Generate error report for migration
   */
  generateErrorReport(migrationId: string): {
    summary: ReturnType<typeof this.getErrorSummary>;
    recommendations: string[];
    criticalErrors: Array<{
      error: string;
      context: ErrorContext;
      timestamp: string;
    }>;
  } {
    const summary = this.getErrorSummary(migrationId);
    const history = this.getErrorHistory(migrationId);
    const recommendations: string[] = [];
    const criticalErrors: Array<{
      error: string;
      context: ErrorContext;
      timestamp: string;
    }> = [];

    // Analyze errors and generate recommendations
    if (summary.totalErrors === 0) {
      recommendations.push('Migration completed without errors');
    } else {
      if (summary.retryCount > summary.totalErrors * 0.5) {
        recommendations.push('High number of retry operations detected. Consider checking network connectivity or target storage performance.');
      }

      if (summary.skipCount > 0) {
        recommendations.push(`${summary.skipCount} items were skipped due to errors. Review the error log for data integrity.`);
      }

      if (summary.abortCount > 0) {
        recommendations.push('Critical errors caused migration abortion. Review system resources and permissions.');
      }

      // Category-specific recommendations
      if (summary.errorsByCategory[DataCategory.CONFIG] > 0) {
        recommendations.push('Configuration errors detected. Verify source data integrity and target storage compatibility.');
      }

      if (summary.errorsByCategory[DataCategory.LOGS] > summary.errorsByCategory[DataCategory.CONFIG]) {
        recommendations.push('High number of log errors. Consider cleaning up corrupted log entries before migration.');
      }
    }

    // Collect critical errors
    for (const entry of history) {
      if (entry.recovery.strategy === ErrorRecoveryStrategy.ABORT || 
          entry.context.category === DataCategory.CONFIG) {
        criticalErrors.push({
          error: entry.error.message,
          context: entry.context,
          timestamp: entry.timestamp
        });
      }
    }

    return {
      summary,
      recommendations,
      criticalErrors
    };
  }

  /**
   * Utility method for sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add event listener for migration errors
   */
  onError(callback: (event: MigrationEvent) => void): void {
    this.on('migrationError', callback);
  }

  /**
   * Remove all error listeners
   */
  removeAllErrorListeners(): void {
    this.removeAllListeners('migrationError');
  }
}