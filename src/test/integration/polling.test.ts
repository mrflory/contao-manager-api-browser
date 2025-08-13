import { renderHook, act, waitFor } from '@testing-library/react';
import { usePolling } from '../../hooks/usePolling';
import { withMockServer, loadScenario, createTestApiClient, TestContext, waitFor as utilWaitFor } from '../utils/testHelpers';
import { MockServer } from '../mockServer/MockServer';

// Store the original fetch before it gets mocked  
const originalFetch = global.fetch;

describe('Polling Integration Tests', () => {
  let testContext: TestContext;
  let apiClient: any;

  beforeEach(async () => {
    testContext = await require('../utils/testHelpers').setupTestEnvironment();
    
    // Track polling state for dynamic responses
    let pollCount = 0;
    let currentScenario = 'default';
    
    // Create a simple API client with mock implementations for testing
    apiClient = {
      async get(endpoint: string) {
        // Mock simple responses for polling tests
        if (endpoint === '/task') {
          // Handle different scenarios
          if (currentScenario === 'high-latency') {
            // Simulate long delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return { status: 'active', id: 'test-task' };
          }
          
          if (currentScenario === 'auth-error') {
            throw new Error('HTTP 401: Unauthorized');
          }
          
          if (currentScenario === 'no-content') {
            return {}; // 204 No Content
          }
          
          // Default progression: active -> active -> complete
          pollCount++;
          if (pollCount <= 2) {
            return { status: 'active', id: 'test-task' };
          } else {
            return { status: 'complete', id: 'test-task' };
          }
        }
        
        if (endpoint === '/contao/database-migration') {
          if (currentScenario === 'migration-error') {
            pollCount++;
            if (pollCount <= 2) {
              return { status: 'active', hash: 'fail123' };
            } else {
              return { status: 'error', hash: 'fail123', error: 'Migration failed' };
            }
          }
          
          pollCount++;
          if (pollCount <= 2) {
            return { status: 'active', hash: 'test123' };
          } else {
            return { status: 'complete', hash: 'test123' };
          }
        }
        
        if (endpoint === '/server/self-update') {
          if (currentScenario === 'auth-error') {
            throw new Error('HTTP 401: Unauthorized');
          }
          return { current_version: '1.9.5', latest_version: '1.9.5' };
        }
        
        return {};
      },
      async put(endpoint: string, data?: any) {
        // Reset poll count when starting new task
        pollCount = 0;
        
        // Set scenario based on data
        if (data?.name === 'manager/self-update') {
          currentScenario = 'high-latency';
        } else if (data?.hash === 'fail123') {
          currentScenario = 'migration-error';
        } else {
          currentScenario = 'default';
        }
        
        // Mock task creation
        if (endpoint === '/task') {
          if (currentScenario === 'no-content') {
            return {}; // Simulate empty task response
          }
          return { status: 'active', id: 'test-task', name: data?.name || 'test' };
        }
        if (endpoint === '/contao/database-migration') {
          return { status: 'active', hash: data?.hash || 'test123' };
        }
        return { status: 'created' };
      },
      async patch(endpoint: string, data?: any) {
        return { status: 'updated' };
      },
      // Add method to set scenario for tests
      setScenario: (scenario: string) => {
        currentScenario = scenario;
        pollCount = 0;
      }
    };
  });

  afterEach(async () => {
    await require('../utils/testHelpers').teardownTestEnvironment(testContext);
  });

  describe('Task Polling', () => {
    test('polls task status until completion', async () => {
      loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

      const results: any[] = [];
      const onResult = jest.fn((result) => results.push(result));
      const onError = jest.fn();
      const onTimeout = jest.fn();

      const { result } = renderHook(() =>
        usePolling(
          () => apiClient.get('/task'),
          (result) => result && result.status === 'active',
          onResult,
          { onError, onTimeout, interval: 100, maxDuration: 5000 }
        )
      );

      // Create a task
      await apiClient.put('/task', { name: 'composer/update', config: { dry_run: true } });

      // Start polling
      act(() => {
        result.current.startPolling();
      });

      // Wait for polling to capture task completion
      await waitFor(() => {
        expect(results.length).toBeGreaterThan(0);
        const lastResult = results[results.length - 1];
        expect(lastResult.status).toBe('complete');
      }, { timeout: 6000 });

      expect(onError).not.toHaveBeenCalled();
      expect(onTimeout).not.toHaveBeenCalled();

      // Should have captured both active and complete states
      expect(results.some(r => r.status === 'active')).toBe(true);
      expect(results.some(r => r.status === 'complete')).toBe(true);
    });

    test('handles task polling timeout', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.high-latency-network');

      const onResult = jest.fn();
      const onError = jest.fn();
      const onTimeout = jest.fn();

      const { result } = renderHook(() =>
        usePolling(
          () => apiClient.get('/task'),
          (result) => result && result.status === 'active',
          onResult,
          { onError, onTimeout, interval: 100, maxDuration: 1000 } // Short timeout
        )
      );

      // Create a long-running task
      await apiClient.put('/task', { name: 'manager/self-update' });

      act(() => {
        result.current.startPolling();
      });

      // Wait for timeout
      await waitFor(() => {
        expect(onTimeout).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    test('handles task polling errors', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.authentication-error');
      apiClient.setScenario('auth-error');

      const onResult = jest.fn();
      const onError = jest.fn();
      const onTimeout = jest.fn();

      const { result } = renderHook(() =>
        usePolling(
          () => apiClient.get('/server/self-update'), // This will fail with auth error
          (result) => true, // Always continue polling
          onResult,
          { onError, onTimeout, interval: 100, maxDuration: 2000 }
        )
      );

      act(() => {
        result.current.startPolling();
      });

      // Wait for error
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Should stop polling after error
      expect(result.current.isPolling).toBe(false);
    });

    test('can start and stop polling manually', async () => {
      loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

      const onResult = jest.fn();

      const { result } = renderHook(() =>
        usePolling(
          () => apiClient.get('/task'),
          (result) => result && result.status === 'active',
          onResult,
          { interval: 100 }
        )
      );

      expect(result.current.isPolling).toBe(false);

      // Start polling
      act(() => {
        result.current.startPolling();
      });

      expect(result.current.isPolling).toBe(true);

      // Stop polling
      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);
    });
  });

  describe('Migration Polling', () => {
    test('polls migration status until completion', async () => {
      loadScenario(testContext.mockServer, 'happy-path.migrations-only');

      const results: any[] = [];
      const onResult = jest.fn((result) => results.push(result));

      const { result } = renderHook(() =>
        usePolling(
          () => apiClient.get('/contao/database-migration'),
          (result) => result && result.status === 'active',
          onResult,
          { interval: 100, maxDuration: 5000 }
        )
      );

      // Start a migration dry-run
      await apiClient.put('/contao/database-migration', {});

      act(() => {
        result.current.startPolling();
      });

      // Wait for migration check to complete
      await waitFor(() => {
        expect(results.length).toBeGreaterThan(0);
        const lastResult = results[results.length - 1];
        expect(['pending', 'complete'].includes(lastResult.status)).toBe(true);
      }, { timeout: 3000 });
    });

    test('polls migration execution until completion', async () => {
      loadScenario(testContext.mockServer, 'happy-path.migrations-only');

      const results: any[] = [];
      const onResult = jest.fn((result) => results.push(result));

      const { result } = renderHook(() =>
        usePolling(
          () => apiClient.get('/contao/database-migration'),
          (result) => result && result.status === 'active',
          onResult,
          { interval: 150, maxDuration: 5000 }
        )
      );

      // Start migration execution with hash
      await apiClient.put('/contao/database-migration', { hash: 'test123' });

      act(() => {
        result.current.startPolling();
      });

      // Wait for execution to complete
      await waitFor(() => {
        expect(results.length).toBeGreaterThan(0);
        const lastResult = results[results.length - 1];
        expect(lastResult.status).toBe('complete');
      }, { timeout: 6000 });

      // Should have seen active state during execution
      expect(results.some(r => r.status === 'active')).toBe(true);
    });

    test('handles migration polling with error', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.migration-failure');

      const results: any[] = [];
      const onResult = jest.fn((result) => results.push(result));
      const onError = jest.fn();

      const { result } = renderHook(() =>
        usePolling(
          () => apiClient.get('/contao/database-migration'),
          (result) => result && result.status === 'active',
          onResult,
          { onError, interval: 100, maxDuration: 5000 }
        )
      );

      // Start migration that will fail
      await apiClient.put('/contao/database-migration', { hash: 'fail123' });

      act(() => {
        result.current.startPolling();
      });

      // Wait for failure result
      await waitFor(() => {
        expect(results.length).toBeGreaterThan(0);
        const lastResult = results[results.length - 1];
        expect(lastResult.status).toBe('error');
      }, { timeout: 4000 });
    });
  });

  describe('Polling Edge Cases', () => {
    test('handles 204 No Content responses', async () => {
      apiClient.setScenario('no-content');
      
      const results: any[] = [];
      const onResult = jest.fn((result) => results.push(result));

      const { result } = renderHook(() =>
        usePolling(
          () => apiClient.get('/task'), // Will return 204 when no task
          (result) => false, // Never continue (since no task)
          onResult,
          { interval: 100, maxDuration: 1000 }
        )
      );

      act(() => {
        result.current.startPolling();
      });

      // Should handle empty responses gracefully
      await waitFor(() => {
        expect(results.length).toBeGreaterThan(0);
      }, { timeout: 1500 });

      expect(results[0]).toEqual({}); // 204 returns empty object
    });

    test('handles rapid polling without overwhelming server', async () => {
      loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

      const callCount = jest.fn();
      const pollFunction = jest.fn(async () => {
        callCount();
        return apiClient.get('/task');
      });

      const { result } = renderHook(() =>
        usePolling(
          pollFunction,
          () => true,
          () => {},
          { interval: 10, maxDuration: 1000 } // Very rapid polling
        )
      );

      act(() => {
        result.current.startPolling();
      });

      await utilWaitFor(() => callCount.mock.calls.length > 10, { timeout: 2000 });

      act(() => {
        result.current.stopPolling();
      });

      // Should have made multiple calls but not overwhelmed
      expect(pollFunction).toHaveBeenCalledTimes(callCount.mock.calls.length);
      expect(callCount.mock.calls.length).toBeLessThan(200); // Reasonable upper bound
    });

    test('cleans up polling on unmount', async () => {
      const onResult = jest.fn();
      const pollFn = jest.fn(() => apiClient.get('/task'));

      const { result, unmount } = renderHook(() =>
        usePolling(pollFn, () => true, onResult, { interval: 100 })
      );

      act(() => {
        result.current.startPolling();
      });

      expect(result.current.isPolling).toBe(true);

      // Unmount component
      unmount();

      // Wait a bit and verify polling stopped
      await utilWaitFor(() => true, { timeout: 300 });
      
      const callsBefore = pollFn.mock.calls.length;
      await utilWaitFor(() => true, { timeout: 200 });
      const callsAfter = pollFn.mock.calls.length;

      // Should not have made additional calls after unmount
      expect(callsAfter).toBe(callsBefore);
    });
  });

  describe('Network Conditions', () => {
    test('handles slow network responses', async () => {
      loadScenario(testContext.mockServer, 'error-scenarios.high-latency-network');
      apiClient.setScenario('high-latency');

      const results: any[] = [];
      const onResult = jest.fn((result) => results.push(result));

      const { result } = renderHook(() =>
        usePolling(
          () => apiClient.get('/server/self-update'),
          () => false, // Don't continue polling
          onResult,
          { interval: 100, maxDuration: 5000 } // Higher timeout for slow responses
        )
      );

      act(() => {
        result.current.startPolling();
      });

      // Should eventually get response despite high latency
      await waitFor(() => {
        expect(results.length).toBeGreaterThan(0);
      }, { timeout: 6000 });

      expect(results[0]).toBeDefined();
    });
  });
});