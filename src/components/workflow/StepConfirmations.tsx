import React, { useState } from 'react';
import { VStack, HStack, Box, Text, Badge, Button, Alert, Link, Collapsible } from '@chakra-ui/react';
import { Checkbox } from '../ui/checkbox';
import { LuChevronDown as ChevronDown } from 'react-icons/lu';
import { WorkflowStep } from '../../types';
import { useColorModeValue } from '../ui/color-mode';
import { CodeBlock } from '../ui/code-block';
import { getOperationBadgeColor, getOperationBadgeText } from '../../utils/workflowUtils';

export interface StepConfirmationsProps {
  step: WorkflowStep;
  createMigrationSummary: (data: any) => any;
  hasPendingTasksError: boolean;
  hasPendingMigrations: boolean;
  hasDryRunComplete: boolean;
  onClearTasks: () => Promise<void>;
  onCancelPendingTasks: () => void;
  onConfirmMigrations: (withDeletes?: boolean) => void;
  onSkipMigrations: () => void;
  onCancelMigrations: () => void;
  onContinueUpdate: () => void;
  onSkipComposerUpdate: () => void;
  onCancelWorkflow: () => void;
  configBg: string;
}

export const StepConfirmations: React.FC<StepConfirmationsProps> = ({
  step,
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
  onSkipComposerUpdate,
  onCancelWorkflow,
  configBg,
}) => {
  const [withDeletes, setWithDeletes] = useState(false);
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const cardBg = useColorModeValue('white', 'gray.800');

  const renderPendingTasksConfirmation = () => {
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
                  <Box key={index} p={3} borderWidth="1px" borderRadius="md" bg={cardBg} maxW="100%" minW={0}>
                    <VStack align="stretch" gap={2}>
                      <HStack justify="space-between" align="start">
                        <Text fontSize="sm" fontWeight="bold" color="blue.600" flex="1">
                          {operation.summary}
                        </Text>
                        <Badge 
                          colorPalette={getOperationBadgeColor(operation.status)}
                          size="sm"
                        >
                          {getOperationBadgeText(operation.status)}
                        </Badge>
                      </HStack>
                      
                      {operation.details && operation.details.trim() && (
                        <Text fontSize="xs" color={mutedColor}>
                          {operation.details}
                        </Text>
                      )}
                      
                      {operation.console && operation.console.trim() && (
                        <Collapsible.Root maxW="100%" width="100%">
                          <Collapsible.Trigger asChild>
                            <Button variant="outline" size="xs" width="fit-content">
                              <ChevronDown size={12} /> View Console Output
                            </Button>
                          </Collapsible.Trigger>
                          <Collapsible.Content maxW="100%" overflow="hidden">
                            <Box mt={2} maxW="100%" overflowX="hidden">
                              <CodeBlock 
                                language="bash"
                                showLineNumbers
                                maxHeight="300px"
                              >
                                {operation.console}
                              </CodeBlock>
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

  const renderMigrationConfirmation = () => {
    if (!step.id.startsWith('check-migrations-loop') || !hasPendingMigrations) {
      return null;
    }

    const migrationData = step.data;
    const summary = migrationData ? createMigrationSummary(migrationData) : null;

    return (
      <VStack gap={3} align="stretch" mt={3}>
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Pending database migrations detected</Alert.Title>
            <Alert.Description>
              The system has detected pending database migrations that need to be executed 
              to complete the update process.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
        
        {summary && (
          <Box p={3} bg={configBg} borderRadius="md">
            <VStack align="stretch" gap={2}>
              <HStack justify="space-between">
                <Text fontSize="sm">Type:</Text>
                <Badge colorPalette="blue" size="sm">{summary.migrationType}</Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">Operations:</Text>
                <Text fontSize="sm" fontWeight="semibold">{summary.totalOperations}</Text>
              </HStack>
              
              {summary.operationBreakdown.length > 0 && (
                <HStack gap={2} flexWrap="wrap">
                  {summary.operationBreakdown.map(({ operation, count }: { operation: string; count: number }) => (
                    <Badge 
                      key={operation}
                      colorPalette={
                        operation === 'DROP' ? 'red' :
                        operation === 'CREATE' ? 'green' :
                        operation === 'ALTER' ? 'orange' :
                        'gray'
                      }
                      size="sm"
                    >
                      {operation}: {count}
                    </Badge>
                  ))}
                </HStack>
              )}
            </VStack>
          </Box>
        )}
        
        <Box p={3} bg={configBg} borderRadius="md">
          <Text fontSize="sm" fontWeight="semibold" mb={3}>Migration Options:</Text>
          <VStack align="start" gap={2}>
            <Checkbox
              checked={withDeletes}
              onCheckedChange={(checked) => setWithDeletes(!!checked.checked)}
            >
              Execute migrations including DROP queries
            </Checkbox>
            <Text fontSize="xs" color="gray.600">
              Warning: DROP queries may remove data or database structures.
            </Text>
          </VStack>
        </Box>
        
        {withDeletes && (
          <Alert.Root status="warning" size="sm">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description fontSize="sm">
                DROP queries enabled - may remove data or database structures.
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}
        
        <Text fontSize="sm">
          Proceed with migrations, skip them, or cancel the workflow.
        </Text>

        <HStack gap={3}>
          <Button variant="ghost" onClick={onCancelMigrations}>
            Cancel Workflow
          </Button>
          <Button variant="outline" onClick={onSkipMigrations}>
            Skip Migrations
          </Button>
          <Button colorPalette="blue" onClick={() => onConfirmMigrations(withDeletes)}>
            Run Migrations
          </Button>
        </HStack>
      </VStack>
    );
  };

  const renderDryRunConfirmation = () => {
    if (step.id !== 'composer-dry-run' || step.status !== 'complete' || !hasDryRunComplete) {
      return null;
    }

    return (
      <VStack gap={3} align="stretch" mt={3}>
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Dry-run completed successfully!</Alert.Title>
            <Alert.Description>
              The composer dry-run has finished. You can review the results above to see what changes would be made.
            </Alert.Description>
          </Alert.Content>
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
          You can continue with the composer update, skip it and proceed to database migrations, 
          or cancel the entire workflow.
        </Text>

        <HStack gap={3}>
          <Button variant="ghost" onClick={onCancelWorkflow}>
            Cancel Workflow
          </Button>
          <Button variant="outline" onClick={onSkipComposerUpdate}>
            Skip Composer Update
          </Button>
          <Button colorPalette="blue" onClick={onContinueUpdate}>
            Run Composer Update
          </Button>
        </HStack>
      </VStack>
    );
  };

  return (
    <>
      {renderPendingTasksConfirmation()}
      {renderMigrationConfirmation()}
      {renderDryRunConfirmation()}
    </>
  );
};