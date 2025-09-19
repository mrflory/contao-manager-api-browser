import React, { useState } from 'react';
import {
  Box,
  Text,
  Button,
  HStack,
  VStack,
  Badge,
  Collapsible,
  Code,
  Separator,
  Alert
} from '@chakra-ui/react';
import { LuChevronDown, LuChevronUp, LuRotateCcw, LuSkipForward } from 'react-icons/lu';
import { EnhancedError, ErrorCategory, ErrorSeverity } from '../../types/errorTypes';
import { EnhancedConsoleOutput } from './EnhancedConsoleOutput';

interface ErrorDisplayProps {
  error: EnhancedError;
  variant?: 'inline' | 'modal' | 'banner';
  showRecoveryActions?: boolean;
  onRetry?: () => void;
  onSkip?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  variant = 'inline',
  showRecoveryActions = true,
  onRetry,
  onSkip
}) => {
  const [showDetails, setShowDetails] = useState(variant === 'modal');
  const [showConsole, setShowConsole] = useState(error.consoleOutput?.hasErrors || false);

  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };

  const getCategoryLabel = (category: ErrorCategory): string => {
    switch (category) {
      case 'network': return 'Network';
      case 'authentication': return 'Auth';
      case 'composer': return 'Composer';
      case 'migration': return 'Migration';
      case 'manager': return 'Manager';
      case 'validation': return 'Validation';
      case 'system': return 'System';
      default: return 'Unknown';
    }
  };

  const renderSummary = () => (
    <HStack gap={2} align="center">
      <Badge colorPalette={getSeverityColor(error.severity)} variant="solid" size="sm">
        {getCategoryLabel(error.category)}
      </Badge>
      <Text fontSize="sm" fontWeight="medium" color="red.600">
        {error.summary}
      </Text>
    </HStack>
  );

  const renderDetails = () => (
    <VStack align="stretch" gap={3}>
      <Text fontSize="sm" color="gray.700">
        {error.message}
      </Text>

      {error.details && (
        <Box>
          <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
            Details:
          </Text>
          <Code fontSize="xs" p={2} bg="gray.50" borderRadius="md" display="block">
            {error.details}
          </Code>
        </Box>
      )}

      {error.context && Object.keys(error.context).length > 0 && (
        <Box>
          <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
            Context:
          </Text>
          <Code fontSize="xs" p={2} bg="gray.50" borderRadius="md" display="block">
            {JSON.stringify(error.context, null, 2)}
          </Code>
        </Box>
      )}
    </VStack>
  );

  const renderRecoveryActions = () => {
    if (!showRecoveryActions || !error.recoveryActions?.length) return null;

    return (
      <Box>
        <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={2}>
          Suggested actions:
        </Text>
        <VStack align="stretch" gap={1}>
          {error.recoveryActions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={() => {
                if (action.action === 'retry' && onRetry) {
                  onRetry();
                } else if (action.action === 'skip' && onSkip) {
                  onSkip();
                } else if (action.callback) {
                  action.callback();
                } else if (action.url) {
                  window.open(action.url, '_blank');
                }
              }}
            >
              {action.action === 'retry' && <LuRotateCcw />}
              {action.action === 'skip' && <LuSkipForward />}
              {action.label}
            </Button>
          ))}
        </VStack>
      </Box>
    );
  };

  const renderConsoleOutput = () => {
    if (!error.consoleOutput) return null;

    return (
      <Box>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowConsole(!showConsole)}
          mb={2}
        >
          {showConsole ? <LuChevronUp /> : <LuChevronDown />}
          Console Output
          {error.consoleOutput.hasErrors && (
            <Badge colorPalette="red" size="sm" ml={2}>
              {error.consoleOutput.errorCount} errors
            </Badge>
          )}
        </Button>

        <Collapsible.Root open={showConsole}>
          <Collapsible.Content>
            <EnhancedConsoleOutput consoleOutput={error.consoleOutput} />
          </Collapsible.Content>
        </Collapsible.Root>
      </Box>
    );
  };

  if (variant === 'banner') {
    return (
      <Alert.Root status="error" mb={4}>
        <Alert.Indicator />
        <Alert.Content>
          <VStack align="stretch" gap={2} width="full">
            {renderSummary()}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
              alignSelf="flex-start"
            >
              {showDetails ? <LuChevronUp /> : <LuChevronDown />}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
            <Collapsible.Root open={showDetails}>
              <Collapsible.Content>
                <VStack align="stretch" gap={3} pt={2}>
                  {renderDetails()}
                  {renderRecoveryActions()}
                </VStack>
              </Collapsible.Content>
            </Collapsible.Root>
          </VStack>
        </Alert.Content>
      </Alert.Root>
    );
  }

  return (
    <Box border="1px" borderColor="red.200" borderRadius="md" p={3} bg="red.50">
      <VStack align="stretch" gap={3}>
        {renderSummary()}

        {variant === 'modal' && (
          <>
            {renderDetails()}
            <Separator />
            {renderRecoveryActions()}
          </>
        )}

        {variant === 'inline' && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
              alignSelf="flex-start"
            >
              {showDetails ? <LuChevronUp /> : <LuChevronDown />}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>

            <Collapsible.Root open={showDetails}>
              <Collapsible.Content>
                <VStack align="stretch" gap={3} pt={2}>
                  {renderDetails()}
                  <Separator />
                  {renderRecoveryActions()}
                </VStack>
              </Collapsible.Content>
            </Collapsible.Root>
          </>
        )}

        {renderConsoleOutput()}
      </VStack>
    </Box>
  );
};