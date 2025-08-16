import React from 'react';
import { VStack, Box, HStack, Text, Badge, Button, Collapsible, Link } from '@chakra-ui/react';
import { LuChevronDown as ChevronDown, LuExternalLink as ExternalLink } from 'react-icons/lu';
import { useColorModeValue } from '../ui/color-mode';
import { CodeBlock } from '../ui/code-block';
import { getOperationBadgeColor, getOperationBadgeText } from '../../utils/workflowUtils';

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

  return (
    <VStack align="stretch" gap={4}>
      {data.sponsor && renderSponsor(data.sponsor)}
      
      {data.operations.map((operation: any, index: number) => (
        <Box key={index} p={4} borderWidth="1px" borderRadius="md" bg={cardBg} maxW="100%" minW={0}>
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
  );
};