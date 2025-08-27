import React, { useState, useCallback } from 'react';
import { VStack, Box, HStack, Text, Badge, Button, IconButton } from '@chakra-ui/react';
import { LuChevronDown as ChevronDown, LuChevronUp as ChevronUp, LuCode as Code } from 'react-icons/lu';
import { JsonDisplayModal } from '../modals/ApiResultModal';
import { useColorModeValue } from '../ui/color-mode';
import { CodeBlock } from '../ui/code-block';
import { getOperationBadgeColor, getOperationBadgeText } from '../../utils/workflowUtils';

// Global state to persist console output visibility across component re-mounts
const consoleVisibilityState = new Map<string, boolean>();

export interface ManagerOperationsProps {
  data: {
    operations?: Array<{
      summary: string;
      details?: string;
      console?: string;
      status: string;
    }>;
  };
  stepId?: string; // Used to create unique keys for persistent state
}

export const ManagerOperations: React.FC<ManagerOperationsProps> = ({ data, stepId }) => {
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const cardBg = useColorModeValue('white', 'gray.800');
  
  // Raw data modal state
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);

  // Console output visibility state for each operation with persistent state
  const ConsoleToggle = ({ operation, operationIndex }: { 
    operation: { summary: string; details?: string; console?: string; status: string }; 
    operationIndex: number 
  }) => {
    // Create unique key for this operation's console state
    const consoleKey = `${stepId || 'default'}-operation-${operationIndex}`;
    
    // Get current state from persistent storage, defaulting to false
    const getCurrentState = useCallback(() => {
      return consoleVisibilityState.get(consoleKey) || false;
    }, [consoleKey]);
    
    const [showConsole, setShowConsole] = useState(getCurrentState);
    
    const toggleConsole = useCallback(() => {
      const newState = !showConsole;
      setShowConsole(newState);
      // Persist state globally
      consoleVisibilityState.set(consoleKey, newState);
    }, [showConsole, consoleKey]);
    
    if (!operation.console || !operation.console.trim()) {
      return null;
    }
    
    return (
      <>
        <Button 
          variant="outline" 
          size="xs" 
          width="fit-content"
          display="flex"
          alignItems="center"
          gap={1}
          onClick={toggleConsole}
        >
          {showConsole ? <ChevronUp size={12} /> : <ChevronDown size={12} />} 
          {showConsole ? 'Hide' : 'View'} Console Output
        </Button>
        {showConsole && (
          <Box mt={2} overflowX="hidden">
            <CodeBlock 
              language="bash"
              showLineNumbers
              maxHeight="300px"
            >
              {operation.console}
            </CodeBlock>
          </Box>
        )}
      </>
    );
  };

  if (!data || !data.operations) return null;

  return (
    <VStack align="stretch" gap={4}>
      {/* Header with title and raw data button */}
      <HStack justify="space-between" align="center">
        <Text fontSize="sm" fontWeight="semibold" color={mutedColor}>
          Manager Update Operations
        </Text>
        <IconButton
          size="xs"
          variant="outline"
          colorPalette="gray"
          aria-label="View raw manager update data"
          title="View raw manager update data"
          onClick={() => setIsRawDataOpen(true)}
        >
          <Code size={12} />
        </IconButton>
        <JsonDisplayModal
          isOpen={isRawDataOpen}
          onClose={() => setIsRawDataOpen(false)}
          title="Raw Manager Update Data"
          data={data}
          size="xl"
        />
      </HStack>
      
      {data.operations.map((operation, index: number) => (
        <Box key={index} p={4} borderWidth="1px" borderRadius="md" bg={cardBg} minW={0}>
          <VStack align="stretch" gap={3}>
            <HStack justify="space-between" align="start">
              <Text fontSize="sm" fontWeight="bold" color="blue.600" flex="1">
                {operation.summary}
              </Text>
              <Badge colorPalette={getOperationBadgeColor(operation.status)} size="sm">
                {getOperationBadgeText(operation.status)}
              </Badge>
            </HStack>
            
            {operation.details && operation.details.trim() && (
              <Text fontSize="xs" color={mutedColor}>
                {operation.details}
              </Text>
            )}
            
            <ConsoleToggle operation={operation} operationIndex={index} />
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};