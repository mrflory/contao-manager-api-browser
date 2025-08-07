import { MockServer } from './MockServer';
import { scenarioLoader } from './scenarioLoader';
import { createTestApiClient } from '../utils/testHelpers';

describe('Mock Server Tests', () => {
  let mockServer: MockServer | null = null;
  let apiClient: any;
  const testPort = 3002;

  beforeAll(async () => {
    await scenarioLoader.loadAllScenarios();
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
      mockServer = null;
    }
    // Give time for all handles to close
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  beforeEach(async () => {
    // Ensure clean state between tests
    if (mockServer) {
      await mockServer.stop();
    }
    
    // Add small delay to ensure port is released
    await new Promise(resolve => setTimeout(resolve, 50));
    
    mockServer = new MockServer();
    await mockServer.start(testPort);
    apiClient = createTestApiClient(`http://localhost:${testPort}`);
  });

  afterEach(async () => {
    if (mockServer) {
      // Give a small delay to ensure any pending requests complete
      await new Promise(resolve => setTimeout(resolve, 150));
      await mockServer.stop();
      mockServer = null;
    }
  });

  describe('Server Endpoints', () => {
    test('health check endpoint responds correctly', async () => {
      const response = await fetch(`http://localhost:${testPort}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });

    test('server configuration endpoints work', async () => {
      const selfUpdate = await apiClient.get('/server/self-update');
      expect(selfUpdate.current_version).toBeDefined();
      expect(selfUpdate.latest_version).toBeDefined();

      const config = await apiClient.get('/server/config');
      expect(config.php_cli).toBeDefined();

      const phpWeb = await apiClient.get('/server/php-web');
      expect(phpWeb.version).toBeDefined();

      const contao = await apiClient.get('/server/contao');
      expect(contao.version).toBeDefined();
    });

    test('task endpoints handle CRUD operations', async () => {
      // Initially no task
      const noTask = await apiClient.get('/task');
      expect(noTask).toEqual({});

      // Create task
      const createResponse = await apiClient.put('/task', {
        name: 'composer/update',
        config: { dry_run: true }
      });
      expect(createResponse.id).toBeDefined();
      expect(createResponse.status).toBe('active');

      // Get task
      const getResponse = await apiClient.get('/task');
      expect(getResponse.id).toBe(createResponse.id);

      // Wait for task to complete (simulated)
      await new Promise(resolve => setTimeout(resolve, 1200));

      const completedTask = await apiClient.get('/task');
      expect(completedTask.status).toBe('complete');

      // Delete task
      const deleteResponse = await apiClient.delete('/task');
      expect(deleteResponse.deleted).toBe(true);

      // Should be empty again
      const emptyTask = await apiClient.get('/task');
      expect(emptyTask).toEqual({});
    }, 10000);

    test('migration endpoints handle workflow correctly', async () => {
      // Start migration check (dry run)
      const migrationCheck = await apiClient.put('/contao/database-migration', {});
      expect(migrationCheck.status).toBe('pending');

      // Should have operations if there are pending migrations
      if (migrationCheck.hash && migrationCheck.hash !== '') {
        expect(migrationCheck.operations).toBeDefined();
        expect(migrationCheck.operations.length).toBeGreaterThan(0);

        // Execute migrations with hash
        const migrationExecution = await apiClient.put('/contao/database-migration', {
          hash: migrationCheck.hash
        });
        expect(migrationExecution.status).toBe('active');

        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 1100));

        const completedMigration = await apiClient.get('/contao/database-migration');
        expect(completedMigration.status).toBe('complete');

        // Delete migration
        await apiClient.delete('/contao/database-migration');
        const noMigration = await apiClient.get('/contao/database-migration');
        expect(noMigration).toEqual({});
      }
    });

    test('package endpoints return correct data', async () => {
      const rootPackage = await apiClient.get('/packages/root');
      expect(rootPackage.name).toBeDefined();
      expect(rootPackage.version).toBeDefined();

      const localPackages = await apiClient.get('/packages/local/');
      expect(localPackages.root).toBeDefined();
      expect(Object.keys(localPackages).length).toBeGreaterThan(1);
    });
  });

  describe('Scenario Loading', () => {
    test('loads happy path scenario correctly', async () => {
      const scenario = scenarioLoader.getScenario('happy-path.complete-update-success');
      expect(scenario).toBeDefined();

      mockServer.loadScenario(scenario!);
      const state = mockServer.getState();

      expect(state.selfUpdate.current_version).toBe('1.9.4');
      expect(state.selfUpdate.latest_version).toBe('1.9.5');
      expect(state.pendingMigrations).toBeDefined();
    });

    test('loads error scenario correctly', async () => {
      const scenario = scenarioLoader.getScenario('error-scenarios.composer-update-failure');
      expect(scenario).toBeDefined();

      mockServer.loadScenario(scenario!);
      const state = mockServer.getState();

      expect(state.scenarios?.taskFailures).toBeDefined();
      expect(state.scenarios?.taskFailures?.['composer/update']).toContain('requirements could not be resolved');
    });

    test('handles scenario not found', () => {
      const scenario = scenarioLoader.getScenario('non-existent-scenario');
      expect(scenario).toBeUndefined();
    });

    test('can reset state to default', () => {
      const scenario = scenarioLoader.getScenario('error-scenarios.authentication-error');
      mockServer.loadScenario(scenario!);

      let state = mockServer.getState();
      expect(state.scenarios?.authErrors).toBe(true);

      mockServer.reset();
      state = mockServer.getState();
      expect(state.scenarios?.authErrors).toBeUndefined();
    });
  });

  describe('Task Simulation', () => {
    test('simulates task execution with proper timing', async () => {
      const taskData = await apiClient.put('/task', {
        name: 'composer/update',
        config: { dry_run: false }
      });

      expect(taskData.status).toBe('active');

      // Should complete after simulation delay
      await new Promise(resolve => setTimeout(resolve, 3200));

      const completedTask = await apiClient.get('/task');
      expect(completedTask.status).toBe('complete');
      expect(completedTask.console).toContain('completed successfully');
    }, 15000);

    test('simulates task failures when configured', async () => {
      const scenario = scenarioLoader.getScenario('error-scenarios.composer-update-failure');
      mockServer.loadScenario(scenario!);

      const taskData = await apiClient.put('/task', {
        name: 'composer/update'
      });

      expect(taskData.status).toBe('active');

      // Should fail after simulation delay
      await new Promise(resolve => setTimeout(resolve, 3100));

      const failedTask = await apiClient.get('/task');
      expect(failedTask.status).toBe('error');
      expect(failedTask.console).toContain('requirements could not be resolved');
    });

    test('handles task abortion correctly', async () => {
      const taskData = await apiClient.put('/task', {
        name: 'composer/update'
      });

      expect(taskData.status).toBe('active');

      // Abort task
      const abortResponse = await apiClient.patch('/task', { status: 'aborting' });
      expect(abortResponse.status).toBe('aborting');

      // Wait for abortion to complete
      await new Promise(resolve => setTimeout(resolve, 600));

      const abortedTask = await apiClient.get('/task');
      expect(abortedTask.status).toBe('stopped');
      expect(abortedTask.console).toContain('aborted by user');
    });
  });

  describe('Migration Simulation', () => {
    test('simulates migration execution correctly', async () => {
      // Load scenario with migrations
      const scenario = scenarioLoader.getScenario('happy-path.migrations-only');
      mockServer.loadScenario(scenario!);

      const migrationData = await apiClient.put('/contao/database-migration', {
        hash: 'test123'
      });

      expect(migrationData.status).toBe('active');

      // Should complete after simulation delay
      await new Promise(resolve => setTimeout(resolve, 1700));

      const completedMigration = await apiClient.get('/contao/database-migration');
      expect(completedMigration.status).toBe('complete');
      expect(completedMigration.operations.every((op: any) => op.status === 'complete')).toBe(true);
    }, 10000);

    test('simulates migration failures when configured', async () => {
      const scenario = scenarioLoader.getScenario('error-scenarios.migration-failure');
      mockServer.loadScenario(scenario!);

      const migrationData = await apiClient.put('/contao/database-migration', {
        hash: 'fail123'
      });

      expect(migrationData.status).toBe('active');

      // Should fail after simulation delay
      await new Promise(resolve => setTimeout(resolve, 1600));

      const failedMigration = await apiClient.get('/contao/database-migration');
      expect(failedMigration.status).toBe('error');
    });
  });

  describe('Network Simulation', () => {
    test('simulates network latency', async () => {
      const scenario = scenarioLoader.getScenario('error-scenarios.high-latency-network');
      mockServer.loadScenario(scenario!);

      const startTime = Date.now();
      await apiClient.get('/server/self-update');
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(1900); // Should be at least 2000ms due to latency
    });

    test('simulates authentication errors', async () => {
      const scenario = scenarioLoader.getScenario('error-scenarios.authentication-error');
      mockServer.loadScenario(scenario!);

      try {
        await apiClient.get('/server/self-update');
        throw new Error('Should have thrown authentication error');
      } catch (error) {
        expect(error.message).toContain('401');
      }
    });
  });

  describe('State Management', () => {
    test('can modify state dynamically', () => {
      const initialState = mockServer.getState();
      expect(initialState.maintenanceMode.enabled).toBe(false);

      mockServer.setState({
        maintenanceMode: { enabled: true }
      });

      const updatedState = mockServer.getState();
      expect(updatedState.maintenanceMode.enabled).toBe(true);
    });

    test('maintains state consistency during operations', async () => {
      const taskData = await apiClient.put('/task', {
        name: 'composer/update'
      });

      const state = mockServer.getState();
      expect(state.currentTask).toBeDefined();
      expect(state.currentTask?.id).toBe(taskData.id);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3100));

      const finalState = mockServer.getState();
      expect(finalState.currentTask?.status).toBe('complete');
    });
  });

  describe('Error Handling', () => {
    test('handles invalid endpoints gracefully', async () => {
      try {
        await apiClient.get('/invalid/endpoint');
        throw new Error('Should have returned 404');
      } catch (error) {
        expect(error.message).toContain('404');
      }
    });

    test('handles malformed requests', async () => {
      try {
        await apiClient.put('/task', 'invalid-json');
        throw new Error('Should have returned error for malformed request');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('prevents task conflicts', async () => {
      await apiClient.put('/task', { name: 'composer/update' });

      try {
        await apiClient.put('/task', { name: 'another/task' });
        throw new Error('Should have prevented task conflict');
      } catch (error) {
        expect(error.message).toContain('400');
      }
    });
  });
});