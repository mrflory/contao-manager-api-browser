import React, { useState, useEffect } from 'react';
import {
  VStack,
  Box,
  Heading,
  Button,
  Spinner,
  Alert,
  Table,
  Badge,
  IconButton,
  HStack,
  Menu,
  Portal,
  Text,
} from '@chakra-ui/react';
import { LuEye as Eye, LuRefreshCw as RefreshCw, LuEllipsis as MoreVertical, LuTrash2 as Trash, LuUndo2 as Undo } from 'react-icons/lu';
import { Site, HistoryEntry, HistoryResponse } from '../../types';
import { HistoryApiService } from '../../services/apiCallService';
import { useApiCall } from '../../hooks/useApiCall';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { HistoryDetailsModal } from '../modals/HistoryDetailsModal';
import { ConfirmationDialog } from '../modals/ConfirmationDialog';
import { formatDateTime } from '../../utils/dateUtils';
import { ComposerFilesDialog } from '../ui/ComposerFilesDialog';
import { RestoreWorkflow } from '../RestoreWorkflow';
import { BackupWorkflow } from '../BackupWorkflow';

export interface HistoryTabProps {
  site: Site;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ site }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<HistoryEntry | null>(null);
  const [composerDialogState, setComposerDialogState] = useState<{
    isOpen: boolean;
    snapshotId: string | null;
    filename: 'composer.json' | 'composer.lock' | null;
  }>({ isOpen: false, snapshotId: null, filename: null });
  const [backupWorkflowOpen, setBackupWorkflowOpen] = useState(false);
  const [restoreWorkflowState, setRestoreWorkflowState] = useState<{
    isOpen: boolean;
    entry: HistoryEntry | null;
    restoreComposer: boolean;
    restoreDatabase: boolean;
  }>({ isOpen: false, entry: null, restoreComposer: true, restoreDatabase: true });

  const toast = useToastNotifications();

  // Always initialize hooks to maintain hook order
  const loadHistory = useApiCall(
    () => {
      console.log('Loading history for site:', site.url);
      return HistoryApiService.getHistoryForSite(site.url);
    },
    {
      onSuccess: (data: unknown) => {
        console.log('History API response:', data);
        const response = data as HistoryResponse;
        setHistory(response.history || []);
      },
      onError: (error) => {
        console.error('History loading error:', error);
        console.error('Error details:', { siteUrl: site.url, error });
        // Only show error toast if there's no existing history data
        if (history.length === 0) {
          toast.showError({ 
            title: 'Failed to Load History',
            description: `Error: ${error}`
          });
        }
      },
      showErrorToast: false // Disable automatic error toasts since we handle them manually
    }
  );

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await loadHistory.execute();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.url]); // Only trigger when site.url changes


  const handleViewDetails = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEntry(null);
  };

  const handleViewComposerFile = (snapshotId: string, filename: 'composer.json' | 'composer.lock') => {
    setComposerDialogState({ isOpen: true, snapshotId, filename });
  };

  const handleDeleteButtonClick = (entry: HistoryEntry) => {
    setEntryToDelete(entry);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;

    try {
      await HistoryApiService.deleteHistoryEntry(site.url, entryToDelete.id);
      toast.showSuccess({
        title: 'Entry Deleted',
        description: 'History entry has been deleted successfully'
      });
      // Reload history
      await loadHistory.execute();
    } catch (error) {
      console.error('Delete error:', error);
      toast.showError({
        title: 'Delete Failed',
        description: `Failed to delete history entry: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleCreateBackup = () => {
    setBackupWorkflowOpen(true);
  };

  const handleCloseBackupWorkflow = () => {
    setBackupWorkflowOpen(false);
    // Reload history after backup completes
    loadHistory.execute();
  };

  const getDatabaseBackupFromHistoryEntry = (entry: HistoryEntry): string | null => {
    const backupStep = entry.steps.find(step => step.data?.databaseBackup);
    return backupStep?.data?.databaseBackup || null;
  };

  const handleRestore = async (entry: HistoryEntry) => {
    const snapshot = getSnapshotFromHistoryEntry(entry);
    const databaseBackup = getDatabaseBackupFromHistoryEntry(entry);

    if (!snapshot) {
      toast.showError({
        title: 'Restore Not Available',
        description: 'This entry does not have composer file backups'
      });
      return;
    }

    // Open the restore workflow dialog
    setRestoreWorkflowState({
      isOpen: true,
      entry,
      restoreComposer: true,
      restoreDatabase: !!databaseBackup
    });
  };

  const handleCloseRestoreWorkflow = () => {
    setRestoreWorkflowState({
      isOpen: false,
      entry: null,
      restoreComposer: true,
      restoreDatabase: true
    });
    // Reload history after restore completes
    loadHistory.execute();
  };

  const getSnapshotFromHistoryEntry = (entry: HistoryEntry) => {
    // Look for any step that has snapshot data
    const snapshotStep = entry.steps.find(step =>
      (step.id === 'composer-update' ||
       step.id === 'create-snapshot' ||
       step.id === 'create-safety-snapshot') &&
      step.data?.snapshot
    );
    return snapshotStep?.data?.snapshot || null;
  };

  const getSnapshotFileCount = (snapshot: any) => {
    if (!snapshot?.files) return 0;
    return Object.values(snapshot.files).filter((file: any) => file?.exists).length;
  };

  const getStatusBadgeColor = (status: HistoryEntry['status'] | string) => {
    switch (status) {
      case 'completed':
      case 'finished':
        return 'green';
      case 'failed':
      case 'error':
        return 'red';
      case 'cancelled':
        return 'orange';
      case 'started':
      case 'running':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status: HistoryEntry['status'] | string) => {
    switch (status) {
      case 'completed':
      case 'finished':
        return 'Finished';
      case 'failed':
      case 'error':
        return 'Error';
      case 'cancelled':
        return 'Cancelled';
      case 'started':
      case 'running':
        return 'Running';
      default:
        return status;
    }
  };

  const getWorkflowTypeText = (type: HistoryEntry['workflowType']) => {
    switch (type) {
      case 'update':
        return 'Update';
      case 'migration':
        return 'Migration';
      case 'composer':
        return 'Composer';
      case 'restore':
        return 'Restore';
      case 'manual-backup':
        return 'Backup';
      default:
        return type;
    }
  };

  if (loadHistory.state.loading && history.length === 0) {
    return (
      <VStack gap={6} align="stretch">
        <Box textAlign="center" py={8}>
          <Spinner size="lg" />
          <Box mt={4} color="gray.600">
            Loading update history...
          </Box>
        </Box>
      </VStack>
    );
  }

  if (loadHistory.state.error && history.length === 0) {
    return (
      <VStack gap={6} align="stretch">
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to Load History</Alert.Title>
            <Alert.Description>
              {loadHistory.state.error}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
        <Button onClick={() => loadHistory.execute()} variant="outline">
          Try Again
        </Button>
      </VStack>
    );
  }

  return (
    <>
      <VStack gap={6} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">Update History</Heading>
          <HStack gap={2}>
            <Button
              variant="solid"
              colorPalette="blue"
              onClick={handleCreateBackup}
            >
              Create Backup
            </Button>
            <IconButton
              variant="outline"
              onClick={() => loadHistory.execute()}
              loading={loadHistory.state.loading}
            >
              <RefreshCw />
            </IconButton>
          </HStack>
        </Box>

        {history.length === 0 ? (
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No History Available</Alert.Title>
              <Alert.Description>
                No update history found for this site. History will be recorded when you run updates, migrations, or other workflows.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : (
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Date & Time</Table.ColumnHeader>
                  <Table.ColumnHeader>Type</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Database Backup</Table.ColumnHeader>
                  <Table.ColumnHeader>Files</Table.ColumnHeader>
                  <Table.ColumnHeader width="120px">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(history || []).map((entry) => (
                  <Table.Row key={entry.id}>
                    <Table.Cell>
                      <Box fontSize="sm">
                        {formatDateTime(entry.startTime)}
                      </Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="subtle" colorPalette="blue">
                        {getWorkflowTypeText(entry.workflowType)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        variant="subtle"
                        colorPalette={getStatusBadgeColor(entry.status)}
                      >
                        {getStatusText(entry.status)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {(() => {
                        const databaseBackup = getDatabaseBackupFromHistoryEntry(entry);
                        if (databaseBackup) {
                          return (
                            <Badge colorPalette="green" variant="subtle">
                              Available
                            </Badge>
                          );
                        }
                        return (
                          <Text fontSize="sm" color="gray.400">
                            -
                          </Text>
                        );
                      })()}
                    </Table.Cell>
                    <Table.Cell>
                      {(() => {
                        const snapshot = getSnapshotFromHistoryEntry(entry);
                        if (!snapshot) {
                          return (
                            <Text fontSize="sm" color="gray.400" fontStyle="italic">
                              No files
                            </Text>
                          );
                        }
                        
                        const fileCount = getSnapshotFileCount(snapshot);
                        return (
                          <Text fontSize="sm" color="gray.600">
                            {fileCount === 0 ? 'No files' : `${fileCount} file${fileCount !== 1 ? 's' : ''}`}
                          </Text>
                        );
                      })()}
                    </Table.Cell>
                    <Table.Cell>
                      <HStack gap={1}>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(entry)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </IconButton>
                        
                        {(() => {
                          const snapshot = getSnapshotFromHistoryEntry(entry);
                          const hasSnapshotFiles = snapshot && getSnapshotFileCount(snapshot) > 0;
                          
                          return (
                            <Menu.Root>
                              <Menu.Trigger asChild>
                                <IconButton
                                  size="sm"
                                  variant="ghost"
                                  title="More actions"
                                >
                                  <MoreVertical size={16} />
                                </IconButton>
                              </Menu.Trigger>
                              <Portal>
                                <Menu.Positioner>
                                  <Menu.Content>
                                    {(() => {
                                      const snapshot = getSnapshotFromHistoryEntry(entry);
                                      const hasSnapshot = snapshot && getSnapshotFileCount(snapshot) > 0;

                                      return hasSnapshot && (
                                        <>
                                          <Menu.Item
                                            value="restore-backup"
                                            onClick={() => handleRestore(entry)}
                                            colorPalette="orange"
                                          >
                                            <Undo size={16} />
                                            Restore Backup
                                          </Menu.Item>
                                          <Menu.Separator />
                                        </>
                                      );
                                    })()}
                                    {hasSnapshotFiles && (
                                      <>
                                        {snapshot!.files['composer.json']?.exists && (
                                          <Menu.Item
                                            value="view-composer-json"
                                            onClick={() => handleViewComposerFile(snapshot!.id, 'composer.json')}
                                          >
                                            View composer.json
                                          </Menu.Item>
                                        )}
                                        {snapshot!.files['composer.lock']?.exists && (
                                          <Menu.Item
                                            value="view-composer-lock"
                                            onClick={() => handleViewComposerFile(snapshot!.id, 'composer.lock')}
                                          >
                                            View composer.lock
                                          </Menu.Item>
                                        )}
                                        <Menu.Separator />
                                      </>
                                    )}
                                    <Menu.Item
                                      value="delete-entry"
                                      onClick={() => handleDeleteButtonClick(entry)}
                                      color="red.500"
                                      _hover={{ bg: 'red.50' }}
                                    >
                                      <Trash size={16} />
                                      Delete entry
                                    </Menu.Item>
                                  </Menu.Content>
                                </Menu.Positioner>
                              </Portal>
                            </Menu.Root>
                          );
                        })()}
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </VStack>

      {/* History Details Modal */}
      {selectedEntry && (
        <HistoryDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          historyEntry={selectedEntry}
          onDownloadSnapshot={() => {}} // Not used anymore since download is handled in the dialog
        />
      )}

      {/* Composer Files Dialog */}
      {composerDialogState.snapshotId && composerDialogState.filename && (
        <ComposerFilesDialog
          isOpen={composerDialogState.isOpen}
          onClose={() => setComposerDialogState({ isOpen: false, snapshotId: null, filename: null })}
          snapshotId={composerDialogState.snapshotId}
          title={`${composerDialogState.filename} - Package Details`}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setEntryToDelete(null);
        }}
        onConfirm={handleDeleteEntry}
        title="Delete History Entry"
        message={entryToDelete ? `Are you sure you want to delete this history entry from "${formatDateTime(entryToDelete.startTime)}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColorPalette="red"
      />

      {/* Restore Workflow Dialog */}
      {restoreWorkflowState.entry && (() => {
        const snapshot = getSnapshotFromHistoryEntry(restoreWorkflowState.entry);
        const databaseBackup = getDatabaseBackupFromHistoryEntry(restoreWorkflowState.entry);

        if (!snapshot) return null;

        return (
          <RestoreWorkflow
            isOpen={restoreWorkflowState.isOpen}
            onClose={handleCloseRestoreWorkflow}
            snapshotId={snapshot.id}
            databaseBackupFilename={databaseBackup || null}
            restoreComposer={restoreWorkflowState.restoreComposer}
            restoreDatabase={restoreWorkflowState.restoreDatabase}
            timestamp={formatDateTime(restoreWorkflowState.entry.startTime)}
          />
        );
      })()}

      {/* Backup Workflow Dialog */}
      <BackupWorkflow
        isOpen={backupWorkflowOpen}
        onClose={handleCloseBackupWorkflow}
        siteUrl={site.url}
      />
    </>
  );
};