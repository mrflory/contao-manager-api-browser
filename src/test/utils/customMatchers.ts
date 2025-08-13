import { WorkflowState, WorkflowStep } from '../../types';
import '@testing-library/jest-dom';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveWorkflowStatus(expectedStatus: string): R;
      toHaveStepWithStatus(stepId: string, expectedStatus: string): R;
      toHaveCompletedStep(stepId: string): R;
      toHaveActiveStep(stepId: string): R;
      toHaveErrorInStep(stepId: string, expectedError?: string): R;
      toBeAtStep(stepId: string): R;
      toHaveStepsInOrder(expectedOrder: string[]): R;
      toHavePendingMigrations(): R;
      toBeWorkflowComplete(): R;
    }
  }
}

// Custom matchers for workflow testing
export const customMatchers = {
  /**
   * Check if workflow has expected status
   */
  toHaveWorkflowStatus(received: WorkflowState, expectedStatus: string) {
    const actualStatus = received.isRunning ? 'running' : 
                        received.isPaused ? 'paused' :
                        received.error ? 'error' : 
                        received.currentStep >= received.steps.length ? 'complete' : 'ready';
    
    const pass = actualStatus === expectedStatus;
    
    return {
      pass,
      message: () => pass 
        ? `Expected workflow not to have status "${expectedStatus}"`
        : `Expected workflow to have status "${expectedStatus}", but got "${actualStatus}"`
    };
  },

  /**
   * Check if a specific step has expected status
   */
  toHaveStepWithStatus(received: WorkflowState, stepId: string, expectedStatus: string) {
    const step = received.steps.find(s => s.id === stepId);
    
    if (!step) {
      return {
        pass: false,
        message: () => `Step "${stepId}" not found in workflow steps`
      };
    }

    const pass = step.status === expectedStatus;
    
    return {
      pass,
      message: () => pass
        ? `Expected step "${stepId}" not to have status "${expectedStatus}"`
        : `Expected step "${stepId}" to have status "${expectedStatus}", but got "${step.status}"`
    };
  },

  /**
   * Check if step is completed
   */
  toHaveCompletedStep(received: WorkflowState, stepId: string) {
    return customMatchers.toHaveStepWithStatus(received, stepId, 'complete');
  },

  /**
   * Check if step is active
   */
  toHaveActiveStep(received: WorkflowState, stepId: string) {
    return customMatchers.toHaveStepWithStatus(received, stepId, 'active');
  },

  /**
   * Check if step has error
   */
  toHaveErrorInStep(received: WorkflowState, stepId: string, expectedError?: string) {
    const step = received.steps.find(s => s.id === stepId);
    
    if (!step) {
      return {
        pass: false,
        message: () => `Step "${stepId}" not found in workflow steps`
      };
    }

    const hasError = step.status === 'error';
    
    if (!hasError) {
      return {
        pass: false,
        message: () => `Expected step "${stepId}" to have an error, but it has status "${step.status}"`
      };
    }

    if (expectedError && step.error !== expectedError) {
      return {
        pass: false,
        message: () => `Expected step "${stepId}" to have error "${expectedError}", but got "${step.error}"`
      };
    }

    return {
      pass: true,
      message: () => `Expected step "${stepId}" not to have an error`
    };
  },

  /**
   * Check if workflow is at specific step
   */
  toBeAtStep(received: WorkflowState, stepId: string) {
    const currentStep = received.steps[received.currentStep];
    
    if (!currentStep) {
      return {
        pass: false,
        message: () => `Workflow is not at any valid step (currentStep: ${received.currentStep})`
      };
    }

    const pass = currentStep.id === stepId;
    
    return {
      pass,
      message: () => pass
        ? `Expected workflow not to be at step "${stepId}"`
        : `Expected workflow to be at step "${stepId}", but it's at "${currentStep.id}"`
    };
  },

  /**
   * Check if steps are in expected order
   */
  toHaveStepsInOrder(received: WorkflowState, expectedOrder: string[]) {
    const actualOrder = received.steps.map(step => step.id);
    
    // Check if all expected steps exist and are in order
    for (let i = 0; i < expectedOrder.length; i++) {
      const expectedId = expectedOrder[i];
      const actualIndex = actualOrder.indexOf(expectedId);
      
      if (actualIndex === -1) {
        return {
          pass: false,
          message: () => `Expected step "${expectedId}" not found in workflow steps. Actual order: [${actualOrder.join(', ')}]`
        };
      }
      
      if (actualIndex !== i) {
        return {
          pass: false,
          message: () => `Step "${expectedId}" found at position ${actualIndex}, expected at position ${i}. Actual order: [${actualOrder.join(', ')}]`
        };
      }
    }

    return {
      pass: true,
      message: () => `Expected steps not to be in order [${expectedOrder.join(', ')}], but they are`
    };
  },

  /**
   * Check if workflow has pending migrations
   */
  toHavePendingMigrations(received: WorkflowState) {
    const checkStep = received.steps.find(step => step.id.startsWith('check-migrations-loop'));
    const hasPendingMigrations = checkStep?.status === 'complete' && 
                                checkStep?.data?.hash && 
                                received.isPaused;

    return {
      pass: !!hasPendingMigrations,
      message: () => hasPendingMigrations
        ? `Expected workflow not to have pending migrations`
        : `Expected workflow to have pending migrations`
    };
  },

  /**
   * Check if workflow is complete
   */
  toBeWorkflowComplete(received: WorkflowState) {
    const isComplete = received.currentStep >= received.steps.length && !received.isRunning;
    
    return {
      pass: isComplete,
      message: () => isComplete
        ? `Expected workflow not to be complete`
        : `Expected workflow to be complete, but currentStep is ${received.currentStep} of ${received.steps.length} and isRunning is ${received.isRunning}`
    };
  }
};

// Register custom matchers with Jest
expect.extend(customMatchers);