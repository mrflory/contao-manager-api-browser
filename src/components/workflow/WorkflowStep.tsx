import React, { useState, useEffect } from 'react';
import { Badge, HStack, VStack, Text, Collapsible, Spinner, IconButton } from '@chakra-ui/react';
import { LuCheck as Check, LuX as X, LuMinus as Minus, LuCircle as Circle, LuChevronDown as ChevronDown, LuChevronUp as ChevronUp } from 'react-icons/lu';
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
  createMigrationSummary?: (migrationData: any, stepId?: string) => any;
}

export const WorkflowStepComponent: React.FC<WorkflowStepProps> = ({
  step,
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
  createMigrationSummary,
}) => {
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if step needs confirmation (has pending user actions)
  const needsConfirmation = () => {
    // Check for specific steps that might need confirmation
    if (step.id === 'check-tasks' && hasPendingTasksError) return true;
    if (step.id.startsWith('check-migrations-loop') && hasPendingMigrations) return true;
    if (step.id === 'composer-dry-run' && hasDryRunComplete) return true;
    
    // Check if step is complete but waiting for user input
    // This happens when a step has completed its API call but workflow is paused
    if (step.status === 'complete' && (hasPendingTasksError || hasPendingMigrations || hasDryRunComplete)) {
      return true;
    }
    
    return false;
  };

  // Smart auto-expand/collapse logic
  useEffect(() => {
    if (step.status === 'active') {
      // Auto-expand when step becomes active
      setIsExpanded(true);
    } else if (step.status === 'error' || needsConfirmation()) {
      // Always expand and keep expanded for errors or pending confirmations
      setIsExpanded(true);
    } else if (step.status === 'complete' && !needsConfirmation()) {
      // Auto-collapse when step completes and doesn't need confirmation
      setIsExpanded(false);
    }
  }, [step.status, hasPendingTasksError, hasPendingMigrations, hasDryRunComplete]);

  // Determine if content should be shown (expanded or has important content)
  const shouldShowContent = isExpanded || step.status === 'error' || step.status === 'active' || step.status === 'cancelled' || needsConfirmation();

  const getStepIcon = () => {
    switch (step.status) {
      case 'active':
        return <Spinner size="md" borderWidth="4px" />;
      case 'complete':
        return <Check color="white" size={24} />;
      case 'error':
        return <X color="white" size={24} />;
      case 'skipped':
        return <Minus color="white" size={24} />;
      case 'cancelled':
        return <X color="white" size={24} />;
      default:
        return <Circle color="white" size={24} />;
    }
  };

  const getIndicatorColor = () => {
    switch (step.status) {
      case 'active':
        return 'blue.300'; // Light blue for running
      case 'complete':
        return 'green.500'; // Green for finished
      case 'error':
        return 'red.500'; // Red for error
      case 'skipped':
        return 'blue.800'; // Dark blue for skipped
      case 'cancelled':
        return 'orange.500'; // Orange for cancelled
      default:
        return 'blue.500'; // Default blue for pending
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
      <TimelineConnector bg={getIndicatorColor()}>
        {getStepIcon()}
      </TimelineConnector>
      
      <TimelineContent>
        <TimelineTitle fontSize="md">
          <HStack justify="space-between" align="center" width="100%">
            <Text>{step.title}</Text>
            <HStack align="center" gap={2}>
              {getStatusBadge()}
              {/* Manual toggle arrow */}
              <IconButton
                size="xs"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? "Collapse step details" : "Expand step details"}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </IconButton>
            </HStack>
          </HStack>
        </TimelineTitle>

        {/* Collapsible content area */}
        <Collapsible.Root open={shouldShowContent}>
          <Collapsible.Content>
            <VStack align="stretch" gap={3} mt={3}>
              {/* Step description moved inside */}
              <TimelineDescription fontSize="sm" color={mutedColor}>
                {step.description}
              </TimelineDescription>

              {/* Timestamps */}
              {(step.startTime || step.endTime) && (
                <HStack gap={4} fontSize="xs" color={mutedColor}>
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

              {/* Error display */}
              {step.error && (
                <Text fontSize="sm" color="red.500" p={3} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.500">
                  ⚠️ {step.error}
                </Text>
              )}
              
              {/* Step data and confirmations */}
              <StepDataRenderer 
                step={step} 
                migrationSummary={step.data && createMigrationSummary ? createMigrationSummary(step.data, step.id) : null}
              />
              
              <StepConfirmations
                step={step}
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
      </TimelineContent>
    </TimelineItem>
  );
};