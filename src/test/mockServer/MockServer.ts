import { Express, Request, Response } from 'express';
const express = require('express');
const cors = require('cors');
import { Server } from 'http';
import { MockState, Scenario, TaskData, MigrationData } from './types';
import { createDefaultState } from './state';
import { taskHandlers } from './handlers/taskHandlers';
import { migrationHandlers } from './handlers/migrationHandlers';
import { serverHandlers } from './handlers/serverHandlers';
import { packageHandlers } from './handlers/packageHandlers';
import { scenarioLoader } from './scenarioLoader';

export class MockServer {
  private app: Express;
  private server: Server | null = null;
  private state: MockState;
  private connections: Set<any> = new Set();
  private port: number = 3001;
  private currentScenarioName: string | null = null;

  constructor() {
    this.app = express();
    this.state = createDefaultState();
    this.setupMiddleware();
    this.setupRoutes();
    
    // Initialize scenarios
    this.initializeScenarios();
  }
  
  private async initializeScenarios(): Promise<void> {
    try {
      await scenarioLoader.loadAllScenarios();
    } catch (error) {
      console.warn('[MockServer] Failed to load scenarios:', error);
    }
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Logging middleware for debugging
    this.app.use((req: Request, res: Response, next) => {
      console.log(`[MOCK] ${req.method} ${req.path}`, 
        req.body ? JSON.stringify(req.body) : '');
      next();
    });
  }

  private setupRoutes(): void {
    const router = express.Router();

    // Server configuration endpoints
    router.get('/server/self-update', serverHandlers.getSelfUpdate(() => this.state));
    router.get('/server/config', serverHandlers.getConfig(() => this.state));
    router.get('/server/php-web', serverHandlers.getPhpWeb(() => this.state));
    router.get('/server/contao', serverHandlers.getContao(() => this.state));
    router.get('/server/composer', serverHandlers.getComposer(() => this.state));
    router.get('/server/phpinfo', serverHandlers.getPhpInfo(() => this.state));

    // Task endpoints
    router.get('/task', taskHandlers.getTask(() => this.state));
    router.put('/task', taskHandlers.putTask(() => this.state));
    router.patch('/task', taskHandlers.patchTask(() => this.state));
    router.delete('/task', taskHandlers.deleteTask(() => this.state));

    // Database migration endpoints
    router.get('/contao/database-migration', migrationHandlers.getMigration(() => this.state));
    router.put('/contao/database-migration', migrationHandlers.putMigration(() => this.state));
    router.delete('/contao/database-migration', migrationHandlers.deleteMigration(() => this.state));

    // Package endpoints
    router.get('/packages/root', packageHandlers.getRootPackage(() => this.state));
    router.get('/packages/local', packageHandlers.getLocalPackages(() => this.state));
    router.get('/packages/local/:name', packageHandlers.getLocalPackage(() => this.state));

    // User management endpoints
    router.get('/users', serverHandlers.getUsers(() => this.state));
    router.get('/users/:username', serverHandlers.getUser(() => this.state));

    // Maintenance mode endpoints
    router.get('/contao/maintenance-mode', (req: Request, res: Response) => {
      res.json({ enabled: this.state.maintenanceMode.enabled });
    });

    router.put('/contao/maintenance-mode', (req: Request, res: Response) => {
      this.state.maintenanceMode.enabled = true;
      res.json({ enabled: true });
    });

    router.delete('/contao/maintenance-mode', (req: Request, res: Response) => {
      this.state.maintenanceMode.enabled = false;
      res.json({ enabled: false });
    });

    // Backup endpoints  
    router.get('/contao/backup', serverHandlers.getBackups(() => this.state));

    // Session endpoints (mock)
    router.get('/session', (req: Request, res: Response) => {
      const users = this.state.users || [];
      if (users.length > 0) {
        res.json(users[0]); // Return first user as logged in
      } else {
        res.status(204).send();
      }
    });

    this.app.use('/api', router);

    // Mock control endpoints for testing
    this.app.post('/mock/scenario', (req: Request, res: Response) => {
      const { scenario } = req.body;
      if (!scenario) {
        return res.status(400).json({ error: 'Scenario name required' });
      }
      
      const scenarioData = scenarioLoader.getScenario(scenario);
      if (!scenarioData) {
        return res.status(404).json({ error: `Scenario '${scenario}' not found` });
      }
      
      this.loadScenario(scenarioData);
      this.currentScenarioName = scenario;
      res.json({ success: true, scenario: scenario, description: scenarioData.description });
    });

    this.app.post('/mock/reset', (req: Request, res: Response) => {
      this.state = createDefaultState();
      this.currentScenarioName = null;
      res.json({ success: true, message: 'State reset to default' });
    });
    this.app.use('/contao-manager.phar.php/api', router);

    // OAuth endpoints (for frontend integration)
    this.app.get('/oauth2/authorize', (req: Request, res: Response) => {
      const { response_type, client_id, redirect_uri, scope, state } = req.query;
      
      console.log(`[OAUTH] Authorization request:`, { response_type, client_id, scope, state });
      
      // Simulate OAuth flow - in real UI testing, this would redirect back with a token
      const mockToken = `mock_token_${Math.random().toString(36).substr(2, 12)}`;
      const redirectUrl = `${redirect_uri}#access_token=${mockToken}&token_type=Bearer&expires_in=3600${state ? `&state=${state}` : ''}`;
      
      console.log(`[OAUTH] Redirecting to: ${redirectUrl}`);
      res.redirect(redirectUrl);
    });

    this.app.post('/oauth2/token', (req: Request, res: Response) => {
      const { grant_type, client_id, client_secret } = req.body;
      
      console.log(`[OAUTH] Token request:`, { grant_type, client_id });
      
      const mockToken = `mock_token_${Math.random().toString(36).substr(2, 12)}`;
      res.json({
        access_token: mockToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'admin'
      });
    });

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Mock server status and control frontend
    this.app.get('/', (req: Request, res: Response) => {
      const availableScenarios = scenarioLoader.listScenarios();
      const currentScenario = this.getCurrentScenarioName();
      
      const html = `<!DOCTYPE html>
<html>
<head>
    <title>Contao Manager Mock Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        .current-status { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .scenario-list { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .scenario-item { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
        .scenario-active { background: #d4edda; border: 2px solid #28a745; }
        button { padding: 8px 15px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .reset-btn { background: #dc3545; }
        .reset-btn:hover { background: #c82333; }
        .info { color: #666; font-size: 14px; }
        .error { color: #dc3545; background: #f8d7da; padding: 10px; border-radius: 3px; margin: 10px 0; }
        .success { color: #155724; background: #d4edda; padding: 10px; border-radius: 3px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎭 Contao Manager Mock Server</h1>
        <p class="info">Control and monitor mock server scenarios for testing</p>
        
        <div class="current-status">
            <h3>Current Status</h3>
            <p><strong>Active Scenario:</strong> ${currentScenario || 'Default (no scenario loaded)'}</p>
            <p><strong>Server URL:</strong> http://localhost:${this.port}/contao-manager.phar.php</p>
            <p><strong>Health Check:</strong> <a href="/health">http://localhost:${this.port}/health</a></p>
        </div>

        <div class="scenario-list">
            <h3>Available Scenarios</h3>
            ${availableScenarios.map(scenario => {
              const scenarioData = scenarioLoader.getScenario(scenario);
              const isActive = currentScenario === scenario;
              return `
                <div class="scenario-item ${isActive ? 'scenario-active' : ''}">
                    <strong>${scenario}</strong>
                    ${isActive ? '<span style="color: #28a745; float: right;">✓ ACTIVE</span>' : ''}
                    <br>
                    <small class="info">${scenarioData?.description || 'No description'}</small>
                    <br>
                    <button onclick="loadScenario('${scenario}')">Load Scenario</button>
                </div>
              `;
            }).join('')}
        </div>

        <div style="margin-top: 30px;">
            <button class="reset-btn" onclick="resetToDefault()">Reset to Default</button>
            <button onclick="window.location.reload()">Refresh Status</button>
        </div>

        <div id="message"></div>

        <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
            <h4>Usage Instructions</h4>
            <ol>
                <li>Add <code>http://localhost:${this.port}/contao-manager.phar.php</code> as a site in your frontend</li>
                <li>Use scope "admin" for full access during OAuth flow</li>
                <li>Load different scenarios above to test various conditions</li>
                <li>The composer error scenario will now properly block update workflows</li>
            </ol>
        </div>
    </div>

    <script>
        function showMessage(text, type = 'info') {
            const messageDiv = document.getElementById('message');
            messageDiv.className = type;
            messageDiv.textContent = text;
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = '';
            }, 3000);
        }

        function loadScenario(scenario) {
            fetch('/mock/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(\`Loaded scenario: \${data.scenario}\`, 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showMessage(\`Error: \${data.error}\`, 'error');
                }
            })
            .catch(error => {
                showMessage(\`Network error: \${error.message}\`, 'error');
            });
        }

        function resetToDefault() {
            fetch('/mock/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then(data => {
                showMessage('Reset to default state', 'success');
                setTimeout(() => window.location.reload(), 1000);
            })
            .catch(error => {
                showMessage(\`Error resetting: \${error.message}\`, 'error');
            });
        }
    </script>
</body>
</html>`;
      
      res.send(html);
    });
  }

  async start(port: number = 3001): Promise<void> {
    this.port = port;
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`Mock server listening on port ${port}`);
          resolve();
        });
        
        // Track connections
        this.server.on('connection', (socket) => {
          this.connections.add(socket);
          socket.on('close', () => {
            this.connections.delete(socket);
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        // Force close all active connections immediately
        this.connections.forEach(socket => socket.destroy());
        this.connections.clear();
        
        // Close server
        this.server.close((err) => {
          if (err) {
            console.error('Error stopping mock server:', err);
          } else {
            console.log('Mock server stopped');
          }
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Methods for controlling mock server state during tests
  loadScenario(scenario: Scenario): void {
    this.state = {
      ...createDefaultState(),
      ...scenario.state
    };
    console.log(`[MOCK] Loaded scenario: ${scenario.name}`);
  }

  getState(): MockState {
    return { ...this.state };
  }

  setState(newState: Partial<MockState>): void {
    this.state = { ...this.state, ...newState };
  }

  getPort(): number {
    return this.port;
  }

  reset(): void {
    this.state = createDefaultState();
    this.currentScenarioName = null;
    console.log('[MOCK] State reset to default');
  }

  getCurrentScenarioName(): string | null {
    return this.currentScenarioName;
  }

  // Simulate task execution with realistic timing
  simulateTaskExecution(taskName: string, duration: number = 2000): void {
    if (!this.state.currentTask) return;

    const task = this.state.currentTask;
    task.status = 'active';
    
    setTimeout(() => {
      if (this.state.currentTask && this.state.currentTask.id === task.id) {
        // Check if task should fail based on scenario
        if (this.state.scenarios?.taskFailures?.[taskName]) {
          task.status = 'error';
          task.console = this.state.scenarios.taskFailures[taskName];
        } else {
          task.status = 'complete';
          task.console = `${taskName} completed successfully`;
        }
      }
    }, duration);
  }

  // Simulate migration execution
  simulateMigrationExecution(duration: number = 1500): void {
    if (!this.state.currentMigration) return;

    const migration = this.state.currentMigration;
    migration.status = 'active';

    setTimeout(() => {
      if (this.state.currentMigration && this.state.currentMigration.hash === migration.hash) {
        // Check if migration should fail
        if (this.state.scenarios?.migrationFailures) {
          migration.status = 'error';
          migration.operations = migration.operations?.map(op => ({
            ...op,
            status: 'error',
            message: 'Migration failed'
          }));
        } else {
          migration.status = 'complete';
          migration.operations = migration.operations?.map(op => ({
            ...op,
            status: 'complete',
            message: 'Migration completed'
          }));
        }
      }
    }, duration);
  }
}