import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { MockState, Scenario, TaskData, MigrationData } from './types';
import { createDefaultState } from './state';
import { taskHandlers } from './handlers/taskHandlers';
import { migrationHandlers } from './handlers/migrationHandlers';
import { serverHandlers } from './handlers/serverHandlers';
import { packageHandlers } from './handlers/packageHandlers';
import { logsHandlers } from './handlers/logsHandlers';
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
      const queryString = Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query as any).toString() : '';
      console.log(`[MOCK] ${req.method} ${req.path}${queryString}`, 
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
    router.get('/server/database', serverHandlers.getDatabase(() => this.state));

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

    // Logs endpoints
    router.get('/logs', logsHandlers.getLogs(() => this.state));
    router.get('/logs/:file', logsHandlers.getLogContent(() => this.state));

    // User management endpoints
    router.get('/users', serverHandlers.getUsers(() => this.state));
    router.get('/users/:username', serverHandlers.getUser(() => this.state));
    
    // Token management endpoints
    router.get('/users/:username/tokens', (req: Request, res: Response) => {
      const { username } = req.params;
      console.log(`[MOCK] GET tokens for user: ${username}`);
      
      // Mock tokens list
      const mockTokens = [
        {
          id: 'current',
          name: 'Mock API Token',
          scope: 'admin',
          created_at: '2023-01-01T00:00:00Z',
          last_used: '2024-01-01T00:00:00Z'
        }
      ];
      
      res.json(mockTokens);
    });
    
    router.get('/users/:username/tokens/:id', (req: Request, res: Response) => {
      const { username, id } = req.params;
      console.log(`[MOCK] GET token ${id} for user: ${username}`);
      
      // Mock token details
      const mockToken = {
        id: id,
        name: 'Mock API Token',
        scope: 'admin',
        created_at: '2023-01-01T00:00:00Z',
        last_used: '2024-01-01T00:00:00Z'
      };
      
      res.json(mockToken);
    });
    
    router.delete('/users/:username/tokens/:id', (req: Request, res: Response) => {
      const { username, id } = req.params;
      console.log(`[MOCK] DELETE token ${id} for user: ${username}`);
      
      // Mock successful token deletion
      const deletedToken = {
        id: id,
        name: 'Mock API Token',
        scope: 'admin',
        created_at: '2023-01-01T00:00:00Z',
        last_used: '2024-01-01T00:00:00Z',
        deleted_at: new Date().toISOString()
      };
      
      res.json(deletedToken);
    });

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

    // Handle OAuth client-side flow (when URL has #oauth fragment)
    // This needs to serve HTML that will parse the OAuth parameters and redirect
    this.setupContaoManagerRoute();

    // Handle the trailing slash variant as well - preserve query parameters
    // IMPORTANT: This must come AFTER the main route to avoid conflicts
    this.app.get('/contao-manager.phar.php/', (req: Request, res: Response) => {
      const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
      const redirectUrl = `/contao-manager.phar.php${queryString ? '?' + queryString : ''}`;
      res.redirect(redirectUrl);
    });

    // OAuth endpoints (for frontend integration) - both standalone and under Contao Manager path
    const oauthAuthorizeHandler = (req: Request, res: Response) => {
      const { response_type, client_id, redirect_uri, scope, state } = req.query;
      
      console.log(`[OAUTH] Authorization request:`, { response_type, client_id, scope, state });
      
      // Simulate OAuth flow - in real UI testing, this would redirect back with a token
      const mockToken = `mock_token_${Math.random().toString(36).substring(2, 14)}`;
      const redirectUrl = `${redirect_uri}#access_token=${mockToken}&token_type=Bearer&expires_in=3600${state ? `&state=${state}` : ''}`;
      
      console.log(`[OAUTH] Redirecting to: ${redirectUrl}`);
      res.redirect(redirectUrl);
    };

    const oauthTokenHandler = (req: Request, res: Response) => {
      const { grant_type, client_id } = req.body;
      
      console.log(`[OAUTH] Token request:`, { grant_type, client_id });
      
      const mockToken = `mock_token_${Math.random().toString(36).substring(2, 14)}`;
      res.json({
        access_token: mockToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'admin'
      });
    };

    // Mount OAuth endpoints both standalone and under Contao Manager path
    this.app.get('/oauth2/authorize', oauthAuthorizeHandler);
    this.app.post('/oauth2/token', oauthTokenHandler);
    this.app.get('/contao-manager.phar.php/oauth2/authorize', oauthAuthorizeHandler);
    this.app.post('/contao-manager.phar.php/oauth2/token', oauthTokenHandler);

    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Mock server status and control frontend
    this.app.get('/', (_req: Request, res: Response) => {
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

  /**
   * Set up the main Contao Manager route - can be overridden by subclasses
   */
  protected setupContaoManagerRoute(): void {
    this.app.get('/contao-manager.phar.php', (req: Request, res: Response) => {
      // For real Contao Manager, OAuth params come as URL fragment (#oauth?...)
      // Since fragments aren't sent to server, we serve a page that handles both cases:
      // 1. If query params exist (direct call), handle as OAuth
      // 2. If no query params, serve page that checks for #oauth fragment
      
      const isOAuthRequest = req.query.response_type || req.query.scope || req.query.client_id;
      
      if (isOAuthRequest) {
        this.handleOAuthRequest(req, res);
        return;
      }

      // Serve a page that can handle both regular interface AND fragment-based OAuth
      this.serveContaoManagerInterfaceWithFragmentSupport(res);
    });
  }

  /**
   * Serve interface that can handle #oauth fragments (like real Contao Manager)
   */
  protected serveContaoManagerInterfaceWithFragmentSupport(res: Response): void {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Contao Manager</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <script>
        function handleOAuthFragment() {
            // Check if URL contains #oauth fragment (like real Contao Manager)
            if (window.location.hash.includes('#oauth')) {
                console.log('[OAUTH] Detected #oauth fragment in URL');
                
                // Parse the fragment parameters
                const fragment = window.location.hash.substring(1); // Remove #
                const params = new URLSearchParams(fragment.replace('oauth?', ''));
                
                const response_type = params.get('response_type');
                const scope = params.get('scope');
                const client_id = params.get('client_id');
                const redirect_uri = params.get('redirect_uri');
                const state = params.get('state');
                
                if (response_type && scope && client_id && redirect_uri) {
                    console.log('[OAUTH] Valid OAuth parameters found in fragment');
                    
                    // Redirect to our OAuth handler with query parameters
                    const oauthUrl = window.location.pathname + 
                      '?response_type=' + encodeURIComponent(response_type) +
                      '&scope=' + encodeURIComponent(scope) +
                      '&client_id=' + encodeURIComponent(client_id) +
                      '&redirect_uri=' + encodeURIComponent(redirect_uri) +
                      (state ? '&state=' + encodeURIComponent(state) : '');
                    
                    console.log('[OAUTH] Redirecting to OAuth handler:', oauthUrl);
                    window.location.href = oauthUrl;
                    return;
                }
            }
            
            // No OAuth detected, show regular interface
            showRegularInterface();
        }
        
        function showRegularInterface() {
            document.body.innerHTML = \`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h1>🏗️ Contao Manager (Mock Server)</h1>
                <div style="background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>✅ Mock Server Active</h3>
                    <p>This is a mock Contao Manager instance running on <code>localhost:${this.port}</code></p>
                </div>
                <div style="background: #e7f3ff; border: 1px solid #b3d7ff; color: #004085; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h4>🔧 OAuth Testing</h4>
                    <p>To test the OAuth flow, use a URL like:</p>
                    <code style="display: block; background: #f8f9fa; padding: 10px; border-radius: 3px; margin: 10px 0; word-break: break-all;">
                    http://localhost:${this.port}/contao-manager.phar.php/#oauth?response_type=token&scope=admin&client_id=TestApp&redirect_uri=http://localhost:5173/callback
                    </code>
                    <p><small>Note the <strong>#oauth?</strong> fragment - this mimics the real Contao Manager URL format</small></p>
                </div>
                <p><a href="/" style="color: #007bff;">← Back to Mock Server Control Panel</a></p>
            </div>
            \`;
        }
        
        // Run when page loads
        handleOAuthFragment();
    </script>
</body>
</html>`;
    res.send(html);
  }

  /**
   * Handle OAuth request - can be overridden by subclasses
   */
  protected handleOAuthRequest(req: Request, res: Response): void {
    const { response_type, client_id, redirect_uri, scope, state } = req.query;
    console.log(`[OAUTH] Client-side OAuth request:`, { response_type, client_id, scope, state });
    
    // Generate mock token
    const mockToken = `mock_token_${Math.random().toString(36).substring(2, 14)}`;
    
    // Return HTML that will redirect with the token
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Contao Manager - OAuth</title>
    <script>
        // Simulate OAuth authentication and redirect with token
        setTimeout(function() {
            var redirectUrl = '${redirect_uri}#access_token=${mockToken}&token_type=Bearer&expires_in=3600${state ? `&state=${state}` : ''}';
            console.log('[OAUTH] Redirecting to:', redirectUrl);
            window.location.href = redirectUrl;
        }, 1000);
    </script>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5;
        }
        .container { 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #007bff;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>🔐 Contao Manager OAuth</h2>
        <div class="spinner"></div>
        <p>Authenticating...</p>
        <small>Mock server is generating an access token</small>
    </div>
</body>
</html>`;
    res.send(html);
  }

  /**
   * Serve the regular Contao Manager interface - can be overridden by subclasses
   */
  protected serveContaoManagerInterface(res: Response): void {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Contao Manager</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #007bff;
        }
        .logo {
            color: #007bff;
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .status {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .info {
            background: #e7f3ff;
            border: 1px solid #b3d7ff;
            color: #004085;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏗️ Contao Manager</div>
            <p>Mock Server Implementation</p>
        </div>
        
        <div class="status">
            <h3>✅ Mock Server Active</h3>
            <p>This is a mock Contao Manager instance running on <code>localhost:${this.port}</code></p>
        </div>

        <div class="info">
            <h4>📋 Available Features</h4>
            <ul>
                <li>✅ OAuth Authentication Flow</li>
                <li>✅ Self-Update Management</li>
                <li>✅ Composer Package Management</li>
                <li>✅ Database Migration Handling</li>
                <li>✅ Task Execution Simulation</li>
                <li>✅ Multi-Scenario Testing</li>
            </ul>
        </div>

        <div class="info">
            <h4>🔧 Integration Instructions</h4>
            <ol>
                <li>Use URL: <code>http://localhost:${this.port}/contao-manager.phar.php</code></li>
                <li>Select scope "admin" during OAuth flow</li>
                <li>Mock server will handle authentication automatically</li>
                <li>Access <a href="/">control panel</a> to switch test scenarios</li>
            </ol>
        </div>

        <div class="info">
            <h4>🎯 API Endpoints</h4>
            <p>All standard Contao Manager API endpoints are available under:</p>
            <p><code>/contao-manager.phar.php/api/*</code></p>
        </div>
    </div>
</body>
</html>`;
    res.send(html);
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