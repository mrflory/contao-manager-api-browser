import { MockServer } from '../mockServer/MockServer';
import { scenarioLoader } from '../mockServer/scenarioLoader';
import { Scenario } from '../mockServer/types';

export interface TestContext {
  mockServer: MockServer;
  baseURL: string;
}

/**
 * Set up test environment with mock server
 */
export async function setupTestEnvironment(): Promise<TestContext> {
  const mockServer = new MockServer();
  const port = 3001 + Math.floor(Math.random() * 1000); // Use random port to avoid conflicts
  await mockServer.start(port);
  
  // Load scenarios
  await scenarioLoader.loadAllScenarios();
  
  return {
    mockServer,
    baseURL: `http://localhost:${port}`
  };
}

/**
 * Tear down test environment
 */
export async function teardownTestEnvironment(context: TestContext): Promise<void> {
  if (context.mockServer) {
    await context.mockServer.stop();
  }
}

/**
 * Create a test wrapper that sets up and tears down the environment
 */
export function withMockServer<T>(
  testFn: (context: TestContext) => Promise<T>
): () => Promise<T> {
  return async (): Promise<T> => {
    const context = await setupTestEnvironment();
    try {
      return await testFn(context);
    } finally {
      await teardownTestEnvironment(context);
    }
  };
}

/**
 * Load and apply a scenario to the mock server
 */
export function loadScenario(mockServer: MockServer, scenarioKey: string): void {
  const scenario = scenarioLoader.getScenario(scenarioKey);
  if (!scenario) {
    throw new Error(`Scenario not found: ${scenarioKey}`);
  }
  mockServer.loadScenario(scenario);
}

/**
 * Create a test API client that uses the mock server
 */
export function createTestApiClient(baseURL: string) {
  const apiBase = `${baseURL}/api`;
  
  return {
    async get<T>(endpoint: string): Promise<T> {
      const response = await fetch(`${apiBase}${endpoint}`);
      if (!response.ok && response.status !== 204) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.status === 204 ? ({} as T) : response.json();
    },

    async post<T>(endpoint: string, data?: any): Promise<T> {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },

    async put<T>(endpoint: string, data?: any): Promise<T> {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },

    async patch<T>(endpoint: string, data?: any): Promise<T> {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },

    async delete<T>(endpoint: string): Promise<T> {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'DELETE'
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.status === 204 ? ({} as T) : response.json();
    }
  };
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor<T>(
  condition: () => Promise<T> | T,
  options: {
    timeout?: number;
    interval?: number;
    timeoutMessage?: string;
  } = {}
): Promise<T> {
  const {
    timeout = 5000,
    interval = 100,
    timeoutMessage = 'Timeout waiting for condition'
  } = options;

  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return result;
      }
    } catch (error) {
      // Continue waiting if condition throws
    }
    await sleep(interval);
  }
  
  throw new Error(timeoutMessage);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = { ...console };
  const consoleMocks = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };

  // Replace console methods
  Object.assign(console, consoleMocks);

  return {
    mocks: consoleMocks,
    restore: () => Object.assign(console, originalConsole)
  };
}

/**
 * Create a test environment with specific API base URL for components
 */
export function createTestEnvironment(mockServerURL: string) {
  // Store original fetch
  const originalFetch = global.fetch;
  
  // Mock fetch to use mock server
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    // Redirect API calls to mock server
    if (typeof url === 'string' && url.startsWith('/api')) {
      url = `${mockServerURL}${url}`;
    }
    return originalFetch(url, init);
  });

  return {
    restore: () => {
      global.fetch = originalFetch;
    }
  };
}

/**
 * Assert that workflow steps are in expected order
 */
export function assertWorkflowStepOrder(steps: Array<{ id: string; status: string }>, expectedOrder: string[]): void {
  const stepIds = steps.map(step => step.id);
  
  for (let i = 0; i < expectedOrder.length; i++) {
    const expectedId = expectedOrder[i];
    const actualIndex = stepIds.indexOf(expectedId);
    
    if (actualIndex === -1) {
      throw new Error(`Expected step '${expectedId}' not found in workflow steps`);
    }
    
    if (actualIndex !== i) {
      throw new Error(`Step '${expectedId}' found at index ${actualIndex}, expected at index ${i}`);
    }
  }
}

/**
 * Assert workflow step status
 */
export function assertStepStatus(steps: Array<{ id: string; status: string }>, stepId: string, expectedStatus: string): void {
  const step = steps.find(s => s.id === stepId);
  if (!step) {
    throw new Error(`Step '${stepId}' not found in workflow`);
  }
  
  if (step.status !== expectedStatus) {
    throw new Error(`Step '${stepId}' has status '${step.status}', expected '${expectedStatus}'`);
  }
}