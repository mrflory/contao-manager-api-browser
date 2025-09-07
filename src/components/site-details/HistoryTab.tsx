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
import { LuEye as Eye, LuRefreshCw as RefreshCw, LuEllipsis as MoreVertical, LuTrash2 as Trash } from 'react-icons/lu';
import { Site, HistoryEntry, HistoryResponse } from '../../types';
import { HistoryApiService } from '../../services/apiCallService';
import { useApiCall } from '../../hooks/useApiCall';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { HistoryDetailsModal } from '../modals/HistoryDetailsModal';
import { ConfirmationDialog } from '../modals/ConfirmationDialog';
import { formatDateTime, formatDuration } from '../../utils/dateUtils';
import { ComposerFilesDialog } from '../ui/ComposerFilesDialog';

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
  
  const toast = useToastNotifications();

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

  const getSnapshotFromHistoryEntry = (entry: HistoryEntry) => {
    // Look for composer update step that has snapshot data
    const composerStep = entry.steps.find(step => 
      step.id === 'composer-update' && step.data?.snapshot
    );
    return composerStep?.data?.snapshot || null;
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
          <IconButton
            variant="outline"
            onClick={() => loadHistory.execute()}
            loading={loadHistory.state.loading}
          >
            <RefreshCw />
          </IconButton>
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
                  <Table.ColumnHeader>Duration</Table.ColumnHeader>
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
                      <Box fontSize="sm" color="gray.600">
                        {entry.endTime
                          ? formatDuration(new Date(entry.startTime), new Date(entry.endTime))
                          : entry.status === 'started'
                          ? 'Running...'
                          : '-'
                        }
                      </Box>
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
    </>
  );
};