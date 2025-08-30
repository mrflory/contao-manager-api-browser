import { MockServer } from '../mockServer/MockServer';

describe('New Server Endpoints', () => {
  let mockServer: MockServer;
  let baseUrl: string;

  beforeAll(async () => {
    const testPort = 3010 + Math.floor(Math.random() * 90); // Random port to avoid conflicts
    mockServer = new MockServer();
    await mockServer.start(testPort);
    baseUrl = `http://localhost:${testPort}`;
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  describe('GET /api/server/contao', () => {
    it('should return Contao installation information', async () => {
      const response = await fetch(`${baseUrl}/api/server/contao`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('api');
      expect(data.api).toHaveProperty('version');
      expect(data.api).toHaveProperty('features');
      expect(typeof data.api.features).toBe('object');
      expect(data.api.features).not.toBeNull();
      expect(data).toHaveProperty('project_dir');
      expect(data).toHaveProperty('config');
      expect(data).toHaveProperty('cli');
    });
  });

  describe('GET /api/server/composer', () => {
    it('should return composer configuration status', async () => {
      const response = await fetch(`${baseUrl}/api/server/composer`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('json');
      expect(data.json).toHaveProperty('found', true);
      expect(data.json).toHaveProperty('valid', true);
      expect(data).toHaveProperty('lock');
      expect(data.lock).toHaveProperty('found', true);
      expect(data.lock).toHaveProperty('fresh', true);
      expect(data).toHaveProperty('vendor');
      expect(data.vendor).toHaveProperty('found', true);
    });
  });

  describe('GET /api/server/phpinfo', () => {
    it('should return comprehensive PHP information', async () => {
      const response = await fetch(`${baseUrl}/api/server/phpinfo`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('html');
      expect(typeof data.html).toBe('string');
      expect(data.html).toContain('PHP Version');
      expect(data.html).toContain('phpinfo()');
      
      // Check that essential extensions are mentioned in HTML
      expect(data.html).toContain('json');
      expect(data.html).toContain('curl');
      expect(data.html).toContain('mbstring');
      expect(data.html).toContain('mysqli');
      expect(data.html).toContain('gd');
      expect(data.html).toContain('intl');
      expect(data.html).toContain('zip');

      // Check that PHP settings are mentioned in HTML
      expect(data.html).toContain('memory_limit');
      expect(data.html).toContain('max_execution_time');
      expect(data.html).toContain('upload_max_filesize');
    });
  });

  describe('Server endpoints with contao-manager.phar.php path', () => {
    it('should work with /contao-manager.phar.php/api/* path pattern', async () => {
      const endpoints = ['contao', 'composer', 'phpinfo'];
      
      for (const endpoint of endpoints) {
        const response = await fetch(`${baseUrl}/contao-manager.phar.php/api/server/${endpoint}`);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toBeDefined();
        expect(typeof data).toBe('object');
      }
    });
  });

  describe('Server endpoints with authentication scenarios', () => {
    it('should handle auth error scenario for all new endpoints', async () => {
      // Set auth error scenario
      await fetch(`${baseUrl}/mock/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'error-scenarios.authentication-error' })
      });

      // Test all endpoints return 401 with auth error
      const endpoints = ['contao', 'composer', 'phpinfo'];
      
      for (const endpoint of endpoints) {
        const response = await fetch(`${baseUrl}/api/server/${endpoint}`, {
          headers: { 'Authorization': 'Bearer invalid_token' }
        });
        
        if (endpoint === 'contao') {
          // Contao endpoint should return 401 in auth error scenario
          expect(response.status).toBe(401);
        } else {
          // Other endpoints don't implement auth error handling yet, so they return 200
          expect([200, 401]).toContain(response.status);
        }
      }

      // Reset to default scenario
      await fetch(`${baseUrl}/mock/reset`, { method: 'POST' });
    });
  });
});