import { EventEmitter } from 'events';
import {
  MigrationProgress,
  MigrationStep,
  MigrationEvent,
  MigrationEventCallback,
  DataCategory,
  MigrationStatus
} from '../../types/migration';

/**
 * Progress metrics for throughput calculation
 */
export interface ThroughputMetrics {
  itemsPerSecond: number;
  averageItemSize: number;
  totalDataProcessed: number;
  totalTimeElapsed: number;
  estimatedTimeRemaining: number;
}

/**
 * Progress snapshot for persistence
 */
export interface ProgressSnapshot {
  migrationId: string;
  timestamp: string;
  overallProgress: number;
  currentStep?: string;
  throughput: ThroughputMetrics;
  status: MigrationStatus;
}

/**
 * Progress reporting configuration
 */
export interface ProgressConfig {
  reportInterval: number; // milliseconds
  persistProgress: boolean;
  enableDetailedMetrics: boolean;
  maxHistoryEntries: number;
}

/**
 * Comprehensive progress reporting service for migration operations
 */
export class MigrationProgressReporter extends EventEmitter {
  private progressHistory = new Map<string, ProgressSnapshot[]>();
  private lastReportTime = new Map<string, number>();
  private startTimes = new Map<string, number>();
  private itemCounts = new Map<string, number>();
  private dataSizes = new Map<string, number>();

  private config: ProgressConfig = {
    reportInterval: 1000, // 1 second
    persistProgress: true,
    enableDetailedMetrics: true,
    maxHistoryEntries: 1000
  };

  constructor(config?: Partial<ProgressConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize progress tracking for a migration
   */
  initializeProgress(migrationId: string, totalSteps: number): void {
    const now = Date.now();
    this.startTimes.set(migrationId, now);
    this.lastReportTime.set(migrationId, now);
    this.itemCounts.set(migrationId, 0);
    this.dataSizes.set(migrationId, 0);
    
    if (!this.progressHistory.has(migrationId)) {
      this.progressHistory.set(migrationId, []);
    }

    this.emitProgressEvent({
      type: 'migration_started',
      migrationId,
      timestamp: new Date().toISOString(),
      data: { totalSteps }
    });
  }

  /**
   * Update progress for a migration step
   */
  updateStepProgress(
    migrationId: string,
    stepId: string,
    progress: Partial<MigrationStep>,
    dataSize?: number
  ): void {
    const now = Date.now();
    const lastReport = this.lastReportTime.get(migrationId) || now;

    // Update counters
    if (progress.itemsProcessed !== undefined) {
      const currentCount = this.itemCounts.get(migrationId) || 0;
      this.itemCounts.set(migrationId, currentCount + 1);
    }

    if (dataSize) {
      const currentSize = this.dataSizes.get(migrationId) || 0;
      this.dataSizes.set(migrationId, currentSize + dataSize);
    }

    // Emit progress event if interval has passed
    if (now - lastReport >= this.config.reportInterval) {
      this.emitProgressEvent({
        type: 'step_started',
        migrationId,
        timestamp: new Date().toISOString(),
        data: { stepId, progress }
      });

      this.lastReportTime.set(migrationId, now);
    }
  }

  /**
   * Mark step as completed
   */
  completeStep(
    migrationId: string,
    stepId: string,
    step: MigrationStep
  ): void {
    this.emitProgressEvent({
      type: 'step_completed',
      migrationId,
      timestamp: new Date().toISOString(),
      data: { stepId, step }
    });
  }

  /**
   * Mark step as failed
   */
  failStep(
    migrationId: string,
    stepId: string,
    step: MigrationStep,
    error: string
  ): void {
    this.emitProgressEvent({
      type: 'step_failed',
      migrationId,
      timestamp: new Date().toISOString(),
      data: { stepId, step, error }
    });
  }

  /**
   * Update overall migration progress
   */
  updateOverallProgress(
    migrationId: string,
    progress: MigrationProgress
  ): void {
    const metrics = this.calculateThroughputMetrics(migrationId, progress);
    progress.throughputMetrics = metrics;
    
    // Update estimated time remaining
    if (metrics.itemsPerSecond > 0) {
      const remainingItems = progress.totalSteps - progress.completedSteps;
      progress.estimatedTimeRemaining = (remainingItems / metrics.itemsPerSecond) * 1000;
    }

    // Create progress snapshot
    const snapshot: ProgressSnapshot = {
      migrationId,
      timestamp: new Date().toISOString(),
      overallProgress: progress.overallProgress,
      currentStep: progress.currentStep?.id,
      throughput: metrics,
      status: progress.status
    };

    // Store in history
    this.addToHistory(migrationId, snapshot);

    // Emit progress event
    this.emitProgressEvent({
      type: 'migration_progress',
      migrationId,
      timestamp: snapshot.timestamp,
      data: { progress, snapshot }
    });
  }

  /**
   * Calculate throughput metrics
   */
  private calculateThroughputMetrics(
    migrationId: string,
    progress: MigrationProgress
  ): ThroughputMetrics {
    const startTime = this.startTimes.get(migrationId);
    const totalItems = this.itemCounts.get(migrationId) || 0;
    const totalDataSize = this.dataSizes.get(migrationId) || 0;
    const now = Date.now();

    if (!startTime) {
      return {
        itemsPerSecond: 0,
        averageItemSize: 0,
        totalDataProcessed: 0,
        totalTimeElapsed: 0,
        estimatedTimeRemaining: 0
      };
    }

    const totalTimeElapsed = now - startTime;
    const timeElapsedSeconds = totalTimeElapsed / 1000;

    const itemsPerSecond = timeElapsedSeconds > 0 ? totalItems / timeElapsedSeconds : 0;
    const averageItemSize = totalItems > 0 ? totalDataSize / totalItems : 0;

    return {
      itemsPerSecond,
      averageItemSize,
      totalDataProcessed: totalDataSize,
      totalTimeElapsed,
      estimatedTimeRemaining: 0 // Will be calculated in updateOverallProgress
    };
  }

  /**
   * Add snapshot to history
   */
  private addToHistory(migrationId: string, snapshot: ProgressSnapshot): void {
    if (!this.config.persistProgress) {
      return;
    }

    const history = this.progressHistory.get(migrationId) || [];
    history.push(snapshot);

    // Trim history if too large
    if (history.length > this.config.maxHistoryEntries) {
      history.splice(0, history.length - this.config.maxHistoryEntries);
    }

    this.progressHistory.set(migrationId, history);
  }

  /**
   * Get progress history for migration
   */
  getProgressHistory(migrationId: string): ProgressSnapshot[] {
    return this.progressHistory.get(migrationId) || [];
  }

  /**
   * Get latest progress snapshot
   */
  getLatestProgress(migrationId: string): ProgressSnapshot | null {
    const history = this.getProgressHistory(migrationId);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Generate progress report
   */
  generateProgressReport(migrationId: string): {
    summary: {
      migrationId: string;
      status: MigrationStatus;
      overallProgress: number;
      startTime: string;
      duration: number;
      estimatedCompletion?: string;
    };
    performance: {
      averageItemsPerSecond: number;
      peakItemsPerSecond: number;
      totalDataProcessed: number;
      averageItemSize: number;
    };
    timeline: Array<{
      timestamp: string;
      progress: number;
      throughput: number;
    }>;
  } {
    const history = this.getProgressHistory(migrationId);
    const startTime = this.startTimes.get(migrationId);
    const latest = this.getLatestProgress(migrationId);

    if (!startTime || !latest) {
      throw new Error(`No progress data found for migration ${migrationId}`);
    }

    // Calculate performance metrics
    const throughputValues = history.map(h => h.throughput.itemsPerSecond);
    const averageItemsPerSecond = throughputValues.reduce((sum, val) => sum + val, 0) / throughputValues.length;
    const peakItemsPerSecond = Math.max(...throughputValues);

    // Generate timeline
    const timeline = history.map(snapshot => ({
      timestamp: snapshot.timestamp,
      progress: snapshot.overallProgress,
      throughput: snapshot.throughput.itemsPerSecond
    }));

    // Calculate estimated completion
    let estimatedCompletion: string | undefined;
    if (latest.status === MigrationStatus.IN_PROGRESS && latest.throughput.estimatedTimeRemaining > 0) {
      const completionTime = new Date(Date.now() + latest.throughput.estimatedTimeRemaining);
      estimatedCompletion = completionTime.toISOString();
    }

    return {
      summary: {
        migrationId,
        status: latest.status,
        overallProgress: latest.overallProgress,
        startTime: new Date(startTime).toISOString(),
        duration: Date.now() - startTime,
        estimatedCompletion
      },
      performance: {
        averageItemsPerSecond,
        peakItemsPerSecond,
        totalDataProcessed: latest.throughput.totalDataProcessed,
        averageItemSize: latest.throughput.averageItemSize
      },
      timeline
    };
  }

  /**
   * Complete migration progress tracking
   */
  completeMigration(migrationId: string, status: MigrationStatus): void {
    const endTime = new Date().toISOString();
    
    this.emitProgressEvent({
      type: status === MigrationStatus.COMPLETED ? 'migration_completed' : 'migration_failed',
      migrationId,
      timestamp: endTime,
      data: { status }
    });

    // Create final snapshot
    const latest = this.getLatestProgress(migrationId);
    if (latest) {
      const finalSnapshot: ProgressSnapshot = {
        ...latest,
        timestamp: endTime,
        status,
        overallProgress: status === MigrationStatus.COMPLETED ? 100 : latest.overallProgress
      };
      
      this.addToHistory(migrationId, finalSnapshot);
    }
  }

  /**
   * Emit progress event
   */
  private emitProgressEvent(event: MigrationEvent): void {
    this.emit('progress', event);
  }

  /**
   * Subscribe to progress events
   */
  onProgress(callback: MigrationEventCallback): void {
    this.on('progress', callback);
  }

  /**
   * Unsubscribe from progress events
   */
  offProgress(callback: MigrationEventCallback): void {
    this.off('progress', callback);
  }

  /**
   * Clear progress data for migration
   */
  clearProgressData(migrationId: string): void {
    this.progressHistory.delete(migrationId);
    this.lastReportTime.delete(migrationId);
    this.startTimes.delete(migrationId);
    this.itemCounts.delete(migrationId);
    this.dataSizes.delete(migrationId);
  }

  /**
   * Get progress statistics across all migrations
   */
  getAllProgressStatistics(): {
    activeMigrations: number;
    completedMigrations: number;
    failedMigrations: number;
    totalDataProcessed: number;
    averageCompletionTime: number;
  } {
    const allMigrations = Array.from(this.progressHistory.keys());
    let activeMigrations = 0;
    let completedMigrations = 0;
    let failedMigrations = 0;
    let totalDataProcessed = 0;
    let totalCompletionTime = 0;
    let completedCount = 0;

    for (const migrationId of allMigrations) {
      const latest = this.getLatestProgress(migrationId);
      if (!latest) continue;

      switch (latest.status) {
        case MigrationStatus.IN_PROGRESS:
          activeMigrations++;
          break;
        case MigrationStatus.COMPLETED:
          completedMigrations++;
          completedCount++;
          totalCompletionTime += latest.throughput.totalTimeElapsed;
          break;
        case MigrationStatus.FAILED:
        case MigrationStatus.ROLLED_BACK:
          failedMigrations++;
          break;
      }

      totalDataProcessed += latest.throughput.totalDataProcessed;
    }

    return {
      activeMigrations,
      completedMigrations,
      failedMigrations,
      totalDataProcessed,
      averageCompletionTime: completedCount > 0 ? totalCompletionTime / completedCount : 0
    };
  }

  /**
   * Export progress data for external analysis
   */
  exportProgressData(migrationId: string): string {
    const history = this.getProgressHistory(migrationId);
    const report = this.generateProgressReport(migrationId);
    
    return JSON.stringify({
      migrationId,
      exportTime: new Date().toISOString(),
      history,
      report
    }, null, 2);
  }

  /**
   * Clean up old progress data
   */
  cleanupOldData(retentionDays: number = 7): void {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    for (const [migrationId, history] of this.progressHistory.entries()) {
      if (history.length === 0) continue;
      
      const latestSnapshot = history[history.length - 1];
      const latestTime = new Date(latestSnapshot.timestamp).getTime();
      
      // Remove if latest snapshot is older than cutoff and migration is completed/failed
      if (latestTime < cutoffTime && 
          (latestSnapshot.status === MigrationStatus.COMPLETED || 
           latestSnapshot.status === MigrationStatus.FAILED ||
           latestSnapshot.status === MigrationStatus.ROLLED_BACK)) {
        this.clearProgressData(migrationId);
        console.log(`Cleaned up old progress data for migration: ${migrationId}`);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProgressConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ProgressConfig {
    return { ...this.config };
  }
}