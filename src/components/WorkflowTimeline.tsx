import React from 'react';
import {
  Box,
  Text,
  Badge,
  Spinner,
  CollapsibleRoot,
  CollapsibleContent,
  Code,
  HStack,
  VStack,
  Circle
} from '@chakra-ui/react';
import { LuCheck as Check, LuX as X, LuTriangleAlert as AlertTriangle, LuMinus as Minus } from 'react-icons/lu';
import { useColorModeValue } from './ui/color-mode';
import { WorkflowStep } from '../types';

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentStep: number;
}

interface TimelineItemProps {
  step: WorkflowStep;
  isActive: boolean;
  isLast: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ step, isActive, isLast }) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const bgColor = useColorModeValue('white', 'gray.800');

  const getStepIcon = () => {
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
        return null;
    }
  };

  const getIndicatorColor = () => {
    switch (step.status) {
      case 'active':
        return 'blue.500';
      case 'complete':
        return 'green.500';
      case 'error':
        return 'red.500';
      case 'skipped':
        return 'gray.400';
      default:
        return isActive ? 'blue.200' : 'gray.200';
    }
  };

  const getStatusBadge = () => {
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

  const getDuration = () => {
    if (!step.startTime) return '';
    const endTime = step.endTime || new Date();
    const duration = Math.round((endTime.getTime() - step.startTime.getTime()) / 1000);
    return `${duration}s`;
  };

  return (
    <Box position="relative">
      {/* Connector Line */}
      {!isLast && (
        <Box
          position="absolute"
          left="16px"
          top="32px"
          bottom="-24px"
          width="2px"
          bg={borderColor}
          zIndex={0}
        />
      )}
      
      <HStack align="flex-start" spacing={4}>
        {/* Timeline Indicator */}
        <Circle 
          size="8" 
          bg={getIndicatorColor()} 
          flexShrink={0}
          zIndex={1}
          opacity={step.status === 'skipped' ? 0.6 : 1}
        >
          {getStepIcon()}
        </Circle>

        {/* Timeline Content */}
        <Box 
          flex="1" 
          pb={isLast ? 0 : 6}
          opacity={step.status === 'skipped' ? 0.6 : 1}
        >
          <Box
            p={4}
            border="1px"
            borderColor={borderColor}
            borderRadius="md"
            bg={bgColor}
          >
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="semibold" fontSize="md">
                {step.title}
              </Text>
              {getStatusBadge()}
            </HStack>
            
            <Text fontSize="sm" color={mutedColor} mb={3}>
              {step.description}
            </Text>

            {(step.startTime || step.endTime) && (
              <HStack spacing={4} fontSize="xs" color={mutedColor} mb={2}>
                {step.startTime && (
                  <Text>Started: {formatTime(step.startTime)}</Text>
                )}
                {step.endTime && (
                  <Text>Ended: {formatTime(step.endTime)}</Text>
                )}
                {step.startTime && (
                  <Text>Duration: {getDuration()}</Text>
                )}
              </HStack>
            )}

            <CollapsibleRoot open={!!step.error || !!step.data}>
              <CollapsibleContent>
                <VStack align="stretch" spacing={2} mt={2}>
                  {step.error && (
                    <Box p={2} bg="red.50" borderRadius="md" border="1px" borderColor="red.200">
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
              </CollapsibleContent>
            </CollapsibleRoot>
          </Box>
        </Box>
      </HStack>
    </Box>
  );
};

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ steps, currentStep }) => {
  return (
    <VStack align="stretch" spacing={0} position="relative">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isLast = index === steps.length - 1;
        
        return (
          <TimelineItem
            key={step.id}
            step={step}
            isActive={isActive}
            isLast={isLast}
          />
        );
      })}
    </VStack>
  );
};