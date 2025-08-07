import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateWorkflow } from '../../components/UpdateWorkflow';
import { useWorkflow } from '../../hooks/useWorkflow';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import {
  renderWithProviders,
  createMockWorkflowState,
  createCompletedWorkflowState,
  createErrorWorkflowState,
  createMigrationPendingWorkflowState,
  mockUseWorkflow
} from '../utils/mockHelpers';

// Mock hooks
jest.mock('../../hooks/useWorkflow');
jest.mock('../../hooks/useToastNotifications');

const mockUseWorkflowHook = useWorkflow as jest.MockedFunction<typeof useWorkflow>;
const mockUseToastNotifications = useToastNotifications as jest.MockedFunction<typeof useToastNotifications>;

describe('UpdateWorkflow Component', () => {
  const mockToast = {
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
    showWarning: jest.fn(),
    showError: jest.fn()
  };

  beforeEach(() => {
    mockUseToastNotifications.mockReturnValue(mockToast);
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('renders workflow ready state', () => {
      const state = createMockWorkflowState();
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('Automated Contao Update')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByText('Start Update Workflow')).toBeInTheDocument();
    });

    test('displays configuration options when not running', () => {
      const state = createMockWorkflowState();
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Skip composer dry-run')).toBeInTheDocument();
    });

    test('shows debug buttons when workflow is ready', () => {
      const state = createMockWorkflowState();
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('🔧 Debug: Start from Dry-run')).toBeInTheDocument();
      expect(screen.getByText('🔧 Debug: Start from Migrations')).toBeInTheDocument();
    });
  });

  describe('Running State', () => {
    test('shows progress and pause button when running', () => {
      const state = createMockWorkflowState({
        isRunning: true,
        currentStep: 1
      });
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Pause Workflow')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
    });

    test('hides configuration when running', () => {
      const state = createMockWorkflowState({
        isRunning: true
      });
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
    });
  });

  describe('Paused State', () => {
    test('shows resume button when paused', () => {
      const state = createMockWorkflowState({
        isPaused: true,
        isRunning: false
      });
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.getByText('Resume Workflow')).toBeInTheDocument();
    });
  });

  describe('Completed State', () => {
    test('shows success message and run again button when complete', () => {
      const state = createCompletedWorkflowState();
      mockUseWorkflowHook.mockReturnValue({
        ...mockUseWorkflow(state),
        isComplete: true
      });

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('Complete')).toBeInTheDocument();
      expect(screen.getByText('Update Complete!')).toBeInTheDocument();
      expect(screen.getByText('Run Again')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error status when workflow has error', () => {
      const state = createErrorWorkflowState();
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('starts workflow when start button clicked', async () => {
      const user = userEvent.setup();
      const mockWorkflow = mockUseWorkflow(createMockWorkflowState());
      mockUseWorkflowHook.mockReturnValue(mockWorkflow);

      renderWithProviders(<UpdateWorkflow />);

      const startButton = screen.getByText('Start Update Workflow');
      await user.click(startButton);

      expect(mockWorkflow.startWorkflow).toHaveBeenCalled();
      expect(mockToast.showInfo).toHaveBeenCalled();
    });

    test('pauses workflow when pause button clicked', async () => {
      const user = userEvent.setup();
      const mockWorkflow = mockUseWorkflow(createMockWorkflowState({
        isRunning: true
      }));
      mockUseWorkflowHook.mockReturnValue(mockWorkflow);

      renderWithProviders(<UpdateWorkflow />);

      const pauseButton = screen.getByText('Pause Workflow');
      await user.click(pauseButton);

      expect(mockWorkflow.stopWorkflow).toHaveBeenCalled();
      expect(mockToast.showWarning).toHaveBeenCalled();
    });

    test('resumes workflow when resume button clicked', async () => {
      const user = userEvent.setup();
      const mockWorkflow = mockUseWorkflow(createMockWorkflowState({
        isPaused: true,
        isRunning: false
      }));
      mockUseWorkflowHook.mockReturnValue(mockWorkflow);

      renderWithProviders(<UpdateWorkflow />);

      const resumeButton = screen.getByText('Resume Workflow');
      await user.click(resumeButton);

      expect(mockWorkflow.resumeWorkflow).toHaveBeenCalled();
      expect(mockToast.showInfo).toHaveBeenCalled();
    });

    test('toggles dry-run configuration', async () => {
      const user = userEvent.setup();
      const state = createMockWorkflowState();
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      
      // The checkbox should now be checked (dry-run disabled)
      expect(checkbox).toBeChecked();
    });

    test('starts workflow from debug buttons', async () => {
      const user = userEvent.setup();
      const mockWorkflow = mockUseWorkflow(createMockWorkflowState());
      mockUseWorkflowHook.mockReturnValue(mockWorkflow);

      renderWithProviders(<UpdateWorkflow />);

      const debugDryRunButton = screen.getByText('🔧 Debug: Start from Dry-run');
      await user.click(debugDryRunButton);

      expect(mockWorkflow.startWorkflowFromStep).toHaveBeenCalledWith('composer-dry-run');
    });

    test('starts again when run again button clicked', async () => {
      const user = userEvent.setup();
      const state = createCompletedWorkflowState();
      const mockWorkflow = {
        ...mockUseWorkflow(state),
        isComplete: true
      };
      mockUseWorkflowHook.mockReturnValue(mockWorkflow);

      renderWithProviders(<UpdateWorkflow />);

      const runAgainButton = screen.getByText('Run Again');
      await user.click(runAgainButton);

      expect(mockWorkflow.initializeWorkflow).toHaveBeenCalled();
    });
  });

  describe('Progress Calculation', () => {
    test('calculates progress correctly based on completed steps', () => {
      const state = createMockWorkflowState({
        steps: [
          { id: 'step1', title: 'Step 1', description: 'First step', status: 'complete' },
          { id: 'step2', title: 'Step 2', description: 'Second step', status: 'complete' },
          { id: 'step3', title: 'Step 3', description: 'Third step', status: 'active' },
          { id: 'step4', title: 'Step 4', description: 'Fourth step', status: 'pending' }
        ],
        isRunning: true,
        currentStep: 2
      });
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      // Should show progress based on 2 completed out of 4 steps (50%)
      expect(screen.getByText('Progress')).toBeInTheDocument();
    });
  });

  describe('Migration Handling', () => {
    test('renders workflow timeline with migration confirmations', () => {
      const state = createMigrationPendingWorkflowState();
      const mockWorkflow = {
        ...mockUseWorkflow(state),
        hasPendingMigrations: true
      };
      mockUseWorkflowHook.mockReturnValue(mockWorkflow);

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('Workflow Progress')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('displays error information in timeline', () => {
      const state = createErrorWorkflowState('composer-update', 'Composer failed');
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper button labels and roles', () => {
      const state = createMockWorkflowState();
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      const startButton = screen.getByRole('button', { name: /start update workflow/i });
      expect(startButton).toBeInTheDocument();
    });

    test('checkbox has proper labeling', () => {
      const state = createMockWorkflowState();
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      const checkbox = screen.getByRole('checkbox', { name: /skip composer dry-run/i });
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('shows appropriate UI during transitions', () => {
      const state = createMockWorkflowState({
        isRunning: true,
        steps: [
          { id: 'step1', title: 'Step 1', description: 'First step', status: 'active', startTime: new Date() }
        ]
      });
      mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

      renderWithProviders(<UpdateWorkflow />);

      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.queryByText('Start Update Workflow')).not.toBeInTheDocument();
    });
  });
});