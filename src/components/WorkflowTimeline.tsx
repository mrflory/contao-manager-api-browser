import React, { useEffect, useRef } from 'react';
import { TimelineRoot } from './ui/timeline';
import { WorkflowStep } from '../types';
import { useToastNotifications } from '../hooks/useToastNotifications';
import { WorkflowStepComponent } from './workflow/WorkflowStep';

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentStep: number;
  createMigrationSummary: (migrationData: any) => any;
  hasPendingTasksError: boolean;
  hasPendingMigrations: boolean;
  hasDryRunComplete: boolean;
  onClearTasks: () => Promise<void>;
  onCancelPendingTasks: () => void;
  onConfirmMigrations: (withDeletes?: boolean) => void;
  onSkipMigrations: () => void;
  onCancelMigrations: () => void;
  onContinueUpdate: () => void;
  onSkipComposerUpdate: () => void;
  onCancelWorkflow: () => void;
  configBg: string;
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({ 
  steps, 
  createMigrationSummary,
  hasPendingTasksError,
  hasPendingMigrations,
  hasDryRunComplete,
  onClearTasks,
  onCancelPendingTasks,
  onConfirmMigrations,
  onSkipMigrations,
  onCancelMigrations,
  onContinueUpdate,
  onSkipComposerUpdate,
  onCancelWorkflow,
  configBg
}) => {
  const erroredStepsRef = useRef<Set<string>>(new Set());
  const toast = useToastNotifications();

  // Show toast notifications for errors
  useEffect(() => {
    steps.forEach(step => {
      if (step.status === 'error' && !erroredStepsRef.current.has(step.id)) {
        erroredStepsRef.current.add(step.id);
        
        let title = 'Workflow Error';
        let description = step.error || 'An error occurred during workflow execution';
        
        if (step.id === 'check-tasks' && hasPendingTasksError) {
          title = 'Pending Tasks Found';
          description = 'There are active tasks that must be resolved before proceeding';
        } else if (step.id === 'composer-dry-run') {
          title = 'Composer Dry Run Failed';
          description = 'The composer dry run encountered an error';
        } else if (step.id === 'composer-update') {
          title = 'Composer Update Failed';
          description = 'The composer update encountered an error';
        } else if (step.id === 'manager-update') {
          title = 'Manager Update Failed';
          description = 'The Contao Manager update encountered an error';
        } else if (step.id === 'database-migration') {
          title = 'Database Migration Failed';
          description = 'Database migrations encountered an error';
        }
        
        toast.showError({
          title,
          description,
          duration: 8000,
        });
      }
    });
  }, [steps, hasPendingTasksError, toast]);

  return (
    <TimelineRoot size="xl">
      {steps.map((step) => (
        <WorkflowStepComponent
          key={step.id}
          step={step}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={hasPendingTasksError}
          hasPendingMigrations={hasPendingMigrations}
          hasDryRunComplete={hasDryRunComplete}
          onClearTasks={onClearTasks}
          onCancelPendingTasks={onCancelPendingTasks}
          onConfirmMigrations={onConfirmMigrations}
          onSkipMigrations={onSkipMigrations}
          onCancelMigrations={onCancelMigrations}
          onContinueUpdate={onContinueUpdate}
          onSkipComposerUpdate={onSkipComposerUpdate}
          onCancelWorkflow={onCancelWorkflow}
          configBg={configBg}
        />
      ))}
    </TimelineRoot>
  );
};