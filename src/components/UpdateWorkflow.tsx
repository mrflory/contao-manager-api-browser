import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Heading,
  createToaster,
  Badge
} from '@chakra-ui/react';
import { ProgressRoot, ProgressBar } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import {
  DialogRoot,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from './ui/dialog';
import { Alert } from '@chakra-ui/react';
import { LuPlay as Play, LuPause as Pause, LuRefreshCw as RefreshCw, LuTriangleAlert as AlertTriangle, LuCircleCheck as CheckCircle, LuInfo as Info, LuCircleX as XCircle } from 'react-icons/lu';
import { useColorModeValue } from './ui/color-mode';
import { WorkflowTimeline } from './WorkflowTimeline';
import { useWorkflow } from '../hooks/useWorkflow';
import { WorkflowConfig } from '../types';

export const UpdateWorkflow: React.FC = () => {
  const [config, setConfig] = useState<WorkflowConfig>({ 
    performDryRun: false,
    withDeletes: false 
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingTasksModalOpen, setPendingTasksModalOpen] = useState(false);
  const [migrationsModalOpen, setMigrationsModalOpen] = useState(false);
  
  const configSummaryBg = useColorModeValue('blue.50', 'blue.900');
  const configBg = useColorModeValue('gray.50', 'gray.700');
  const toaster = createToaster({
    placement: 'top',
  });
  
  const {
    state,
    initializeWorkflow,
    startWorkflow,
    stopWorkflow,
    resumeWorkflow,
    clearPendingTasks,
    confirmMigrations,
    skipMigrations,
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
                              currentStep?.error?.includes('Pending tasks');

  useEffect(() => {
    if (hasPendingTasksError && !pendingTasksModalOpen) {
      setPendingTasksModalOpen(true);
    }
  }, [hasPendingTasksError, pendingTasksModalOpen]);

  useEffect(() => {
    if (hasPendingMigrations && !migrationsModalOpen) {
      setMigrationsModalOpen(true);
    }
  }, [hasPendingMigrations, migrationsModalOpen]);

  const handleStartWorkflow = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirmStart = () => {
    setIsConfirmModalOpen(false);
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
    setPendingTasksModalOpen(false);
    await clearPendingTasks();
  };

  const handleConfirmMigrations = () => {
    setMigrationsModalOpen(false);
    confirmMigrations();
    toaster.create({
      title: 'Migrations Confirmed',
      description: 'Database migrations will now be executed',
      type: 'info',
      duration: 3000,
    });
  };

  const handleSkipMigrations = () => {
    setMigrationsModalOpen(false);
    skipMigrations();
    toaster.create({
      title: 'Migrations Skipped',
      description: 'Database migrations were skipped. You can run them manually later.',
      type: 'warning',
      duration: 5000,
    });
  };

  const getWorkflowProgress = () => {
    const completedSteps = state.steps.filter(step => 
      step.status === 'complete' || step.status === 'skipped'
    ).length;
    return (completedSteps / state.steps.length) * 100;
  };

  const getEstimatedTime = () => {
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
                  checked={config.performDryRun}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, performDryRun: !!checked.checked }))}
                >
                  Perform composer dry-run before actual update
                </Checkbox>
                <Checkbox
                  checked={config.withDeletes}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, withDeletes: !!checked.checked }))}
                >
                  Execute migrations including DROP queries
                </Checkbox>
                <Text fontSize="sm" color="gray.600">
                  <strong>Estimated time:</strong> {getEstimatedTime()}
                </Text>
              </VStack>
            </Box>
          )}

          {/* Action Buttons */}
          <HStack gap={3}>
            {canStart && (
              <Button
                colorPalette="blue"
                onClick={handleStartWorkflow}
                size="lg"
              >
                <Play size={16} /> Start Update Workflow
              </Button>
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
          </HStack>

          {/* Error Alert */}
          {state.error && (
            <Alert.Root status="error">
              <Alert.Indicator>
                <XCircle size={20} />
              </Alert.Indicator>
              <Box>
                <Alert.Title>Workflow Error!</Alert.Title>
                <Alert.Description>{state.error}</Alert.Description>
              </Box>
            </Alert.Root>
          )}

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
          <WorkflowTimeline steps={state.steps} currentStep={state.currentStep} />
        </Box>
      )}

      {/* Confirm Start Modal */}
      <DialogRoot open={isConfirmModalOpen} onOpenChange={(details) => !details.open && setIsConfirmModalOpen(false)}>
        <DialogBackdrop />
        <DialogContent>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>Confirm Update Workflow</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4} align="stretch">
              <Alert.Root status="warning">
                <Alert.Indicator>
                  <AlertTriangle size={20} />
                </Alert.Indicator>
                <Box>
                  <Alert.Title>Important!</Alert.Title>
                  <Alert.Description>
                    This process will update your Contao installation and may cause temporary downtime. 
                    Make sure you have a backup before proceeding.
                  </Alert.Description>
                </Box>
              </Alert.Root>
              
              <Text>The workflow will perform the following steps:</Text>
              <VStack align="start" gap={1} pl={4}>
                <Text fontSize="sm">• Check for pending tasks</Text>
                <Text fontSize="sm">• Update Contao Manager (if needed)</Text>
                {config.performDryRun && (
                  <Text fontSize="sm">• Run composer dry-run test</Text>
                )}
                <Text fontSize="sm">• Update composer packages</Text>
                <Text fontSize="sm">• Check for database migrations (cyclically until complete)</Text>
                <Text fontSize="sm">• Execute database migrations (with confirmation){config.withDeletes ? ' including DROP queries' : ''}</Text>
                <Text fontSize="sm">• Update version information</Text>
              </VStack>

              {/* Configuration Summary */}
              <Box p={3} bg={configSummaryBg} borderRadius="md">
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Configuration Summary:</Text>
                <VStack align="start" gap={1} fontSize="sm">
                  <Text>• Composer dry-run: {config.performDryRun ? 'Enabled' : 'Disabled'}</Text>
                  <Text>• Include DROP queries in migrations: {config.withDeletes ? 'Enabled' : 'Disabled'}</Text>
                </VStack>
                {config.withDeletes && (
                  <Text fontSize="xs" color="orange.600" mt={2}>
                    ⚠️ DROP queries may remove data or database structures
                  </Text>
                )}
              </Box>
              
              <Text fontSize="sm" color="gray.600">
                Estimated time: {getEstimatedTime()}
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button colorPalette="blue" onClick={handleConfirmStart}>
              Start Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      {/* Pending Tasks Modal */}
      <DialogRoot open={pendingTasksModalOpen} onOpenChange={(details) => !details.open && setPendingTasksModalOpen(false)}>
        <DialogBackdrop />
        <DialogContent>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>Pending Tasks Found</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4} align="stretch">
              <Alert.Root status="warning">
                <Alert.Indicator>
                  <AlertTriangle size={20} />
                </Alert.Indicator>
                <Box>
                  <Alert.Title>Tasks are currently running</Alert.Title>
                  <Alert.Description>
                    There are pending tasks that must be cleared before the update workflow can proceed.
                  </Alert.Description>
                </Box>
              </Alert.Root>
              
              {currentStep?.data && (
                <Box p={3} bg={configBg} borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Current task details:</Text>
                  <Text fontSize="xs" fontFamily="mono">
                    {JSON.stringify(currentStep.data, null, 2)}
                  </Text>
                </Box>
              )}
              
              <Text fontSize="sm">
                You can either wait for the current tasks to complete, or force clear them to continue 
                with the update workflow.
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" mr={3} onClick={() => setPendingTasksModalOpen(false)}>
              Cancel
            </Button>
            <Button colorPalette="orange" onClick={handleClearTasks}>
              Clear Tasks & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      {/* Database Migrations Confirmation Modal */}
      <DialogRoot open={migrationsModalOpen} onOpenChange={(details) => !details.open && setMigrationsModalOpen(false)}>
        <DialogBackdrop />
        <DialogContent>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>Database Migrations Required</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4} align="stretch">
              <Alert.Root status="info">
                <Alert.Indicator>
                  <Info size={20} />
                </Alert.Indicator>
                <Box>
                  <Alert.Title>Pending database migrations detected</Alert.Title>
                  <Alert.Description>
                    The system has detected pending database migrations that need to be executed 
                    to complete the update process.
                  </Alert.Description>
                </Box>
              </Alert.Root>
              
              {state.steps.find(step => step.id === 'check-migrations-loop')?.data && (
                <Box p={3} bg={configBg} borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Migration details:</Text>
                  <Text fontSize="xs" fontFamily="mono">
                    {JSON.stringify(state.steps.find(step => step.id === 'check-migrations-loop')?.data, null, 2)}
                  </Text>
                </Box>
              )}
              
              {/* Migration Configuration Display */}
              <Box p={3} borderWidth="1px" borderRadius="md">
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Migration Settings:</Text>
                <HStack gap={4}>
                  <Text fontSize="sm">
                    <strong>Include DROP queries:</strong> {config.withDeletes ? 'Yes' : 'No'}
                  </Text>
                </HStack>
                {config.withDeletes && (
                  <Alert.Root status="warning" size="sm" mt={2}>
                    <Alert.Indicator>
                      <AlertTriangle size={16} />
                    </Alert.Indicator>
                    <Alert.Description fontSize="xs">
                      DROP queries will be executed, which may remove data or database structures.
                    </Alert.Description>
                  </Alert.Root>
                )}
              </Box>
              
              <Text fontSize="sm">
                <strong>Important:</strong> Database migrations will modify your database structure. 
                It's recommended to have a backup before proceeding.
              </Text>
              
              <Text fontSize="sm">
                You can either proceed with the migrations now, or skip them and run them manually later 
                through the Expert functions.
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" mr={3} onClick={handleSkipMigrations}>
              Skip Migrations
            </Button>
            <Button colorPalette="blue" onClick={handleConfirmMigrations}>
              Run Migrations
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </VStack>
  );
};