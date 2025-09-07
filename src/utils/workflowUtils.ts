import { WorkflowStep } from '../types';


/**
 * Get step icon based on status
 */
export const getStepIconName = (step: WorkflowStep): string => {
  switch (step.status) {
    case 'running':
      return 'spinner';
    case 'completed':
      return 'check';
    case 'failed':
      return 'x';
    case 'pending':
    default:
      return 'circle';
  }
};

/**
 * Get status badge color palette based on step status
 */
export const getStatusBadgeColor = (step: WorkflowStep): string => {
  switch (step.status) {
    case 'running':
      return 'blue';
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'pending':
    default:
      return 'gray';
  }
};

/**
 * Get status badge text based on step status
 */
export const getStatusBadgeText = (step: WorkflowStep): string => {
  switch (step.status) {
    case 'running':
      return 'In Progress';
    case 'completed':
      return 'Complete';
    case 'failed':
      return 'Error';
    case 'pending':
    default:
      return 'Pending';
  }
};

/**
 * Get operation badge color based on operation status
 */
export const getOperationBadgeColor = (status: string): string => {
  switch (status) {
    case 'complete':
      return 'green';
    case 'active':
      return 'blue';
    case 'pending':
      return 'gray';
    case 'error':
      return 'red';
    case 'stopped':
      return 'orange';
    default:
      return 'gray';
  }
};

/**
 * Get operation badge text based on operation status
 */
export const getOperationBadgeText = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Running';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error';
    case 'stopped':
      return 'Stopped';
    default:
      return status;
  }
};

/**
 * Check if step is a composer step
 */
export const isComposerStep = (step: WorkflowStep): boolean => {
  return (step.id.includes('dry-run') || 
          step.id.includes('composer-update') || 
          step.id.includes('update-packages')) && 
         typeof step.data === 'object' && 
         step.data?.operations;
};

/**
 * Check if step is a migration step
 */
export const isMigrationStep = (step: WorkflowStep): boolean => {
  return (step.id.includes('migrations') || step.id.includes('migration')) && 
         typeof step.data === 'object' && 
         (step.data?.operations || step.data?.status || step.data?.type);
};

