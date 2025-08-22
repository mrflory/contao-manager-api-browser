/**
 * Basic Workflow Test Example
 * 
 * This file demonstrates how to write tests using the mock server
 * and test utilities. It's a good starting point for understanding
 * the testing patterns and available tools.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflow } from '../../backup/useWorkflowOld';
import { 
  setupTestEnvironment, 
  teardownTestEnvironment, 
  loadScenario, 
  TestContext 
} from '../utils/testHelpers';
import '../utils/customMatchers';

// Mock the API module to use our test server
jest.mock('../../utils/api');

describe('Basic Workflow Example', () => {
  let testContext: TestContext;

  // Setup: Create a fresh mock server for each test
  beforeEach(async () => {
    testContext = await setupTestEnvironment();
    
    // Configure the API module to use our test server
    const { api } = require('../../utils/api');
    const { createTestApiClient } = require('../utils/testHelpers');
    const apiClient = createTestApiClient(testContext.baseURL);
    Object.assign(api, apiClient);
  });

  // Cleanup: Stop the mock server after each test
  afterEach(async () => {
    await teardownTestEnvironment(testContext);
  });

  test('Example: Complete workflow runs successfully', async () => {
    // 1. Load a scenario that defines the test conditions
    loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

    // 2. Set up the React hook for testing
    const { result } = renderHook(() => useWorkflow());

    // 3. Initialize the workflow with configuration
    act(() => {
      result.current.initializeWorkflow({ performDryRun: true });
    });

    // 4. Verify initial state using custom matchers
    expect(result.current.state).toHaveWorkflowStatus('ready');
    expect(result.current.state).toHaveStepsInOrder([
      'check-tasks',
      'check-manager', 
      'composer-dry-run',
      'composer-update',
      'check-migrations-loop',
      'execute-migrations',
      'update-versions'
    ]);

    // 5. Start the workflow
    await act(async () => {
      result.current.startWorkflow();
    });

    // 6. Verify workflow is running
    expect(result.current.state).toHaveWorkflowStatus('running');
    expect(result.current.state).toBeAtStep('check-tasks');

    // 7. Wait for each step to complete
    await waitFor(() => {
      expect(result.current.state).toHaveCompletedStep('check-tasks');
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(result.current.state).toHaveCompletedStep('check-manager');
    }, { timeout: 5000 });

    // 8. Wait for dry-run to complete (workflow will pause)
    await waitFor(() => {
      expect(result.current.state).toHaveCompletedStep('composer-dry-run');
      expect(result.current.state).toHaveWorkflowStatus('paused');
    }, { timeout: 5000 });

    // 9. Resume the workflow
    await act(async () => {
      result.current.resumeWorkflow();
    });

    // 10. Wait for composer update
    await waitFor(() => {
      expect(result.current.state).toHaveCompletedStep('composer-update');
    }, { timeout: 8000 });

    // 11. Handle migrations if they exist
    await waitFor(() => {
      expect(result.current.state).toHaveCompletedStep('check-migrations-loop');
    }, { timeout: 5000 });

    // If migrations are pending, confirm them
    if (result.current.hasPendingMigrations) {
      await act(async () => {
        result.current.confirmMigrations();
      });

      await waitFor(() => {
        expect(result.current.state).toHaveCompletedStep('execute-migrations');
      }, { timeout: 5000 });
    }

    // 12. Wait for final completion
    await waitFor(() => {
      expect(result.current.state).toHaveCompletedStep('update-versions');
      expect(result.current.state).toBeWorkflowComplete();
    }, { timeout: 5000 });
  });

  test('Example: Handling workflow errors', async () => {
    // Load an error scenario
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
      expect(result.current.state).toHaveErrorInStep(
        'composer-update',
        expect.stringContaining('requirements could not be resolved')
      );
      expect(result.current.state).toHaveWorkflowStatus('error');
    }, { timeout: 10000 });

    // Workflow should be stopped
    expect(result.current.state.isRunning).toBe(false);

    // User can reset and try again
    act(() => {
      result.current.initializeWorkflow({ performDryRun: false });
    });

    expect(result.current.state.error).toBeUndefined();
    expect(result.current.state.steps[0].status).toBe('pending');
  });

  test('Example: Testing migration workflows', async () => {
    // Load scenario with migrations
    loadScenario(testContext.mockServer, 'happy-path.migrations-only');

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

    // Test skipping migrations
    act(() => {
      result.current.skipMigrations();
    });

    // Should skip execute step and continue
    await waitFor(() => {
      expect(result.current.state).toHaveStepWithStatus('execute-migrations', 'skipped');
      expect(result.current.state).toBeWorkflowComplete();
    }, { timeout: 5000 });
  });

  test('Example: Testing workflow pause/resume', async () => {
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
      expect(result.current.state).toHaveWorkflowStatus('running');
    }, { timeout: 3000 });

    // Pause the workflow
    act(() => {
      result.current.stopWorkflow();
    });

    expect(result.current.state).toHaveWorkflowStatus('paused');
    expect(result.current.state.isRunning).toBe(false);

    // Resume the workflow
    await act(async () => {
      result.current.resumeWorkflow();
    });

    expect(result.current.state).toHaveWorkflowStatus('running');
    expect(result.current.state.isRunning).toBe(true);
  });

  test('Example: Testing pending task conflicts', async () => {
    loadScenario(testContext.mockServer, 'error-scenarios.pending-tasks-blocking');

    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.initializeWorkflow({ performDryRun: false });
    });

    await act(async () => {
      result.current.startWorkflow();
    });

    // Should fail at check-tasks due to pending tasks
    await waitFor(() => {
      expect(result.current.state).toHaveErrorInStep(
        'check-tasks', 
        'Pending tasks found. Please resolve before continuing.'
      );
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
});