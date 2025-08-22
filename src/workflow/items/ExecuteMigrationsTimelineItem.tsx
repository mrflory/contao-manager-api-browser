import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';
import { MigrationOperations } from '../../components/workflow/MigrationOperations';

/**
 * Timeline item for executing database migrations
 */
export class ExecuteMigrationsTimelineItem extends BaseTimelineItem {
  private pollingInterval?: NodeJS.Timeout;
  private cycle: number;
  
  constructor(cycle: number = 1) {
    super(
      cycle === 1 ? 'execute-migrations' : `execute-migrations-${cycle}`,
      `Execute Database Migrations${cycle > 1 ? ` (Cycle ${cycle})` : ''}`,
      `Execute pending database migrations${cycle > 1 ? ` in cycle ${cycle}` : ''}`
    );
    this.cycle = cycle;
  }
  
  canSkip(): boolean {
    return true; // Migration execution can be skipped
  }
  
  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();
    
    try {
      // Get migration data from the workflow context
      const migrationHash = this.getMigrationHash();
      const withDeletes = this.getWithDeletesSetting();
      
      if (!migrationHash) {
        // No migrations to execute
        return this.setComplete();
      }
      
      // Start the migration execution
      await api.startDatabaseMigration({ 
        hash: migrationHash,
        withDeletes: withDeletes
      });
      
      // Start polling for migration completion
      return this.startPolling();
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to execute database migrations');
    }
  }
  
  private getMigrationHash(): string | null {
    // Get migration hash from workflow context
    return this.getContextData(`migration-${this.cycle}-hash`) || null;
  }
  
  private getWithDeletesSetting(): boolean {
    // Get withDeletes setting from workflow context
    return this.getContextData(`migration-${this.cycle}-withDeletes`) || false;
  }
  
  private startPolling(): Promise<TimelineResult> {
    return new Promise((resolve) => {
      const pollMigration = async () => {
        try {
          const migrationStatus = await api.getDatabaseMigrationStatus();
          
          if (migrationStatus.status === 'complete') {
            this.stopPolling();
            
            // Clean up migration task
            try {
              await api.deleteDatabaseMigrationTask();
            } catch (cleanupError) {
              console.warn('Failed to clean up migration task:', cleanupError);
            }
            
            // Create UI content showing the migration results
            const uiContent = migrationStatus.operations ? (
              <MigrationOperations data={migrationStatus} />
            ) : null;
            
            resolve({
              status: 'success',
              data: migrationStatus,
              uiContent
            });
            
          } else if (migrationStatus.status === 'error') {
            this.stopPolling();
            resolve(this.setError('Database migration execution failed'));
            
          } else if (migrationStatus.status === 'pending') {
            // This shouldn't happen during execution, but handle gracefully
            this.stopPolling();
            resolve(this.setError('Unexpected pending status during migration execution'));
          }
          // If status is 'active', continue polling
          
        } catch (error) {
          this.stopPolling();
          resolve(this.setError(error instanceof Error ? error.message : 'Migration execution failed'));
        }
      };
      
      // Start immediate poll, then set interval
      pollMigration();
      this.pollingInterval = setInterval(pollMigration, 2000);
      
      // Set timeout after 30 minutes (migrations can take long)
      setTimeout(() => {
        if (this.pollingInterval) {
          this.stopPolling();
          resolve(this.setError('Migration execution timeout after 30 minutes'));
        }
      }, 30 * 60 * 1000);
    });
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
}