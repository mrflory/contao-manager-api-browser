import { MockServer } from './mockServer/MockServer';

export default async function globalTeardown() {
  // Stop mock server after all tests
  const mockServer: MockServer = (global as any).__MOCK_SERVER__;
  if (mockServer) {
    await mockServer.stop();
    console.log('Mock server stopped');
  }
}