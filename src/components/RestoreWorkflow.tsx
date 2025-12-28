import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Heading,
  Dialog,
  Alert
} from '@chakra-ui/react';
import { ProgressRoot, ProgressBar } from './ui/progress';
import { LuPlay as Play, LuPause as Pause, LuX as X } from 'react-icons/lu';
import { useToastNotifications, TOAST_MESSAGES } from '../hooks/useToastNotifications';
import { useRestoreWorkflow } from '../workflow/hooks/useRestoreWorkflow';
import { RestoreWorkflowConfig } from '../workflow/definitions/RestoreWorkflowDefinition';
import { WorkflowTimeline } from '../workflow';
import { useWorkflowHistory } from '../hooks/useWorkflowHistory';

export interface RestoreWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotId?: string;
  databaseBackupFilename?: string | null;
  restoreComposer: boolean;
  restoreDatabase: boolean;
  timestamp: string;
}

export const RestoreWorkflow: React.FC<RestoreWorkflowProps> = ({
  isOpen,
  onClose,
  snapshotId,
  databaseBackupFilename,
  restoreComposer,
  restoreDatabase,
  timestamp
}) => {
  const toast = useToastNotifications();
  const workflowHistory = useWorkflowHistory();

  const [config] = useState<RestoreWorkflowConfig>({
    performDryRun: false,
    restoreComposer,
    restoreDatabase,
    snapshotId,
    databaseBackupFilename: databaseBackupFilename || undefined
  });

  const workflow = useRestoreWorkflow(config);
  const [isCancelling, setIsCancelling] = useState(false);

  // Initialize workflow when dialog opens
  useEffect(() => {
    if (isOpen) {
      workflow.initialize(config);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, snapshotId, databaseBackupFilename, restoreComposer, restoreDatabase]);

  // Reset cancellation state when workflow is cancelled
  useEffect(() => {
    if (workflow.isCancelled) {
      setIsCancelling(false);
    }
  }, [workflow.isCancelled]);

  // Auto-close dialog when workflow completes successfully
  useEffect(() => {
    if (workflow.isComplete && !workflow.error) {
      toast.showSuccess({
        title: 'Restoration Complete',
        description: 'Your backup has been successfully restored'
      });
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [workflow.isComplete, workflow.error, toast, onClose]);

  const handleStartWorkflow = async () => {
    if (workflow.engine) {
      // Start history tracking before starting the workflow
      await workflowHistory.startHistoryTracking(workflow.engine, 'restore');
    }
    await workflow.start();
    toast.showInfo(TOAST_MESSAGES.WORKFLOW_STARTED);
  };

  const handlePauseWorkflow = async () => {
    await workflow.pause();
    toast.showInfo(TOAST_MESSAGES.WORKFLOW_PAUSED);
  };

  const handleResumeWorkflow = async () => {
    await workflow.resume();
    toast.showInfo(TOAST_MESSAGES.WORKFLOW_RESUMED);
  };

  const handleCancelWorkflow = async () => {
    setIsCancelling(true);
    await workflow.cancel();
    toast.showWarning(TOAST_MESSAGES.WORKFLOW_CANCELLED);
  };

  const handleClose = () => {
    if (workflow.isRunning) {
      toast.showWarning({
        title: 'Workflow Running',
        description: 'Please cancel the workflow before closing'
      });
      return;
    }
    onClose();
  };

  const progress = workflow.progress || 0;
  const hasStarted = workflow.currentIndex > 0 || workflow.isRunning || workflow.isComplete;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => e.open === false && handleClose()} size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxWidth="900px">
          <Dialog.Header>
            <Dialog.Title>Restore Backup</Dialog.Title>
            <Dialog.CloseTrigger disabled={workflow.isRunning} />
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={6} align="stretch">
              {/* Backup Information */}
              <Box>
                <Heading size="sm" mb={2}>Backup Information</Heading>
                <VStack align="stretch" gap={2} fontSize="sm">
                  <HStack justify="space-between">
                    <Text color="gray.600">Backup from:</Text>
                    <Text fontWeight="medium">{timestamp}</Text>
                  </HStack>
                  {restoreComposer && snapshotId && (
                    <HStack justify="space-between">
                      <Text color="gray.600">Composer Files:</Text>
                      <Text fontWeight="medium" color="blue.600">Will be restored</Text>
                    </HStack>
                  )}
                  {restoreDatabase && databaseBackupFilename && (
                    <HStack justify="space-between">
                      <Text color="gray.600">Database:</Text>
                      <Text fontWeight="medium" color="green.600">Will be restored</Text>
                    </HStack>
                  )}
                </VStack>
              </Box>

              {/* Warning Alert */}
              {!hasStarted && (
                <Alert.Root status="warning" variant="subtle">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Safety Backup Created</Alert.Title>
                    <Alert.Description>
                      A safety backup of your current state will be created automatically before restoration begins.
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              {/* Progress Bar */}
              {hasStarted && (
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">Progress</Text>
                    <Text fontSize="sm" color="gray.600">{Math.round(progress)}%</Text>
                  </HStack>
                  <ProgressRoot value={progress} size="sm" colorPalette="blue">
                    <ProgressBar />
                  </ProgressRoot>
                </Box>
              )}

              {/* Workflow Timeline */}
              {workflow.engine && (
                <Box>
                  <WorkflowTimeline
                    engine={workflow.engine}
                    executionHistory={workflow.executionHistory}
                    currentIndex={workflow.currentIndex}
                    onStartFromStep={workflow.startFromStep}
                    isWorkflowRunning={workflow.isRunning}
                  />
                </Box>
              )}

              {/* Error Display */}
              {workflow.error && (
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Restoration Failed</Alert.Title>
                    <Alert.Description>{workflow.error}</Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={2} width="100%" justify="space-between">
              <HStack gap={2}>
                {!hasStarted && (
                  <Button
                    onClick={handleStartWorkflow}
                    colorPalette="blue"
                    disabled={workflow.isRunning}
                  >
                    <Play />
                    Start Restoration
                  </Button>
                )}

                {hasStarted && !workflow.isComplete && !workflow.isCancelled && (
                  <>
                    {workflow.isPaused ? (
                      <Button onClick={handleResumeWorkflow} colorPalette="blue">
                        <Play />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        onClick={handlePauseWorkflow}
                        disabled={!workflow.isRunning}
                        variant="outline"
                      >
                        <Pause />
                        Pause
                      </Button>
                    )}

                    <Button
                      onClick={handleCancelWorkflow}
                      colorPalette="red"
                      variant="outline"
                      disabled={isCancelling}
                      loading={isCancelling}
                    >
                      <X />
                      Cancel
                    </Button>
                  </>
                )}
              </HStack>

              <Button
                variant="outline"
                onClick={handleClose}
                disabled={workflow.isRunning}
              >
                {workflow.isComplete ? 'Close' : 'Cancel'}
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
