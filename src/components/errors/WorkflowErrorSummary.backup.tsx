import React from 'react';
import {
  Alert,
  Badge,
  Button,
  HStack,
  VStack,
  Text
} from '@chakra-ui/react';
import { LuRotateCcw, LuSkipForward, LuSquare } from 'react-icons/lu';
import { WorkflowErrorSummary as WorkflowErrorSummaryType } from '../../types/errorTypes';

interface WorkflowErrorSummaryProps {
  errorSummary: WorkflowErrorSummaryType;
  onRetryWorkflow?: () => void;
  onSkipErrors?: () => void;
  onStopWorkflow?: () => void;
  isRetrying?: boolean;
}

export const WorkflowErrorSummary: React.FC<WorkflowErrorSummaryProps> = ({
  errorSummary,
  onRetryWorkflow,
  onSkipErrors,
  onStopWorkflow,
  isRetrying = false
}) => {
  const getCriticalityStatus = (): 'error' | 'warning' => {
    return errorSummary.criticalErrors > 0 ? 'error' : 'warning';
  };

  const getErrorCategoryBadges = () => {
    return Object.entries(errorSummary.errorsByCategory)
      .filter(([, count]) => count > 0)
      .map(([category, count]) => (
        <Badge key={category} colorPalette="red" size="sm">
          {category}: {count}
        </Badge>
      ));
  };

  const getMainMessage = (): string => {
    if (errorSummary.criticalErrors > 0) {
      return `${errorSummary.criticalErrors} critical error${errorSummary.criticalErrors > 1 ? 's' : ''} occurred`;
    }

    if (errorSummary.totalErrors === 1) {
      return 'An error occurred during workflow execution';
    }

    return `${errorSummary.totalErrors} errors occurred during workflow execution`;
  };

  const getLatestErrorMessage = (): string | undefined => {
    if (errorSummary.latestError) {
      return errorSummary.latestError.summary;
    }
    return undefined;
  };

  const renderActionButtons = () => {
    const buttons = [];

    if (onRetryWorkflow && errorSummary.canRetry) {
      buttons.push(
        <Button
          key="retry"
          colorPalette="blue"
          size="sm"
          onClick={onRetryWorkflow}
          loading={isRetrying}
        >
          <LuRotateCcw />
          Retry Failed Steps
        </Button>
      );
    }

    if (onSkipErrors && errorSummary.canSkip) {
      buttons.push(
        <Button
          key="skip"
          variant="outline"
          size="sm"
          onClick={onSkipErrors}
        >
          <LuSkipForward />
          Skip Failed Steps
        </Button>
      );
    }

    if (onStopWorkflow) {
      buttons.push(
        <Button
          key="stop"
          variant="outline"
          colorPalette="red"
          size="sm"
          onClick={onStopWorkflow}
        >
          <LuSquare />
          Stop Workflow
        </Button>
      );
    }

    return buttons;
  };

  if (errorSummary.totalErrors === 0) {
    return null;
  }

  return (
    <Alert.Root status={getCriticalityStatus()} mb={4}>
      <Alert.Indicator />
      <Alert.Content>
        <VStack align="stretch" gap={3} width="full">
          <VStack align="stretch" gap={2}>
            <Alert.Title>
              {getMainMessage()}
            </Alert.Title>

            {getLatestErrorMessage() && (
              <Alert.Description>
                Latest: {getLatestErrorMessage()}
              </Alert.Description>
            )}
          </VStack>

          {/* Error category breakdown */}
          <HStack gap={2} wrap="wrap">
            <Text fontSize="sm" color="gray.600">
              Error breakdown:
            </Text>
            {getErrorCategoryBadges()}
          </HStack>

          {/* Action buttons */}
          <HStack gap={2} wrap="wrap">
            {renderActionButtons()}
          </HStack>
        </VStack>
      </Alert.Content>
    </Alert.Root>
  );
};