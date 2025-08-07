#!/usr/bin/env node

// Simple JavaScript version of mock server starter that avoids TypeScript compilation issues

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

class SimpleMockServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.state = this.createDefaultState();
    this.connections = new Set();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  createDefaultState() {
    return {
      selfUpdate: {
        current_version: '1.9.4',
        latest_version: '1.9.5',
        update_available: true
      },
      currentTask: null,
      currentMigration: null,
      pendingMigrations: [],
      serverConfig: {
        php_cli: '/usr/bin/php8.2',
        php_web: '8.2.15'
      },
      phpWeb: {
        version: '8.2.15',
        version_id: 80215,
        problem: null
      },
      contaoInfo: {
        version: '5.4.12',
        api: 2,
        supported_api: [1, 2]
      },
      rootPackage: {
        name: 'contao/managed-edition',
        version: '5.4.12',
        type: 'project'
      },
      localPackages: {},
      maintenanceMode: { enabled: false },
      scenarios: null,
      taskHistory: [],
      migrationHistory: [],
      backups: []
    };
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    this.app.use((req, res, next) => {
      console.log(`[MOCK] ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body) : '');
      next();
    });
  }

  setupRoutes() {
    const router = express.Router();

    // Basic server endpoints
    router.get('/server/self-update', (req, res) => {
      // Check for authentication error scenario
      if (this.state.scenarios?.authErrors) {
        return res.status(401).json({
          title: 'Unauthorized',
          detail: 'Authentication failed due to invalid credentials'
        });
      }
      res.json(this.state.selfUpdate);
    });

    router.get('/server/config', (req, res) => {
      res.json(this.state.serverConfig);
    });

    router.get('/server/php-web', (req, res) => {
      res.json(this.state.phpWeb);
    });

    router.get('/server/contao', (req, res) => {
      res.json(this.state.contaoInfo);
    });

    router.get('/server/composer', (req, res) => {
      res.json({
        json: {
          found: true,
          valid: true
        },
        lock: {
          found: true,
          fresh: true
        },
        vendor: {
          found: true
        }
      });
    });

    router.get('/server/phpinfo', (req, res) => {
      res.json({
        version: this.state.phpWeb.version,
        version_id: this.state.phpWeb.version_id,
        platform: this.state.phpWeb.platform || 'Linux',
        extensions: {
          core: true,
          date: true,
          libxml: true,
          openssl: true,
          pcre: true,
          sqlite3: true,
          zlib: true,
          ctype: true,
          curl: true,
          dom: true,
          fileinfo: true,
          filter: true,
          ftp: true,
          hash: true,
          iconv: true,
          json: true,
          mbstring: true,
          mysqlnd: true,
          mysqli: true,
          pdo: true,
          pdo_mysql: true,
          pdo_sqlite: true,
          phar: true,
          posix: true,
          readline: true,
          reflection: true,
          session: true,
          simplexml: true,
          spl: true,
          standard: true,
          tokenizer: true,
          xml: true,
          xmlreader: true,
          xmlwriter: true,
          zip: true,
          // Contao-specific extensions
          gd: true,
          imagick: true,
          intl: true,
          tidy: true,
          xsl: true
        },
        settings: {
          memory_limit: '512M',
          max_execution_time: '30',
          upload_max_filesize: '64M',
          post_max_size: '64M',
          opcache_enabled: true,
          opcache_memory_consumption: '128',
          date_default_timezone: 'UTC'
        },
        sapi_name: 'fpm-fcgi',
        system: 'Linux localhost 5.15.0-88-generic #98-Ubuntu SMP Mon Oct 2 15:18:56 UTC 2023 x86_64',
        build_date: 'Dec 21 2023 15:37:27'
      });
    });

    // Task endpoints
    router.get('/task', (req, res) => {
      if (!this.state.currentTask) {
        return res.status(204).send();
      }
      res.json(this.state.currentTask);
    });

    router.put('/task', (req, res) => {
      const { name, config } = req.body;
      
      if (this.state.currentTask && this.state.currentTask.status === 'active') {
        return res.status(400).json({
          title: 'Task already running',
          detail: 'Another task is already in progress'
        });
      }

      const taskId = Math.random().toString(36).substr(2, 9);
      const task = {
        id: taskId,
        title: this.getTaskTitle(name),
        status: 'active',
        console: `Starting ${name}...`,
        cancellable: true,
        autoclose: false,
        audit: false,
        operations: []
      };

      this.state.currentTask = task;

      // Simulate task completion
      const duration = config?.dry_run ? 1000 : 3000;
      setTimeout(() => {
        if (this.state.currentTask && this.state.currentTask.id === taskId) {
          this.state.currentTask.status = 'complete';
          this.state.currentTask.console += `\n${name} completed successfully`;
        }
      }, duration);

      res.json(task);
    });

    router.delete('/task', (req, res) => {
      if (!this.state.currentTask) {
        return res.status(400).json({
          title: 'No task to delete',
          detail: 'No task data exists'
        });
      }

      this.state.taskHistory.push({...this.state.currentTask});
      this.state.currentTask = null;
      res.json({ deleted: true });
    });

    // Migration endpoints
    router.get('/contao/database-migration', (req, res) => {
      if (!this.state.currentMigration) {
        return res.status(204).send();
      }
      res.json(this.state.currentMigration);
    });

    router.put('/contao/database-migration', (req, res) => {
      const { hash } = req.body;
      
      if (!hash) {
        // Dry run - check for migrations
        this.state.currentMigration = {
          type: 'schema',
          status: 'pending',
          operations: []
        };
      } else {
        // Execute migration
        this.state.currentMigration = {
          type: 'schema',
          status: 'active',
          hash,
          operations: []
        };
        
        setTimeout(() => {
          if (this.state.currentMigration && this.state.currentMigration.hash === hash) {
            this.state.currentMigration.status = 'complete';
          }
        }, 1500);
      }
      
      res.status(201).json(this.state.currentMigration);
    });

    // Package endpoints
    router.get('/packages/root', (req, res) => {
      res.json(this.state.rootPackage);
    });

    router.get('/packages/local', (req, res) => {
      res.json({
        root: this.state.rootPackage,
        ...this.state.localPackages
      });
    });

    // Root route - simulate a basic Contao Manager interface
    this.app.get('/', (req, res) => {
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Contao Manager</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .status { background: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .error { background: #f8d7da; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .endpoints { background: #e2e3e5; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .code { background: #f8f9fa; padding: 10px; border-radius: 3px; font-family: monospace; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Mock Contao Manager</h1>
        <p>This is a <strong>mock server</strong> for testing your Contao Manager Browser UI.</p>
    </div>
    
    <div class="status">
        <h2>✅ Server Status</h2>
        <p><strong>Status:</strong> Running</p>
        <p><strong>Version:</strong> Mock 1.9.4 (simulated)</p>
        <p><strong>Available Update:</strong> 1.9.5</p>
    </div>
    
    <div class="endpoints">
        <h2>🔗 API Endpoints</h2>
        <p>All Contao Manager API endpoints are available under <code>/api</code>:</p>
        <h3>Server Configuration</h3>
        <ul>
            <li><code>GET /api/server/self-update</code> - Self-update information</li>
            <li><code>GET /api/server/config</code> - Server configuration</li>
            <li><code>GET /api/server/php-web</code> - PHP web version info</li>
            <li><code>GET /api/server/contao</code> - Contao installation info</li>
            <li><code>GET /api/server/composer</code> - Composer configuration status</li>
            <li><code>GET /api/server/phpinfo</code> - Detailed PHP information</li>
        </ul>
        <h3>Tasks & Workflows</h3>
        <ul>
            <li><code>GET /api/task</code> - Current task status</li>
            <li><code>PUT /api/task</code> - Create new task</li>
            <li><code>GET /api/contao/database-migration</code> - Migration status</li>
        </ul>
        <h3>Packages</h3>
        <ul>
            <li><code>GET /api/packages/root</code> - Root package info</li>
            <li><code>GET /api/packages/local</code> - Local packages</li>
        </ul>
    </div>
    
    <div class="endpoints">
        <h2>🎭 Scenario Control</h2>
        <p>Change test scenarios using these buttons or API calls:</p>
        <button onclick="changeScenario('default')">✅ Default (Success)</button>
        <button onclick="changeScenario('error-scenarios.composer-update-failure')">❌ Composer Error</button>
        <button onclick="changeScenario('error-scenarios.authentication-error')">🔒 Auth Error</button>
        <button onclick="resetScenario()">🔄 Reset</button>
        
        <div class="code">
            <p><strong>API Usage:</strong></p>
            <p>POST /mock/scenario with {"scenario": "scenario-name"}</p>
            <p>POST /mock/reset to reset to default</p>
        </div>
    </div>
    
    <div class="status">
        <h2>🎯 How to Test Your UI</h2>
        <ol>
            <li>In your Contao Manager Browser UI, add this URL: <strong>http://localhost:3001/contao-manager.phar.php</strong></li>
            <li>Use OAuth scope <strong>"admin"</strong> for full testing capabilities</li>
            <li>Complete the OAuth flow (click "Allow Access" on the consent page)</li>
            <li>Navigate to the site details and perform update workflows</li>
            <li>Use the scenario buttons above to test different error conditions</li>
        </ol>
        <div class="code">
            <p><strong>✅ Expected OAuth Flow:</strong></p>
            <p>1. Add site → 2. OAuth consent page → 3. "Allow Access" → 4. Token saved successfully</p>
        </div>
    </div>
    
    <div class="endpoints">
        <h2>🛠️ Additional Testing Tools</h2>
        <p>For advanced OAuth testing, use the <a href="/oauth-test.html" target="_blank">OAuth Test Page</a></p>
        <p>Health check: <a href="/health" target="_blank">/health</a></p>
        <p>Current state: <a href="/mock/state" target="_blank">/mock/state</a></p>
        <p>Available scenarios: <a href="/mock/scenarios" target="_blank">/mock/scenarios</a></p>
    </div>

    <script>
        async function changeScenario(scenario) {
            try {
                const response = await fetch('/mock/scenario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenario })
                });
                const result = await response.json();
                alert('Scenario changed to: ' + scenario);
                console.log('Scenario change result:', result);
            } catch (error) {
                alert('Error changing scenario: ' + error.message);
            }
        }
        
        async function resetScenario() {
            try {
                const response = await fetch('/mock/reset', { method: 'POST' });
                const result = await response.json();
                alert('Scenario reset to default');
                console.log('Reset result:', result);
            } catch (error) {
                alert('Error resetting scenario: ' + error.message);
            }
        }
    </script>
</body>
</html>
      `);
    });

    // Session/Authentication endpoints (for token validation)
    router.get('/session', (req, res) => {
      console.log('[SESSION] ===========================================');
      console.log('[SESSION] Session validation request received');
      console.log('[SESSION] Request headers:', JSON.stringify({
        'authorization': req.headers.authorization,
        'contao-manager-auth': req.headers['contao-manager-auth'],
        'user-agent': req.headers['user-agent'],
        'host': req.headers.host
      }, null, 2));
      
      // Check for authentication error scenario
      if (this.state.scenarios?.authErrors) {
        console.log('[SESSION] Rejecting due to auth error scenario');
        return res.status(401).json({
          title: 'Unauthorized',
          detail: 'Authentication failed due to invalid credentials'
        });
      }
      
      // Handle both Authorization header formats
      const authHeader = req.headers.authorization;
      const contaoAuth = req.headers['contao-manager-auth']; // Express lowercases header names
      
      let token = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('[SESSION] Using Authorization Bearer header');
      } else if (contaoAuth) {
        token = contaoAuth;
        console.log('[SESSION] Using Contao-Manager-Auth header');
      } else {
        console.log('[SESSION] No valid auth header found');
        console.log('[SESSION] Available headers:', Object.keys(req.headers));
        return res.status(401).json({
          title: 'Unauthorized',
          detail: 'No valid authorization header provided'
        });
      }
      
      // Check for valid mock token format
      if (!token.startsWith('mock_')) {
        console.log('[SESSION] Invalid token format:', token.substring(0, 20) + '...');
        return res.status(401).json({
          title: 'Invalid token',
          detail: 'Token format is not valid'
        });
      }
      
      console.log(`[SESSION] ✅ Token validation SUCCESSFUL for: ${token.substring(0, 20)}...`);
      
      const sessionResponse = {
        username: 'mock-user',
        name: 'Mock Test User',
        session: token.substring(5, 15), // Use part of token as session ID
        iat: Math.floor(Date.now() / 1000) - 300, // Issued 5 minutes ago
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        scopes: ['admin']
      };
      
      console.log('[SESSION] Sending response:', JSON.stringify(sessionResponse, null, 2));
      console.log('[SESSION] ===========================================');
      
      // Return session information for valid token
      res.json(sessionResponse);
    });

    router.post('/session', (req, res) => {
      // Mock login endpoint - not typically used in OAuth flow but good to have
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          title: 'Missing credentials',
          detail: 'Username and password are required'
        });
      }
      
      // Mock successful login
      const mockToken = 'mock_' + Math.random().toString(36).substr(2, 32);
      res.json({
        username: username,
        name: 'Mock Test User',
        token: mockToken,
        session: mockToken.substring(5, 15),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        scopes: ['admin']
      });
    });

    router.delete('/session', (req, res) => {
      // Mock logout endpoint
      console.log('[SESSION] User logged out');
      res.status(204).send();
    });

    this.app.use('/api', router);
    
    // IMPORTANT: Also add session endpoint under /contao-manager.phar.php/api/session
    // This handles cases where the manager URL includes the .phar.php file
    this.app.get('/contao-manager.phar.php/api/session', (req, res) => {
      console.log('[SESSION] ===========================================');
      console.log('[SESSION] Session validation request received (via phar.php path)');
      console.log('[SESSION] Request headers:', JSON.stringify({
        'authorization': req.headers.authorization,
        'contao-manager-auth': req.headers['contao-manager-auth'],
        'user-agent': req.headers['user-agent'],
        'host': req.headers.host
      }, null, 2));
      
      // Check for authentication error scenario
      if (this.state.scenarios?.authErrors) {
        console.log('[SESSION] Rejecting due to auth error scenario');
        return res.status(401).json({
          title: 'Unauthorized',
          detail: 'Authentication failed due to invalid credentials'
        });
      }
      
      // Handle both Authorization header formats
      const authHeader = req.headers.authorization;
      const contaoAuth = req.headers['contao-manager-auth'];
      
      let token = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('[SESSION] Using Authorization Bearer header');
      } else if (contaoAuth) {
        token = contaoAuth;
        console.log('[SESSION] Using Contao-Manager-Auth header');
      } else {
        console.log('[SESSION] No valid auth header found');
        console.log('[SESSION] Available headers:', Object.keys(req.headers));
        return res.status(401).json({
          title: 'Unauthorized',
          detail: 'No valid authorization header provided'
        });
      }
      
      // Check for valid mock token format
      if (!token.startsWith('mock_')) {
        console.log('[SESSION] Invalid token format:', token.substring(0, 20) + '...');
        return res.status(401).json({
          title: 'Invalid token',
          detail: 'Token format is not valid'
        });
      }
      
      console.log(`[SESSION] ✅ Token validation SUCCESSFUL for: ${token.substring(0, 20)}...`);
      
      const sessionResponse = {
        username: 'mock-user',
        name: 'Mock Test User',
        session: token.substring(5, 15),
        iat: Math.floor(Date.now() / 1000) - 300,
        exp: Math.floor(Date.now() / 1000) + 3600,
        scopes: ['admin']
      };
      
      console.log('[SESSION] Sending response:', JSON.stringify(sessionResponse, null, 2));
      console.log('[SESSION] ===========================================');
      
      res.json(sessionResponse);
    });

    // Add the Contao Manager main file endpoint
    this.app.get('/contao-manager.phar.php', (req, res) => {
      // This mimics the real Contao Manager entry point
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Contao Manager</title>
</head>
<body>
    <script>
        // Handle OAuth hash fragments like the real Contao Manager
        if (window.location.hash && window.location.hash.includes('oauth')) {
            // Extract OAuth parameters from hash
            const hashContent = window.location.hash.substring(1); // Remove #
            if (hashContent.startsWith('oauth?')) {
                const oauthParams = hashContent.substring(6); // Remove 'oauth?'
                const urlParams = new URLSearchParams(oauthParams);
                
                const response_type = urlParams.get('response_type');
                const scope = urlParams.get('scope');
                const client_id = urlParams.get('client_id');
                const redirect_uri = urlParams.get('redirect_uri');
                const state = urlParams.get('state');
                
                console.log('[OAUTH] Processing OAuth request:', { response_type, scope, client_id, redirect_uri, state });
                
                // Show OAuth consent dialog
                document.body.innerHTML = \`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; background: #f8f9fa;">
                    <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #f47c00; margin: 0;">🧪 Mock Contao Manager</h1>
                            <p>OAuth Authorization Request</p>
                        </div>
                        
                        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                            <h3>Application Details</h3>
                            <p><strong>Application:</strong> \${client_id || 'Unknown Application'}</p>
                            <p><strong>Requested Access:</strong> \${scope || 'read'}</p>
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4>This application is requesting access to:</h4>
                            <ul>
                                <li>Full access to all Contao Manager functions (\${scope || 'admin'} scope)</li>
                            </ul>
                        </div>
                        
                        <p><strong>Do you want to allow "\${client_id || 'this application'}" to access your Contao Manager?</strong></p>
                        
                        <div style="display: flex; gap: 10px; margin-top: 30px;">
                            <button onclick="allowAccess()" style="background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                                ✅ Allow Access
                            </button>
                            <button onclick="denyAccess()" style="background: #dc3545; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                                ❌ Deny Access
                            </button>
                        </div>
                    </div>
                </div>
                \`;
                
                window.allowAccess = function() {
                    const mockToken = 'mock_' + Math.random().toString(36).substr(2, 32);
                    
                    // Format the token response according to OAuth2 Implicit Grant specification
                    const tokenParams = [];
                    tokenParams.push('access_token=' + encodeURIComponent(mockToken));
                    tokenParams.push('token_type=' + encodeURIComponent('Bearer'));
                    tokenParams.push('expires_in=' + encodeURIComponent('3600'));
                    tokenParams.push('scope=' + encodeURIComponent(scope || 'admin'));
                    if (state) {
                        tokenParams.push('state=' + encodeURIComponent(state));
                    }
                    
                    // Check if redirect_uri already has a hash fragment
                    const separator = redirect_uri.includes('#') ? '&' : '#';
                    const finalRedirect = redirect_uri + separator + tokenParams.join('&');
                    
                    console.log('[OAUTH] User allowed access, redirecting to:', finalRedirect);
                    console.log('[OAUTH] Token details:', { access_token: mockToken, token_type: 'Bearer', scope: scope || 'admin' });
                    window.location.href = finalRedirect;
                };
                
                window.denyAccess = function() {
                    const errorParams = [];
                    errorParams.push('error=' + encodeURIComponent('access_denied'));
                    errorParams.push('error_description=' + encodeURIComponent('User denied access'));
                    if (state) {
                        errorParams.push('state=' + encodeURIComponent(state));
                    }
                    
                    const separator = redirect_uri.includes('#') ? '&' : '#';
                    const finalRedirect = redirect_uri + separator + errorParams.join('&');
                    
                    console.log('[OAUTH] User denied access, redirecting to:', finalRedirect);
                    window.location.href = finalRedirect;
                };
                
                // Auto-allow for testing convenience (with 2 second delay)
                setTimeout(() => {
                    if (confirm('Auto-approve OAuth for testing? (Click Cancel to manually approve)')) {
                        allowAccess();
                    }
                }, 2000);
                
            }
        } else {
            // Regular Contao Manager interface (simplified)
            document.body.innerHTML = \`
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                    <h1>🧪 Mock Contao Manager</h1>
                    <p>Mock Contao Manager for UI Testing</p>
                    <p><strong>Version:</strong> 1.9.4 (Mock) | <strong>Available Update:</strong> 1.9.5</p>
                </div>
                <div style="background: #d4edda; padding: 15px; border-radius: 5px;">
                    <p><strong>OAuth Endpoint Ready:</strong> Use this URL in your UI for proper OAuth flow</p>
                    <code>http://localhost:3001/contao-manager.phar.php</code>
                    <br><br>
                    <p><strong>Example OAuth URL:</strong></p>
                    <code>http://localhost:3001/contao-manager.phar.php/#oauth?response_type=token&scope=admin&client_id=YOUR_APP&redirect_uri=YOUR_REDIRECT</code>
                </div>
            </div>
            \`;
        }
    </script>
</body>
</html>
      `);
    });

    // Contao Manager OAuth endpoints (matching real behavior)
    // The real Contao Manager uses /contao-manager.phar.php/#oauth but since we can't handle 
    // hash fragments on server side, we'll intercept with JavaScript and convert to query params
    this.app.get('/', (req, res) => {
      // Check if this is an OAuth request via query parameters
      if (req.query.response_type && req.query.client_id) {
        const { response_type, scope, client_id, redirect_uri, state } = req.query;
        
        console.log(`[OAUTH] OAuth request detected:`, { response_type, scope, client_id, redirect_uri, state });
        
        // Serve the OAuth consent dialog (like real Contao Manager)
        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contao Manager - OAuth Authorization</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; background: #f8f9fa; }
        .oauth-dialog { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { color: #f47c00; margin: 0; }
        .scope-info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .buttons { display: flex; gap: 10px; margin-top: 30px; }
        button { padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        .allow { background: #28a745; color: white; }
        .allow:hover { background: #218838; }
        .deny { background: #dc3545; color: white; }
        .deny:hover { background: #c82333; }
        .app-info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="oauth-dialog">
        <div class="logo">
            <h1>🧪 Mock Contao Manager</h1>
            <p>OAuth Authorization Request</p>
        </div>
        
        <div class="app-info">
            <h3>Application Details</h3>
            <p><strong>Application:</strong> ${client_id || 'Unknown Application'}</p>
            <p><strong>Requested Access:</strong> ${scope || 'read'}</p>
        </div>
        
        <div class="scope-info">
            <h4>This application is requesting access to:</h4>
            <ul>
                ${this.getScopeDescription(scope || 'read')}
            </ul>
        </div>
        
        <p><strong>Do you want to allow "${client_id || 'this application'}" to access your Contao Manager?</strong></p>
        
        <div class="buttons">
            <button class="allow" onclick="allowAccess()">✅ Allow Access</button>
            <button class="deny" onclick="denyAccess()">❌ Deny Access</button>
        </div>
    </div>

    <script>
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUri = urlParams.get('redirect_uri');
        const state = urlParams.get('state');
        
        function allowAccess() {
            const mockToken = 'mock_' + Math.random().toString(36).substr(2, 32);
            const tokenResponse = 'access_token=' + mockToken + '&token_type=Bearer&expires_in=3600&scope=${scope || 'admin'}';
            const stateParam = state ? '&state=' + encodeURIComponent(state) : '';
            const finalRedirect = redirectUri + '#' + tokenResponse + stateParam;
            
            console.log('[OAUTH] User allowed access, redirecting to:', finalRedirect);
            window.location.href = finalRedirect;
        }
        
        function denyAccess() {
            const errorResponse = 'error=access_denied&error_description=User denied access';
            const stateParam = state ? '&state=' + encodeURIComponent(state) : '';
            const finalRedirect = redirectUri + '#' + errorResponse + stateParam;
            
            console.log('[OAUTH] User denied access, redirecting to:', finalRedirect);
            window.location.href = finalRedirect;
        }
        
        // Auto-allow for testing (remove this for manual testing)
        setTimeout(() => {
            if (confirm('Auto-allow OAuth for testing? (Click Cancel to manually approve)')) {
                allowAccess();
            }
        }, 1000);
    </script>
</body>
</html>
        `);
        return;
      }
      
      // Regular root page if not OAuth request, but check for hash-based OAuth
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Contao Manager</title>
</head>
<body>
    <script>
        // Handle hash-based OAuth URLs like the real Contao Manager
        if (window.location.hash && window.location.hash.includes('oauth')) {
            // Extract hash fragment and convert to query parameters
            const hashContent = window.location.hash.substring(1); // Remove #
            if (hashContent.startsWith('oauth?')) {
                const oauthParams = hashContent.substring(6); // Remove 'oauth?'
                // Redirect to same URL but with query parameters instead
                window.location.href = window.location.origin + '/?' + oauthParams;
            }
        } else {
            // Not an OAuth request, show the regular page
            document.body.innerHTML = \`${this.getRootPageHtml().replace(/`/g, '\\`')}\`;
        }
    </script>
</body>
</html>
      `);
    });

    // Mock management endpoints
    this.app.get('/mock/scenarios', (req, res) => {
      const scenarios = [
        { name: 'happy-path.complete-update-success', description: 'Complete update with self-update and migrations', category: 'happy-path' },
        { name: 'error-scenarios.composer-update-failure', description: 'Composer update fails with dependency conflicts', category: 'error-scenarios' },
        { name: 'error-scenarios.authentication-error', description: 'All API calls return 401 Unauthorized', category: 'error-scenarios' }
      ];
      res.json({ scenarios });
    });

    this.app.post('/mock/scenario', (req, res) => {
      const { scenario } = req.body;
      console.log(`\n🎭 Scenario changed to: ${scenario}`);
      
      // Apply basic scenario changes
      if (scenario.includes('error') || scenario.includes('failure')) {
        this.state.scenarios = { taskFailures: { 'composer/update': 'Update failed with errors' } };
      } else {
        this.state.scenarios = null;
      }
      
      res.json({ success: true, scenario, description: `Applied ${scenario}` });
    });

    this.app.post('/mock/reset', (req, res) => {
      this.state = this.createDefaultState();
      console.log(`\n🔄 State reset to default`);
      res.json({ success: true, message: 'State reset to default' });
    });

    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  getTaskTitle(taskName) {
    const titles = {
      'composer/update': 'Composer Update',
      'composer/install': 'Composer Install',
      'manager/self-update': 'Manager Self Update'
    };
    return titles[taskName] || taskName;
  }

  getScopeDescription(scope) {
    const descriptions = {
      'read': '<li>View installed packages and read log files</li>',
      'update': '<li>View installed packages and read log files</li><li>Update existing packages and perform maintenance tasks</li>',
      'install': '<li>View installed packages and read log files</li><li>Update and install packages</li><li>Change system settings</li>',
      'admin': '<li>Full access to all Contao Manager functions</li>'
    };
    return descriptions[scope] || descriptions['read'];
  }

  getRootPageHtml() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock Contao Manager</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .status { background: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .endpoints { background: #e2e3e5; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .code { background: #f8f9fa; padding: 10px; border-radius: 3px; font-family: monospace; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Mock Contao Manager</h1>
        <p>This is a <strong>mock server</strong> for testing your Contao Manager Browser UI.</p>
    </div>
    
    <div class="status">
        <h2>✅ Server Status</h2>
        <p><strong>Status:</strong> Running</p>
        <p><strong>Version:</strong> Mock 1.9.4 (simulated)</p>
        <p><strong>Available Update:</strong> 1.9.5</p>
    </div>
    
    <div class="endpoints">
        <h2>🔗 API Endpoints</h2>
        <p>All Contao Manager API endpoints are available under <code>/api</code></p>
        <ul>
            <li><strong>Session validation:</strong> <code>GET /api/session</code></li>
            <li><strong>Server info:</strong> <code>GET /api/server/self-update</code></li>
            <li><strong>Task management:</strong> <code>GET|PUT|DELETE /api/task</code></li>
            <li><strong>Migrations:</strong> <code>GET|PUT|DELETE /api/contao/database-migration</code></li>
        </ul>
        <p><strong>OAuth Endpoint:</strong> <code>http://localhost:3001/contao-manager.phar.php</code></p>
        <p><strong>Mock Interface:</strong> <code>http://localhost:3001/</code> (this page)</p>
    </div>
    
    <div class="endpoints">
        <h2>🎭 Scenario Control</h2>
        <button onclick="changeScenario('default')">✅ Default (Success)</button>
        <button onclick="changeScenario('error-scenarios.composer-update-failure')">❌ Composer Error</button>
        <button onclick="changeScenario('error-scenarios.authentication-error')">🔒 Auth Error</button>
        <button onclick="resetScenario()">🔄 Reset</button>
    </div>
    
    <div class="status">
        <h2>🎯 How to Test</h2>
        <p>Add <strong>http://localhost:3001/contao-manager.phar.php</strong> as a site in your Contao Manager Browser UI with OAuth scope <strong>"admin"</strong></p>
        <p><em>Note: Use the full path above, not just the domain!</em></p>
    </div>

    <script>
        async function changeScenario(scenario) {
            const response = await fetch('/mock/scenario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario })
            });
            alert('Scenario changed to: ' + scenario);
        }
        
        async function resetScenario() {
            await fetch('/mock/reset', { method: 'POST' });
            alert('Scenario reset to default');
        }
    </script>
</body>
</html>
    `;
  }

  async start(port = 3001) {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log('\n🚀 Starting Contao Manager Mock Server for UI Testing');
          console.log('================================================');
          console.log(`\n✅ Mock server running on http://localhost:${port}`);
          console.log(`\n🔧 Usage Instructions:`);
          console.log(`   1. Add http://localhost:${port}/contao-manager.phar.php as a site in your frontend`);
          console.log(`   2. Use scope "admin" for full access during OAuth`);
          console.log(`   3. Change scenarios using POST http://localhost:${port}/mock/scenario`);
          console.log(`\n🌐 Frontend Setup:`);
          console.log(`   • Site URL: http://localhost:${port}/contao-manager.phar.php`);
          console.log(`   • OAuth will work automatically`);
          console.log(`   • All Contao Manager API endpoints available under /api`);
          console.log(`\n📊 Health Check: http://localhost:${port}/health`);
          console.log(`\nPress Ctrl+C to stop the server\n`);
          resolve();
        });

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

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.connections.forEach(socket => socket.destroy());
        this.connections.clear();
        
        this.server.close(() => {
          console.log('Mock server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// CLI execution
if (require.main === module) {
  const server = new SimpleMockServer();
  const port = parseInt(process.argv[2]) || 3001;
  
  server.start(port).catch(error => {
    console.error('Failed to start mock server:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down mock server...');
    await server.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Shutting down mock server...');
    await server.stop();
    process.exit(0);
  });
}

module.exports = { SimpleMockServer };