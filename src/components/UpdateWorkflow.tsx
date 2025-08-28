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
import { LuPlay as Play, LuPause as Pause, LuRefreshCw as RefreshCw, LuX as X } from 'react-icons/lu';
import { useToastNotifications, TOAST_MESSAGES } from '../hooks/useToastNotifications';
import { useUpdateWorkflow, WorkflowTimeline, WorkflowConfig } from '../workflow';

/**
 * Get descriptive text for the next action when resuming the workflow
 */
const getResumeActionDescription = (workflow: ReturnType<typeof useUpdateWorkflow>): string => {
  // If no engine, not paused, or cancelled, return default
  if (!workflow.engine || !workflow.isPaused || workflow.isCancelled) {
    return 'Resume Workflow';
  }

  // Get the next item that will be executed
  const timeline = workflow.engine.getTimeline();
  const currentIndex = workflow.currentIndex;
  
  // If we're at the end of the timeline, return default
  if (currentIndex >= timeline.length) {
    return 'Resume Workflow';
  }

  const nextItem = timeline[currentIndex];
  
  // Map timeline item IDs to user-friendly action descriptions
  const actionMap: Record<string, string> = {
    'check-tasks': 'Continue checking pending tasks',
    'check-manager': 'Continue checking manager updates',
    'update-manager': 'Continue with manager update',
    'composer-dry-run': 'Continue with composer dry-run',
    'composer-update': 'Continue with composer update',
    'check-migrations-loop': 'Continue checking database migrations',
    'execute-migrations': 'Continue with database migrations',
    'update-versions': 'Continue updating version information',
  };

  // Handle migration cycles (e.g., check-migrations-loop-2, check-migrations-loop-3)
  if (nextItem.id.startsWith('check-migrations-loop-')) {
    return 'Continue checking database migrations';
  }
  if (nextItem.id.startsWith('execute-migrations-')) {
    return 'Continue with database migrations';
  }

  // Return specific action description or fall back to the item title
  return actionMap[nextItem.id] || `Continue with ${nextItem.title.toLowerCase()}`;
};

export const UpdateWorkflow: React.FC = () => {
  const [config, setConfig] = useState<WorkflowConfig>({ 
    performDryRun: true
  });
  const [isCancelling, setIsCancelling] = useState(false);
  
  const toast = useToastNotifications();
  const workflow = useUpdateWorkflow(config);
  
  // Reset cancellation state when workflow is cancelled
  useEffect(() => {
    if (workflow.isCancelled) {
      setIsCancelling(false);
    }
  }, [workflow.isCancelled]);
  
  const handleStartWorkflow = async () => {
    await workflow.start();
    toast.showInfo(TOAST_MESSAGES.WORKFLOW_STARTED);
  };

  const handlePause = () => {
    workflow.pause();
    toast.showWarning(TOAST_MESSAGES.WORKFLOW_STOPPED);
  };

  const handleResume = async () => {
    await workflow.resume();
    toast.showInfo(TOAST_MESSAGES.WORKFLOW_RESUMED);
  };

  const handleCancel = async () => {
    if (isCancelling) return; // Prevent multiple cancellation attempts
    
    setIsCancelling(true);
    
    // Show immediate feedback
    toast.showInfo({
      title: 'Cancelling Workflow',
      description: 'Stopping all running tasks and cleaning up...',
    });
    
    try {
      await workflow.cancel();
      toast.showWarning({
        title: 'Workflow Cancelled',
        description: 'Workflow has been cancelled and all background tasks have been stopped.',
      });
    } catch (error) {
      toast.showError({
        title: 'Cancellation Error',
        description: error instanceof Error ? error.message : 'Failed to cancel workflow',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReset = () => {
    workflow.initialize(config);
    toast.showInfo({
      title: 'Workflow Reset',
      description: 'Workflow has been reset and is ready to start.',
    });
  };

  const getWorkflowStatus = () => {
    if (workflow.isComplete) return 'complete';
    if (workflow.error) return 'error';
    if (workflow.isCancelled) return 'cancelled';
    if (isCancelling) return 'cancelling';
    if (workflow.isRunning) return 'running';
    if (workflow.isPaused) return 'paused';
    return 'ready';
  };

  // Helper function to check if there are any items requiring user action
  const hasUserActionRequired = () => {
    if (!workflow.engine) return false;
    const timeline = workflow.engine.getTimeline();
    return timeline.some(item => item.status === 'user_action_required');
  };

  const getStatusBadge = () => {
    const status = getWorkflowStatus();
    const colorMap = {
      complete: 'green',
      error: 'red',
      cancelled: 'orange',
      cancelling: 'orange',
      running: 'blue',
      paused: 'orange',
      ready: 'gray'
    };
    
    const textMap = {
      complete: 'Complete',
      error: 'Error',
      cancelled: 'Cancelled',
      cancelling: 'Cancelling...',
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

  const canStart = !workflow.isRunning && !workflow.isComplete && workflow.engine && !workflow.isCancelled;
  const canPause = workflow.isRunning;
  const canResume = workflow.isPaused && !workflow.isCancelled;
  const canCancel = workflow.isRunning || workflow.isPaused || (workflow.engine && hasUserActionRequired());

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

          {workflow.isRunning && (
            <Box>
              <Text fontSize="sm" mb={2}>Progress</Text>
              <ProgressRoot value={workflow.progress} colorPalette="blue">
                <ProgressBar />
              </ProgressRoot>
            </Box>
          )}

          {/* Error display */}
          {workflow.error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Workflow Error</Alert.Title>
                <Alert.Description>
                  {workflow.error}
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          {/* Configuration */}
          {!workflow.isRunning && !workflow.isComplete && !workflow.isCancelled && (
            <Box>
              <Text fontWeight="semibold" mb={3}>Configuration</Text>
              <VStack align="start" gap={3}>
                <Checkbox
                  checked={!config.performDryRun}
                  onCheckedChange={(checked) => {
                    const newConfig = { ...config, performDryRun: !checked.checked };
                    setConfig(newConfig);
                    workflow.initialize(newConfig);
                  }}
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
            
            {canPause && (
              <Button
                colorPalette="orange"
                onClick={handlePause}
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
                <Play size={16} /> {getResumeActionDescription(workflow)}
              </Button>
            )}

            {canCancel && (
              <Button
                colorPalette="red"
                onClick={handleCancel}
                size="lg"
                loading={isCancelling}
                disabled={isCancelling}
              >
                <X size={16} /> {isCancelling ? 'Cancelling...' : 'Cancel Workflow'}
              </Button>
            )}

            {(workflow.isComplete || workflow.error || workflow.isCancelled) && (
              <Button
                colorPalette="green"
                onClick={handleReset}
                size="lg"
              >
                <RefreshCw size={16} /> Reset Workflow
              </Button>
            )}
          </VStack>

          {/* Success Alert */}
          {workflow.isComplete && !workflow.error && (
            <Alert.Root status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Update Complete!</Alert.Title>
                <Alert.Description>
                  Your Contao installation has been successfully updated. 
                  All components are now up to date.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          {/* Cancelled Alert */}
          {workflow.isCancelled && !workflow.error && (
            <Alert.Root status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Workflow Cancelled</Alert.Title>
                <Alert.Description>
                  The update workflow has been cancelled. You can reset the workflow to start over or review the steps that were completed.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
        </VStack>
      </Box>

      {/* Timeline */}
      {workflow.engine && workflow.engine.getTimeline().length > 0 && (
        <Box borderWidth="1px" p={6} borderRadius="lg">
          <Heading size="md" mb={4}>Workflow Progress</Heading>
          <WorkflowTimeline 
            engine={workflow.engine} 
            executionHistory={workflow.executionHistory}
            currentIndex={workflow.currentIndex}
            onStartFromStep={workflow.startFromStep}
            isWorkflowRunning={workflow.isRunning}
          />
        </Box>
      )}
    </VStack>
  );
};