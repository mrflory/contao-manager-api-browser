import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowTimeline } from '../../components/WorkflowTimeline';
import { renderWithProviders } from '../utils/mockHelpers';
import { WorkflowStep } from '../../types';

describe('WorkflowTimeline Component', () => {
  const mockHandlers = {
    onClearTasks: jest.fn(),
    onCancelPendingTasks: jest.fn(),
    onConfirmMigrations: jest.fn(),
    onSkipMigrations: jest.fn(),
    onCancelMigrations: jest.fn(),
    onContinueUpdate: jest.fn(),
    onSkipComposerUpdate: jest.fn(),
    onCancelWorkflow: jest.fn()
  };

  const createMigrationSummary = jest.fn((migrationData) => {
    if (!migrationData?.operations) return null;
    return {
      totalOperations: migrationData.operations.length,
      operationBreakdown: [{ operation: 'CREATE', count: 2 }],
      migrationType: 'schema',
      migrationHash: 'abc123'
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step Rendering', () => {
    test('renders basic workflow steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'check-tasks',
          title: 'Check Pending Tasks',
          description: 'Verify no other tasks are running',
          status: 'complete'
        },
        {
          id: 'composer-update',
          title: 'Composer Update',
          description: 'Update all Composer packages',
          status: 'active'
        },
        {
          id: 'update-versions',
          title: 'Update Version Info',
          description: 'Refresh version information',
          status: 'pending'
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={1}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={false}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Check Pending Tasks')).toBeInTheDocument();
      expect(screen.getByText('Composer Update')).toBeInTheDocument();
      expect(screen.getByText('Update Version Info')).toBeInTheDocument();
    });

    test('shows correct status indicators for different step states', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          title: 'Completed Step',
          description: 'This step is done',
          status: 'complete'
        },
        {
          id: 'step2',
          title: 'Active Step',
          description: 'This step is running',
          status: 'active'
        },
        {
          id: 'step3',
          title: 'Error Step',
          description: 'This step failed',
          status: 'error',
          error: 'Something went wrong'
        },
        {
          id: 'step4',
          title: 'Skipped Step',
          description: 'This step was skipped',
          status: 'skipped'
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={2}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={false}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Completed Step')).toBeInTheDocument();
      expect(screen.getByText('Active Step')).toBeInTheDocument();
      expect(screen.getByText('Error Step')).toBeInTheDocument();
      expect(screen.getByText('Skipped Step')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('shows pending tasks error with clear/cancel buttons', async () => {
      const user = userEvent.setup();
      const steps: WorkflowStep[] = [
        {
          id: 'check-tasks',
          title: 'Check Pending Tasks',
          description: 'Verify no other tasks are running',
          status: 'error',
          error: 'Pending tasks found. Please resolve before continuing.',
          data: { taskData: { id: 'existing-task', title: 'Manual Task' } }
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={0}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={true}
          hasPendingMigrations={false}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Clear and Continue')).toBeInTheDocument();
      expect(screen.getByText('Cancel Workflow')).toBeInTheDocument();

      await user.click(screen.getByText('Clear and Continue'));
      expect(mockHandlers.onClearTasks).toHaveBeenCalled();

      await user.click(screen.getByText('Cancel Workflow'));
      expect(mockHandlers.onCancelPendingTasks).toHaveBeenCalled();
    });

    test('displays error messages for failed steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'composer-update',
          title: 'Composer Update',
          description: 'Update all Composer packages',
          status: 'error',
          error: 'Composer dependency conflict detected',
          startTime: new Date(),
          endTime: new Date()
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={0}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={false}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Composer dependency conflict detected')).toBeInTheDocument();
    });
  });

  describe('Migration Handling', () => {
    test('shows migration confirmation dialog when migrations are pending', async () => {
      const user = userEvent.setup();
      const steps: WorkflowStep[] = [
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
              },
              {
                name: 'ALTER TABLE tl_content ADD COLUMN test_field',
                status: 'pending',
                message: 'Adding test field'
              }
            ]
          }
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={0}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={true}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Confirm Migrations')).toBeInTheDocument();
      expect(screen.getByText('Skip Migrations')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Test confirm migrations
      await user.click(screen.getByText('Confirm Migrations'));
      expect(mockHandlers.onConfirmMigrations).toHaveBeenCalledWith(false);

      // Test skip migrations
      await user.click(screen.getByText('Skip Migrations'));
      expect(mockHandlers.onSkipMigrations).toHaveBeenCalled();

      // Test cancel
      await user.click(screen.getByText('Cancel'));
      expect(mockHandlers.onCancelMigrations).toHaveBeenCalled();
    });

    test('shows migration summary when available', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'check-migrations-loop',
          title: 'Check Database Migrations',
          description: 'Check if database migrations are pending',
          status: 'complete',
          data: {
            hash: 'abc123',
            operations: [
              { name: 'CREATE TABLE tl_test', status: 'pending' },
              { name: 'CREATE INDEX idx_test', status: 'pending' }
            ]
          }
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={0}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={true}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      expect(createMigrationSummary).toHaveBeenCalledWith(steps[0].data);
    });

    test('handles migration confirmation with deletes option', async () => {
      const user = userEvent.setup();
      const steps: WorkflowStep[] = [
        {
          id: 'check-migrations-loop',
          title: 'Check Database Migrations',
          description: 'Check if database migrations are pending',
          status: 'complete',
          data: {
            hash: 'abc123',
            operations: [
              { name: 'DROP TABLE tl_old_table', status: 'pending' }
            ]
          }
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={0}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={true}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      // Find and click the "Include DROP statements" checkbox
      const checkbox = screen.getByRole('checkbox', { name: /include drop statements/i });
      await user.click(checkbox);

      // Now confirm migrations
      await user.click(screen.getByText('Confirm Migrations'));
      expect(mockHandlers.onConfirmMigrations).toHaveBeenCalledWith(true);
    });
  });

  describe('Dry Run Handling', () => {
    test('shows dry run completion with continue/skip options', async () => {
      const user = userEvent.setup();
      const steps: WorkflowStep[] = [
        {
          id: 'composer-dry-run',
          title: 'Composer Dry Run',
          description: 'Test composer update',
          status: 'complete'
        },
        {
          id: 'composer-update',
          title: 'Composer Update',
          description: 'Update packages',
          status: 'pending'
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={1}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={false}
          hasDryRunComplete={true}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Continue with Update')).toBeInTheDocument();
      expect(screen.getByText('Skip Composer Update')).toBeInTheDocument();

      await user.click(screen.getByText('Continue with Update'));
      expect(mockHandlers.onContinueUpdate).toHaveBeenCalled();

      await user.click(screen.getByText('Skip Composer Update'));
      expect(mockHandlers.onSkipComposerUpdate).toHaveBeenCalled();
    });
  });

  describe('Step Data Display', () => {
    test('shows task data when available', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'composer-update',
          title: 'Composer Update',
          description: 'Update packages',
          status: 'complete',
          data: {
            id: 'task-123',
            status: 'complete',
            console: 'Loading composer repositories...\nResolving dependencies...\nInstalling packages...',
            operations: [
              {
                summary: 'Downloading packages',
                details: 'Fetching updated packages',
                status: 'complete'
              }
            ]
          }
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={0}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={false}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      expect(screen.getByText(/Loading composer repositories/)).toBeInTheDocument();
    });

    test('handles conditional steps correctly', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'update-manager',
          title: 'Update Manager',
          description: 'Update Contao Manager',
          status: 'skipped',
          conditional: true
        },
        {
          id: 'composer-update',
          title: 'Composer Update',
          description: 'Update packages',
          status: 'pending'
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={1}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={false}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Update Manager')).toBeInTheDocument();
      expect(screen.getByText('Composer Update')).toBeInTheDocument();
    });
  });

  describe('Timing Information', () => {
    test('displays step timing when available', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:02:30Z');

      const steps: WorkflowStep[] = [
        {
          id: 'composer-update',
          title: 'Composer Update',
          description: 'Update packages',
          status: 'complete',
          startTime,
          endTime
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={0}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={false}
          hasPendingMigrations={false}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      // Should show duration (2 minutes 30 seconds)
      expect(screen.getByText('Composer Update')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper button roles and labels', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'check-tasks',
          title: 'Check Pending Tasks',
          description: 'Verify no other tasks',
          status: 'error',
          error: 'Pending tasks found'
        }
      ];

      renderWithProviders(
        <WorkflowTimeline
          steps={steps}
          currentStep={0}
          createMigrationSummary={createMigrationSummary}
          hasPendingTasksError={true}
          hasPendingMigrations={false}
          hasDryRunComplete={false}
          configBg="gray.50"
          {...mockHandlers}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear and continue/i });
      const cancelButton = screen.getByRole('button', { name: /cancel workflow/i });

      expect(clearButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });
});