import React from 'react';
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
} from '@chakra-ui/react';
import { LuCheck as Check, LuX as X, LuTriangleAlert as AlertTriangle, LuMinus as Minus, LuCircle as Circle, LuChevronDown as ChevronDown, LuExternalLink as ExternalLink } from 'react-icons/lu';
import { useColorModeValue } from './ui/color-mode';
import {
  TimelineRoot,
  TimelineItem,
  TimelineConnector,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
} from './ui/timeline';
import { WorkflowStep } from '../types';

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentStep: number;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ steps }) => {
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const cardBg = useColorModeValue('white', 'gray.800');

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
                      >
                        {operation.console}
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