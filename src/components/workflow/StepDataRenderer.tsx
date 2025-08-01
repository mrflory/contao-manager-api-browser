import React from 'react';
import { VStack, Text, Separator, Collapsible, Button, Box, Code } from '@chakra-ui/react';
import { LuChevronDown as ChevronDown } from 'react-icons/lu';
import { WorkflowStep } from '../../types';
import { isComposerStep, isMigrationStep, getStepDataTitle } from '../../utils/workflowUtils';
import { ComposerOperations } from './ComposerOperations';
import { MigrationOperations } from './MigrationOperations';

export interface StepDataRendererProps {
  step: WorkflowStep;
}

export const StepDataRenderer: React.FC<StepDataRendererProps> = ({ step }) => {
  if (!step.data) return null;

  const isActive = step.status === 'active';
  const isComplete = step.status === 'complete';

  // Composer step rendering
  if (isComposerStep(step) && (isActive || isComplete)) {
    return (
      <VStack align="stretch" gap={3}>
        <Text fontSize="xs" fontWeight="semibold">
          {getStepDataTitle(step, isActive)}
        </Text>
        <ComposerOperations data={step.data} />
        
        <Separator />
        
        <Collapsible.Root>
          <Collapsible.Trigger asChild>
            <Button variant="outline" size="xs" width="fit-content">
              <ChevronDown size={12} /> Show Raw Data
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Box mt={2}>
              <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                {JSON.stringify(step.data, null, 2)}
              </Code>
            </Box>
          </Collapsible.Content>
        </Collapsible.Root>
      </VStack>
    );
  }

  // Migration step rendering
  if (isMigrationStep(step) && (isActive || isComplete)) {
    return (
      <VStack align="stretch" gap={3}>
        <Text fontSize="xs" fontWeight="semibold">
          {getStepDataTitle(step, isActive)}
        </Text>
        <MigrationOperations data={step.data} />
        
        <Separator />
        
        <Collapsible.Root>
          <Collapsible.Trigger asChild>
            <Button variant="outline" size="xs" width="fit-content">
              <ChevronDown size={12} /> Show Raw Data
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Box mt={2}>
              <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                {JSON.stringify(step.data, null, 2)}
              </Code>
            </Box>
          </Collapsible.Content>
        </Collapsible.Root>
      </VStack>
    );
  }

  // Default rendering for other steps
  if (isActive || isComplete) {
    return (
      <VStack align="stretch" gap={2}>
        <Text fontSize="xs" fontWeight="semibold">
          {getStepDataTitle(step, isActive)}
        </Text>
        
        <Collapsible.Root>
          <Collapsible.Trigger asChild>
            <Button variant="outline" size="xs" width="fit-content">
              <ChevronDown size={12} /> Show Details
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Box mt={2}>
              <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap" maxH="300px" overflowY="auto">
                {typeof step.data === 'string' ? step.data : JSON.stringify(step.data, null, 2)}
              </Code>
            </Box>
          </Collapsible.Content>
        </Collapsible.Root>
      </VStack>
    );
  }

  return null;
};