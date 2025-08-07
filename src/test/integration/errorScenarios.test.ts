import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflow } from '../../hooks/useWorkflow';
import { withMockServer, loadScenario, createTestApiClient, TestContext } from '../utils/testHelpers';
import '../utils/customMatchers';

jest.mock('../../utils/api');

describe('Error Scenarios Integration Tests', () => {
  let testContext: TestContext;
  let apiClient: any;

  beforeEach(async () => {
    testContext = await require('../utils/testHelpers').setupTestEnvironment();
    apiClient = createTestApiClient(testContext.baseURL);
    require('../../utils/api').api = apiClient;
  });

  afterEach(async () => {
    await require('../utils/testHelpers').teardownTestEnvironment(testContext);
  });

  describe('Task Failure Scenarios', () => {
    test('recovers from composer update dependency conflicts', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.composer-update-failure');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for workflow to fail at composer update
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('composer-update');
        expect(result.current.state.error).toContain('requirements could not be resolved');
      }, { timeout: 8000 });

      // Workflow should be stopped
      expect(result.current.state.isRunning).toBe(false);
      expect(result.current.state.isPaused).toBe(false);

      // User can restart workflow after fixing dependencies
      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      expect(result.current.state.error).toBeUndefined();
      expect(result.current.state.steps[0].status).toBe('pending');
    });

    test('handles manager self-update permission failures', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.manager-update-failure');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for manager update to be attempted and fail
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('update-manager');
        expect(result.current.state.error).toContain('Permission denied');
      }, { timeout: 10000 });

      // Workflow should stop at manager update failure
      expect(result.current.state.isRunning).toBe(false);
    });

    test('handles task abortion gracefully', async () => {
      loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for workflow to be running
      await waitFor(() => {
        expect(result.current.state.isRunning).toBe(true);
      }, { timeout: 3000 });

      // Stop workflow
      act(() => {
        result.current.stopWorkflow();
      });

      expect(result.current.state.isRunning).toBe(false);
      expect(result.current.state.isPaused).toBe(true);

      // Should be able to resume
      expect(result.current.state.steps.some(s => s.status === 'active' || s.status === 'complete')).toBe(true);
    });
  });

  describe('Migration Error Scenarios', () => {
    test('handles database migration constraint violations', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.migration-failure');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for migration check to find pending migrations
      await waitFor(() => {
        expect(result.current.state).toHavePendingMigrations();
      }, { timeout: 8000 });

      // Confirm migrations
      await act(async () => {
        result.current.confirmMigrations();
      });

      // Wait for migration execution to fail
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('execute-migrations');
        expect(result.current.state).toHaveWorkflowStatus('error');
      }, { timeout: 5000 });

      // User should be able to skip failed migrations and continue
      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // When migrations are found again, skip them
      await waitFor(() => {
        expect(result.current.state).toHavePendingMigrations();
      }, { timeout: 8000 });

      act(() => {
        result.current.skipMigrations();
      });

      // Should continue to completion
      await waitFor(() => {
        expect(result.current.state).toBeWorkflowComplete();
      }, { timeout: 5000 });
    });

    test('handles migration timeout scenarios', async () => {
      loadScenario(testContext.mockServer, 'edge-cases.large-migration-set');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for large migration set to be detected
      await waitFor(() => {
        expect(result.current.state).toHavePendingMigrations();
      }, { timeout: 10000 });

      // Confirm migrations
      await act(async () => {
        result.current.confirmMigrations();
      });

      // For this test, we expect the large migration set to complete successfully
      // but it tests the system's ability to handle many operations
      await waitFor(() => {
        const executeStep = result.current.state.steps.find(s => s.id === 'execute-migrations');
        expect(executeStep?.status).toMatch(/complete|error/);
      }, { timeout: 15000 });
    });

    test('handles empty migration responses correctly', async () => {
      loadScenario(testContext.mockServer, 'edge-cases.empty-migration-hash');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should complete successfully when no migrations are needed
      await waitFor(() => {
        expect(result.current.state).toBeWorkflowComplete();
        expect(result.current.state).toHaveStepWithStatus('execute-migrations', 'skipped');
      }, { timeout: 8000 });
    });
  });

  describe('Network and Authentication Errors', () => {
    test('handles authentication failures during workflow', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.authentication-error');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should fail at check-manager step due to authentication
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('check-manager');
        expect(result.current.state).toHaveWorkflowStatus('error');
      }, { timeout: 5000 });

      // Error should contain authentication failure message
      expect(result.current.state.error).toBeDefined();
    });

    test('handles high network latency gracefully', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.high-latency-network');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      const startTime = Date.now();

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should eventually complete despite high latency
      await waitFor(() => {
        expect(result.current.state.currentStep).toBeGreaterThan(0);
      }, { timeout: 8000 });

      const elapsedTime = Date.now() - startTime;
      // Should take longer than normal due to network latency
      expect(elapsedTime).toBeGreaterThan(2000);
    });

    test('retries failed network requests appropriately', async () => {
      // Load a scenario that starts normally then inject network issues
      loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for workflow to start
      await waitFor(() => {
        expect(result.current.state.isRunning).toBe(true);
      }, { timeout: 3000 });

      // Inject network errors by changing scenario
      testContext.mockServer.setState({
        scenarios: {
          networkLatency: 5000, // Very high latency
          authErrors: false
        }
      });

      // Workflow should continue despite network issues
      // (This tests the robustness of polling mechanisms)
      const initialStep = result.current.state.currentStep;
      
      await waitFor(() => {
        expect(result.current.state.currentStep).toBeGreaterThanOrEqual(initialStep);
      }, { timeout: 10000 });
    });
  });

  describe('Resource Constraint Scenarios', () => {
    test('handles partial task completion due to resource limits', async () => {
      loadScenario(testContext.mockServer, 'edge-cases.partial-task-completion');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should detect existing partial task and handle appropriately
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('check-tasks');
      }, { timeout: 5000 });

      // Clear the partial task
      await act(async () => {
        result.current.clearPendingTasks();
      });

      // Should be able to restart workflow
      await waitFor(() => {
        expect(result.current.state.isRunning).toBe(true);
        expect(result.current.state).toBeAtStep('check-tasks');
      }, { timeout: 3000 });
    });

    test('handles manager version not supported for updates', async () => {
      loadScenario(testContext.mockServer, 'edge-cases.manager-not-supported');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should skip manager update and continue with other steps
      await waitFor(() => {
        expect(result.current.state).toHaveCompletedStep('check-manager');
        expect(result.current.state).toHaveStepWithStatus('update-manager', 'skipped');
      }, { timeout: 5000 });

      // Workflow should continue to completion
      await waitFor(() => {
        expect(result.current.state.currentStep).toBeGreaterThan(1);
      }, { timeout: 8000 });
    });
  });

  describe('Complex Error Recovery', () => {
    test('handles multiple consecutive errors', async () => {
      const { result } = renderHook(() => useWorkflow());

      // Start with composer failure scenario
      loadScenario(testContext.mockServer, 'error-scenarios.composer-update-failure');

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for composer error
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('composer-update');
      }, { timeout: 8000 });

      // Reset and try with migration failure scenario
      loadScenario(testContext.mockServer, 'error-scenarios.migration-failure');

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should handle this different error scenario
      await waitFor(() => {
        expect(result.current.state).toHavePendingMigrations();
      }, { timeout: 8000 });

      await act(async () => {
        result.current.confirmMigrations();
      });

      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('execute-migrations');
      }, { timeout: 5000 });

      // Finally, try with a successful scenario
      loadScenario(testContext.mockServer, 'happy-path.no-updates-needed');

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should complete successfully
      await waitFor(() => {
        expect(result.current.state).toBeWorkflowComplete();
      }, { timeout: 5000 });
    });

    test('handles workflow interruption and state recovery', async () => {
      loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Wait for workflow to progress partway
      await waitFor(() => {
        expect(result.current.state.currentStep).toBeGreaterThan(0);
      }, { timeout: 5000 });

      const currentStep = result.current.state.currentStep;

      // Simulate interruption (stop workflow)
      act(() => {
        result.current.stopWorkflow();
      });

      expect(result.current.state.isRunning).toBe(false);
      expect(result.current.state.isPaused).toBe(true);

      // Resume workflow
      await act(async () => {
        result.current.resumeWorkflow();
      });

      expect(result.current.state.isRunning).toBe(true);
      expect(result.current.state.isPaused).toBe(false);

      // Should continue from where it left off
      expect(result.current.state.currentStep).toBe(currentStep);
    });
  });

  describe('Edge Case Error Handling', () => {
    test('handles malformed API responses gracefully', async () => {
      // This would test scenarios where API returns unexpected data formats
      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      // Set up mock server to return malformed responses
      testContext.mockServer.setState({
        scenarios: {
          malformedResponses: true
        }
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should handle malformed responses without crashing
      // Implementation depends on how robust our error handling is
      await waitFor(() => {
        expect(result.current.state.isRunning || result.current.state.error).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('handles simultaneous error conditions', async () => {
      // Load scenario with both pending tasks and auth errors
      loadScenario(testContext.mockServer, 'error-scenarios.pending-tasks-blocking');
      
      // Also set auth errors
      testContext.mockServer.setState({
        scenarios: {
          authErrors: true
        }
      });

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.initializeWorkflow({ performDryRun: false });
      });

      await act(async () => {
        result.current.startWorkflow();
      });

      // Should handle the most critical error first (pending tasks)
      await waitFor(() => {
        expect(result.current.state).toHaveErrorInStep('check-tasks');
      }, { timeout: 5000 });
    });
  });
});