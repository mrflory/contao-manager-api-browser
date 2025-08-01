import React from 'react';
import { Badge, HStack, VStack, Text, Card, Collapsible, Spinner } from '@chakra-ui/react';
import { LuCheck as Check, LuX as X, LuMinus as Minus, LuCircle as Circle } from 'react-icons/lu';
import {
  TimelineItem,
  TimelineConnector,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
} from '../ui/timeline';
import { WorkflowStep as WorkflowStepType } from '../../types';
import { useColorModeValue } from '../ui/color-mode';
import { formatTime, getDuration } from '../../utils/dateUtils';
import { getStatusBadgeColor, getStatusBadgeText } from '../../utils/workflowUtils';
import { StepDataRenderer } from './StepDataRenderer';
import { StepConfirmations } from './StepConfirmations';

export interface WorkflowStepProps {
  step: WorkflowStepType;
  config: unknown;
  createMigrationSummary: (data: unknown) => unknown;
  hasPendingTasksError: boolean;
  hasPendingMigrations: boolean;
  hasDryRunComplete: boolean;
  onClearTasks: () => Promise<void>;
  onCancelPendingTasks: () => void;
  onConfirmMigrations: () => void;
  onSkipMigrations: () => void;
  onCancelMigrations: () => void;
  onContinueUpdate: () => void;
  onSkipComposerUpdate: () => void;
  onCancelWorkflow: () => void;
  configBg: string;
}

export const WorkflowStepComponent: React.FC<WorkflowStepProps> = ({
  step,
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
  onSkipComposerUpdate,
  onCancelWorkflow,
  configBg,
}) => {
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const getStepIcon = () => {
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

  const getStatusBadge = () => {
    return (
      <Badge colorPalette={getStatusBadgeColor(step)}>
        {getStatusBadgeText(step)}
      </Badge>
    );
  };

  return (
    <TimelineItem opacity={step.status === 'skipped' ? 0.6 : 1}>
      <TimelineConnector>
        {getStepIcon()}
      </TimelineConnector>
      
      <TimelineContent>
        <TimelineTitle fontSize="md"> 
          <HStack justify="space-between">
            {step.title}
            {getStatusBadge()}
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
                  <Text>Duration: {getDuration(step.startTime, step.endTime)}</Text>
                )}
              </HStack>
            )}

            <Collapsible.Root open={!!step.error || !!step.data}>
              <Collapsible.Content>
                <VStack align="stretch" gap={2} mt={2}>
                  {step.error && (
                    <Text fontSize="sm" color="red.500" p={2} bg="red.50" borderRadius="md">
                      ⚠️ {step.error}
                    </Text>
                  )}
                  
                  <StepDataRenderer step={step} />
                  
                  <StepConfirmations
                    step={step}
                    config={config}
                    createMigrationSummary={createMigrationSummary}
                    hasPendingTasksError={hasPendingTasksError}
                    hasPendingMigrations={hasPendingMigrations}
                    hasDryRunComplete={hasDryRunComplete}
                    onClearTasks={onClearTasks}
                    onCancelPendingTasks={onCancelPendingTasks}
                    onConfirmMigrations={onConfirmMigrations}
                    onSkipMigrations={onSkipMigrations}
                    onCancelMigrations={onCancelMigrations}
                    onContinueUpdate={onContinueUpdate}
                    onSkipComposerUpdate={onSkipComposerUpdate}
                    onCancelWorkflow={onCancelWorkflow}
                    configBg={configBg}
                  />
                </VStack>
              </Collapsible.Content>
            </Collapsible.Root>
          </Card.Body>
        </Card.Root>
      </TimelineContent>
    </TimelineItem>
  );
};