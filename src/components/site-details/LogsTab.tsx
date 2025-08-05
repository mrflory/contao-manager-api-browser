import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Box,
  Flex,
  Center,
  Spinner,
  Badge,
  Code,
  Table,
  Alert,
} from '@chakra-ui/react';
import { LuTrash2 as Trash2, LuRefreshCcw } from 'react-icons/lu';
import { Site } from '../../types';
import { useApiCall } from '../../hooks/useApiCall';
import { useModalState } from '../../hooks/useModalState';
import { LogsApiService } from '../../services/apiCallService';
import { useToastNotifications, TOAST_MESSAGES } from '../../hooks/useToastNotifications';
import { ApiResultModal } from '../modals/ApiResultModal';
import { useColorModeValue } from '../ui/color-mode';
import { formatDateTime } from '../../utils/dateUtils';

export interface LogsTabProps {
  site: Site;
}

export const LogsTab: React.FC<LogsTabProps> = ({ site }) => {
  const [logs, setLogs] = useState<any[]>([]);

  const cardBg = useColorModeValue('white', 'gray.800');
  const toast = useToastNotifications();
  const { modalState, openModal, closeModal } = useModalState();

  const logsApi = useApiCall(
    () => LogsApiService.getLogs(site.url),
    {
      onSuccess: (data: any) => {
        setLogs(data.logs || []);
      },
      showErrorToast: true,
    }
  );

  const cleanupApi = useApiCall(
    () => LogsApiService.cleanupOldLogs(site.url),
    {
      onSuccess: (data: any) => {
        if (data.success) {
          toast.showSuccess(TOAST_MESSAGES.LOGS_CLEANED(data.deletedCount));
          loadLogs();
        }
      },
    }
  );

  const loadLogs = async () => {
    await logsApi.execute();
  };

  const handleCleanupOldLogs = async () => {
    await cleanupApi.execute();
  };

  useEffect(() => {
    loadLogs();
  }, [site.url]);

  const showLogDetails = (log: any) => {
    const logDetails = (
      <VStack gap={4} align="stretch">
        <Box p={4} borderWidth="1px" borderRadius="md">
          <Heading size="sm" mb={3}>Request Details</Heading>
          <VStack gap={2} align="start">
            <Text><strong>Method:</strong> {log.method}</Text>
            <Text><strong>Endpoint:</strong> {log.endpoint}</Text>
            <Text><strong>Timestamp:</strong> {formatDateTime(log.timestamp)}</Text>
            <Text><strong>Status Code:</strong> {log.statusCode || 'N/A'}</Text>
            {log.error && (
              <Text><strong>Error:</strong> <Text as="span" color="red.500">{log.error}</Text></Text>
            )}
          </VStack>
        </Box>
        
        {log.requestData && (
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={3}>Request Data</Heading>
            <Code display="block" whiteSpace="pre" p={3} borderRadius="md" maxH="200px" overflowY="auto">
              {JSON.stringify(log.requestData, null, 2)}
            </Code>
          </Box>
        )}
        
        {log.responseData && (
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Heading size="sm" mb={3}>Response Data</Heading>
            <Code display="block" whiteSpace="pre" p={3} borderRadius="md" maxH="300px" overflowY="auto">
              {JSON.stringify(log.responseData, null, 2)}
            </Code>
          </Box>
        )}
      </VStack>
    );
    
    openModal(`Log Details - ${log.method} ${log.endpoint}`, logDetails);
  };

  return (
    <>
      <VStack gap={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg">API Call Logs</Heading>
          <HStack gap={3}>
            <Button
              colorPalette="red"
              onClick={handleCleanupOldLogs}
              loading={cleanupApi.state.loading}
              size="sm"
            >
              <Trash2 size={16} /> Cleanup Old Logs
            </Button>
            <Button
              colorPalette="blue"
              onClick={loadLogs}
              loading={logsApi.state.loading}
              size="sm"
            >
              <LuRefreshCcw size={16} /> Refresh Logs
            </Button>
          </HStack>
        </Flex>
        
        {logsApi.state.loading ? (
          <Center py={8}>
            <Spinner size="lg" />
          </Center>
        ) : logs.length === 0 ? (
          <Alert.Root status="info">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No logs found</Alert.Title>
              <Alert.Description>
                No API call logs are available for this site yet. Make some API calls from the Expert tab to see logs here.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        ) : (
          <Box>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Showing {logs.length} log entries for {site.name}
            </Text>
            <Box maxH="600px" overflowY="auto">
              <Table.Root variant="outline" size="sm">
                <Table.Header position="sticky" top={0} bg={cardBg} zIndex={1}>
                  <Table.Row>
                    <Table.ColumnHeader>Timestamp</Table.ColumnHeader>
                    <Table.ColumnHeader>Method</Table.ColumnHeader>
                    <Table.ColumnHeader>Endpoint</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader>Error</Table.ColumnHeader>
                    <Table.ColumnHeader>Details</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {logs.map((log, index) => (
                    <Table.Row key={index}>
                      <Table.Cell>
                        <Text fontSize="xs">
                          {formatDateTime(log.timestamp)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge 
                          colorPalette={
                            log.method === 'GET' ? 'blue' : 
                            log.method === 'POST' ? 'green' : 
                            log.method === 'PUT' ? 'orange' : 
                            log.method === 'DELETE' ? 'red' : 'gray'
                          }
                          size="sm"
                        >
                          {log.method}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Code fontSize="xs">{log.endpoint}</Code>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge 
                          colorPalette={
                            log.statusCode >= 200 && log.statusCode < 300 ? 'green' :
                            log.statusCode >= 300 && log.statusCode < 400 ? 'blue' :
                            log.statusCode >= 400 && log.statusCode < 500 ? 'orange' :
                            log.statusCode >= 500 ? 'red' : 'gray'
                          }
                          size="sm"
                        >
                          {log.statusCode || 'N/A'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {log.error ? (
                          <Text fontSize="xs" color="red.500" lineClamp={1} maxW="150px">
                            {log.error}
                          </Text>
                        ) : (
                          <Text fontSize="xs" color="gray.400">None</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => showLogDetails(log)}
                        >
                          View
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        )}
      </VStack>

      <ApiResultModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
      >
        {modalState.content}
      </ApiResultModal>
    </>
  );
};