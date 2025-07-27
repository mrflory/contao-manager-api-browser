import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Heading,
  Badge
} from '@chakra-ui/react';
import { ProgressRoot, ProgressBar } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Alert } from '@chakra-ui/react';
import { LuPlay as Play, LuPause as Pause, LuRefreshCw as RefreshCw, LuCircleCheck as CheckCircle } from 'react-icons/lu';
import { useColorModeValue } from './ui/color-mode';
import { toaster } from './ui/toaster';
import { WorkflowTimeline } from './WorkflowTimeline';
import { useWorkflow } from '../hooks/useWorkflow';
import { WorkflowConfig } from '../types';

// Helper function to analyze migration operations and create summary
const createMigrationSummary = (migrationData: any) => {
  if (!migrationData || !migrationData.operations) {
    return null;
  }

  const operationCounts: Record<string, number> = {};
  const sqlOperations = ['CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE'];
  
  // Initialize counters
  sqlOperations.forEach(op => operationCounts[op] = 0);
  operationCounts['OTHER'] = 0;

  // Analyze each operation
  migrationData.operations.forEach((operation: any) => {
    const operationName = operation.name || '';
    let classified = false;
    
    // Check for each SQL operation type
    for (const sqlOp of sqlOperations) {
      if (operationName.toUpperCase().includes(sqlOp)) {
        operationCounts[sqlOp]++;
        classified = true;
        break;
      }
    }
    
    if (!classified) {
      operationCounts['OTHER']++;
    }
  });

  // Filter out zero counts and create summary
  const nonZeroOperations = Object.entries(operationCounts)
    .filter(([, count]) => count > 0)
    .map(([operation, count]) => ({ operation, count }));

  return {
    totalOperations: migrationData.operations.length,
    operationBreakdown: nonZeroOperations,
    migrationType: migrationData.type || 'unknown',
    migrationHash: migrationData.hash
  };
};

export const UpdateWorkflow: React.FC = () => {
  const [config, setConfig] = useState<WorkflowConfig>({ 
    performDryRun: true,
    withDeletes: false,
    skipComposer: false
  });
  const configBg = useColorModeValue('gray.50', 'gray.700');
  
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
    toaster.create({
      title: 'Workflow Started',
      description: 'Contao update workflow has begun',
      type: 'info',
      duration: 3000,
    });
  };

  const handleStop = () => {
    stopWorkflow();
    toaster.create({
      title: 'Workflow Stopped',
      description: 'Update workflow has been paused',
      type: 'warning',
      duration: 3000,
    });
  };

  const handleResume = () => {
    resumeWorkflow();
    toaster.create({
      title: 'Workflow Resumed',
      description: 'Update workflow is continuing',
      type: 'info',
      duration: 3000,
    });
  };

  const handleClearTasks = async () => {
    await clearPendingTasks();
  };

  const handleCancelPendingTasks = () => {
    // Reset the workflow to allow the dialog to appear again on next start
    initializeWorkflow(config);
    toaster.create({
      title: 'Workflow Cancelled',
      description: 'Please resolve pending tasks manually before starting the workflow again.',
      type: 'warning',
      duration: 5000,
    });
  };

  const handleConfirmMigrations = () => {
    confirmMigrations();
    toaster.create({
      title: 'Migrations Confirmed',
      description: 'Database migrations will now be executed',
      type: 'info',
      duration: 3000,
    });
  };

  const handleSkipMigrations = () => {
    skipMigrations();
    toaster.create({
      title: 'Migrations Skipped',
      description: 'Database migrations were skipped. You can run them manually later.',
      type: 'warning',
      duration: 5000,
    });
  };

  const handleCancelMigrations = () => {
    // Reset the workflow to allow the dialog to appear again on next start
    initializeWorkflow(config);
    toaster.create({
      title: 'Workflow Cancelled',
      description: 'Database migrations cancelled. You can resolve them manually and restart the workflow.',
      type: 'warning',
      duration: 5000,
    });
  };

  const handleContinueUpdate = () => {
    resumeWorkflow();
    toaster.create({
      title: 'Update Continuing',
      description: 'Proceeding with composer update',
      type: 'info',
      duration: 3000,
    });
  };

  const handleSkipComposerUpdate = () => {
    skipComposerUpdate();
    toaster.create({
      title: 'Composer Update Skipped',
      description: 'Skipping composer update and proceeding to database migrations',
      type: 'warning',
      duration: 5000,
    });
  };

  const handleCancelWorkflow = () => {
    // Reset the workflow to allow the dialog to appear again on next start
    initializeWorkflow(config);
    toaster.create({
      title: 'Workflow Cancelled',
      description: 'Update workflow has been cancelled',
      type: 'warning',
      duration: 3000,
    });
  };

  const handleStartFromDryRun = () => {
    startWorkflowFromStep('composer-dry-run');
    toaster.create({
      title: 'Debug Mode',
      description: 'Starting workflow from composer dry-run step',
      type: 'info',
      duration: 3000,
    });
  };

  const handleStartFromMigrations = () => {
    startWorkflowFromStep('check-migrations-loop');
    toaster.create({
      title: 'Debug Mode', 
      description: 'Starting workflow from database migration check step',
      type: 'info',
      duration: 3000,
    });
  };

  const getWorkflowProgress = () => {
    const completedSteps = state.steps.filter(step => 
      step.status === 'complete' || step.status === 'skipped'
    ).length;
    return (completedSteps / state.steps.length) * 100;
  };

  const getEstimatedTime = () => {
    if (config.skipComposer) {
      return "2-3 minutes"; // Only manager updates and migrations
    }
    const baseTime = 5; // Base 5 minutes
    const dryRunTime = config.performDryRun ? 3 : 0;
    return `${baseTime + dryRunTime}-${baseTime + dryRunTime + 5} minutes`;
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
    switch (status) {
      case 'complete':
        return <Badge colorPalette="green" size="lg">Complete</Badge>;
      case 'error':
        return <Badge colorPalette="red" size="lg">Error</Badge>;
      case 'running':
        return <Badge colorPalette="blue" size="lg">Running</Badge>;
      case 'paused':
        return <Badge colorPalette="orange" size="lg">Paused</Badge>;
      default:
        return <Badge colorPalette="gray" size="lg">Ready</Badge>;
    }
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
                <Checkbox
                  checked={config.withDeletes}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, withDeletes: !!checked.checked }))}
                >
                  Execute migrations including DROP queries
                </Checkbox>
                <Checkbox
                  checked={config.skipComposer}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, skipComposer: !!checked.checked }))}
                >
                  Skip composer steps (testing mode)
                </Checkbox>
                <Text fontSize="sm" color="gray.600">
                  <strong>Estimated time:</strong> {getEstimatedTime()}
                </Text>
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
              <Alert.Indicator>
                <CheckCircle size={20} />
              </Alert.Indicator>
              <Box>
                <Alert.Title>Update Complete!</Alert.Title>
                <Alert.Description>
                  Your Contao installation has been successfully updated. All components are now up to date.
                </Alert.Description>
              </Box>
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
            config={config}
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
            getEstimatedTime={getEstimatedTime}
          />
        </Box>
      )}




    </VStack>
  );
};