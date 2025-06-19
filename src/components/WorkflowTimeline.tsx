import React from 'react';
import {
  Box,
  Text,
  Badge,
  Spinner,
  Collapsible,
  Code,
  HStack,
  VStack,
  Card,
} from '@chakra-ui/react';
import { LuCheck as Check, LuX as X, LuTriangleAlert as AlertTriangle, LuMinus as Minus, LuCircle as Circle } from 'react-icons/lu';
import { useColorModeValue } from './ui/color-mode';
import {
  TimelineRoot,
  TimelineItem,
  TimelineConnector,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
} from './ui/timeline';
import { WorkflowStep } from '../types';

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentStep: number;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ steps }) => {
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'active':
        return <Spinner size="sm" />;
      case 'complete':
        return <Check color="white" size={12} />;
      case 'error':
        return <X color="white" size={12} />;
      case 'skipped':
        return <Minus color="white" size={12} />;
      default:
        return <Circle color="white" size={12} />;
    }
  };


  const getStatusBadge = (step: WorkflowStep) => {
    switch (step.status) {
      case 'active':
        return <Badge colorPalette="blue">In Progress</Badge>;
      case 'complete':
        return <Badge colorPalette="green">Complete</Badge>;
      case 'error':
        return <Badge colorPalette="red">Error</Badge>;
      case 'skipped':
        return <Badge colorPalette="gray">Skipped</Badge>;
      default:
        return <Badge colorPalette="gray">Pending</Badge>;
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString();
  };

  const getDuration = (step: WorkflowStep) => {
    if (!step.startTime) return '';
    const endTime = step.endTime || new Date();
    const duration = Math.round((endTime.getTime() - step.startTime.getTime()) / 1000);
    return `${duration}s`;
  };

  return (
    <TimelineRoot>
      {steps.map((step) => {
        
        return (
          <TimelineItem key={step.id} opacity={step.status === 'skipped' ? 0.6 : 1}>
            <TimelineConnector>
              {getStepIcon(step)}
            </TimelineConnector>
            
            <TimelineContent>
              <TimelineTitle fontSize="md"> 
                <HStack justify="space-between">
                  {step.title}
                  {getStatusBadge(step)}
                </HStack>
              </TimelineTitle>
                
                <TimelineDescription fontSize="sm" color={mutedColor}>
                  {step.description}
                </TimelineDescription>
              <Card.Root>
                <Card.Body>

                {(step.startTime || step.endTime) && (
                  <HStack gap={4} fontSize="xs" color={mutedColor} mb={2}>
                    {step.startTime && (
                      <Text>Started: {formatTime(step.startTime)}</Text>
                    )}
                    {step.endTime && (
                      <Text>Ended: {formatTime(step.endTime)}</Text>
                    )}
                    {step.startTime && (
                      <Text>Duration: {getDuration(step)}</Text>
                    )}
                  </HStack>
                )}

                <Collapsible.Root open={!!step.error || !!step.data}>
                  <Collapsible.Content>
                    <VStack align="stretch" gap={2} mt={2}>
                      {step.error && (
                        <Box p={2} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                          <HStack>
                            <AlertTriangle color="#E53E3E" size={16} />
                            <Text fontSize="sm" color="red.700">
                              {step.error}
                            </Text>
                          </HStack>
                        </Box>
                      )}
                      
                      {step.data && step.status === 'active' && (
                        <Box>
                          <Text fontSize="xs" fontWeight="semibold" mb={1}>
                            Progress:
                          </Text>
                          <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap">
                            {typeof step.data === 'string' ? step.data : JSON.stringify(step.data, null, 2)}
                          </Code>
                        </Box>
                      )}
                    </VStack>
                  </Collapsible.Content>
                </Collapsible.Root>

              </Card.Body>
              </Card.Root>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </TimelineRoot>
  );
};