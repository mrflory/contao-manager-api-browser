import React, { useState } from 'react';
import { VStack, HStack, Text, Badge, Button, Box, Link, Alert } from '@chakra-ui/react';
import { LuChevronDown as ChevronDown, LuChevronUp as ChevronUp, LuExternalLink as ExternalLink } from 'react-icons/lu';
import { BaseTimelineItem } from '../engine/BaseTimelineItem';
import { TimelineResult, UserAction, WorkflowContext } from '../engine/types';
import { api } from '../../utils/api';
import { CodeBlock } from '../../components/ui/code-block';
import { getOperationBadgeColor, getOperationBadgeText } from '../../utils/workflowUtils';

/**
 * Timeline item for checking pending tasks
 */
export class CheckTasksTimelineItem extends BaseTimelineItem {
  constructor() {
    super(
      'check-tasks',
      'Check Pending Tasks',
      'Verify no other tasks are running'
    );
  }
  
  async execute(context?: WorkflowContext): Promise<TimelineResult> {
    this.context = context;
    this.setActive();
    
    try {
      // Emit initial progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, { status: 'active', message: 'Checking for pending tasks...' });
      }
      
      // Check for regular tasks first
      const taskData = await api.getTaskData();
      if (taskData && Object.keys(taskData).length > 0) {
        // Emit progress update about found tasks
        if (this.context?.engine) {
          this.context.engine.emitProgress(this, { status: 'active', message: 'Found pending tasks', taskData });
        }
        return this.handlePendingTasks(taskData);
      }
      
      // Emit progress update for migration check
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, { status: 'active', message: 'Checking for pending migrations...' });
      }
      
      // Also check for database migration tasks
      try {
        const migrationStatus = await api.getDatabaseMigrationStatus();
        if (migrationStatus && Object.keys(migrationStatus).length > 0 && migrationStatus.status) {
          if (migrationStatus.status === 'active' || migrationStatus.status === 'pending') {
            // Emit progress update about found migrations
            if (this.context?.engine) {
              this.context.engine.emitProgress(this, { status: 'active', message: 'Found pending migrations', migrationStatus });
            }
            return this.handlePendingMigration(migrationStatus);
          }
        }
      } catch (migrationError) {
        // Log unexpected migration errors but don't fail the workflow
        console.warn('Migration status check failed:', migrationError);
      }
      
      // Emit final progress update
      if (this.context?.engine) {
        this.context.engine.emitProgress(this, { status: 'complete', message: 'No pending tasks found' });
      }
      
      // No pending tasks found - return success result with UI content
      const result = this.setComplete({ noPendingTasks: true });
      result.uiContent = this.renderNoTasksSuccess();
      return result;
      
    } catch (error) {
      // 204 No Content means no tasks - this is what we want
      if (error instanceof Error && error.message.includes('204')) {
        // Emit final progress update
        if (this.context?.engine) {
          this.context.engine.emitProgress(this, { status: 'complete', message: 'No pending tasks found' });
        }
        const result = this.setComplete({ noPendingTasks: true });
        result.uiContent = this.renderNoTasksSuccess();
        return result;
      } else {
        return this.setError(error instanceof Error ? error.message : 'Failed to check tasks');
      }
    }
  }
  
  private handlePendingTasks(taskData: any): TimelineResult {
    const actions: UserAction[] = [
      {
        id: 'clear-tasks',
        label: 'Clear Tasks & Continue',
        variant: 'primary',
        execute: async () => {
          try {
            // Emit progress update for clearing tasks
            if (this.context?.engine) {
              this.context.engine.emitProgress(this, { status: 'active', message: 'Clearing pending tasks...' });
            }
            
            // If task is active, abort it first
            if (taskData.status === 'active') {
              console.log('Aborting active task before deletion');
              
              // Emit progress update for aborting
              if (this.context?.engine) {
                this.context.engine.emitProgress(this, { status: 'active', message: 'Aborting active task...' });
              }
              
              await api.patchTaskStatus('aborting');
              
              // Wait for task to be aborted (polling until status changes to 'stopped')
              let attempts = 0;
              const maxAttempts = 10;
              while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
                
                // Emit progress update during polling
                if (this.context?.engine) {
                  this.context.engine.emitProgress(this, { 
                    status: 'active', 
                    message: `Waiting for task to abort... (${attempts + 1}/${maxAttempts})`
                  });
                }
                
                const currentTask = await api.getTaskData();
                if (!currentTask || currentTask.status === 'stopped' || currentTask.status === 'error') {
                  break;
                }
                attempts++;
              }
            }
            
            // Emit progress update for deleting
            if (this.context?.engine) {
              this.context.engine.emitProgress(this, { status: 'active', message: 'Deleting task data...' });
            }
            
            // Now delete the task
            await api.deleteTaskData();
            
            // Emit completion progress update
            if (this.context?.engine) {
              this.context.engine.emitProgress(this, { status: 'complete', message: 'Tasks cleared successfully' });
            }
            
            return { action: 'continue' };
          } catch (error) {
            throw error;
          }
        }
      },
      {
        id: 'cancel',
        label: 'Cancel',
        variant: 'secondary',
        execute: async () => ({ action: 'cancel' })
      }
    ];
    
    const uiContent = this.renderTaskDisplay(taskData);
    
    return this.requireUserAction(actions, uiContent, taskData);
  }
  
  private handlePendingMigration(migrationStatus: any): TimelineResult {
    const actions: UserAction[] = [
      {
        id: 'clear-migration',
        label: 'Clear Migration Task & Continue',
        variant: 'primary',
        execute: async () => {
          try {
            // Emit progress update for clearing migration
            if (this.context?.engine) {
              this.context.engine.emitProgress(this, { status: 'active', message: 'Clearing pending migration task...' });
            }
            
            await api.deleteDatabaseMigrationTask();
            
            // Emit completion progress update
            if (this.context?.engine) {
              this.context.engine.emitProgress(this, { status: 'complete', message: 'Migration task cleared successfully' });
            }
            
            return { action: 'continue' };
          } catch (error) {
            throw error;
          }
        }
      },
      {
        id: 'cancel',
        label: 'Cancel',
        variant: 'secondary',
        execute: async () => ({ action: 'cancel' })
      }
    ];
    
    const uiContent = this.renderMigrationDisplay(migrationStatus);
    
    return this.requireUserAction(actions, uiContent, {
      migrationType: 'database-migration',
      migrationStatus
    });
  }
  
  private renderTaskDisplay(taskData: any): React.ReactNode {
    const cardBg = 'white'; // We'll need to handle color mode later
    
    // Console output visibility state for each operation
    const ConsoleToggle = ({ operation }: { operation: any }) => {
      const [showConsole, setShowConsole] = useState(false);
      
      if (!operation.console || !operation.console.trim()) {
        return null;
      }
      
      return (
        <>
          <Button 
            variant="outline" 
            size="xs" 
            width="fit-content"
            display="flex"
            alignItems="center"
            gap={1}
            onClick={() => setShowConsole(!showConsole)}
          >
            {showConsole ? <ChevronUp size={12} /> : <ChevronDown size={12} />} 
            {showConsole ? 'Hide' : 'View'} Console Output
          </Button>
          {showConsole && (
            <Box mt={2} overflowX="hidden">
              <CodeBlock 
                language="bash"
                showLineNumbers
                maxHeight="300px"
              >
                {operation.console}
              </CodeBlock>
            </Box>
          )}
        </>
      );
    };
    
    return (
      <VStack align="stretch" gap={3}>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          Current pending tasks:
        </Text>
        
        {taskData.title && (
          <VStack align="stretch" gap={2} mb={3}>
            <HStack justify="space-between" align="center">
              <Text fontSize="sm" fontWeight="bold" color="blue.600">
                {taskData.title}
              </Text>
              <Badge 
                colorPalette={
                  taskData.status === 'complete' ? 'green' :
                  taskData.status === 'active' ? 'blue' :
                  taskData.status === 'error' ? 'red' : 'gray'
                }
                size="sm"
              >
                {taskData.status}
              </Badge>
            </HStack>
            
            {taskData.id && (
              <Text fontSize="xs" color="gray.500">
                Task ID: {taskData.id}
              </Text>
            )}
            
            {taskData.sponsor && (
              <HStack fontSize="xs" color="gray.500">
                <Text>Sponsored by:</Text>
                <Link 
                  href={taskData.sponsor.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {taskData.sponsor.name} <ExternalLink size={10} style={{ display: 'inline' }} />
                </Link>
              </HStack>
            )}
          </VStack>
        )}
        
        {taskData.operations && Array.isArray(taskData.operations) ? (
          <VStack align="stretch" gap={3}>
            {taskData.operations.map((operation: any, index: number) => (
              <Box key={index} p={3} borderWidth="1px" borderRadius="md" bg={cardBg} minW={0}>
                <VStack align="stretch" gap={2}>
                  <HStack justify="space-between" align="start">
                    <Text fontSize="sm" fontWeight="bold" color="blue.600" flex="1">
                      {operation.summary}
                    </Text>
                    <Badge 
                      colorPalette={getOperationBadgeColor(operation.status)}
                      size="sm"
                    >
                      {getOperationBadgeText(operation.status)}
                    </Badge>
                  </HStack>
                  
                  {operation.details && operation.details.trim() && (
                    <Text fontSize="xs" color="gray.500">
                      {operation.details}
                    </Text>
                  )}
                  
                  <ConsoleToggle operation={operation} />
                </VStack>
              </Box>
            ))}
          </VStack>
        ) : (
          <Text fontSize="sm" color="gray.600">
            {taskData.title || 'Task running...'}
          </Text>
        )}
        
        <Text fontSize="sm">
          You can either wait for the current tasks to complete, or force clear them to continue 
          with the update workflow.
        </Text>
      </VStack>
    );
  }
  
  private renderMigrationDisplay(migrationStatus: any): React.ReactNode {
    return (
      <VStack align="stretch" gap={3}>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          Current pending database migration task:
        </Text>
        
        <HStack justify="space-between" align="center">
          <Text fontSize="sm" flex="1">
            Database Migration Task
          </Text>
          <Badge 
            colorPalette={
              migrationStatus.status === 'active' ? 'blue' :
              migrationStatus.status === 'pending' ? 'gray' :
              migrationStatus.status === 'complete' ? 'green' :
              migrationStatus.status === 'error' ? 'red' : 'gray'
            }
            size="sm"
          >
            {migrationStatus.status === 'active' ? 'Running' :
             migrationStatus.status === 'pending' ? 'Pending' :
             migrationStatus.status === 'complete' ? 'Complete' :
             migrationStatus.status === 'error' ? 'Error' :
             migrationStatus.status}
          </Badge>
        </HStack>
        
        <Text fontSize="sm">
          You can either wait for the current migration task to complete, or force clear it to continue 
          with the update workflow.
        </Text>
      </VStack>
    );
  }
  
  private renderNoTasksSuccess(): React.ReactNode {
    return (
      <Alert.Root status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>No pending tasks</Alert.Title>
          <Alert.Description>
            All systems are clear - no tasks are currently running or pending.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );
  }
}