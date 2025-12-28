import React, { useState, useEffect } from 'react';
import { Box, Text, Progress, HStack, Dialog } from '@chakra-ui/react';
import { Button } from './ui/button';
import { useBackupWorkflow } from '../workflow/hooks/useBackupWorkflow';
import { BackupWorkflowConfig } from '../workflow/definitions/BackupWorkflowDefinition';
import { WorkflowTimeline } from '../workflow';
import { useWorkflowHistory } from '../hooks/useWorkflowHistory';
import { useToastNotifications, TOAST_MESSAGES } from '../hooks/useToastNotifications';

export interface BackupWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  siteUrl: string;
}

export const BackupWorkflow: React.FC<BackupWorkflowProps> = ({
  isOpen,
  onClose,
  siteUrl
}) => {
  const toast = useToastNotifications();
  const workflowHistory = useWorkflowHistory();

  const [config] = useState<BackupWorkflowConfig>({
    siteUrl
  });

  const workflow = useBackupWorkflow(config);

  // Track completion
  useEffect(() => {
    if (workflow.isComplete && !workflow.isCancelled) {
      toast.showSuccess({
        title: 'Backup Complete',
        description: 'Successfully created backup of composer files and database'
      });
    }
  }, [workflow.isComplete, workflow.isCancelled, toast]);

  // Track cancellation
  useEffect(() => {
    if (workflow.isCancelled) {
      toast.showWarning({
        title: 'Backup Cancelled',
        description: 'Backup workflow was cancelled'
      });
    }
  }, [workflow.isCancelled, toast]);

  const handleStartWorkflow = async () => {
    if (workflow.engine) {
      await workflowHistory.startHistoryTracking(workflow.engine, 'manual-backup');
    }
    await workflow.start();
    toast.showInfo({
      title: 'Backup Started',
      description: 'Creating backup of composer files and database'
    });
  };

  const handlePause = () => {
    workflow.pause();
    toast.showWarning(TOAST_MESSAGES.WORKFLOW_PAUSED);
  };

  const handleResume = async () => {
    await workflow.resume();
    toast.showInfo(TOAST_MESSAGES.WORKFLOW_RESUMED);
  };

  const handleCancel = async () => {
    await workflow.cancel();
  };

  const handleClose = () => {
    if (workflow.isRunning) {
      toast.showWarning({
        title: 'Backup In Progress',
        description: 'Please wait for the backup to complete or cancel it first'
      });
      return;
    }
    onClose();
  };

  const progress = workflow.progress || 0;
  const hasStarted = workflow.currentIndex > 0 || workflow.isRunning || workflow.isComplete;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => details.open === false && handleClose()} size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxWidth="900px">
          <Dialog.Header>
            <Dialog.Title>Create Backup</Dialog.Title>
            <Dialog.CloseTrigger disabled={workflow.isRunning} />
          </Dialog.Header>

          <Dialog.Body>
            <Box>
              {/* Progress Bar */}
              {hasStarted && (
                <Box mb={4}>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">
                      Progress
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {Math.round(progress)}%
                    </Text>
                  </HStack>
                  <Progress.Root value={progress} size="sm" colorPalette="blue">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                </Box>
              )}

              {/* Introduction Text */}
              {!hasStarted && (
                <Box
                  mb={4}
                  p={4}
                  bg={{ base: "blue.50", _dark: "blue.900/20" }}
                  borderRadius="md"
                  borderLeft="4px solid"
                  borderColor="blue.500"
                >
                  <Text fontWeight="medium" mb={2}>
                    Manual Backup Creation
                  </Text>
                  <Text fontSize="sm" color={{ base: "gray.600", _dark: "gray.300" }}>
                    This will create a backup of:
                  </Text>
                  <Box as="ul" pl={5} mt={2} fontSize="sm" color={{ base: "gray.600", _dark: "gray.300" }}>
                    <li>Composer files (composer.json and composer.lock)</li>
                    <li>Database backup (SQL dump)</li>
                  </Box>
                </Box>
              )}

              {/* Workflow Timeline */}
              {workflow.engine && (
                <WorkflowTimeline
                  engine={workflow.engine}
                  executionHistory={workflow.executionHistory}
                  currentIndex={workflow.currentIndex}
                  onStartFromStep={workflow.startFromStep}
                  isWorkflowRunning={workflow.isRunning}
                />
              )}
            </Box>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack justify="space-between" width="100%">
              <Box>
                {workflow.error && (
                  <Text fontSize="sm" color="red.500">
                    Error: {workflow.error}
                  </Text>
                )}
              </Box>

              <HStack gap={2}>
                {!hasStarted && (
                  <>
                    <Button variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button colorPalette="blue" onClick={handleStartWorkflow}>
                      Start Backup
                    </Button>
                  </>
                )}

                {hasStarted && !workflow.isComplete && !workflow.isCancelled && (
                  <>
                    {!workflow.isRunning && !workflow.isPaused && (
                      <Button variant="outline" onClick={handleClose}>
                        Close
                      </Button>
                    )}
                    {workflow.isRunning && (
                      <>
                        <Button variant="outline" onClick={handlePause}>
                          Pause
                        </Button>
                        <Button colorPalette="red" variant="outline" onClick={handleCancel}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {workflow.isPaused && (
                      <>
                        <Button colorPalette="blue" onClick={handleResume}>
                          Resume
                        </Button>
                        <Button colorPalette="red" variant="outline" onClick={handleCancel}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </>
                )}

                {(workflow.isComplete || workflow.isCancelled) && (
                  <Button colorPalette="blue" onClick={handleClose}>
                    Close
                  </Button>
                )}
              </HStack>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
