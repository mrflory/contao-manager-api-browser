import { WorkflowErrorSummary, ErrorCategory, EnhancedError } from '../types/errorTypes';
import { TimelineExecutionRecord, TimelineItem } from '../workflow/engine/types';

export class WorkflowErrorUtils {
  static generateErrorSummary(executionHistory: TimelineExecutionRecord[]): WorkflowErrorSummary {
    const errorRecords = executionHistory.filter(
      record => record.result?.status === 'error'
    );

    if (errorRecords.length === 0) {
      return {
        totalErrors: 0,
        criticalErrors: 0,
        errorsByCategory: {} as Record<ErrorCategory, number>,
        canRetry: false,
        canSkip: false
      };
    }

    const errorsByCategory: Record<ErrorCategory, number> = {
      network: 0,
      authentication: 0,
      composer: 0,
      migration: 0,
      manager: 0,
      validation: 0,
      system: 0,
      database: 0,
      unknown: 0
    };

    let criticalErrors = 0;
    let latestError: EnhancedError | undefined;
    let canRetry = false;
    let canSkip = false;

    // Process each error record
    for (const record of errorRecords) {
      const enhancedError = record.result?.enhancedError;

      if (enhancedError) {
        // Count by category
        errorsByCategory[enhancedError.category]++;

        // Count critical errors
        if (enhancedError.severity === 'critical' || enhancedError.severity === 'high') {
          criticalErrors++;
        }

        // Track latest error (most recent timestamp)
        if (!latestError || enhancedError.timestamp > latestError.timestamp) {
          latestError = enhancedError;
        }
      } else {
        // Legacy error - categorize as unknown
        errorsByCategory.unknown++;
      }

      // Check if the failed item can be retried or skipped
      if (record.item.canRetry()) {
        canRetry = true;
      }
      if (record.item.canSkip()) {
        canSkip = true;
      }
    }

    return {
      totalErrors: errorRecords.length,
      criticalErrors,
      errorsByCategory,
      latestError,
      canRetry,
      canSkip
    };
  }

  static hasErrors(executionHistory: TimelineExecutionRecord[]): boolean {
    return executionHistory.some(record => record.result?.status === 'error');
  }

  static getFailedSteps(executionHistory: TimelineExecutionRecord[]): TimelineExecutionRecord[] {
    return executionHistory.filter(record => record.result?.status === 'error');
  }

  static canRecoverFromErrors(executionHistory: TimelineExecutionRecord[]): boolean {
    const failedSteps = this.getFailedSteps(executionHistory);
    return failedSteps.some(record => record.item.canRetry() || record.item.canSkip());
  }

  static getCriticalErrorCount(executionHistory: TimelineExecutionRecord[]): number {
    return executionHistory
      .filter(record => record.result?.status === 'error')
      .filter(record => {
        const enhancedError = record.result?.enhancedError;
        return enhancedError?.severity === 'critical' || enhancedError?.severity === 'high';
      })
      .length;
  }

  // Alternative methods that work directly with timeline items (when execution history is not available)
  static hasErrorsFromTimeline(timeline: TimelineItem[]): boolean {
    return timeline.some(item => item.status === 'error');
  }

  static generateErrorSummaryFromTimeline(timeline: TimelineItem[], executionHistory?: TimelineExecutionRecord[]): WorkflowErrorSummary {
    // If execution history is available and has errors, use it for more detailed analysis
    if (executionHistory && executionHistory.length > 0) {
      const historyHasErrors = this.hasErrors(executionHistory);
      if (historyHasErrors) {
        return this.generateErrorSummary(executionHistory);
      }
    }

    // Fallback to timeline items
    const errorItems = timeline.filter(item => item.status === 'error');

    if (errorItems.length === 0) {
      return {
        totalErrors: 0,
        criticalErrors: 0,
        errorsByCategory: {} as Record<ErrorCategory, number>,
        canRetry: false,
        canSkip: false
      };
    }

    // For timeline items without detailed error info, create a basic summary
    const errorsByCategory: Record<ErrorCategory, number> = {
      network: 0,
      authentication: 0,
      composer: 0,
      migration: 0,
      manager: 0,
      validation: 0,
      system: 0,
      database: 0,
      unknown: errorItems.length // Default to unknown category
    };

    let canRetry = false;
    let canSkip = false;

    // Check if any failed items can be retried or skipped
    for (const item of errorItems) {
      if (item.canRetry && item.canRetry()) {
        canRetry = true;
      }
      if (item.canSkip && item.canSkip()) {
        canSkip = true;
      }
    }

    return {
      totalErrors: errorItems.length,
      criticalErrors: errorItems.length, // Assume all errors are critical when we don't have detailed info
      errorsByCategory,
      canRetry,
      canSkip
    };
  }

  static getFailedStepsFromTimeline(timeline: TimelineItem[]): TimelineItem[] {
    return timeline.filter(item => item.status === 'error');
  }

  static canRecoverFromErrorsFromTimeline(timeline: TimelineItem[]): boolean {
    const failedItems = this.getFailedStepsFromTimeline(timeline);
    return failedItems.some(item =>
      (item.canRetry && item.canRetry()) ||
      (item.canSkip && item.canSkip())
    );
  }
}