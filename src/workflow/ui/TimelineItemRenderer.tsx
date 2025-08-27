import React, { useState, useEffect } from 'react';
import { Badge, HStack, VStack, Text, Spinner, IconButton, Box, Alert } from '@chakra-ui/react';
import { LuCheck as Check, LuX as X, LuMinus as Minus, LuCircle as Circle, LuChevronDown as ChevronDown, LuChevronUp as ChevronUp, LuPlay as Play, LuCode as Code } from 'react-icons/lu';
import {
  TimelineItem as TimelineItemUI,
  TimelineConnector,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
} from '../../components/ui/timeline';
import { JsonDisplayModal } from '../../components/modals/ApiResultModal';
import { TimelineItem, TimelineExecutionRecord } from '../engine/types';
import { useColorModeValue } from '../../components/ui/color-mode';
import { formatTime, getDuration } from '../../utils/dateUtils';
import { UserActionPanel } from './UserActionPanel';
import { ComposerOperations } from '../../components/workflow/ComposerOperations';
import { MigrationOperations } from '../../components/workflow/MigrationOperations';
import { ManagerOperations } from '../../components/workflow/ManagerOperations';
import { ManagerVersionComparison } from '../../components/display/ManagerVersionComparison';
import { Separator } from '@chakra-ui/react';

interface TimelineItemRendererProps {
  item: TimelineItem;
  executionRecord?: TimelineExecutionRecord;
  isCurrent?: boolean;
  onUserAction: (actionId: string) => Promise<void>;
  onRetry: () => Promise<void>;
  onSkip: () => Promise<void>;
  onStartFromStep?: () => Promise<void>;
  isWorkflowRunning?: boolean;
}

// Helper functions to determine timeline item types
const isComposerTimelineItem = (item: TimelineItem, data: unknown): boolean => {
  return (item.id.includes('dry-run') || 
          item.id.includes('composer-update')) && 
         typeof data === 'object' && 
         data !== null &&
         'operations' in data;
};

const isMigrationTimelineItem = (item: TimelineItem, data: unknown): boolean => {
  return (item.id.includes('migrations') || item.id.includes('migration')) && 
         typeof data === 'object' && 
         data !== null &&
         ('operations' in data || 'status' in data || 'type' in data);
};

const isManagerTimelineItem = (item: TimelineItem, data: unknown): boolean => {
  return (item.id.includes('update-manager') || item.id.includes('manager-update')) && 
         typeof data === 'object' && 
         data !== null &&
         'operations' in data;
};

const hasVersionComparison = (data: unknown): data is { versionComparison: { currentVersion: string; latestVersion: string; needsUpdate: boolean; type: string } } => {
  return typeof data === 'object' && 
         data !== null &&
         'versionComparison' in data &&
         typeof (data as any).versionComparison === 'object' &&
         (data as any).versionComparison !== null &&
         'currentVersion' in (data as any).versionComparison &&
         'latestVersion' in (data as any).versionComparison;
};



export const TimelineItemRenderer: React.FC<TimelineItemRendererProps> = ({
  item,
  executionRecord,
  onUserAction,
  onRetry,
  onStartFromStep,
  isWorkflowRunning
}) => {
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRawDataOpen, setIsRawDataOpen] = useState(false);
  
  
  // Smart auto-expand/collapse logic
  useEffect(() => {
    if (item.status === 'active') {
      // Auto-expand when item becomes active
      setIsExpanded(true);
    } else if (item.status === 'error' || item.status === 'user_action_required' || item.status === 'cancelled') {
      // Always expand and keep expanded for errors, user actions, or cancelled items
      setIsExpanded(true);
    } else if (item.status === 'complete') {
      // Auto-collapse when item completes and doesn't need user action
      setIsExpanded(false);
    }
  }, [item.status]);
  
  // Determine if content should be shown
  const shouldShowContent = isExpanded || 
                           item.status === 'error' || 
                           item.status === 'active' || 
                           item.status === 'cancelled' ||
                           item.status === 'user_action_required';
  
  const getStepIcon = () => {
    switch (item.status) {
      case 'active':
        return <Spinner size="md" borderWidth="4px" />;
      case 'complete':
        return <Check color="white" size={24} />;
      case 'error':
        return <X color="white" size={24} />;
      case 'skipped':
        return <Minus color="white" size={24} />;
      case 'cancelled':
        return <X color="white" size={24} />;
      default:
        return <Circle color="white" size={24} />;
    }
  };
  
  const getIndicatorColor = () => {
    switch (item.status) {
      case 'active':
        return 'blue.300';
      case 'complete':
        return 'green.500';
      case 'error':
        return 'red.500';
      case 'skipped':
        return 'blue.800';
      case 'cancelled':
        return 'orange.500';
      case 'user_action_required':
        return 'orange.500';
      default:
        return 'blue.500';
    }
  };
  
  const getStatusBadge = () => {
    const getStatusBadgeColor = () => {
      switch (item.status) {
        case 'active':
          return 'blue';
        case 'complete':
          return 'green';
        case 'error':
          return 'red';
        case 'skipped':
          return 'gray';
        case 'cancelled':
          return 'orange';
        case 'user_action_required':
          return 'orange';
        default:
          return 'gray';
      }
    };
    
    const getStatusBadgeText = () => {
      switch (item.status) {
        case 'active':
          return 'In Progress';
        case 'complete':
          return 'Complete';
        case 'error':
          return 'Error';
        case 'skipped':
          return 'Skipped';
        case 'cancelled':
          return 'Cancelled';
        case 'user_action_required':
          return 'Action Required';
        default:
          return 'Pending';
      }
    };
    
    return (
      <Badge colorPalette={getStatusBadgeColor()}>
        {getStatusBadgeText()}
      </Badge>
    );
  };
  
  return (
    <TimelineItemUI opacity={item.status === 'skipped' ? 0.6 : 1}>
      <TimelineConnector bg={getIndicatorColor()}>
        {getStepIcon()}
      </TimelineConnector>
      
      <TimelineContent>
        <TimelineTitle fontSize="md">
          <HStack justify="space-between" align="center" width="100%">
            <Text>{item.title}</Text>
            <HStack align="center" gap={2}>
              {getStatusBadge()}
              
              {/* Raw Data button - show when execution data is available */}
              {executionRecord?.result?.data && (
                <IconButton
                  size="xs"
                  variant="outline"
                  colorPalette="gray"
                  aria-label="View raw API response data"
                  title="View raw API response data"
                  onClick={() => setIsRawDataOpen(true)}
                >
                  <Code size={12} />
                </IconButton>
              )}
              
              {/* Start from this step button - only show for pending/skipped steps when workflow is not running */}
              {onStartFromStep && !isWorkflowRunning && (item.status === 'pending' || item.status === 'skipped') && (
                <IconButton
                  size="xs"
                  variant="outline"
                  colorPalette="blue"
                  onClick={onStartFromStep}
                  aria-label="Start workflow from this step"
                  title="Start workflow from this step"
                >
                  <Play size={12} />
                </IconButton>
              )}
              
              {/* Manual toggle arrow */}
              <IconButton
                size="xs"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? "Collapse step details" : "Expand step details"}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </IconButton>
            </HStack>
          </HStack>
        </TimelineTitle>

        {/* Collapsible content area */}
        {shouldShowContent && (
            <VStack align="stretch" gap={3} mt={3}>
              {/* Step description */}
              <TimelineDescription fontSize="sm" color={mutedColor}>
                {item.description}
              </TimelineDescription>

              {/* Timestamps */}
              {(item.startTime || item.endTime) && (
                <HStack gap={4} fontSize="xs" color={mutedColor}>
                  {item.startTime && (
                    <Text>Started: {formatTime(item.startTime)}</Text>
                  )}
                  {item.endTime && (
                    <Text>Ended: {formatTime(item.endTime)}</Text>
                  )}
                  {item.startTime && (
                    <Text>Duration: {getDuration(item.startTime, item.endTime)}</Text>
                  )}
                </HStack>
              )}

              {/* Error display */}
              {item.status === 'error' && executionRecord?.result?.error && (
                <Text 
                  fontSize="sm" 
                  color="red.500" 
                  p={3} 
                  bg="red.50" 
                  borderRadius="md" 
                  borderLeft="4px solid" 
                  borderColor="red.500"
                >
                  ⚠️ {executionRecord.result.error}
                </Text>
              )}
              
              {/* Custom UI content from timeline result */}
              {executionRecord?.result?.uiContent && (
                <Box>
                  {executionRecord.result.uiContent}
                </Box>
              )}
              
              {/* Version comparison display for manager update check */}
              {(item.status === 'active' || item.status === 'complete' || item.status === 'error') && 
               executionRecord?.result?.data && 
               hasVersionComparison(executionRecord.result.data) && (
                <VStack align="stretch" gap={3}>
                  <ManagerVersionComparison
                    currentVersion={executionRecord.result.data.versionComparison.currentVersion}
                    latestVersion={executionRecord.result.data.versionComparison.latestVersion}
                    showStatus={true}
                    size="md"
                  />
                  <Separator />
                </VStack>
              )}

              {/* Formatted data display for composer/migration items during progress or completion */}
              {(item.status === 'active' || item.status === 'complete' || item.status === 'error' || item.status === 'user_action_required') && 
               executionRecord?.result?.data && (
                <>
                  {/* Composer operations display */}
                  {isComposerTimelineItem(item, executionRecord.result.data) && (
                    <VStack align="stretch" gap={3}>
                      <ComposerOperations data={executionRecord.result.data} />
                      <Separator />
                    </VStack>
                  )}
                  
                  {/* Migration operations display */}
                  {isMigrationTimelineItem(item, executionRecord.result.data) && (
                    <VStack align="stretch" gap={3}>
                      <MigrationOperations 
                        data={executionRecord.result.data}
                        summary={executionRecord.result.data} // TODO: Create migration summary if needed
                      />
                      <Separator />
                    </VStack>
                  )}
                  
                  {/* Manager operations display */}
                  {isManagerTimelineItem(item, executionRecord.result.data) && (
                    <VStack align="stretch" gap={3}>
                      <ManagerOperations 
                        data={executionRecord.result.data}
                        stepId={item.id}
                      />
                      <Separator />
                    </VStack>
                  )}
                  
                </>
              )}
              
              
              {/* User action panel */}
              {item.status === 'user_action_required' && (
                <>
                  {executionRecord?.result?.userActions ? (
                    <UserActionPanel
                      actions={executionRecord.result.userActions}
                      onAction={onUserAction}
                      onRetry={item.canRetry() ? onRetry : undefined}
                    />
                  ) : (
                    <Alert.Root status="warning" size="sm">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>
                          Action required but no actions available. Check console for details.
                        </Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  )}
                </>
              )}

              {/* Cancelled status message */}
              {item.status === 'cancelled' && (
                <Alert.Root status="warning" size="sm">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      This step was cancelled. The workflow was stopped before this action could complete.
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}
            </VStack>
        )}
      </TimelineContent>
      
      {/* Raw data modal */}
      {executionRecord?.result?.data && (
        <JsonDisplayModal
          isOpen={isRawDataOpen}
          onClose={() => setIsRawDataOpen(false)}
          title="Raw API Response Data"
          data={executionRecord.result.data}
          size="xl"
        />
      )}
    </TimelineItemUI>
  );
};