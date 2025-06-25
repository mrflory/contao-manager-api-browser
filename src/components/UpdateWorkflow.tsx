import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Heading,
  Badge,
  Code
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
    .filter(([_, count]) => count > 0)
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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingTasksModalOpen, setPendingTasksModalOpen] = useState(false);
  const [migrationsModalOpen, setMigrationsModalOpen] = useState(false);
  const [dryRunConfirmModalOpen, setDryRunConfirmModalOpen] = useState(false);
  
  const configSummaryBg = useColorModeValue('blue.50', 'blue.900');
  const configBg = useColorModeValue('gray.50', 'gray.700');
  
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
                              (currentStep?.error?.includes('Pending tasks') || 
                               currentStep?.error?.includes('Pending database migration task'));

  // Check if dry-run is complete and waiting for confirmation
  const dryRunStep = state.steps.find(step => step.id === 'composer-dry-run');
  const hasDryRunComplete = dryRunStep?.status === 'complete' && 
                           state.isPaused && 
                           currentStep?.id === 'composer-update';

  useEffect(() => {
    if (hasPendingTasksError && !pendingTasksModalOpen) {
      setPendingTasksModalOpen(true);
    }
  }, [hasPendingTasksError]);

  useEffect(() => {
    if (hasPendingMigrations && !migrationsModalOpen) {
      setMigrationsModalOpen(true);
    }
  }, [hasPendingMigrations]);

  useEffect(() => {
    if (hasDryRunComplete && !dryRunConfirmModalOpen) {
      setDryRunConfirmModalOpen(true);
    }
  }, [hasDryRunComplete]);

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

  const handleCancelPendingTasks = () => {
    setPendingTasksModalOpen(false);
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

  const handleCancelMigrations = () => {
    setMigrationsModalOpen(false);
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
    setDryRunConfirmModalOpen(false);
    resumeWorkflow();
    toaster.create({
      title: 'Update Continuing',
      description: 'Proceeding with composer update',
      type: 'info',
      duration: 3000,
    });
  };

  const handleStopWorkflow = () => {
    setDryRunConfirmModalOpen(false);
    stopWorkflow();
    toaster.create({
      title: 'Workflow Stopped',
      description: 'Update workflow has been stopped after dry-run',
      type: 'warning',
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
                {!config.skipComposer && config.performDryRun && (
                  <Text fontSize="sm">• Run composer dry-run test</Text>
                )}
                {!config.skipComposer && (
                  <Text fontSize="sm">• Update composer packages</Text>
                )}
                {config.skipComposer && (
                  <Text fontSize="sm" color="orange.600">• Skip composer steps (testing mode)</Text>
                )}
                <Text fontSize="sm">• Check for database migrations (cyclically until complete)</Text>
                <Text fontSize="sm">• Execute database migrations (with confirmation){config.withDeletes ? ' including DROP queries' : ''}</Text>
                <Text fontSize="sm">• Update version information</Text>
              </VStack>

              {/* Configuration Summary */}
              <Box p={3} bg={configSummaryBg} borderRadius="md">
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Configuration Summary:</Text>
                <VStack align="start" gap={1} fontSize="sm">
                  {config.skipComposer ? (
                    <Text color="orange.600">• Composer steps: Skipped (testing mode)</Text>
                  ) : (
                    <Text>• Composer dry-run: {config.performDryRun ? 'Will be performed' : 'Skipped'}</Text>
                  )}
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
      <DialogRoot open={pendingTasksModalOpen} onOpenChange={(details) => !details.open && handleCancelPendingTasks()}>
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
                    There are pending tasks or database migrations that must be cleared before the update workflow can proceed.
                  </Alert.Description>
                </Box>
              </Alert.Root>
              
              {(currentStep?.data || currentStep?.error) && (
                <Box p={3} bg={configBg} borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    {currentStep.data?.migrationType === 'database-migration' 
                      ? 'Current pending database migration task:' 
                      : 'Current pending tasks:'}
                  </Text>
                  
                  {/* Handle database migration tasks */}
                  {currentStep.data?.migrationType === 'database-migration' && currentStep.data?.migrationStatus ? (
                    <HStack justify="space-between" align="center">
                      <Text fontSize="sm" flex="1">
                        Database Migration Task
                      </Text>
                      <Badge 
                        colorPalette={
                          currentStep.data.migrationStatus.status === 'active' ? 'blue' :
                          currentStep.data.migrationStatus.status === 'pending' ? 'gray' :
                          currentStep.data.migrationStatus.status === 'complete' ? 'green' :
                          currentStep.data.migrationStatus.status === 'error' ? 'red' : 'gray'
                        }
                        size="sm"
                      >
                        {currentStep.data.migrationStatus.status === 'active' ? 'Running' :
                         currentStep.data.migrationStatus.status === 'pending' ? 'Pending' :
                         currentStep.data.migrationStatus.status === 'complete' ? 'Complete' :
                         currentStep.data.migrationStatus.status === 'error' ? 'Error' :
                         currentStep.data.migrationStatus.status}
                      </Badge>
                    </HStack>
                  ) : 
                  /* Handle regular composer tasks */
                  currentStep.data?.operations && Array.isArray(currentStep.data.operations) ? (
                    <VStack align="stretch" gap={2}>
                      {currentStep.data.operations.map((operation: any, index: number) => (
                        <HStack key={index} justify="space-between" align="center">
                          <Text fontSize="sm" flex="1">
                            {operation.summary}
                          </Text>
                          <Badge 
                            colorPalette={
                              operation.status === 'complete' ? 'green' :
                              operation.status === 'active' ? 'blue' :
                              operation.status === 'error' ? 'red' :
                              operation.status === 'stopped' ? 'orange' : 'gray'
                            }
                            size="sm"
                          >
                            {operation.status === 'active' ? 'Running' : 
                             operation.status === 'complete' ? 'Complete' :
                             operation.status === 'error' ? 'Error' :
                             operation.status === 'stopped' ? 'Stopped' : 
                             operation.status}
                          </Badge>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="gray.600">
                      {currentStep.data?.title || currentStep.error || 'Task running...'}
                    </Text>
                  )}
                </Box>
              )}
              
              <Text fontSize="sm">
                You can either wait for the current tasks to complete, or force clear them to continue 
                with the update workflow.
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" mr={3} onClick={handleCancelPendingTasks}>
              Cancel
            </Button>
            <Button colorPalette="orange" onClick={handleClearTasks}>
              Clear Tasks & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      {/* Database Migrations Confirmation Modal */}
      <DialogRoot open={migrationsModalOpen} onOpenChange={(details) => !details.open && handleCancelMigrations()}>
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
              
              {(() => {
                const migrationStep = state.steps.find(step => step.id === 'check-migrations-loop');
                const migrationData = migrationStep?.data;
                const summary = migrationData ? createMigrationSummary(migrationData) : null;
                
                return (
                  <VStack align="stretch" gap={3}>
                    {summary && (
                      <Box p={3} bg={configBg} borderRadius="md">
                        <Text fontSize="sm" fontWeight="semibold" mb={3}>Current Migration Summary:</Text>
                        <VStack align="stretch" gap={2}>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Migration Type:</Text>
                            <Badge colorPalette="blue" size="sm">{summary.migrationType}</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Total Operations:</Text>
                            <Text fontSize="sm" fontWeight="semibold">{summary.totalOperations}</Text>
                          </HStack>
                          
                          {summary.operationBreakdown.length > 0 && (
                            <>
                              <Text fontSize="sm" fontWeight="semibold" mt={2}>Operations by Type:</Text>
                              <VStack align="stretch" gap={1}>
                                {summary.operationBreakdown.map(({ operation, count }) => (
                                  <HStack key={operation} justify="space-between">
                                    <Text fontSize="sm">{operation}:</Text>
                                    <Badge 
                                      colorPalette={
                                        operation === 'DROP' ? 'red' :
                                        operation === 'CREATE' ? 'green' :
                                        operation === 'ALTER' ? 'orange' :
                                        'gray'
                                      }
                                      size="sm"
                                    >
                                      {count}
                                    </Badge>
                                  </HStack>
                                ))}
                              </VStack>
                            </>
                          )}
                          
                          {summary.migrationHash && (
                            <HStack justify="space-between" mt={2}>
                              <Text fontSize="xs">Hash:</Text>
                              <Code fontSize="xs">{summary.migrationHash.substring(0, 12)}...</Code>
                            </HStack>
                          )}
                        </VStack>
                      </Box>
                    )}
                    
                    {migrationStep?.migrationHistory && migrationStep.migrationHistory.length > 0 && (
                      <Box p={3} bg={configBg} borderRadius="md">
                        <Text fontSize="sm" fontWeight="semibold" mb={2}>
                          Previous Migration Cycles ({migrationStep.migrationHistory.length}):
                        </Text>
                        <VStack align="stretch" gap={2}>
                          {migrationStep.migrationHistory.slice(-3).map((history, index) => (
                            <HStack key={index} justify="space-between" align="center">
                              <HStack>
                                <Badge 
                                  colorPalette={history.stepType === 'check' ? 'blue' : 'orange'} 
                                  size="xs"
                                >
                                  Cycle {history.cycle}
                                </Badge>
                                <Text fontSize="xs">
                                  {history.stepType === 'check' ? 'Check' : 'Execute'}
                                </Text>
                              </HStack>
                              <HStack>
                                <Badge 
                                  colorPalette={
                                    history.status === 'complete' ? 'green' : 
                                    history.status === 'error' ? 'red' : 'gray'
                                  } 
                                  size="xs"
                                >
                                  {history.status}
                                </Badge>
                                <Text fontSize="xs" color="gray.500">
                                  {history.timestamp.toLocaleTimeString()}
                                </Text>
                              </HStack>
                            </HStack>
                          ))}
                          {migrationStep.migrationHistory.length > 3 && (
                            <Text fontSize="xs" color="gray.500" textAlign="center">
                              ... and {migrationStep.migrationHistory.length - 3} more cycles
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    )}
                  </VStack>
                );
              })()}
              
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
            <Button variant="ghost" mr={3} onClick={handleCancelMigrations}>
              Cancel Workflow
            </Button>
            <Button variant="outline" mr={3} onClick={handleSkipMigrations}>
              Skip Migrations
            </Button>
            <Button colorPalette="blue" onClick={handleConfirmMigrations}>
              Run Migrations
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      {/* Dry-run Confirmation Modal */}
      <DialogRoot open={dryRunConfirmModalOpen} onOpenChange={(details) => !details.open && handleStopWorkflow()}>
        <DialogBackdrop />
        <DialogContent>
          <DialogCloseTrigger />
          <DialogHeader>
            <DialogTitle>Dry-run Complete - Proceed with Update?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4} align="stretch">
              <Alert.Root status="success">
                <Alert.Indicator>
                  <CheckCircle size={20} />
                </Alert.Indicator>
                <Box>
                  <Alert.Title>Dry-run completed successfully!</Alert.Title>
                  <Alert.Description>
                    The composer dry-run has finished. You can review the results above to see what changes would be made.
                  </Alert.Description>
                </Box>
              </Alert.Root>
              
              {dryRunStep?.data && (
                <Box p={3} bg={configBg} borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Dry-run summary:</Text>
                  {dryRunStep.data.operations && Array.isArray(dryRunStep.data.operations) ? (
                    <VStack align="stretch" gap={2}>
                      {dryRunStep.data.operations.map((operation: any, index: number) => (
                        <HStack key={index} justify="space-between" align="center">
                          <Text fontSize="sm" flex="1">
                            {operation.summary}
                          </Text>
                          <Badge 
                            colorPalette={operation.status === 'complete' ? 'green' : 'gray'}
                            size="sm"
                          >
                            {operation.status === 'complete' ? 'Complete' : operation.status}
                          </Badge>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="gray.600">
                      {dryRunStep.data.title || 'Dry-run completed'}
                    </Text>
                  )}
                </Box>
              )}
              
              <Text fontSize="sm">
                <strong>Would you like to proceed with the actual composer update?</strong>
              </Text>
              
              <Text fontSize="sm" color="gray.600">
                You can continue with the update or stop the workflow here. If you stop, 
                you can restart the workflow later from the beginning.
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" mr={3} onClick={handleStopWorkflow}>
              Stop Workflow
            </Button>
            <Button colorPalette="blue" onClick={handleContinueUpdate}>
              Continue Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </VStack>
  );
};