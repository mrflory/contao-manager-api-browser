import React from 'react';
import {
  VStack,
  Box,
  Heading,
  Text,
  Badge,
  Separator,
  HStack,
  Link,
} from '@chakra-ui/react';
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogCloseTrigger } from '../ui/dialog';
import { DataListRoot, DataListItem } from '../ui/data-list';
import { HistoryEntry, HistoryStep } from '../../types';
import { formatDateTime, formatDuration } from '../../utils/dateUtils';

export interface HistoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyEntry: HistoryEntry;
  onDownloadSnapshot?: (snapshotId: string, filename: 'composer.json' | 'composer.lock') => void;
}

export const HistoryDetailsModal: React.FC<HistoryDetailsModalProps> = ({
  isOpen,
  onClose,
  historyEntry,
  onDownloadSnapshot,
}) => {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'complete':
      case 'finished':
        return 'green';
      case 'error':
        return 'red';
      case 'cancelled':
        return 'orange';
      case 'active':
      case 'started':
        return 'blue';
      case 'skipped':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'finished':
        return 'Finished';
      case 'error':
        return 'Error';
      case 'cancelled':
        return 'Cancelled';
      case 'active':
        return 'Active';
      case 'started':
        return 'Started';
      case 'skipped':
        return 'Skipped';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const getWorkflowTypeText = (type: HistoryEntry['workflowType']) => {
    switch (type) {
      case 'update':
        return 'Update Workflow';
      case 'migration':
        return 'Migration Workflow';
      case 'composer':
        return 'Composer Workflow';
      default:
        return type;
    }
  };

  const renderStepsList = (steps: HistoryStep[]) => {
    if (steps.length === 0) {
      return (
        <Box p={4} textAlign="center" color="gray.600">
          No steps recorded for this workflow.
        </Box>
      );
    }

    return (
      <Box maxHeight="400px" overflow="auto" pr={2}>
        <VStack gap={3} align="stretch">
          {steps.map((step, index) => (
            <Box
              key={step.id}
              p={4}
              borderWidth="1px"
              borderRadius="md"
              borderColor={step.status === 'error' ? 'red.200' : 'gray.200'}
              bg={step.status === 'error' ? 'red.50' : 'gray.50'}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box flex="1" mr={3}>
                  <Text fontWeight="medium" fontSize="sm">
                    {index + 1}. {step.name}
                  </Text>
                  <Text fontSize="sm" color="gray.600" mt={1} lineHeight="1.4">
                    {step.data?.summary || step.summary || 'No summary available'}
                  </Text>
                </Box>
                <Badge
                  variant="subtle"
                  colorPalette={getStatusBadgeColor(step.status)}
                  size="sm"
                  flexShrink={0}
                >
                  {getStatusText(step.status)}
                </Badge>
              </Box>
              
              {step.error && (
                <Box
                  mt={2}
                  p={2}
                  bg="red.100"
                  borderRadius="sm"
                  borderLeftWidth="3px"
                  borderLeftColor="red.500"
                >
                  <Text fontSize="sm" color="red.700" fontWeight="medium">
                    Error: {step.error}
                  </Text>
                </Box>
              )}
              
              {/* Snapshot Downloads */}
              {step.data?.snapshot && onDownloadSnapshot && (
                <Box mt={3} p={2} bg="gray.100" borderRadius="sm">
                  <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={2}>
                    Available Snapshots:
                  </Text>
                  <HStack gap={3}>
                    {step.data.snapshot.files?.['composer.json']?.exists && (
                      <Link
                        fontSize="xs"
                        onClick={() => onDownloadSnapshot(step.data.snapshot.id, 'composer.json')}
                        title="Download composer.json snapshot"
                      >
                        composer.json
                      </Link>
                    )}
                    {step.data.snapshot.files?.['composer.lock']?.exists && (
                      <Link
                        fontSize="xs"
                        onClick={() => onDownloadSnapshot(step.data.snapshot.id, 'composer.lock')}
                        title="Download composer.lock snapshot"
                      >
                        composer.lock
                      </Link>
                    )}
                  </HStack>
                </Box>
              )}
              
              <Box display="flex" justifyContent="space-between" mt={2} fontSize="xs" color="gray.500">
                <Text>Started: {formatDateTime(step.startTime)}</Text>
                {step.endTime && (
                  <Text>
                    Duration: {formatDuration(new Date(step.startTime), new Date(step.endTime))}
                  </Text>
                )}
              </Box>
            </Box>
          ))}
        </VStack>
      </Box>
    );
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={({ open }) => !open && onClose()}>
      <DialogContent maxWidth="6xl" height="85vh" overflow="hidden">
        <DialogHeader>
          <DialogTitle>Workflow Details</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        
        <DialogBody overflow="auto" maxHeight="calc(85vh - 120px)">
          <VStack gap={6} align="stretch">
            {/* Workflow Summary */}
            <Box>
              <Heading size="md" mb={4}>Summary</Heading>
              <DataListRoot orientation="horizontal" size="md">
                <DataListItem
                  label="Workflow Type"
                  value={getWorkflowTypeText(historyEntry.workflowType)}
                />
                <DataListItem
                  label="Status"
                  value={
                    <Badge
                      variant="subtle"
                      colorPalette={getStatusBadgeColor(historyEntry.status)}
                    >
                      {getStatusText(historyEntry.status)}
                    </Badge>
                  }
                />
                <DataListItem
                  label="Started"
                  value={formatDateTime(historyEntry.startTime)}
                />
                {historyEntry.endTime && (
                  <DataListItem
                    label="Duration"
                    value={formatDuration(
                      new Date(historyEntry.startTime),
                      new Date(historyEntry.endTime)
                    )}
                  />
                )}
                <DataListItem
                  label="Total Steps"
                  value={historyEntry.steps.length.toString()}
                />
                <DataListItem
                  label="Completed Steps"
                  value={historyEntry.steps.filter(s => s.status === 'complete').length.toString()}
                />
                {historyEntry.steps.some(s => s.status === 'error') && (
                  <DataListItem
                    label="Failed Steps"
                    value={historyEntry.steps.filter(s => s.status === 'error').length.toString()}
                  />
                )}
              </DataListRoot>
            </Box>

            <Separator />

            {/* Step Details */}
            <Box>
              <Heading size="md" mb={4}>Step Details</Heading>
              {renderStepsList(historyEntry.steps)}
            </Box>
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};