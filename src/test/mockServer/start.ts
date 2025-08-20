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
    // Add scenario status endpoint
    this.getApp().get('/mock/status', (req, res) => {
      res.json({ 
        currentScenario: this.getCurrentScenarioName(),
        status: 'running',
        scenarios: this.getState().scenarios 
      });
    });

    // Override the mock scenario endpoint to track current scenario
    this.getApp().post('/mock/scenario', async (req, res) => {
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
          const { migrationHandlers } = require('./handlers/migrationHandlers');
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
    this.getApp().post('/mock/reset', (req, res) => {
      this.reset();
      (this as any).currentScenarioName = null;
      
      // Reset migration cycle counter
      const { migrationHandlers } = require('./handlers/migrationHandlers');
      migrationHandlers.resetMigrationCycles();
      
      console.log('\n🔄 State reset to default');
      res.json({ success: true, message: 'State reset to default' });
    });

    // Add enhanced frontend with scenario display
    this.getApp().get('/', (req, res) => {
      const html = this.getEnhancedFrontendHTML();
      res.send(html);
    });
  }

  // Add method to expose app for route additions
  public getApp() {
    return (this as any).app;
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
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});