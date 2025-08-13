import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { WorkflowState } from '../../types';
import { system } from '../../theme';

// Mock providers wrapper
const TestProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ChakraProvider value={system}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </ChakraProvider>
  );
};

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestProviders, ...options });
}

/**
 * Create a mock workflow state for testing
 */
export function createMockWorkflowState(overrides: Partial<WorkflowState> = {}): WorkflowState {
  return {
    currentStep: 0,
    steps: [
      {
        id: 'check-tasks',
        title: 'Check Pending Tasks',
        description: 'Verify no other tasks are running',
        status: 'pending'
      },
      {
        id: 'check-manager',
        title: 'Check Manager Updates',
        description: 'Check if Contao Manager needs updating',
        status: 'pending'
      },
      {
        id: 'composer-update',
        title: 'Composer Update',
        description: 'Update all Composer packages',
        status: 'pending'
      },
      {
        id: 'check-migrations-loop',
        title: 'Check Database Migrations',
        description: 'Check if database migrations are pending',
        status: 'pending'
      },
      {
        id: 'update-versions',
        title: 'Update Version Info',
        description: 'Refresh version information',
        status: 'pending'
      }
    ],
    isRunning: false,
    isPaused: false,
    config: { performDryRun: true },
    ...overrides
  };
}

/**
 * Create a workflow state with completed steps
 */
export function createCompletedWorkflowState(): WorkflowState {
  return createMockWorkflowState({
    currentStep: 5,
    steps: [
      {
        id: 'check-tasks',
        title: 'Check Pending Tasks',
        description: 'Verify no other tasks are running',
        status: 'complete',
        startTime: new Date(Date.now() - 10000),
        endTime: new Date(Date.now() - 9000)
      },
      {
        id: 'check-manager',
        title: 'Check Manager Updates',
        description: 'Check if Contao Manager needs updating',
        status: 'complete',
        startTime: new Date(Date.now() - 9000),
        endTime: new Date(Date.now() - 8000)
      },
      {
        id: 'composer-update',
        title: 'Composer Update',
        description: 'Update all Composer packages',
        status: 'complete',
        startTime: new Date(Date.now() - 8000),
        endTime: new Date(Date.now() - 5000)
      },
      {
        id: 'check-migrations-loop',
        title: 'Check Database Migrations',
        description: 'Check if database migrations are pending',
        status: 'complete',
        startTime: new Date(Date.now() - 5000),
        endTime: new Date(Date.now() - 3000)
      },
      {
        id: 'update-versions',
        title: 'Update Version Info',
        description: 'Refresh version information',
        status: 'complete',
        startTime: new Date(Date.now() - 3000),
        endTime: new Date(Date.now() - 1000)
      }
    ],
    isRunning: false,
    isPaused: false,
    startTime: new Date(Date.now() - 10000),
    endTime: new Date(Date.now() - 1000)
  });
}

/**
 * Create a workflow state with error
 */
export function createErrorWorkflowState(errorStep: string = 'composer-update', errorMessage: string = 'Test error'): WorkflowState {
  const steps = [
    {
      id: 'check-tasks',
      title: 'Check Pending Tasks',
      description: 'Verify no other tasks are running',
      status: 'complete' as const
    },
    {
      id: 'check-manager',
      title: 'Check Manager Updates',
      description: 'Check if Contao Manager needs updating',
      status: 'complete' as const
    },
    {
      id: 'composer-update',
      title: 'Composer Update',
      description: 'Update all Composer packages',
      status: 'error' as const,
      error: errorMessage
    }
  ];

  return createMockWorkflowState({
    currentStep: 2,
    steps,
    isRunning: false,
    isPaused: false,
    error: errorMessage
  });
}

/**
 * Create a workflow state with pending migrations
 */
export function createMigrationPendingWorkflowState(): WorkflowState {
  return createMockWorkflowState({
    currentStep: 3,
    steps: [
      {
        id: 'check-tasks',
        title: 'Check Pending Tasks',
        description: 'Verify no other tasks are running',
        status: 'complete'
      },
      {
        id: 'check-manager',
        title: 'Check Manager Updates',
        description: 'Check if Contao Manager needs updating',
        status: 'complete'
      },
      {
        id: 'composer-update',
        title: 'Composer Update',
        description: 'Update all Composer packages',
        status: 'complete'
      },
      {
        id: 'check-migrations-loop',
        title: 'Check Database Migrations',
        description: 'Check if database migrations are pending',
        status: 'complete',
        data: {
          hash: 'abc123',
          operations: [
            {
              name: 'CREATE TABLE tl_test',
              status: 'pending',
              message: 'Creating test table'
            }
          ]
        }
      },
      {
        id: 'execute-migrations',
        title: 'Execute Database Migrations',
        description: 'Execute pending database migrations',
        status: 'pending'
      },
      {
        id: 'update-versions',
        title: 'Update Version Info',
        description: 'Refresh version information',
        status: 'pending'
      }
    ],
    isRunning: false,
    isPaused: true
  });
}

/**
 * Mock the useWorkflow hook
 */
export function mockUseWorkflow(state: WorkflowState) {
  const mockFunctions = {
    initializeWorkflow: jest.fn(),
    startWorkflow: jest.fn(),
    startWorkflowFromStep: jest.fn(),
    stopWorkflow: jest.fn(),
    resumeWorkflow: jest.fn(),
    clearPendingTasks: jest.fn(),
    confirmMigrations: jest.fn(),
    skipMigrations: jest.fn(),
    skipComposerUpdate: jest.fn(),
    isComplete: state.currentStep >= state.steps.length && !state.isRunning,
    hasPendingMigrations: false
  };

  return {
    state,
    ...mockFunctions
  };
}

/**
 * Mock API responses
 */
export const mockApiResponses = {
  taskSuccess: {
    id: 'test-task',
    title: 'Test Task',
    status: 'complete',
    console: 'Task completed successfully',
    cancellable: false,
    autoclose: true,
    audit: false
  },

  taskError: {
    id: 'test-task',
    title: 'Test Task',
    status: 'error',
    console: 'Task failed with error',
    cancellable: false,
    autoclose: false,
    audit: false
  },

  migrationSuccess: {
    type: 'schema',
    status: 'complete',
    hash: 'abc123',
    operations: [
      {
        name: 'CREATE TABLE tl_test',
        status: 'complete',
        message: 'Table created successfully'
      }
    ]
  },

  migrationPending: {
    type: 'schema',
    status: 'pending',
    hash: 'abc123',
    operations: [
      {
        name: 'CREATE TABLE tl_test',
        status: 'pending',
        message: 'Will create test table'
      }
    ]
  },

  selfUpdateAvailable: {
    current_version: '1.9.4',
    latest_version: '1.9.5',
    channel: 'stable',
    supported: true
  },

  selfUpdateCurrent: {
    current_version: '1.9.5',
    latest_version: '1.9.5',
    channel: 'stable',
    supported: true
  }
};

/**
 * Setup fetch mock for API calls
 */
export function setupFetchMock() {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;
  
  return mockFetch;
}

/**
 * Create a promise that resolves after specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}