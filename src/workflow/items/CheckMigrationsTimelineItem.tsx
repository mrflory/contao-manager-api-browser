import React from 'react';
import { Alert, VStack, Text } from '@chakra-ui/react';
import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, UserAction, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';
import { MigrationOperations } from '../../components/workflow/MigrationOperations';
import { ExecuteMigrationsTimelineItem } from './ExecuteMigrationsTimelineItem';
import { createMigrationSummary } from '../../utils/migrationSummary';

/**
 * Timeline item for checking database migrations
 */
export class CheckMigrationsTimelineItem extends BaseTimelineItem {
  private pollingInterval?: NodeJS.Timeout;
  private cycle: number;
  
  constructor(cycle: number = 1) {
    super(
      cycle === 1 ? 'check-migrations-loop' : `check-migrations-loop-${cycle}`,
      `Check Database Migrations${cycle > 1 ? ` (Cycle ${cycle})` : ''}`,
      `Check for pending database migrations${cycle > 1 ? ` in cycle ${cycle}` : ''}`
    );
    this.cycle = cycle;
  }
  
  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();
    
    try {
      // Start database migration check (dry-run)
      await api.startDatabaseMigration({});
      
      // Start polling for migration status
      return this.startPolling();
      
    } catch (error) {
      return this.setError(error instanceof Error ? error.message : 'Failed to check database migrations');
    }
  }
  
  private startPolling(): Promise<TimelineResult> {
    return new Promise((resolve) => {
      const pollMigration = async () => {
        try {
          const migrationStatus = await api.getDatabaseMigrationStatus();
          
          if (migrationStatus.status === 'pending') {
            this.stopPolling();
            
            // Clean up migration task
            try {
              await api.deleteDatabaseMigrationTask();
            } catch (cleanupError) {
              console.warn('Failed to clean up migration task:', cleanupError);
            }
            
            if (!migrationStatus.hash || migrationStatus.hash === '' || migrationStatus.hash === null) {
              // No migrations needed
              resolve(this.setComplete(migrationStatus));
            } else {
              // Migrations needed - require user confirmation
              resolve(this.handlePendingMigrations(migrationStatus));
            }
            
          } else if (migrationStatus.status === 'complete') {
            this.stopPolling();
            
            try {
              await api.deleteDatabaseMigrationTask();
            } catch (cleanupError) {
              console.warn('Failed to clean up migration task:', cleanupError);
            }
            
            resolve(this.setComplete(migrationStatus));
            
          } else if (migrationStatus.status === 'error') {
            this.stopPolling();
            resolve(this.setError('Database migration check failed'));
          }
          // If status is 'active', continue polling
          
        } catch (error) {
          this.stopPolling();
          resolve(this.setError(error instanceof Error ? error.message : 'Migration check failed'));
        }
      };
      
      // Start immediate poll, then set interval
      pollMigration();
      this.pollingInterval = setInterval(pollMigration, 2000);
      
      // Set timeout after 10 minutes
      setTimeout(() => {
        if (this.pollingInterval) {
          this.stopPolling();
          resolve(this.setError('Migration check timeout after 10 minutes'));
        }
      }, 10 * 60 * 1000);
    });
  }
  
  private handlePendingMigrations(migrationStatus: any): TimelineResult {
    // Create the execute migrations item for this cycle
    const executeItem = new ExecuteMigrationsTimelineItem(this.cycle);
    
    // Create the next check item for the next cycle
    const nextCheckItem = new CheckMigrationsTimelineItem(this.cycle + 1);
    
    const actions: UserAction[] = [
      {
        id: 'confirm-without-deletes',
        label: 'Run Migrations',
        description: 'Execute migrations without DROP queries',
        variant: 'primary',
        execute: async () => {
          // Store migration data in context for ExecuteMigrationsTimelineItem
          this.setContextData(`migration-${this.cycle}-hash`, migrationStatus.hash);
          this.setContextData(`migration-${this.cycle}-withDeletes`, false);
          this.setContextData(`migration-${this.cycle}-data`, migrationStatus);
          
          return {
            action: 'continue',
            additionalItems: [executeItem, nextCheckItem],
            data: { ...migrationStatus, withDeletes: false }
          };
        }
      },
      {
        id: 'confirm-with-deletes',
        label: 'Run Migrations (with DELETE)',
        description: 'Execute migrations including DROP queries',
        variant: 'primary',
        execute: async () => {
          // Store migration data in context for ExecuteMigrationsTimelineItem
          this.setContextData(`migration-${this.cycle}-hash`, migrationStatus.hash);
          this.setContextData(`migration-${this.cycle}-withDeletes`, true);
          this.setContextData(`migration-${this.cycle}-data`, migrationStatus);
          
          return {
            action: 'continue',
            additionalItems: [executeItem, nextCheckItem],
            data: { ...migrationStatus, withDeletes: true }
          };
        }
      },
      {
        id: 'skip',
        label: 'Skip Migrations',
        description: 'Skip all remaining migrations',
        variant: 'secondary',
        execute: async () => ({ action: 'skip' })
      },
      {
        id: 'cancel',
        label: 'Cancel Workflow',
        description: 'Cancel the entire workflow',
        variant: 'danger',
        execute: async () => ({ action: 'stop' })
      }
    ];
    
    const uiContent = this.renderMigrationPrompt(migrationStatus);
    
    return this.requireUserAction(actions, uiContent, migrationStatus);
  }
  
  private renderMigrationPrompt(migrationStatus: any): React.ReactNode {
    const migrationSummary = createMigrationSummary(migrationStatus, this.id);
    
    return (
      <VStack align="stretch" gap={4}>
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Pending database migrations detected</Alert.Title>
            <Alert.Description>
              The system has detected pending database migrations that need to be executed 
              to complete the update process.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
        
        {migrationStatus.operations && (
          <MigrationOperations 
            data={migrationStatus} 
            summary={migrationSummary}
          />
        )}
        
        <Text fontSize="sm">
          Choose how to proceed with the migrations:
        </Text>
      </VStack>
    );
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