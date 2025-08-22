import React, { useState } from 'react';
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
import { useToastNotifications, TOAST_MESSAGES } from '../hooks/useToastNotifications';
import { useUpdateWorkflow, WorkflowTimeline, WorkflowConfig } from '../workflow';

export const UpdateWorkflow: React.FC = () => {
  const [config, setConfig] = useState<WorkflowConfig>({ 
    performDryRun: true
  });
  
  const toast = useToastNotifications();
  const workflow = useUpdateWorkflow(config);
  
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
    if (workflow.isRunning) return 'running';
    if (workflow.isPaused) return 'paused';
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

  const canStart = !workflow.isRunning && !workflow.isComplete && workflow.engine;
  const canPause = workflow.isRunning;
  const canResume = workflow.isPaused;

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
          {!workflow.isRunning && !workflow.isComplete && (
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
                <Play size={16} /> Resume Workflow
              </Button>
            )}

            {(workflow.isComplete || workflow.error) && (
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