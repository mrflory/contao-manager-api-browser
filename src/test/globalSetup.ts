import { MockServer } from './mockServer/MockServer';

let mockServer: MockServer;

export default async function globalSetup() {
  // Start mock server for integration tests
  mockServer = new MockServer();
  await mockServer.start(3001); // Use a different port from the main server
  
  // Store mock server instance globally so tests can access it
  (global as any).__MOCK_SERVER__ = mockServer;
  
  console.log('Mock server started on port 3001 for testing');
}