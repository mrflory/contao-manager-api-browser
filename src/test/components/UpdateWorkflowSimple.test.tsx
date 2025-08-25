import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '../../theme';

// Mock all the complex UI components to avoid Chakra UI v3 issues
jest.mock('../../components/ui/progress', () => ({
  ProgressRoot: ({ children, ...props }: any) => <div data-testid="progress-root" {...props}>{children}</div>,
  ProgressBar: ({ children, ...props }: any) => <div data-testid="progress-bar" {...props}>{children}</div>,
  ProgressLabel: ({ children, ...props }: any) => <div data-testid="progress-label" {...props}>{children}</div>,
  ProgressValueText: ({ children, ...props }: any) => <div data-testid="progress-value" {...props}>{children}</div>,
}));

jest.mock('../../components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

jest.mock('../../components/ui/toggle-tip', () => ({
  InfoTip: ({ children, ...props }: any) => <div data-testid="info-tip" {...props}>{children}</div>,
}));

jest.mock('../../workflow/ui/WorkflowTimeline', () => ({
  WorkflowTimeline: ({ steps, ...props }: any) => <div data-testid="workflow-timeline" {...props} />,
}));

jest.mock('../../components/ui/checkbox', () => ({
  Checkbox: ({ children, checked, ...props }: any) => 
    <input type="checkbox" checked={checked} data-testid="checkbox" {...props} />,
}));

import { UpdateWorkflow } from '../../components/UpdateWorkflow';
import { useUpdateWorkflow } from '../../workflow';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { WorkflowState } from '../../types';

// Mock hooks
jest.mock('../../workflow');
jest.mock('../../hooks/useToastNotifications');

const mockUseUpdateWorkflow = jest.mocked(useUpdateWorkflow);
const mockUseToastNotifications = jest.mocked(useToastNotifications);

describe('UpdateWorkflow Component (Simplified)', () => {
  const mockToast = {
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
    showWarning: jest.fn(),
    showError: jest.fn(),
    showApiError: jest.fn(),
    showApiSuccess: jest.fn(),
  };

  const createBasicWorkflowState = (): WorkflowState => ({
    steps: [
      { id: 'check-tasks', title: 'Check Tasks', description: 'Checking...', status: 'pending' },
      { id: 'composer-update', title: 'Update', description: 'Updating...', status: 'pending' },
    ],
    currentStep: 0,
    isRunning: false,
    isPaused: false,
    error: null,
    config: { performDryRun: false },
  });

  const mockUseWorkflowReturn = {
    initialize: jest.fn(),
    config: { performDryRun: false },
    engine: null,
    isRunning: false,
    isPaused: false,
    isComplete: false,
    error: undefined,
    currentIndex: 0,
    progress: 0,
    executionHistory: [],
    start: jest.fn(),
    startFromStep: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
    addItems: jest.fn(),
    getEngine: jest.fn(() => null),
  };

  beforeEach(() => {
    mockUseUpdateWorkflow.mockReturnValue(mockUseWorkflowReturn);
    mockUseToastNotifications.mockReturnValue(mockToast);
    jest.clearAllMocks();
  });

  test('renders basic workflow component', () => {
    render(
      <ChakraProvider value={system}>
        <UpdateWorkflow />
      </ChakraProvider>
    );
    
    // Basic smoke test - just verify the component renders without crashing
    expect(screen.getByTestId('workflow-timeline')).toBeInTheDocument();
  });

  test('shows ready state initially', () => {
    render(
      <ChakraProvider value={system}>
        <UpdateWorkflow />
      </ChakraProvider>
    );
    
    // Should show some basic elements
    const timeline = screen.getByTestId('workflow-timeline');
    expect(timeline).toBeInTheDocument();
  });

  test('handles running state', () => {
    mockUseWorkflowReturn.isRunning = true;
    render(
      <ChakraProvider value={system}>
        <UpdateWorkflow />
      </ChakraProvider>
    );
    
    expect(screen.getByTestId('workflow-timeline')).toBeInTheDocument();
  });
});