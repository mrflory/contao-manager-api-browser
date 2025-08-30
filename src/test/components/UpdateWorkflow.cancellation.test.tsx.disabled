import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UpdateWorkflow } from '../../components/UpdateWorkflow';
import { useUpdateWorkflow } from '../../workflow/hooks/useUpdateWorkflow';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { WorkflowEngine } from '../../workflow/engine/WorkflowEngine';

// Mock dependencies
jest.mock('../../workflow/hooks/useUpdateWorkflow');
jest.mock('../../hooks/useToastNotifications');

const mockUseUpdateWorkflow = useUpdateWorkflow as jest.MockedFunction<typeof useUpdateWorkflow>;
const mockUseToastNotifications = useToastNotifications as jest.MockedFunction<typeof useToastNotifications>;

describe('UpdateWorkflow - Cancellation Functionality', () => {
  const mockToast = {
    showInfo: jest.fn(),
    showWarning: jest.fn(),
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showApiError: jest.fn(),
    showApiSuccess: jest.fn(),
  };

  const mockEngine = {
    getTimeline: jest.fn(() => [
      { id: 'check-tasks', title: 'Check Tasks', description: 'Checking...', status: 'complete' },
      { id: 'composer-update', title: 'Update', description: 'Updating...', status: 'user_action_required' },
    ]),
    hasCancelledItems: jest.fn(() => false),
  } as any;

  const baseMockWorkflow = {
    initialize: jest.fn(),
    config: { performDryRun: false },
    engine: mockEngine,
    isRunning: false,
    isPaused: false,
    isComplete: false,
    isCancelled: false,
    error: undefined,
    currentIndex: 1,
    progress: 50,
    executionHistory: [],
    start: jest.fn(),
    startFromStep: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
    addItems: jest.fn(),
    getEngine: jest.fn(() => mockEngine),
    cancel: jest.fn(),
  };

  beforeEach(() => {
    mockUseToastNotifications.mockReturnValue(mockToast);
    jest.clearAllMocks();
  });

  it('should show cancel button when workflow has user_action_required items', () => {
    mockUseUpdateWorkflow.mockReturnValue(baseMockWorkflow);

    render(<UpdateWorkflow />);

    expect(screen.getByText('Cancel Workflow')).toBeInTheDocument();
  });

  it('should show cancelled status and reset button after cancellation', async () => {
    const cancelledWorkflow = {
      ...baseMockWorkflow,
      isCancelled: true,
      isRunning: false,
      isPaused: false,
    };

    // First render with user action required
    const { rerender } = render(<UpdateWorkflow />);
    mockUseUpdateWorkflow.mockReturnValue(baseMockWorkflow);

    const cancelButton = screen.getByText('Cancel Workflow');
    expect(cancelButton).toBeInTheDocument();

    // Simulate cancellation
    fireEvent.click(cancelButton);
    await waitFor(() => {
      expect(baseMockWorkflow.cancel).toHaveBeenCalled();
    });

    // Re-render with cancelled state
    mockUseUpdateWorkflow.mockReturnValue(cancelledWorkflow);
    rerender(<UpdateWorkflow />);

    // Should show cancelled status
    expect(screen.getByText('Cancelled')).toBeInTheDocument();

    // Should show reset button
    expect(screen.getByText('Reset Workflow')).toBeInTheDocument();

    // Should show cancellation alert
    expect(screen.getByText('Workflow Cancelled')).toBeInTheDocument();
    expect(screen.getByText(/The update workflow has been cancelled/)).toBeInTheDocument();
  });

  it('should not show configuration when workflow is cancelled', () => {
    const cancelledWorkflow = {
      ...baseMockWorkflow,
      isCancelled: true,
    };

    mockUseUpdateWorkflow.mockReturnValue(cancelledWorkflow);

    render(<UpdateWorkflow />);

    expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
    expect(screen.queryByText('Skip composer dry-run')).not.toBeInTheDocument();
  });

  it('should not allow starting workflow when cancelled', () => {
    const cancelledWorkflow = {
      ...baseMockWorkflow,
      isCancelled: true,
    };

    mockUseUpdateWorkflow.mockReturnValue(cancelledWorkflow);

    render(<UpdateWorkflow />);

    expect(screen.queryByText('Start Update Workflow')).not.toBeInTheDocument();
  });

  it('should not allow resuming workflow when cancelled', () => {
    const cancelledPausedWorkflow = {
      ...baseMockWorkflow,
      isPaused: true,
      isCancelled: true,
    };

    mockUseUpdateWorkflow.mockReturnValue(cancelledPausedWorkflow);

    render(<UpdateWorkflow />);

    expect(screen.queryByText(/Resume/)).not.toBeInTheDocument();
  });

  it('should show proper toast message when cancelling', async () => {
    mockUseUpdateWorkflow.mockReturnValue(baseMockWorkflow);

    render(<UpdateWorkflow />);

    const cancelButton = screen.getByText('Cancel Workflow');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockToast.showWarning).toHaveBeenCalledWith({
        title: 'Workflow Cancelled',
        description: 'Workflow has been cancelled and all background tasks have been stopped.',
      });
    });
  });

  it('should allow reset after cancellation', async () => {
    const cancelledWorkflow = {
      ...baseMockWorkflow,
      isCancelled: true,
    };

    mockUseUpdateWorkflow.mockReturnValue(cancelledWorkflow);

    render(<UpdateWorkflow />);

    const resetButton = screen.getByText('Reset Workflow');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(baseMockWorkflow.initialize).toHaveBeenCalled();
      expect(mockToast.showInfo).toHaveBeenCalledWith({
        title: 'Workflow Reset',
        description: 'Workflow has been reset and is ready to start.',
      });
    });
  });
});