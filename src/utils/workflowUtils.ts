import { WorkflowStep } from '../types';


/**
 * Get step icon based on status
 */
export const getStepIconName = (step: WorkflowStep): string => {
  switch (step.status) {
    case 'active':
      return 'spinner';
    case 'complete':
      return 'check';
    case 'error':
      return 'x';
    case 'skipped':
      return 'minus';
    case 'cancelled':
      return 'x';
    default:
      return 'circle';
  }
};

/**
 * Get status badge color palette based on step status
 */
export const getStatusBadgeColor = (step: WorkflowStep): string => {
  switch (step.status) {
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
    default:
      return 'gray';
  }
};

/**
 * Get status badge text based on step status
 */
export const getStatusBadgeText = (step: WorkflowStep): string => {
  switch (step.status) {
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

