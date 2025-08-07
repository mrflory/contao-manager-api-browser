import * as express from 'express';
import { Express, Request, Response } from 'express';
import * as cors from 'cors';
import { Server } from 'http';
import { MockState, Scenario, TaskData, MigrationData } from './types';
import { createDefaultState } from './state';
import { taskHandlers } from './handlers/taskHandlers';
import { migrationHandlers } from './handlers/migrationHandlers';
import { serverHandlers } from './handlers/serverHandlers';
import { packageHandlers } from './handlers/packageHandlers';

export class MockServer {
  private app: Express;
  private server: Server | null = null;
  private state: MockState;
  private connections: Set<any> = new Set();
  private port: number = 3001;

  constructor() {
    this.app = express();
    this.state = createDefaultState();
    this.setupMiddleware();
    this.setupRoutes();
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
    router.get('/contao/backup', (req: Request, res: Response) => {
      res.json(this.state.backups || []);
    });

    this.app.use('/api', router);
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
    console.log('[MOCK] State reset to default');
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