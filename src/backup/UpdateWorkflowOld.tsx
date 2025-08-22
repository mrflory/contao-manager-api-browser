import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Heading,
  Alert,
} from '@chakra-ui/react';
import { ProgressRoot, ProgressBar } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { LuPlay as Play, LuPause as Pause, LuRefreshCw as RefreshCw } from 'react-icons/lu';
import { useColorModeValue } from './ui/color-mode';
import { useToastNotifications, TOAST_MESSAGES } from '../hooks/useToastNotifications';
import { WorkflowTimeline } from './WorkflowTimeline';
import { useWorkflow } from '../hooks/useWorkflowOld';
import { WorkflowConfig } from '../types';

// Helper function to analyze migration operations and create detailed summary
const createMigrationSummary = (migrationData: any, stepId?: string) => {
  if (!migrationData || !migrationData.operations) {
    return null;
  }

  const operationCounts: Record<string, number> = {};
  const operationDetails: Record<string, any[]> = {};
  const deleteOperations: any[] = [];
  
  // Initialize operation categories
  const categories = ['CREATE_TABLE', 'DROP_TABLE', 'CREATE_INDEX', 'DROP_INDEX', 'ALTER_TABLE', 'OTHER'];
  categories.forEach(cat => {
    operationCounts[cat] = 0;
    operationDetails[cat] = [];
  });

  let hasDeletes = false;

  // Analyze each operation using regex patterns from MigrationView.vue
  migrationData.operations.forEach((operation: any) => {
    const operationName = operation.name || '';
    let classified = false;
    
    // CREATE TABLE pattern
    const createTableMatch = /^CREATE TABLE ([^ ]+) .+$/.exec(operationName);
    if (createTableMatch) {
      operationCounts.CREATE_TABLE++;
      operationDetails.CREATE_TABLE.push({
        ...operation,
        tableName: createTableMatch[1],
        requiresDeletes: false
      });
      classified = true;
    }
    
    // DROP TABLE pattern  
    const dropTableMatch = /^DROP TABLE (.+)$/.exec(operationName);
    if (dropTableMatch && !classified) {
      operationCounts.DROP_TABLE++;
      operationDetails.DROP_TABLE.push({
        ...operation,
        tableName: dropTableMatch[1],
        requiresDeletes: true
      });
      deleteOperations.push(operation);
      hasDeletes = true;
      classified = true;
    }
    
    // CREATE INDEX pattern
    const createIndexMatch = /^CREATE INDEX ([^ ]+) ON ([^ ]+) \(([^)]+)\)$/.exec(operationName);
    if (createIndexMatch && !classified) {
      operationCounts.CREATE_INDEX++;
      operationDetails.CREATE_INDEX.push({
        ...operation,
        indexName: createIndexMatch[1],
        tableName: createIndexMatch[2],
        columns: createIndexMatch[3],
        requiresDeletes: false
      });
      classified = true;
    }
    
    // DROP INDEX pattern
    const dropIndexMatch = /^DROP INDEX ([^ ]+) ON ([^ ]+)$/.exec(operationName);
    if (dropIndexMatch && !classified) {
      operationCounts.DROP_INDEX++;
      operationDetails.DROP_INDEX.push({
        ...operation,
        indexName: dropIndexMatch[1],
        tableName: dropIndexMatch[2],
        requiresDeletes: true
      });
      deleteOperations.push(operation);
      hasDeletes = true;
      classified = true;
    }
    
    // ALTER TABLE pattern
    const alterTableMatch = /^ALTER TABLE ([^ ]+) (.+)$/.exec(operationName);
    if (alterTableMatch && !classified) {
      const tableName = alterTableMatch[1];
      const alterStatement = alterTableMatch[2];
      
      // Parse ALTER TABLE sub-operations
      let stm = '';
      alterStatement.split("'").forEach((ex, i) => {
        if (i % 2) {
          stm = `${stm}'${ex.replace(',', '%comma%')}'`;
        } else {
          stm = `${stm}${ex}`;
        }
      });
      
      const subOps = stm.split(',').map((p) => p.trim().replace('%comma%', ','));
      const subOperations: any[] = [];
      let hasDrops = false;
      
      subOps.forEach((subOp) => {
        const addFieldMatch = /^ADD ([^ ]+) (.+)$/.exec(subOp);
        const changeFieldMatch = /^CHANGE ([^ ]+) ([^ ]+) (.+)$/.exec(subOp);
        const dropFieldMatch = /^DROP (.+)$/.exec(subOp);
        
        if (addFieldMatch) {
          subOperations.push({
            type: 'ADD',
            fieldName: addFieldMatch[1],
            definition: addFieldMatch[2],
            requiresDeletes: false
          });
        } else if (changeFieldMatch) {
          subOperations.push({
            type: 'CHANGE',
            oldField: changeFieldMatch[1],
            newField: changeFieldMatch[2],
            definition: changeFieldMatch[3],
            requiresDeletes: false
          });
        } else if (dropFieldMatch) {
          subOperations.push({
            type: 'DROP',
            fieldName: dropFieldMatch[1],
            requiresDeletes: true
          });
          hasDrops = true;
        } else {
          subOperations.push({
            type: 'OTHER',
            statement: subOp,
            requiresDeletes: false
          });
        }
      });
      
      operationCounts.ALTER_TABLE++;
      operationDetails.ALTER_TABLE.push({
        ...operation,
        tableName,
        subOperations,
        requiresDeletes: hasDrops
      });
      
      if (hasDrops) {
        deleteOperations.push(operation);
        hasDeletes = true;
      }
      classified = true;
    }
    
    // Fallback for unmatched operations
    if (!classified) {
      operationCounts.OTHER++;
      operationDetails.OTHER.push({
        ...operation,
        requiresDeletes: true // Assume unknown operations might be deletes
      });
      deleteOperations.push(operation);
      hasDeletes = true;
    }
  });

  // Filter out zero counts and create summary
  const nonZeroOperations = categories
    .filter(cat => operationCounts[cat] > 0)
    .map(cat => ({ 
      category: cat, 
      count: operationCounts[cat],
      operations: operationDetails[cat]
    }));

  return {
    stepId: stepId || 'unknown', // Include step ID for cycle isolation
    totalOperations: migrationData.operations.length,
    operationBreakdown: nonZeroOperations,
    operationDetails,
    deleteOperations,
    hasDeletes,
    migrationType: migrationData.type || 'unknown',
    migrationHash: migrationData.hash
  };
};

export const UpdateWorkflow: React.FC = () => {
  const [config, setConfig] = useState<WorkflowConfig>({ 
    performDryRun: true
  });
  
  const configBg = useColorModeValue('gray.50', 'gray.700');
  const toast = useToastNotifications();
  
  const {
    state,
    initializeWorkflow,
    startWorkflow,
    startWorkflowFromStep,
    stopWorkflow,
    resumeWorkflow,
    clearPendingTasks,
    confirmMigrations,
    skipMigrations,
    skipComposerUpdate,
    isComplete,
    hasPendingMigrations
  } = useWorkflow();

  useEffect(() => {
    initializeWorkflow(config);
  }, [config, initializeWorkflow]);

  // Check if current step has pending tasks error
  const currentStep = state.steps[state.currentStep];
  const hasPendingTasksError = currentStep?.id === 'check-tasks' && 
                              currentStep?.status === 'error' && 
                              (currentStep?.error?.includes('Pending tasks') || 
                               currentStep?.error?.includes('Pending database migration task'));

  // Check if dry-run is complete and waiting for confirmation
  const dryRunStep = state.steps.find(step => step.id === 'composer-dry-run');
  const hasDryRunComplete = dryRunStep?.status === 'complete' && 
                           state.isPaused && 
                           currentStep?.id === 'composer-update';

  const handleStartWorkflow = () => {
    startWorkflow();
    toast.showInfo(TOAST_MESSAGES.WORKFLOW_STARTED);
  };

  const handleStop = () => {
    stopWorkflow();
    toast.showWarning(TOAST_MESSAGES.WORKFLOW_STOPPED);
  };

  const handleResume = () => {
    resumeWorkflow();
    toast.showInfo(TOAST_MESSAGES.WORKFLOW_RESUMED);
  };

  const handleClearTasks = async () => {
    await clearPendingTasks();
  };

  const handleCancelPendingTasks = () => {
    initializeWorkflow(config);
    toast.showWarning({
      title: 'Workflow Cancelled',
      description: 'Please resolve pending tasks manually before starting the workflow again.',
      duration: 5000,
    });
  };

  const handleConfirmMigrations = (withDeletes?: boolean) => {
    confirmMigrations(withDeletes);
    toast.showInfo(TOAST_MESSAGES.MIGRATIONS_CONFIRMED);
  };

  const handleSkipMigrations = () => {
    skipMigrations();
    toast.showWarning(TOAST_MESSAGES.MIGRATIONS_SKIPPED);
  };

  const handleCancelMigrations = () => {
    initializeWorkflow(config);
    toast.showWarning({
      title: 'Workflow Cancelled',
      description: 'Database migrations cancelled. You can resolve them manually and restart the workflow.',
      duration: 5000,
    });
  };

  const handleContinueUpdate = () => {
    resumeWorkflow();
    toast.showInfo({
      title: 'Update Continuing',
      description: 'Proceeding with composer update',
    });
  };

  const handleSkipComposerUpdate = () => {
    skipComposerUpdate();
    toast.showWarning({
      title: 'Composer Update Skipped',
      description: 'Skipping composer update and proceeding to database migrations',
      duration: 5000,
    });
  };

  const handleCancelWorkflow = () => {
    initializeWorkflow(config);
    toast.showWarning(TOAST_MESSAGES.WORKFLOW_CANCELLED);
  };

  const handleStartFromDryRun = () => {
    startWorkflowFromStep('composer-dry-run');
    toast.showInfo(TOAST_MESSAGES.DEBUG_MODE('Starting workflow from composer dry-run step'));
  };

  const handleStartFromMigrations = () => {
    startWorkflowFromStep('check-migrations-loop');
    toast.showInfo(TOAST_MESSAGES.DEBUG_MODE('Starting workflow from database migration check step'));
  };

  const getWorkflowProgress = () => {
    const completedSteps = state.steps.filter(step => 
      step.status === 'complete' || step.status === 'skipped'
    ).length;
    return (completedSteps / state.steps.length) * 100;
  };


  const getWorkflowStatus = () => {
    if (isComplete) return 'complete';
    if (state.error) return 'error';
    if (state.isRunning) return 'running';
    if (state.isPaused) return 'paused';
    return 'ready';
  };

  const getStatusBadge = () => {
    const status = getWorkflowStatus();
    const colorMap = {
      complete: 'green',
      error: 'red',
      running: 'blue',
      paused: 'orange',
      ready: 'gray'
    };
    
    const textMap = {
      complete: 'Complete',
      error: 'Error',
      running: 'Running',
      paused: 'Paused',
      ready: 'Ready'
    };

    return (
      <Text color={`${colorMap[status as keyof typeof colorMap]}.500`} fontWeight="semibold">
        {textMap[status as keyof typeof textMap]}
      </Text>
    );
  };

  const canStart = !state.isRunning && !isComplete && state.steps.length > 0;
  const canStop = state.isRunning;
  const canResume = state.isPaused;

  return (
    <VStack gap={6} align="stretch">
      {/* Workflow Header */}
      <Box mb={6}>
        <VStack gap={4} align="stretch">
          <HStack justify="space-between" align="center">
            <Heading size="lg">Automated Contao Update</Heading>
            {getStatusBadge()}
          </HStack>
          
          <Text color="gray.600">
            This workflow will automatically update your Contao installation including the manager, 
            composer packages, and database migrations.
          </Text>

          {state.isRunning && (
            <Box>
              <Text fontSize="sm" mb={2}>Progress</Text>
              <ProgressRoot value={getWorkflowProgress()} colorPalette="blue">
                <ProgressBar />
              </ProgressRoot>
            </Box>
          )}

          {/* Configuration */}
          {!state.isRunning && !isComplete && (
            <Box>
              <Text fontWeight="semibold" mb={3}>Configuration</Text>
              <VStack align="start" gap={3}>
                <Checkbox
                  checked={!config.performDryRun}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, performDryRun: !checked.checked }))}
                >
                  Skip composer dry-run
                </Checkbox>
              </VStack>
            </Box>
          )}

          {/* Action Buttons */}
          <VStack gap={3} align="stretch">
            {canStart && (
              <Button
                colorPalette="blue"
                onClick={handleStartWorkflow}
                size="lg"
              >
                <Play size={16} /> Start Update Workflow
              </Button>
            )}
            
            {canStart && (
              <HStack gap={2} justify="center">
                <Button
                  variant="outline"
                  colorPalette="gray"
                  onClick={handleStartFromDryRun}
                  size="xs"
                >
                  🔧 Debug: Start from Dry-run
                </Button>
                <Button
                  variant="outline"
                  colorPalette="gray"
                  onClick={handleStartFromMigrations}
                  size="xs"
                >
                  🔧 Debug: Start from Migrations
                </Button>
              </HStack>
            )}
            
            {canStop && (
              <Button
                colorPalette="orange"
                onClick={handleStop}
                size="lg"
              >
                <Pause size={16} /> Pause Workflow
              </Button>
            )}
            
            {canResume && (
              <Button
                colorPalette="blue"
                onClick={handleResume}
                size="lg"
              >
                <Play size={16} /> Resume Workflow
              </Button>
            )}

            {isComplete && (
              <Button
                colorPalette="green"
                onClick={() => initializeWorkflow(config)}
                size="lg"
              >
                <RefreshCw size={16} /> Run Again
              </Button>
            )}
          </VStack>

          {/* Success Alert */}
          {isComplete && !state.error && (
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Update Complete!</Alert.Title>
                <Alert.Description>
                  Your Contao installation has been successfully updated. All components are now up to date.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
        </VStack>
      </Box>

      {/* Timeline */}
      {state.steps.length > 0 && (
        <Box borderWidth="1px" p={6} borderRadius="lg">
          <Heading size="md" mb={4}>Workflow Progress</Heading>
          <WorkflowTimeline 
            steps={state.steps} 
            currentStep={state.currentStep}
            createMigrationSummary={createMigrationSummary}
            hasPendingTasksError={!!hasPendingTasksError}
            hasPendingMigrations={!!hasPendingMigrations}
            hasDryRunComplete={!!hasDryRunComplete}
            onClearTasks={handleClearTasks}
            onCancelPendingTasks={handleCancelPendingTasks}
            onConfirmMigrations={handleConfirmMigrations}
            onSkipMigrations={handleSkipMigrations}
            onCancelMigrations={handleCancelMigrations}
            onContinueUpdate={handleContinueUpdate}
            onSkipComposerUpdate={handleSkipComposerUpdate}
            onCancelWorkflow={handleCancelWorkflow}
            configBg={configBg}
          />
        </Box>
      )}
    </VStack>
  );
};