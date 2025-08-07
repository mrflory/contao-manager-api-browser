import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflow } from '../../hooks/useWorkflow';
import { withMockServer, loadScenario, createTestApiClient, TestContext } from '../utils/testHelpers';
import '../utils/customMatchers';

// Mock the API module to use test server
jest.mock('../../utils/api');

describe('useWorkflow Hook Integration Tests', () => {
  let testContext: TestContext;
  let apiClient: any;

  beforeEach(async () => {
    testContext = await require('../utils/testHelpers').setupTestEnvironment();
    apiClient = createTestApiClient(testContext.baseURL);
    
    // Mock the API module to use test server
    require('../../utils/api').api = apiClient;
  });

  afterEach(async () => {
    await require('../utils/testHelpers').teardownTestEnvironment(testContext);
  });

  describe('Happy Path Scenarios', () => {
    test('complete update workflow succeeds', async () => {
      loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

      const { result } = renderHook(() => useWorkflow());

      // Initialize workflow
      act(() => {
        result.current.initializeWorkflow({ performDryRun: true });
      });

      expect(result.current.state).toHaveStepsInOrder([
        'check-tasks',
        'check-manager',
        'composer-dry-run',
        'composer-update',
        'check-migrations-loop',
        'execute-migrations',
        'update-versions'
      ]);

      // Start workflow
      await act(async () => {
        result.current.startWorkflow();
      });

      expect(result.current.state).toHaveWorkflowStatus('running');
      expect(result.current.state).toBeAtStep('check-tasks');

      // Wait for workflow to progress through steps
      await waitFor(() => {
        expect(result.current.state).toHaveCompletedStep('check-tasks');
      }, { timeout: 10000 });

      await waitFor(() => {
        expect(result.current.state).toHaveCompletedStep('check-manager');
      }, { timeout: 10000 });

      // Wait for dry-run completion and pause
      await waitFor(() => {
        expect(result.current.state).toHaveCompletedStep('composer-dry-run');
        expect(result.current.state).toHaveWorkflowStatus('paused');
      }, { timeout: 10000 });

      // Resume from dry-run
      await act(async () => {
        result.current.resumeWorkflow();
      });

      // Wait for composer update
      await waitFor(() => {
        expect(result.current.state).toHaveCompletedStep('composer-update');
      }, { timeout: 10000 });

      // Wait for migration check
      await waitFor(() => {
        expect(result.current.state).toHaveCompletedStep('check-migrations-loop');
      }, { timeout: 10000 });

      // Confirm migrations if pending
      if (result.current.hasPendingMigrations) {
        await act(async () => {
          result.current.confirmMigrations();
        });

        await waitFor(() => {
          expect(result.current.state).toHaveCompletedStep('execute-migrations');
        }, { timeout: 10000 });
      }

      // Wait for final step
      await waitFor(() => {
        expect(result.current.state).toHaveCompletedStep('update-versions');
        expect(result.current.state).toBeWorkflowComplete();
      }, { timeout: 10000 });
    });

    test('workflow with no updates needed', async () => {
      loadScenario(testContext.mockServer, 'happy-path.no-updates-needed');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should complete quickly with all steps skipped or completed
      await waitFor(() => {
        expect(result.current.state).toBeWorkflowComplete();
      }, { timeout: 5000 });

      // Manager update step should be skipped
      expect(result.current.state).toHaveStepWithStatus('update-manager', 'skipped');
    });

    test('skip dry-run configuration', async () => {
      loadScenario(testContext.mockServer, 'happy-path.dry-run-success');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      // Should not include dry-run step
      const stepIds = result.current.state.steps.map(step => step.id);
      expect(stepIds).not.toContain('composer-dry-run');
      expect(stepIds).toContain('composer-update');
    });
  });

  describe('Error Handling', () => {
    test('handles composer update failure', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.composer-update-failure');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for composer update to fail
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('composer-update');
        expect(result.current.state).toHaveWorkflowStatus('error');
      }, { timeout: 10000 });

      expect(result.current.state.error).toContain('requirements could not be resolved');
    });

    test('handles migration failure', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.migration-failure');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait to reach migrations
      await waitFor(() => {
        expect(result.current.state).toHavePendingMigrations();
      }, { timeout: 8000 });

      // Confirm migrations
      await act(async () => {
        result.current.confirmMigrations();
      });

      // Wait for migration failure
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('execute-migrations');
        expect(result.current.state).toHaveWorkflowStatus('error');
      }, { timeout: 5000 });
    });

    test('handles pending tasks blocking workflow', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.pending-tasks-blocking');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should fail at check-tasks step
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('check-tasks', 'Pending tasks found. Please resolve before continuing.');
      }, { timeout: 5000 });

      // Test clearing pending tasks
      await act(async () => {
        result.current.clearPendingTasks();
      });

      // Should restart workflow
      await waitFor(() => {
        expect(result.current.state).toHaveWorkflowStatus('running');
        expect(result.current.state).toBeAtStep('check-tasks');
      }, { timeout: 3000 });
    });

    test('handles authentication errors', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.authentication-error');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should fail at check-manager step due to auth error
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('check-manager');
      }, { timeout: 5000 });
    });
  });

  describe('Migration Workflows', () => {
    test('handles migration confirmation with deletes', async () => {
      loadScenario(testContext.mockServer, 'happy-path.migrations-only');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for migration check to complete
      await waitFor(() => {
        expect(result.current.state).toHavePendingMigrations();
      }, { timeout: 8000 });

      // Confirm with deletes
      await act(async () => {
        result.current.confirmMigrations(true);
      });

      // Check that withDeletes flag is stored
      const checkStep = result.current.state.steps.find(s => s.id.startsWith('check-migrations-loop'));
      expect(checkStep?.data?.withDeletes).toBe(true);
    });

    test('handles migration skip', async () => {
      loadScenario(testContext.mockServer, 'happy-path.migrations-only');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for migration check
      await waitFor(() => {
        expect(result.current.state).toHavePendingMigrations();
      }, { timeout: 8000 });

      // Skip migrations
      await act(async () => {
        result.current.skipMigrations();
      });

      // Execute step should be skipped and workflow should continue
      await waitFor(() => {
        expect(result.current.state).toHaveStepWithStatus('execute-migrations', 'skipped');
        expect(result.current.state).toBeWorkflowComplete();
      }, { timeout: 5000 });
    });
  });

  describe('Workflow Control', () => {
    test('can pause and resume workflow', async () => {
      loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      expect(result.current.state).toHaveWorkflowStatus('running');

      // Pause workflow
      act(() => {
        result.current.stopWorkflow();
      });

      expect(result.current.state).toHaveWorkflowStatus('paused');

      // Resume workflow
      await act(async () => {
        result.current.resumeWorkflow();
      });

      expect(result.current.state).toHaveWorkflowStatus('running');
    });

    test('can start workflow from specific step', async () => {
      loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: true });
      });

      // Start from composer-dry-run step
      await act(async () => {
        result.current.startWorkflowFromStep('composer-dry-run');
      });

      expect(result.current.state).toBeAtStep('composer-dry-run');
      expect(result.current.state).toHaveStepWithStatus('check-tasks', 'skipped');
      expect(result.current.state).toHaveStepWithStatus('check-manager', 'skipped');
    });
  });

  describe('Edge Cases', () => {
    test('handles multiple migration cycles', async () => {
      loadScenario(testContext.mockServer, 'edge-cases.multiple-migration-cycles');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // This scenario should create multiple migration cycles
      // Each cycle creates new check and execute steps dynamically
      await waitFor(() => {
        const migrationSteps = result.current.state.steps.filter(s => 
          s.id.startsWith('check-migrations-loop') || s.id.startsWith('execute-migrations')
        );
        expect(migrationSteps.length).toBeGreaterThan(2); // Should have multiple cycles
      }, { timeout: 15000 });
    });

    test('handles empty migration hash gracefully', async () => {
      loadScenario(testContext.mockServer, 'edge-cases.empty-migration-hash');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should skip migrations when hash is empty
      await waitFor(() => {
        expect(result.current.state).toHaveStepWithStatus('execute-migrations', 'skipped');
        expect(result.current.state).toBeWorkflowComplete();
      }, { timeout: 8000 });
    });
  });
});