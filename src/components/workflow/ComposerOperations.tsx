import React from 'react';
import { VStack, Box, HStack, Text, Badge, Button, Collapsible, Link, Separator } from '@chakra-ui/react';
import { LuChevronDown as ChevronDown, LuExternalLink as ExternalLink } from 'react-icons/lu';
import { useColorModeValue } from '../ui/color-mode';
import { CodeBlock } from '../ui/code-block';
import { getOperationBadgeColor, getOperationBadgeText } from '../../utils/workflowUtils';
import { parsePackageOperations } from '../../utils/packageParser';
import { PackageSummary } from './PackageSummary';

export interface ComposerOperationsProps {
  data: any;
}

export const ComposerOperations: React.FC<ComposerOperationsProps> = ({ data }) => {
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const cardBg = useColorModeValue('white', 'gray.800');

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

  // Parse package operations from console output for successful operations
  const getPackageSummary = () => {
    const successfulOperations = data.operations?.filter((op: any) => op.status === 'complete');
    if (!successfulOperations || successfulOperations.length === 0) return null;
    
    // Combine console outputs from all successful operations
    const combinedConsole = successfulOperations
      .map((op: any) => op.console || '')
      .join('\n');
    
    return parsePackageOperations(combinedConsole);
  };

  const packageSummary = getPackageSummary();

  return (
    <VStack align="stretch" gap={4}>
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
            
            {operation.console && operation.console.trim() && (
              <Collapsible.Root width="100%">
                <Collapsible.Trigger asChild>
                  <Button variant="outline" size="xs" width="fit-content">
                    <ChevronDown size={12} /> View Console Output
                  </Button>
                </Collapsible.Trigger>
                <Collapsible.Content overflow="hidden">
                  <Box mt={2} overflowX="hidden">
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
  );
};