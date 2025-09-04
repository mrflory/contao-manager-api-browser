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
  Link,
} from '@chakra-ui/react';
import { LuEye as Eye, LuRefreshCw as RefreshCw } from 'react-icons/lu';
import { Site, HistoryEntry, HistoryResponse } from '../../types';
import { HistoryApiService } from '../../services/apiCallService';
import { useApiCall } from '../../hooks/useApiCall';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { api } from '../../utils/api';
import { HistoryDetailsModal } from '../modals/HistoryDetailsModal';
import { formatDateTime, formatDuration } from '../../utils/dateUtils';

export interface HistoryTabProps {
  site: Site;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ site }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
  }, [site.url]); // Only trigger when site.url changes

  const handleViewDetails = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEntry(null);
  };

  const handleDownloadSnapshot = async (snapshotId: string, filename: 'composer.json' | 'composer.lock') => {
    try {
      const blob = await api.downloadSnapshot(snapshotId, filename);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${snapshotId}-${filename}`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.showSuccess({
        title: 'Download Started',
        description: `Downloading ${filename} snapshot`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.showError({
        title: 'Download Failed',
        description: `Failed to download ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const getSnapshotFromHistoryEntry = (entry: HistoryEntry) => {
    // Look for composer update step that has snapshot data
    const composerStep = entry.steps.find(step => 
      step.id === 'composer-update' && step.data?.snapshot
    );
    return composerStep?.data?.snapshot || null;
  };

  const getStatusBadgeColor = (status: HistoryEntry['status']) => {
    switch (status) {
      case 'finished':
        return 'green';
      case 'error':
        return 'red';
      case 'cancelled':
        return 'orange';
      case 'started':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status: HistoryEntry['status']) => {
    switch (status) {
      case 'finished':
        return 'Finished';
      case 'error':
        return 'Error';
      case 'cancelled':
        return 'Cancelled';
      case 'started':
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
                  <Table.ColumnHeader>Snapshots</Table.ColumnHeader>
                  <Table.ColumnHeader>Actions</Table.ColumnHeader>
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
                            <Box fontSize="xs" color="gray.400" fontStyle="italic">
                              No snapshots
                            </Box>
                          );
                        }
                        
                        return (
                          <HStack gap={3}>
                            {snapshot.files['composer.json']?.exists && (
                              <Link
                                fontSize="xs"
                                onClick={() => handleDownloadSnapshot(snapshot.id, 'composer.json')}
                                title="Download composer.json snapshot"
                              >
                                composer.json
                              </Link>
                            )}
                            {snapshot.files['composer.lock']?.exists && (
                              <Link
                                fontSize="xs"
                                onClick={() => handleDownloadSnapshot(snapshot.id, 'composer.lock')}
                                title="Download composer.lock snapshot"
                              >
                                composer.lock
                              </Link>
                            )}
                          </HStack>
                        );
                      })()}
                    </Table.Cell>
                    <Table.Cell>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(entry)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </IconButton>
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
          onDownloadSnapshot={handleDownloadSnapshot}
        />
      )}
    </>
  );
};