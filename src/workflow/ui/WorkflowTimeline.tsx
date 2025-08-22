import React from 'react';
import { VStack } from '@chakra-ui/react';
import { TimelineRoot } from '../../components/ui/timeline';
import { WorkflowEngine } from '../engine/WorkflowEngine';
import { TimelineExecutionRecord } from '../engine/types';
import { TimelineItemRenderer } from './TimelineItemRenderer';

interface WorkflowTimelineProps {
  engine: WorkflowEngine;
  executionHistory: TimelineExecutionRecord[];
  currentIndex: number;
  onStartFromStep?: (stepIndex: number) => Promise<void>;
  isWorkflowRunning?: boolean;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ engine, executionHistory, currentIndex, onStartFromStep, isWorkflowRunning }) => {
  const timeline = engine.getTimeline();
  
  if (timeline.length === 0) {
    return null;
  }
  
  return (
    <VStack align="stretch" gap={0}>
      <TimelineRoot size="xl">
        {timeline.map((item, index) => {
          const record = executionHistory.find(r => r.item.id === item.id);
          const isCurrent = index === currentIndex;
          
          return (
            <TimelineItemRenderer
              key={item.id}
              item={item}
              executionRecord={record}
              isCurrent={isCurrent}
              onUserAction={(actionId) => engine.handleUserAction(item.id, actionId)}
              onRetry={() => engine.retryItem(index)}
              onSkip={() => engine.skipItem(index)}
              onStartFromStep={onStartFromStep ? () => onStartFromStep(index) : undefined}
              isWorkflowRunning={isWorkflowRunning}
            />
          );
        })}
      </TimelineRoot>
    </VStack>
  );
};