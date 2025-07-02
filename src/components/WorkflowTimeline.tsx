import React, { useEffect, useRef } from 'react';
import {
  Box,
  Text,
  Badge,
  Spinner,
  Collapsible,
  Code,
  HStack,
  VStack,
  Card,
  Link,
  Button,
  Separator,
  Alert,
} from '@chakra-ui/react';
import { LuCheck as Check, LuX as X, LuTriangleAlert as AlertTriangle, LuMinus as Minus, LuCircle as Circle, LuChevronDown as ChevronDown, LuExternalLink as ExternalLink, LuCircleCheck as CheckCircle, LuInfo as Info } from 'react-icons/lu';
import { useColorModeValue } from './ui/color-mode';
import { toaster } from './ui/toaster';
import {
  TimelineRoot,
  TimelineItem,
  TimelineConnector,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
} from './ui/timeline';
import { WorkflowStep, WorkflowConfig } from '../types';

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentStep: number;
  config: WorkflowConfig;
  createMigrationSummary: (migrationData: any) => any;
  hasPendingTasksError: boolean;
  hasPendingMigrations: boolean;
  hasDryRunComplete: boolean;
  onClearTasks: () => Promise<void>;
  onCancelPendingTasks: () => void;
  onConfirmMigrations: () => void;
  onSkipMigrations: () => void;
  onCancelMigrations: () => void;
  onContinueUpdate: () => void;
  onStopWorkflow: () => void;
  configBg: string;
  getEstimatedTime: () => string;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ 
  steps, 
  config,
  createMigrationSummary,
  hasPendingTasksError,
  hasPendingMigrations,
  hasDryRunComplete,
  onClearTasks,
  onCancelPendingTasks,
  onConfirmMigrations,
  onSkipMigrations,
  onCancelMigrations,
  onContinueUpdate,
  onStopWorkflow,
  configBg
}) => {
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const cardBg = useColorModeValue('white', 'gray.800');
  const erroredStepsRef = useRef<Set<string>>(new Set());

  // Show toast notifications for errors
  useEffect(() => {
    steps.forEach(step => {
      if (step.status === 'error' && !erroredStepsRef.current.has(step.id)) {
        erroredStepsRef.current.add(step.id);
        
        let title = 'Workflow Error';
        let description = step.error || 'An error occurred during workflow execution';
        
        if (step.id === 'check-tasks' && hasPendingTasksError) {
          title = 'Pending Tasks Found';
          description = 'There are active tasks that must be resolved before proceeding';
        } else if (step.id === 'composer-dry-run') {
          title = 'Composer Dry Run Failed';
          description = 'The composer dry run encountered an error';
        } else if (step.id === 'composer-update') {
          title = 'Composer Update Failed';
          description = 'The composer update encountered an error';
        } else if (step.id === 'manager-update') {
          title = 'Manager Update Failed';
          description = 'The Contao Manager update encountered an error';
        } else if (step.id === 'database-migration') {
          title = 'Database Migration Failed';
          description = 'Database migrations encountered an error';
        }
        
        toaster.create({
          title,
          description,
          type: 'error',
          duration: 8000,
        });
      }
    });
  }, [steps, hasPendingTasksError]);

  // Utility function to add line numbers to console output
  const addLineNumbers = (text: string): string => {
    if (!text) return '';
    return text.split('\n').map((line, index) => {
      const lineNumber = (index + 1).toString().padStart(3, ' ');
      return `${lineNumber} | ${line}`;
    }).join('\n');
  };

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'active':
        return <Spinner size="sm" />;
      case 'complete':
        return <Check color="white" size={12} />;
      case 'error':
        return <X color="white" size={12} />;
      case 'skipped':
        return <Minus color="white" size={12} />;
      default:
        return <Circle color="white" size={12} />;
    }
  };


  const getStatusBadge = (step: WorkflowStep) => {
    switch (step.status) {
      case 'active':
        return <Badge colorPalette="blue">In Progress</Badge>;
      case 'complete':
        return <Badge colorPalette="green">Complete</Badge>;
      case 'error':
        return <Badge colorPalette="red">Error</Badge>;
      case 'skipped':
        return <Badge colorPalette="gray">Skipped</Badge>;
      default:
        return <Badge colorPalette="gray">Pending</Badge>;
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString();
  };

  const getDuration = (step: WorkflowStep) => {
    if (!step.startTime) return '';
    const endTime = step.endTime || new Date();
    const duration = Math.round((endTime.getTime() - step.startTime.getTime()) / 1000);
    return `${duration}s`;
  };

  const renderSponsor = (sponsor: any) => {
    if (!sponsor) return null;
    
    return (
      <Box p={3} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
        <HStack>
          <Text fontSize="sm" fontWeight="semibold" color="blue.700">
            Sponsored by:
          </Text>
          <Link 
            href={sponsor.link}
            target="_blank"
            rel="noopener noreferrer"
            color="blue.600"
            fontSize="sm"
            fontWeight="semibold"
            _hover={{ textDecoration: 'underline' }}
          >
            {sponsor.name} <ExternalLink size={12} style={{ display: 'inline' }} />
          </Link>
        </HStack>
      </Box>
    );
  };

  const renderComposerOperations = (data: any) => {
    if (!data || !data.operations) return null;

    const getOperationBadge = (status: string) => {
      switch (status) {
        case 'complete':
          return <Badge colorPalette="green" size="sm">Complete</Badge>;
        case 'active':
          return <Badge colorPalette="blue" size="sm">Running</Badge>;
        case 'pending':
          return <Badge colorPalette="gray" size="sm">Pending</Badge>;
        case 'error':
          return <Badge colorPalette="red" size="sm">Error</Badge>;
        case 'stopped':
          return <Badge colorPalette="orange" size="sm">Stopped</Badge>;
        default:
          return <Badge colorPalette="gray" size="sm">{status}</Badge>;
      }
    };

    return (
      <VStack align="stretch" gap={4}>
        {data.sponsor && renderSponsor(data.sponsor)}
        
        {data.operations.map((operation: any, index: number) => (
          <Box key={index} p={4} borderWidth="1px" borderRadius="md" bg={cardBg}>
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between" align="start">
                <Text fontSize="sm" fontWeight="bold" color="blue.600" flex="1">
                  {operation.summary}
                </Text>
                {getOperationBadge(operation.status)}
              </HStack>
              
              {operation.details && operation.details.trim() && (
                <Text fontSize="xs" color={mutedColor}>
                  {operation.details}
                </Text>
              )}
              
              {operation.console && operation.console.trim() && (
                <Collapsible.Root>
                  <Collapsible.Trigger asChild>
                    <Button variant="outline" size="xs" width="fit-content">
                      <ChevronDown size={12} /> View Console Output
                    </Button>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <Box mt={2}>
                      <Code 
                        fontSize="xs" 
                        p={3} 
                        display="block" 
                        whiteSpace="pre-wrap" 
                        bg="black"
                        color="white"
                        borderRadius="md"
                        maxH="300px"
                        overflowY="auto"
                        fontFamily="mono"
                      >
                        {addLineNumbers(operation.console)}
                      </Code>
                    </Box>
                  </Collapsible.Content>
                </Collapsible.Root>
              )}
            </VStack>
          </Box>
        ))}
      </VStack>
    );
  };

  const renderMigrationOperations = (data: any) => {
    if (!data || !data.operations) return null;

    const getOperationBadge = (status: string) => {
      switch (status) {
        case 'complete':
          return <Badge colorPalette="green" size="sm">Complete</Badge>;
        case 'active':
          return <Badge colorPalette="blue" size="sm">Running</Badge>;
        case 'pending':
          return <Badge colorPalette="gray" size="sm">Pending</Badge>;
        case 'error':
          return <Badge colorPalette="red" size="sm">Error</Badge>;
        default:
          return <Badge colorPalette="gray" size="sm">{status}</Badge>;
      }
    };

    return (
      <VStack align="stretch" gap={3}>
        {data.type && (
          <HStack>
            <Text fontSize="xs" fontWeight="semibold">Migration Type:</Text>
            <Badge colorPalette="blue" size="sm">{data.type}</Badge>
          </HStack>
        )}
        
        <Text fontSize="xs" fontWeight="semibold">Database Operations:</Text>
        {data.operations.map((operation: any, index: number) => (
          <Box key={index} p={3} borderWidth="1px" borderRadius="md" bg={cardBg}>
            <HStack justify="space-between" align="start">
              <Text fontSize="sm" fontWeight="bold" color="orange.600" flex="1">
                {operation.name || `Operation ${index + 1}`}
              </Text>
              {operation.status && getOperationBadge(operation.status)}
            </HStack>
          </Box>
        ))}
        
        {data.hash && (
          <HStack>
            <Text fontSize="xs" fontWeight="semibold">Migration Hash:</Text>
            <Code fontSize="xs">{data.hash}</Code>
          </HStack>
        )}
      </VStack>
    );
  };

  const renderMigrationHistory = (step: WorkflowStep) => {
    if (!step.migrationHistory || step.migrationHistory.length === 0) return null;

    return (
      <Box mt={3}>
        <Text fontSize="xs" fontWeight="semibold" mb={2}>
          Migration Execution History ({step.migrationHistory.length} cycles):
        </Text>
        <VStack align="stretch" gap={2}>
          {step.migrationHistory.map((history, index) => (
            <Box key={index} p={3} borderWidth="1px" borderRadius="md" bg={cardBg}>
              <VStack align="stretch" gap={2}>
                <HStack justify="space-between">
                  <HStack>
                    <Badge 
                      colorPalette={history.stepType === 'check' ? 'blue' : 'orange'} 
                      size="xs"
                    >
                      Cycle {history.cycle} - {history.stepType === 'check' ? 'Check' : 'Execute'}
                    </Badge>
                    <Badge 
                      colorPalette={
                        history.status === 'complete' ? 'green' : 
                        history.status === 'error' ? 'red' : 'gray'
                      } 
                      size="xs"
                    >
                      {history.status}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color={mutedColor}>
                    {history.timestamp.toLocaleTimeString()}
                  </Text>
                </HStack>
                
                {history.data.operations && (
                  <Text fontSize="xs" color={mutedColor}>
                    {history.data.operations.length} operations 
                    {history.data.type && ` (${history.data.type})`}
                    {history.data.hash && ` - Hash: ${history.data.hash.substring(0, 8)}...`}
                  </Text>
                )}
                
                {history.error && (
                  <Text fontSize="xs" color="red.500">
                    Error: {history.error}
                  </Text>
                )}
              </VStack>
            </Box>
          ))}
        </VStack>
      </Box>
    );
  };

  const renderPendingTasksConfirmation = (step: WorkflowStep) => {
    if (step.id !== 'check-tasks' || step.status !== 'error' || !hasPendingTasksError) {
      return null;
    }

    return (
      <VStack gap={3} align="stretch" mt={3}>
        
        {(step.data || step.error) && (
          <Box p={3} bg={configBg} borderRadius="md">
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              {step.data?.migrationType === 'database-migration' 
                ? 'Current pending database migration task:' 
                : 'Current pending tasks:'}
            </Text>
            
            {/* Show task title and basic info */}
            {step.data?.title && (
              <VStack align="stretch" gap={2} mb={3}>
                <HStack justify="space-between" align="center">
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">
                    {step.data.title}
                  </Text>
                  <Badge 
                    colorPalette={
                      step.data.status === 'complete' ? 'green' :
                      step.data.status === 'active' ? 'blue' :
                      step.data.status === 'error' ? 'red' : 'gray'
                    }
                    size="sm"
                  >
                    {step.data.status}
                  </Badge>
                </HStack>
                
                {step.data.id && (
                  <Text fontSize="xs" color={mutedColor}>
                    Task ID: {step.data.id}
                  </Text>
                )}
                
                {step.data.sponsor && (
                  <Box p={2} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
                    <HStack>
                      <Text fontSize="xs" fontWeight="semibold" color="blue.700">
                        Sponsored by:
                      </Text>
                      <Link 
                        href={step.data.sponsor.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="blue.600"
                        fontSize="xs"
                        fontWeight="semibold"
                        _hover={{ textDecoration: 'underline' }}
                      >
                        {step.data.sponsor.name}
                      </Link>
                    </HStack>
                  </Box>
                )}
              </VStack>
            )}
            
            {step.data?.migrationType === 'database-migration' && step.data?.migrationStatus ? (
              <HStack justify="space-between" align="center">
                <Text fontSize="sm" flex="1">
                  Database Migration Task
                </Text>
                <Badge 
                  colorPalette={
                    step.data.migrationStatus.status === 'active' ? 'blue' :
                    step.data.migrationStatus.status === 'pending' ? 'gray' :
                    step.data.migrationStatus.status === 'complete' ? 'green' :
                    step.data.migrationStatus.status === 'error' ? 'red' : 'gray'
                  }
                  size="sm"
                >
                  {step.data.migrationStatus.status === 'active' ? 'Running' :
                   step.data.migrationStatus.status === 'pending' ? 'Pending' :
                   step.data.migrationStatus.status === 'complete' ? 'Complete' :
                   step.data.migrationStatus.status === 'error' ? 'Error' :
                   step.data.migrationStatus.status}
                </Badge>
              </HStack>
            ) : 
            step.data?.operations && Array.isArray(step.data.operations) ? (
              <VStack align="stretch" gap={3}>
                {step.data.operations.map((operation: any, index: number) => (
                  <Box key={index} p={3} borderWidth="1px" borderRadius="md" bg={cardBg}>
                    <VStack align="stretch" gap={2}>
                      <HStack justify="space-between" align="start">
                        <Text fontSize="sm" fontWeight="bold" color="blue.600" flex="1">
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
                      
                      {operation.details && operation.details.trim() && (
                        <Text fontSize="xs" color={mutedColor}>
                          {operation.details}
                        </Text>
                      )}
                      
                      {operation.console && operation.console.trim() && (
                        <Collapsible.Root>
                          <Collapsible.Trigger asChild>
                            <Button variant="outline" size="xs" width="fit-content">
                              <ChevronDown size={12} /> View Console Output
                            </Button>
                          </Collapsible.Trigger>
                          <Collapsible.Content>
                            <Box mt={2}>
                              <Code 
                                fontSize="xs" 
                                p={3} 
                                display="block" 
                                whiteSpace="pre-wrap" 
                                bg="black"
                                color="white"
                                borderRadius="md"
                                maxH="300px"
                                overflowY="auto"
                                fontFamily="mono"
                              >
                                {addLineNumbers(operation.console)}
                              </Code>
                            </Box>
                          </Collapsible.Content>
                        </Collapsible.Root>
                      )}
                    </VStack>
                  </Box>
                ))}
                
              </VStack>
            ) : (
              <Text fontSize="sm" color="gray.600">
                {step.data?.title || step.error || 'Task running...'}
              </Text>
            )}
          </Box>
        )}
        
        <Text fontSize="sm">
          You can either wait for the current tasks to complete, or force clear them to continue 
          with the update workflow.
        </Text>

        <HStack gap={3}>
          <Button variant="ghost" onClick={onCancelPendingTasks}>
            Cancel
          </Button>
          <Button colorPalette="orange" onClick={onClearTasks}>
            Clear Tasks & Continue
          </Button>
        </HStack>
      </VStack>
    );
  };

  const renderMigrationConfirmation = (step: WorkflowStep) => {
    if (step.id !== 'check-migrations-loop' || !hasPendingMigrations) {
      return null;
    }

    const migrationData = step.data;
    const summary = migrationData ? createMigrationSummary(migrationData) : null;

    return (
      <VStack gap={3} align="stretch" mt={3}>
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
                      {summary.operationBreakdown.map(({ operation, count }: { operation: string; count: number }) => (
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
          
          {step.migrationHistory && step.migrationHistory.length > 0 && (
            <Box p={3} bg={configBg} borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Previous Migration Cycles ({step.migrationHistory.length}):
              </Text>
              <VStack align="stretch" gap={2}>
                {step.migrationHistory.slice(-3).map((history, index) => (
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
                {step.migrationHistory.length > 3 && (
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    ... and {step.migrationHistory.length - 3} more cycles
                  </Text>
                )}
              </VStack>
            </Box>
          )}
        </VStack>
        
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

        <HStack gap={3}>
          <Button variant="ghost" onClick={onCancelMigrations}>
            Cancel Workflow
          </Button>
          <Button variant="outline" onClick={onSkipMigrations}>
            Skip Migrations
          </Button>
          <Button colorPalette="blue" onClick={onConfirmMigrations}>
            Run Migrations
          </Button>
        </HStack>
      </VStack>
    );
  };

  const renderDryRunConfirmation = (step: WorkflowStep) => {
    if (step.id !== 'composer-dry-run' || step.status !== 'complete' || !hasDryRunComplete) {
      return null;
    }

    return (
      <VStack gap={3} align="stretch" mt={3}>
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
        
        {step.data && (
          <Box p={3} bg={configBg} borderRadius="md">
            <Text fontSize="sm" fontWeight="semibold" mb={2}>Dry-run summary:</Text>
            {step.data.operations && Array.isArray(step.data.operations) ? (
              <VStack align="stretch" gap={2}>
                {step.data.operations.map((operation: any, index: number) => (
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
                {step.data.title || 'Dry-run completed'}
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

        <HStack gap={3}>
          <Button variant="ghost" onClick={onStopWorkflow}>
            Stop Workflow
          </Button>
          <Button colorPalette="blue" onClick={onContinueUpdate}>
            Continue Update
          </Button>
        </HStack>
      </VStack>
    );
  };

  const renderStepData = (step: WorkflowStep) => {
    if (!step.data) return null;

    // Check if this is a composer step (dry-run or update) with structured data
    const isComposerStep = (step.id.includes('dry-run') || 
                           step.id.includes('composer-update') || 
                           step.id.includes('update-packages')) && 
                           typeof step.data === 'object' && 
                           step.data.operations;

    // Check if this is a database migration step
    const isMigrationStep = (step.id.includes('migrations') || step.id.includes('migration')) && 
                           typeof step.data === 'object' && 
                           (step.data.operations || step.data.status || step.data.type);

    const isActive = step.status === 'active';
    const isComplete = step.status === 'complete';

    if (isComposerStep && (isActive || isComplete)) {
      const isDryRun = step.id.includes('dry-run');
      const stepTitle = isDryRun ? 'Dry-run Results:' : 'Update Progress:';
      const activeTitle = isDryRun ? 'Progress:' : 'Update Progress:';
      
      return (
        <VStack align="stretch" gap={3}>
          <Text fontSize="xs" fontWeight="semibold">
            {isActive ? activeTitle : stepTitle}
          </Text>
          {renderComposerOperations(step.data)}
          
          <Separator />
          
          <Collapsible.Root>
            <Collapsible.Trigger asChild>
              <Button variant="outline" size="xs" width="fit-content">
                <ChevronDown size={12} /> Show Raw Data
              </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Box mt={2}>
                <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                  {JSON.stringify(step.data, null, 2)}
                </Code>
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        </VStack>
      );
    }

    if (isMigrationStep && (isActive || isComplete)) {
      const stepTitle = step.id.includes('check') ? 'Migration Check Results:' : 'Migration Progress:';
      const activeTitle = step.id.includes('check') ? 'Checking migrations...' : 'Executing migrations...';
      
      return (
        <VStack align="stretch" gap={3}>
          <Text fontSize="xs" fontWeight="semibold">
            {isActive ? activeTitle : stepTitle}
          </Text>
          {renderMigrationOperations(step.data)}
          
          <Separator />
          
          <Collapsible.Root>
            <Collapsible.Trigger asChild>
              <Button variant="outline" size="xs" width="fit-content">
                <ChevronDown size={12} /> Show Raw Data
              </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Box mt={2}>
                <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                  {JSON.stringify(step.data, null, 2)}
                </Code>
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
          
          {/* Show migration history for migration steps */}
          {renderMigrationHistory(step)}
        </VStack>
      );
    }

    // Default rendering for other steps
    if (isActive || isComplete) {
      return (
        <VStack align="stretch" gap={2}>
          <Text fontSize="xs" fontWeight="semibold">
            {isActive ? 'Progress:' : 'Result:'}
          </Text>
          
          <Collapsible.Root>
            <Collapsible.Trigger asChild>
              <Button variant="outline" size="xs" width="fit-content">
                <ChevronDown size={12} /> Show Details
              </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Box mt={2}>
                <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap" maxH="300px" overflowY="auto">
                  {typeof step.data === 'string' ? step.data : JSON.stringify(step.data, null, 2)}
                </Code>
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
          
          {/* Show migration history for any step that might have it */}
          {renderMigrationHistory(step)}
        </VStack>
      );
    }

    return null;
  };

  return (
    <TimelineRoot>
      {steps.map((step) => {
        
        return (
          <TimelineItem key={step.id} opacity={step.status === 'skipped' ? 0.6 : 1}>
            <TimelineConnector>
              {getStepIcon(step)}
            </TimelineConnector>
            
            <TimelineContent>
              <TimelineTitle fontSize="md"> 
                <HStack justify="space-between">
                  {step.title}
                  {getStatusBadge(step)}
                </HStack>
              </TimelineTitle>
                
                <TimelineDescription fontSize="sm" color={mutedColor}>
                  {step.description}
                </TimelineDescription>
              <Card.Root>
                <Card.Body>

                {(step.startTime || step.endTime) && (
                  <HStack gap={4} fontSize="xs" color={mutedColor} mb={2}>
                    {step.startTime && (
                      <Text>Started: {formatTime(step.startTime)}</Text>
                    )}
                    {step.endTime && (
                      <Text>Ended: {formatTime(step.endTime)}</Text>
                    )}
                    {step.startTime && (
                      <Text>Duration: {getDuration(step)}</Text>
                    )}
                  </HStack>
                )}

                <Collapsible.Root open={!!step.error || !!step.data}>
                  <Collapsible.Content>
                    <VStack align="stretch" gap={2} mt={2}>
                      {step.error && (
                        <Box p={2} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                          <HStack>
                            <AlertTriangle color="#E53E3E" size={16} />
                            <Text fontSize="sm" color="red.700">
                              {step.error}
                            </Text>
                          </HStack>
                        </Box>
                      )}
                      
                      {renderStepData(step)}
                      
                      {/* Render inline confirmations */}
                      {renderPendingTasksConfirmation(step)}
                      {renderMigrationConfirmation(step)}
                      {renderDryRunConfirmation(step)}
                    </VStack>
                  </Collapsible.Content>
                </Collapsible.Root>

              </Card.Body>
              </Card.Root>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </TimelineRoot>
  );
};