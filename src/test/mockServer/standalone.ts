#!/usr/bin/env node

import { MockServer } from './AdvancedMockServer';
import { scenarioLoader } from './scenarioLoader';

class StandaloneMockServer {
  private mockServer: MockServer;
  private currentScenario: string | null = null;

  constructor() {
    this.mockServer = new MockServer();
  }

  async start(port: number = 3001): Promise<void> {
    // Load all available scenarios
    await scenarioLoader.loadAllScenarios();
    
    console.log('\n🚀 Starting Contao Manager Mock Server for UI Testing');
    console.log('================================================');
    
    await this.mockServer.start(port);
    
    console.log(`\n✅ Mock server running on http://localhost:${port}`);
    console.log(`\n📋 Available scenarios:`);
    
    const scenarios = scenarioLoader.getAllScenarios();
    scenarios.forEach(scenario => {
      console.log(`   • ${scenario.name} - ${scenario.description || 'No description'}`);
    });
    
    console.log(`\n🔧 Usage Instructions:`);
    console.log(`   1. Add http://localhost:${port} as a site in your frontend`);
    console.log(`   2. Use scope "admin" for full access during OAuth`);
    console.log(`   3. Change scenarios using the API endpoints below`);
    
    console.log(`\n🎭 Scenario Control:`);
    console.log(`   • Load scenario: POST http://localhost:${port}/mock/scenario`);
    console.log(`     Body: { "scenario": "happy-path.complete-update-success" }`);
    console.log(`   • List scenarios: GET http://localhost:${port}/mock/scenarios`);
    console.log(`   • Reset to default: POST http://localhost:${port}/mock/reset`);
    console.log(`   • Current state: GET http://localhost:${port}/mock/state`);
    
    console.log(`\n🌐 Frontend Setup:`);
    console.log(`   • Site URL: http://localhost:${port}`);
    console.log(`   • OAuth will work automatically (mock implementation)`);
    console.log(`   • All Contao Manager API endpoints are available under /api`);
    
    console.log(`\n📊 Health Check: http://localhost:${port}/health`);
    console.log(`\nPress Ctrl+C to stop the server\n`);
  }

  async stop(): Promise<void> {
    await this.mockServer.stop();
    console.log('Mock server stopped');
  }
}

// Add scenario management endpoints to the mock server
const originalSetupRoutes = MockServer.prototype['setupRoutes'];
MockServer.prototype['setupRoutes'] = function() {
  originalSetupRoutes.call(this);
  
  // Add mock management endpoints
  this.app.get('/mock/scenarios', (req, res) => {
    const scenarios = scenarioLoader.getAllScenarios().map(s => ({
      name: s.name,
      description: s.description || 'No description',
      category: s.name.split('.')[0]
    }));
    res.json({ scenarios });
  });
  
  this.app.post('/mock/scenario', (req, res) => {
    const { scenario } = req.body;
    if (!scenario) {
      return res.status(400).json({ error: 'Scenario name required' });
    }
    
    const scenarioData = scenarioLoader.getScenario(scenario);
    if (!scenarioData) {
      return res.status(404).json({ error: `Scenario '${scenario}' not found` });
    }
    
    this.loadScenario(scenarioData);
    console.log(`\n🎭 Scenario changed to: ${scenario}`);
    res.json({ success: true, scenario: scenario, description: scenarioData.description });
  });
  
  this.app.post('/mock/reset', (req, res) => {
    this.reset();
    console.log(`\n🔄 State reset to default`);
    res.json({ success: true, message: 'State reset to default' });
  });
  
  this.app.get('/mock/state', (req, res) => {
    const state = this.getState();
    res.json({
      currentTask: state.currentTask,
      currentMigration: state.currentMigration,
      selfUpdate: state.selfUpdate,
      scenarios: state.scenarios,
      maintenanceMode: state.maintenanceMode
    });
  });
  
  // Add CORS headers for all mock management endpoints
  this.app.use('/mock/*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
};

// CLI execution
if (require.main === module) {
  const server = new StandaloneMockServer();
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

export { StandaloneMockServer };