import React from 'react';
import { VStack, Separator, Collapsible, Button, Box } from '@chakra-ui/react';
import { LuChevronDown as ChevronDown } from 'react-icons/lu';
import { WorkflowStep } from '../../types';
import { isComposerStep, isMigrationStep } from '../../utils/workflowUtils';
import { ComposerOperations } from './ComposerOperations';
import { MigrationOperations } from './MigrationOperations';
import { CodeBlock } from '../ui/code-block';

export interface StepDataRendererProps {
  step: WorkflowStep;
  migrationSummary?: any; // Enhanced migration summary from parent component
}

export const StepDataRenderer: React.FC<StepDataRendererProps> = ({ step, migrationSummary }) => {
  if (!step.data) return null;

  const isActive = step.status === 'running';
  const isComplete = step.status === 'completed';

  // Composer step rendering
  if (isComposerStep(step) && (isActive || isComplete)) {
    return (
      <VStack align="stretch" gap={3}>
        <ComposerOperations data={step.data} stepId={step.id} />
        
        <Separator />
        
        <Collapsible.Root>
          <Collapsible.Trigger asChild>
            <Button variant="outline" size="xs" width="fit-content">
              <ChevronDown size={12} /> Show Raw Data
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Box mt={2}>
              <CodeBlock language="json" showLineNumbers maxHeight="200px">
                {JSON.stringify(step.data, null, 2)}
              </CodeBlock>
            </Box>
          </Collapsible.Content>
        </Collapsible.Root>
      </VStack>
    );
  }

  // Migration step rendering
  if (isMigrationStep(step) && (isActive || isComplete)) {
    // Use centralized migration summary passed from parent component
    const summary = migrationSummary;
    
    return (
      <VStack align="stretch" gap={3}>
        <MigrationOperations 
          key={step.id}
          data={step.data} 
          summary={summary} 
        />
        
        <Separator />
        
        <Collapsible.Root>
          <Collapsible.Trigger asChild>
            <Button variant="outline" size="xs" width="fit-content">
              <ChevronDown size={12} /> Show Raw Data
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Box mt={2}>
              <CodeBlock language="json" showLineNumbers maxHeight="200px">
                {JSON.stringify(step.data, null, 2)}
              </CodeBlock>
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
        <Collapsible.Root>
          <Collapsible.Trigger asChild>
            <Button variant="outline" size="xs" width="fit-content">
              <ChevronDown size={12} /> Show Details
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Box mt={2}>
              <CodeBlock language="json" showLineNumbers maxHeight="300px">
                {typeof step.data === 'string' ? step.data : JSON.stringify(step.data, null, 2)}
              </CodeBlock>
            </Box>
          </Collapsible.Content>
        </Collapsible.Root>
      </VStack>
    );
  }

  return null;
};