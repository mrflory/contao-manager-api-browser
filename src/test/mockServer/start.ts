#!/usr/bin/env node

/**
 * TypeScript Mock Server Starter
 * Provides the full mock server experience with TypeScript type safety
 */

import { MockServer } from './MockServer';

class EnhancedMockServer extends MockServer {
  constructor() {
    super();
    this.setupEnhancedRoutes();
  }

  private setupEnhancedRoutes(): void {
    console.log('[EnhancedMockServer] Setting up enhanced routes...');
    
    // No need to redefine the route - we'll override the methods instead

    // Add OAuth authorize endpoint
    this.getApp().get('/contao-manager.phar.php/oauth2/authorize', (req: any, res: any) => {
      const { response_type, client_id, redirect_uri, scope, state } = req.query;
      console.log('[OAUTH] Authorization request:', { response_type, client_id, scope, state });
      
      const mockToken = 'mock_token_' + Math.random().toString(36).substring(2, 12);
      const redirectUrl = `${redirect_uri}#access_token=${mockToken}&token_type=Bearer&expires_in=3600${state ? `&state=${state}` : ''}`;
      
      console.log('[OAUTH] Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    });
    // Add scenario status endpoint
    this.getApp().get('/mock/status', (_req: any, res: any) => {
      res.json({ 
        currentScenario: this.getCurrentScenarioName(),
        status: 'running',
        scenarios: this.getState().scenarios 
      });
    });

    // Override the mock scenario endpoint to track current scenario
    this.getApp().post('/mock/scenario', async (req: any, res: any) => {
      const { scenario } = req.body;
      if (!scenario) {
        return res.status(400).json({ error: 'Scenario name required' });
      }

      try {
        // Use the parent class scenario loading
        const { scenarioLoader } = await import('./scenarioLoader');
        const scenarioData = scenarioLoader.getScenario(scenario);
        
        if (!scenarioData) {
          return res.status(404).json({ error: `Scenario '${scenario}' not found` });
        }

        this.loadScenario(scenarioData);
        (this as any).currentScenarioName = scenario;
        
        // Reset migration cycle counter for multiple migration cycles scenarios
        if (scenario.includes('multiple-migration-cycles')) {
          const { migrationHandlers } = await import('./handlers/migrationHandlers');
          migrationHandlers.resetMigrationCycles();
        }
        console.log(`\n🎭 Scenario changed to: ${scenario}`);
        
        res.json({ success: true, scenario: scenario, description: scenarioData.description });
      } catch (error) {
        console.error('Error loading scenario:', error);
        res.status(500).json({ error: 'Failed to load scenario' });
      }
    });

    // Override reset to clear current scenario
    this.getApp().post('/mock/reset', async (_req: any, res: any) => {
      this.reset();
      (this as any).currentScenarioName = null;
      
      // Reset migration cycle counter
      const { migrationHandlers } = await import('./handlers/migrationHandlers');
      migrationHandlers.resetMigrationCycles();
      
      console.log('\n🔄 State reset to default');
      res.json({ success: true, message: 'State reset to default' });
    });

    // Add enhanced frontend with scenario display
    this.getApp().get('/', (_req: any, res: any) => {
      const html = this.getEnhancedFrontendHTML();
      res.send(html);
    });


  }

  // Add method to expose app for route additions
  public getApp() {
    return (this as any).app;
  }

  // Override OAuth handling to implement proper authorization dialog
  protected override handleOAuthRequest(req: any, res: any): void {
    console.log(`[ENHANCED] Handling OAuth request with query:`, req.query);
    
    const { response_type, client_id, redirect_uri, scope, state } = req.query;
    console.log(`[OAUTH] Enhanced OAuth request:`, { response_type, client_id, scope, state });
    
    // Generate mock token (we'll use this when user clicks "Allow Access")
    const mockToken = `enhanced_token_${Math.random().toString(36).substring(2, 14)}`;
    
    // Return HTML that shows the OAuth authorization dialog (like real Contao Manager)
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Contao Manager - OAuth Authorization</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0; 
            padding: 0; 
            background: #f8f9fa;
            color: #212529;
        }
        .container { 
            max-width: 500px; 
            margin: 50px auto; 
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: #007bff;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 500;
        }
        .content {
            padding: 30px;
        }
        .oauth-info {
            background: #e9ecef;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .oauth-info h3 {
            margin: 0 0 10px 0;
            color: #495057;
        }
        .oauth-info p {
            margin: 5px 0;
            font-size: 14px;
            color: #6c757d;
        }
        .scope-info {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 30px;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.2s;
        }
        .btn-success {
            background: #28a745;
            color: white;
        }
        .btn-success:hover {
            background: #218838;
        }
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        .btn-danger:hover {
            background: #c82333;
        }
        .mock-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ffc107;
            color: #212529;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="mock-badge">🎭 MOCK SERVER</div>
    <div class="container">
        <div class="header">
            <h1>🏗️ Contao Manager</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">OAuth Authorization Request</p>
        </div>
        
        <div class="content">
            <p><strong>"${client_id || 'Unknown Application'}"</strong> is requesting access to your Contao Manager.</p>
            
            <div class="oauth-info">
                <h3>Application Details</h3>
                <p><strong>Client ID:</strong> ${client_id || 'Not specified'}</p>
                <p><strong>Requested Scope:</strong> ${scope || 'read'}</p>
                <p><strong>Redirect URI:</strong> ${redirect_uri || 'Not specified'}</p>
                ${state ? `<p><strong>State:</strong> ${state}</p>` : ''}
            </div>

            <div class="scope-info">
                <h4>📋 Permissions Requested: "${scope || 'read'}"</h4>
                ${scope === 'admin' ? 
                    '<p>✅ <strong>Full Admin Access</strong> - Can use all functions of the Contao Manager</p>' :
                scope === 'install' ?
                    '<p>⚙️ <strong>Install Access</strong> - May update and install packages and change system settings</p>' :
                scope === 'update' ?
                    '<p>🔄 <strong>Update Access</strong> - May update existing packages and perform maintenance tasks</p>' :
                    '<p>👁️ <strong>Read Access</strong> - Can see installed packages and read log files</p>'
                }
            </div>

            <div class="buttons">
                <button class="btn btn-success" onclick="allowAccess()">
                    ✅ Allow Access
                </button>
                <button class="btn btn-danger" onclick="denyAccess()">
                    ❌ Deny Access
                </button>
            </div>
        </div>
    </div>

    <script>
        function allowAccess() {
            console.log('[OAUTH] User clicked Allow Access');
            
            // Handle redirect URI that may already contain a fragment
            let baseUrl = '${redirect_uri}';
            let tokenParams = 'access_token=${mockToken}&token_type=Bearer&expires_in=3600${state ? `&state=${state}` : ''}';
            
            // If redirect_uri already contains a fragment (like #token), replace it
            if (baseUrl.includes('#')) {
                // Replace everything after # with our token parameters
                baseUrl = baseUrl.split('#')[0];
            }
            
            const redirectUrl = baseUrl + '#' + tokenParams;
            console.log('[OAUTH] Redirecting to:', redirectUrl);
            window.location.href = redirectUrl;
        }

        function denyAccess() {
            console.log('[OAUTH] User clicked Deny Access');
            
            // Handle redirect URI that may already contain a fragment
            let baseUrl = '${redirect_uri}';
            let errorParams = 'error=access_denied${state ? `&state=${state}` : ''}';
            
            // If redirect_uri already contains a fragment, replace it
            if (baseUrl.includes('#')) {
                baseUrl = baseUrl.split('#')[0];
            }
            
            const redirectUrl = baseUrl + '#' + errorParams;
            console.log('[OAUTH] Redirecting with access denied:', redirectUrl);
            window.location.href = redirectUrl;
        }

        // Auto-allow after 10 seconds for automated testing (optional)
        setTimeout(function() {
            console.log('[OAUTH] Auto-allowing access for mock server testing');
            allowAccess();
        }, 10000);
    </script>
</body>
</html>`;
    res.send(html);
  }

  // Override the regular interface to show enhanced version
  protected override serveContaoManagerInterface(res: any): void {
    const html = `<!DOCTYPE html>
<html>
<head><title>Enhanced Contao Manager Mock</title></head>
<body style="font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0;">
<div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
<h1>🏗️ Enhanced Contao Manager (TypeScript Mock)</h1>
<div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
<strong>Enhanced Features:</strong>
<ul>
<li>✅ Advanced OAuth handling with enhanced logging</li>
<li>✅ TypeScript-based scenario management</li>
<li>✅ Real-time scenario switching</li>
<li>✅ Enhanced debugging and monitoring</li>
</ul>
</div>
<p><a href="/contao-manager.phar.php/oauth2/authorize?response_type=token&scope=admin&client_id=test&redirect_uri=http://localhost:5173/callback" 
   style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Test Enhanced OAuth</a></p>
<p><a href="/" style="color: #007bff;">← Back to Control Panel</a></p>
</div>
</body>
</html>`;
    res.send(html);
  }

  private getEnhancedFrontendHTML(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Contao Manager Mock Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        .current-status { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .scenario-list { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .scenario-item { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
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
        <h1>🎭 Contao Manager Mock Server (TypeScript)</h1>
        <p class="info">Full-featured TypeScript mock server for testing</p>
        
        <div class="current-status">
            <h3>Current Status</h3>
            <p><strong>Server:</strong> Running on TypeScript</p>
            <p><strong>Active Scenario:</strong> <span id="currentScenario">Loading...</span></p>
            <p><strong>Server URL:</strong> http://localhost:${this.getPort()}/contao-manager.phar.php</p>
            <p><strong>Health Check:</strong> <a href="/health">http://localhost:${this.getPort()}/health</a></p>
        </div>

        <div class="scenario-list">
            <h3>Test Scenarios</h3>
            <div class="scenario-item">
                <strong>✅ Default (Happy Path)</strong><br>
                <small class="info">All operations succeed, no errors</small><br>
                <button onclick="resetScenario()">Load Default</button>
            </div>
            <div class="scenario-item">
                <strong>❌ Composer Update Failure</strong><br>
                <small class="info">Composer update fails with dependency conflicts</small><br>
                <button onclick="loadScenario('error-scenarios.composer-update-failure')">Load Scenario</button>
            </div>
            <div class="scenario-item">
                <strong>🔒 Authentication Error</strong><br>
                <small class="info">All API calls return 401 Unauthorized</small><br>
                <button onclick="loadScenario('error-scenarios.authentication-error')">Load Scenario</button>
            </div>
        </div>

        <div style="margin-top: 30px;">
            <button class="reset-btn" onclick="resetScenario()">Reset to Default</button>
            <button onclick="window.location.reload()">Refresh Status</button>
        </div>

        <div id="message"></div>

        <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
            <h4>Usage Instructions</h4>
            <ol>
                <li>Add <code>http://localhost:${this.getPort()}/contao-manager.phar.php</code> as a site in your frontend</li>
                <li>Use scope "admin" for full access during OAuth flow</li>
                <li>Load different scenarios above to test various conditions</li>
                <li>The composer error scenario will properly block update workflows</li>
            </ol>
            
            <h4>TypeScript Features</h4>
            <ul>
                <li>✅ <strong>Type Safety:</strong> Full TypeScript implementation</li>
                <li>✅ <strong>Modular Architecture:</strong> Handlers, scenarios, state management</li>
                <li>✅ <strong>Advanced Scenarios:</strong> JSON-based scenario system</li>
                <li>✅ <strong>Test Integration:</strong> Same codebase used by npm test</li>
            </ul>
        </div>
    </div>

    <script>
        async function loadCurrentScenario() {
            try {
                const response = await fetch('/mock/status');
                const result = await response.json();
                const scenarioSpan = document.getElementById('currentScenario');
                if (scenarioSpan) {
                    scenarioSpan.textContent = result.currentScenario || 'Default (no scenario active)';
                    scenarioSpan.style.color = result.currentScenario ? '#28a745' : '#6c757d';
                }
            } catch (error) {
                console.error('Error loading current scenario:', error);
                const scenarioSpan = document.getElementById('currentScenario');
                if (scenarioSpan) {
                    scenarioSpan.textContent = 'Error loading scenario';
                    scenarioSpan.style.color = '#dc3545';
                }
            }
        }

        function showMessage(text, type = 'info') {
            const messageDiv = document.getElementById('message');
            messageDiv.className = type;
            messageDiv.textContent = text;
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = '';
            }, 3000);
        }

        async function loadScenario(scenario) {
            try {
                const response = await fetch('/mock/scenario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenario })
                });
                const result = await response.json();
                if (result.success) {
                    showMessage(\`Loaded scenario: \${result.scenario}\`, 'success');
                    setTimeout(loadCurrentScenario, 100);
                } else {
                    showMessage(\`Error: \${result.error}\`, 'error');
                }
            } catch (error) {
                showMessage(\`Network error: \${error.message}\`, 'error');
            }
        }

        async function resetScenario() {
            try {
                const response = await fetch('/mock/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                showMessage('Reset to default state', 'success');
                setTimeout(loadCurrentScenario, 100);
            } catch (error) {
                showMessage(\`Error resetting: \${error.message}\`, 'error');
            }
        }

        // Load current scenario when page loads
        document.addEventListener('DOMContentLoaded', loadCurrentScenario);
    </script>
</body>
</html>`;
  }
}

async function startServerWithLogs() {
  const server = new EnhancedMockServer();
  const port = parseInt(process.argv[2]) || 3001;

  try {
    // Scenarios are automatically loaded by MockServer constructor
    const { scenarioLoader } = await import('./scenarioLoader');
    
    console.log('\n🚀 Starting Contao Manager Mock Server for UI Testing');
    console.log('================================================');
    
    await server.start(port);
    
    console.log(`\n✅ Mock server running on http://localhost:${port}`);
    console.log(`\n📋 Available scenarios:`);
    
    const scenarios = scenarioLoader.getAllScenarios();
    scenarios.forEach(scenario => {
      console.log(`   • ${scenario.name} - ${scenario.description || 'No description'}`);
    });
    
    console.log(`\n🔧 Usage Instructions:`);
    console.log(`   1. Add http://localhost:${port}/contao-manager.phar.php as a site in your frontend`);
    console.log(`   2. Use scope "admin" for full access during OAuth`);
    console.log(`   3. Change scenarios using the web interface or API endpoints below`);
    
    console.log(`\n🎭 Scenario Control:`);
    console.log(`   • Web Interface: http://localhost:${port}/`);
    console.log(`   • Load scenario: POST http://localhost:${port}/mock/scenario`);
    console.log(`     Body: { "scenario": "error-scenarios.composer-update-failure" }`);
    console.log(`   • List scenarios: GET http://localhost:${port}/mock/scenarios`);
    console.log(`   • Reset to default: POST http://localhost:${port}/mock/reset`);
    console.log(`   • Current status: GET http://localhost:${port}/mock/status`);
    
    console.log(`\n🌐 Frontend Setup:`);
    console.log(`   • Site URL: http://localhost:${port}/contao-manager.phar.php`);
    console.log(`   • OAuth will work automatically (mock implementation)`);
    console.log(`   • All Contao Manager API endpoints available under /api`);
    
    console.log(`\n📊 Health Check: http://localhost:${port}/health`);
    console.log(`\n🎯 TypeScript Features:`);
    console.log(`   • Full type safety and modular architecture`);
    console.log(`   • Same implementation used by npm test`);
    console.log(`   • Advanced JSON-based scenarios`);
    console.log(`\nPress Ctrl+C to stop the server\n`);

    return server;
  } catch (error) {
    console.error('Failed to start TypeScript mock server:', error);
    process.exit(1);
  }
}

startServerWithLogs().then(server => {
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down TypeScript mock server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Shutting down TypeScript mock server...');
    await server.stop();
    process.exit(0);
  });

  // Keep the process alive
  process.stdin.resume();
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});