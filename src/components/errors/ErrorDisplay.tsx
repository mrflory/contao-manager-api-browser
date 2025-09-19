import React, { useState } from 'react';
import {
  Box,
  Text,
  Button,
  VStack,
  Collapsible,
  Alert
} from '@chakra-ui/react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';
import { EnhancedError } from '../../types/errorTypes';
import { CodeBlock } from '../ui/code-block';

interface ErrorDisplayProps {
  error: EnhancedError;
  variant?: 'inline' | 'modal' | 'banner';
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  variant = 'inline'
}) => {
  const [showConsole, setShowConsole] = useState(false);

  const renderSummary = () => (
    <Text fontSize="sm" fontWeight="medium" color="red.600">
      {error.summary}
    </Text>
  );

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
          View Console Output
        </Button>

        <Collapsible.Root open={showConsole}>
          <Collapsible.Content>
            <Box mt={2} overflowX="hidden">
              <CodeBlock language="bash" showLineNumbers maxHeight="300px">
                {error.consoleOutput.rawOutput}
              </CodeBlock>
            </Box>
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
            {renderConsoleOutput()}
          </VStack>
        </Alert.Content>
      </Alert.Root>
    );
  }

  return (
    <Box border="1px" borderColor="red.200" borderRadius="md" p={3} bg="red.50">
      <VStack align="stretch" gap={3}>
        {renderSummary()}
        {renderConsoleOutput()}
      </VStack>
    </Box>
  );
};