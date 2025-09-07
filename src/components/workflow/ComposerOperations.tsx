import React, { useState, useCallback, useMemo, memo } from 'react';
import { VStack, Box, HStack, Text, Badge, Button, Link, Separator, IconButton } from '@chakra-ui/react';
import { LuChevronDown as ChevronDown, LuChevronUp as ChevronUp, LuExternalLink as ExternalLink, LuCode as Code } from 'react-icons/lu';
import { JsonDisplayModal } from '../modals/ApiResultModal';
import { useColorModeValue } from '../ui/color-mode';
import { CodeBlock } from '../ui/code-block';
import { getOperationBadgeColor, getOperationBadgeText } from '../../utils/workflowUtils';
import { parsePackageOperations } from '../../utils/packageParser';
import { PackageSummary } from './PackageSummary';

// Global state to persist console output visibility across component re-mounts
const consoleVisibilityState = new Map<string, boolean>();

// Memoized ConsoleToggle component to prevent recreation on each render
const ConsoleToggle = memo(({ operation, operationIndex, stepId }: { 
  operation: any; 
  operationIndex: number; 
  stepId?: string; 
}) => {
  // Create unique key for this operation's console state
  const consoleKey = useMemo(() => 
    `${stepId || 'default'}-operation-${operationIndex}`, 
    [stepId, operationIndex]
  );
  
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
  
  // Memoize console content to prevent CodeBlock recreation
  const consoleContent = useMemo(() => operation.console?.trim() || '', [operation.console]);
  
  if (!consoleContent) {
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
            key={consoleKey} // Stable key to prevent recreation
            language="bash"
            showLineNumbers
            maxHeight="300px"
          >
            {consoleContent}
          </CodeBlock>
        </Box>
      )}
    </>
  );
});

ConsoleToggle.displayName = 'ConsoleToggle';

export interface ComposerOperationsProps {
  data: any;
  stepId?: string; // Used to create unique keys for persistent state
}

export const ComposerOperations: React.FC<ComposerOperationsProps> = memo(({ data, stepId }) => {
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const cardBg = useColorModeValue('white', 'gray.800');
  
  // Raw data modal state
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);

  if (!data || !data.operations) return null;

  const renderSponsor = (sponsor: any) => {
    if (!sponsor) return null;
    
    return (
      <HStack fontSize="xs" color={mutedColor}>
        <Text>
          Sponsored by:
        </Text>
        <Link 
          href={sponsor.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {sponsor.name} <ExternalLink size={10} style={{ display: 'inline' }} />
        </Link>
      </HStack>
    );
  };

  // Memoize package summary to prevent unnecessary recalculations
  const packageSummary = useMemo(() => {
    const successfulOperations = data?.operations?.filter((op: any) => op.status === 'completed');
    if (!successfulOperations || successfulOperations.length === 0) return null;
    
    // Combine console outputs from all successful operations
    const combinedConsole = successfulOperations
      .map((op: any) => op.console || '')
      .join('\n');
    
    return parsePackageOperations(combinedConsole);
  }, [data?.operations]);

  return (
    <VStack align="stretch" gap={4}>
      {/* Header with title and raw data button */}
      <HStack justify="space-between" align="center">
        <Text fontSize="sm" fontWeight="semibold" color={mutedColor}>
          Composer Operations
        </Text>
        <IconButton
          size="xs"
          variant="outline"
          colorPalette="gray"
          aria-label="View raw composer data"
          title="View raw composer data"
          onClick={() => setIsRawDataOpen(true)}
        >
          <Code size={12} />
        </IconButton>
        <JsonDisplayModal
          isOpen={isRawDataOpen}
          onClose={() => setIsRawDataOpen(false)}
          title="Raw Composer Data"
          data={data}
          size="xl"
        />
      </HStack>
      
      {/* Snapshot information display */}
      {data.snapshot && (
        <Box p={3} borderWidth="1px" borderRadius="md" bg={cardBg} borderColor="green.200">
          <HStack align="center" gap={2}>
            <Text fontSize="sm" fontWeight="semibold" color="green.600">
              ✓ Snapshot Created
            </Text>
            <Text fontSize="xs" color={mutedColor}>
              {Object.keys(data.snapshot.files || {}).length} files backed up at {new Date(data.snapshot.timestamp).toLocaleTimeString()}
            </Text>
          </HStack>
          {data.snapshot.files && Object.keys(data.snapshot.files).length > 0 && (
            <Text fontSize="xs" color={mutedColor} mt={1}>
              Files: {Object.keys(data.snapshot.files).join(', ')}
            </Text>
          )}
        </Box>
      )}
      
      {data.sponsor && renderSponsor(data.sponsor)}
      
      {/* Package Summary for successful operations */}
      {packageSummary && (
        <>
          <PackageSummary summary={packageSummary} />
          <Separator />
        </>
      )}
      
      {data.operations.map((operation: any, index: number) => (
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
            
            <ConsoleToggle operation={operation} operationIndex={index} stepId={stepId} />
          </VStack>
        </Box>
      ))}
    </VStack>
  );
});

ComposerOperations.displayName = 'ComposerOperations';