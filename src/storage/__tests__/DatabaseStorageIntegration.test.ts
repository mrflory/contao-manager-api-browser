/**
 * DatabaseStorage Integration Tests
 *
 * Integration tests for Phase 1 PostgreSQL database implementation
 * Tests the core functionality with a real database connection
 */

import { DatabaseStorage } from '../DatabaseStorage';
import { StorageConfig, StorageType } from '../interfaces';
import { AppConfig } from '../../types';

describe('DatabaseStorage Integration Tests', () => {
  let storage: DatabaseStorage;

  beforeAll(() => {
    // Only run integration tests if DATABASE_URL is set
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder')) {
      console.log('⏭️  Skipping DatabaseStorage integration tests - no DATABASE_URL configured');
      return;
    }
  });

  beforeEach(() => {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder')) {
      return;
    }

    const config: StorageConfig = {
      type: StorageType.DATABASE,
      connectionString: process.env.DATABASE_URL
    };

    storage = new DatabaseStorage(config);
  });

  afterEach(async () => {
    if (storage) {
      await storage.cleanup();
    }
  });

  const skipIfNoDatabase = () => {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder')) {
      console.log('⏭️  Skipping test - no database configuration');
      return true;
    }
    return false;
  };

  describe('Basic Operations', () => {
    it('should initialize and check availability', async () => {
      if (skipIfNoDatabase()) return;

      const initResult = await storage.initialize();
      expect(initResult.success).toBe(true);

      const isAvailable = await storage.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should handle empty configuration load', async () => {
      if (skipIfNoDatabase()) return;

      await storage.initialize();
      const result = await storage.loadConfig();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        sites: {},
        activeSite: null
      });
    });

    it('should save and load configuration', async () => {
      if (skipIfNoDatabase()) return;

      await storage.initialize();

      const sampleConfig: AppConfig = {
        sites: {
          'http://localhost:8080/contao-manager.phar.php': {
            name: 'Local Test Site',
            url: 'http://localhost:8080/contao-manager.phar.php',
            authMethod: 'token',
            lastUsed: new Date().toISOString(),
            token: 'test_token_123',
            scope: 'admin'
          }
        },
        activeSite: 'http://localhost:8080/contao-manager.phar.php'
      };

      // Save configuration
      const saveResult = await storage.saveConfig(sampleConfig);
      expect(saveResult.success).toBe(true);

      // Load configuration
      const loadResult = await storage.loadConfig();
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeDefined();

      const loadedConfig = loadResult.data!;
      expect(Object.keys(loadedConfig.sites)).toHaveLength(1);
      expect(loadedConfig.sites['http://localhost:8080/contao-manager.phar.php']).toBeDefined();
      expect(loadedConfig.sites['http://localhost:8080/contao-manager.phar.php'].name).toBe('Local Test Site');
      expect(loadedConfig.sites['http://localhost:8080/contao-manager.phar.php'].token).toBe('test_token_123');
    });
  });

  describe('Site Management', () => {
    beforeEach(async () => {
      if (skipIfNoDatabase()) return;
      await storage.initialize();

      // Start with empty config
      await storage.saveConfig({ sites: {}, activeSite: null });
    });

    it('should add a new site', async () => {
      if (skipIfNoDatabase()) return;

      const addResult = await storage.addSite({
        url: 'https://test.example.com/contao-manager.phar.php',
        token: 'test_token_456',
        name: 'Test Site',
        authMethod: 'token',
        scope: 'read'
      });

      expect(addResult.success).toBe(true);

      // Verify site was added
      const config = await storage.loadConfig();
      expect(config.success).toBe(true);
      expect(config.data!.sites['https://test.example.com/contao-manager.phar.php']).toBeDefined();
      expect(config.data!.sites['https://test.example.com/contao-manager.phar.php'].name).toBe('Test Site');
    });

    it('should update site information', async () => {
      if (skipIfNoDatabase()) return;

      // First add a site
      await storage.addSite({
        url: 'https://update.example.com/contao-manager.phar.php',
        token: 'original_token',
        name: 'Original Name',
        authMethod: 'token',
        scope: 'read'
      });

      // Update the site
      const updateResult = await storage.updateSite({
        url: 'https://update.example.com/contao-manager.phar.php',
        name: 'Updated Name',
        scope: 'admin'
      });

      expect(updateResult.success).toBe(true);

      // Verify update
      const config = await storage.loadConfig();
      const site = config.data!.sites['https://update.example.com/contao-manager.phar.php'];
      expect(site.name).toBe('Updated Name');
      expect(site.scope).toBe('admin');
      expect(site.token).toBe('original_token'); // Should remain unchanged
    });

    it('should remove a site', async () => {
      if (skipIfNoDatabase()) return;

      // First add a site
      await storage.addSite({
        url: 'https://remove.example.com/contao-manager.phar.php',
        token: 'remove_token',
        name: 'Site to Remove',
        authMethod: 'token',
        scope: 'read'
      });

      // Verify site exists
      let config = await storage.loadConfig();
      expect(config.data!.sites['https://remove.example.com/contao-manager.phar.php']).toBeDefined();

      // Remove the site
      const removeResult = await storage.removeSite('https://remove.example.com/contao-manager.phar.php');
      expect(removeResult.success).toBe(true);

      // Verify site is gone
      config = await storage.loadConfig();
      expect(config.data!.sites['https://remove.example.com/contao-manager.phar.php']).toBeUndefined();
    });
  });

  describe('Usage Analytics', () => {
    beforeEach(async () => {
      if (skipIfNoDatabase()) return;
      await storage.initialize();
    });

    it('should log usage successfully', async () => {
      if (skipIfNoDatabase()) return;

      const logResult = await storage.logUsage(
        'test_action',
        '/api/test',
        'https://analytics.example.com/contao-manager.phar.php',
        { method: 'GET' },
        { success: true },
        250
      );

      expect(logResult.success).toBe(true);
    });

    it('should get usage statistics', async () => {
      if (skipIfNoDatabase()) return;

      // Log some usage
      await storage.logUsage('action1', '/api/test1', undefined, {}, { success: true }, 100);
      await storage.logUsage('action2', '/api/test2', undefined, {}, { success: true }, 200);
      await storage.logUsage('error_action', '/api/error', undefined, {}, { error: 'Test error' }, null);

      const statsResult = await storage.getUsageStats(undefined, 1);
      expect(statsResult.success).toBe(true);
      expect(statsResult.data).toBeDefined();
      expect(statsResult.data!.totalRequests).toBeGreaterThanOrEqual(3);
      expect(statsResult.data!.errorCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Backup and Restore', () => {
    beforeEach(async () => {
      if (skipIfNoDatabase()) return;
      await storage.initialize();
    });

    it('should create and restore from backup', async () => {
      if (skipIfNoDatabase()) return;

      // Create test configuration
      const testConfig: AppConfig = {
        sites: {
          'https://backup.example.com/contao-manager.phar.php': {
            name: 'Backup Test Site',
            url: 'https://backup.example.com/contao-manager.phar.php',
            authMethod: 'token',
            lastUsed: new Date().toISOString(),
            token: 'backup_token',
            scope: 'admin'
          }
        },
        activeSite: 'https://backup.example.com/contao-manager.phar.php'
      };

      await storage.saveConfig(testConfig);

      // Create backup
      const backupResult = await storage.backupConfig();
      expect(backupResult.success).toBe(true);
      expect(backupResult.data).toBeDefined();

      const backupId = backupResult.data!;

      // Clear current config
      await storage.saveConfig({ sites: {}, activeSite: null });

      // Verify config is empty
      const emptyConfig = await storage.loadConfig();
      expect(Object.keys(emptyConfig.data!.sites)).toHaveLength(0);

      // Restore from backup
      const restoreResult = await storage.restoreFromBackup(backupId);
      expect(restoreResult.success).toBe(true);

      // Verify restoration
      const restoredConfig = await storage.loadConfig();
      expect(restoredConfig.success).toBe(true);
      expect(Object.keys(restoredConfig.data!.sites)).toHaveLength(1);
      expect(restoredConfig.data!.sites['https://backup.example.com/contao-manager.phar.php']).toBeDefined();
      expect(restoredConfig.data!.sites['https://backup.example.com/contao-manager.phar.php'].name).toBe('Backup Test Site');
    });
  });

  describe('Multi-tenant Support', () => {
    beforeEach(async () => {
      if (skipIfNoDatabase()) return;
      await storage.initialize();
    });

    it('should isolate data by user ID', async () => {
      if (skipIfNoDatabase()) return;

      // Set user 1 and add a site
      storage.setCurrentUserId('user1');
      await storage.addSite({
        url: 'https://user1.example.com/contao-manager.phar.php',
        token: 'user1_token',
        name: 'User 1 Site',
        authMethod: 'token',
        scope: 'read'
      });

      // Set user 2 and add a different site
      storage.setCurrentUserId('user2');
      await storage.addSite({
        url: 'https://user2.example.com/contao-manager.phar.php',
        token: 'user2_token',
        name: 'User 2 Site',
        authMethod: 'token',
        scope: 'admin'
      });

      // Verify user 1 only sees their site
      storage.setCurrentUserId('user1');
      const user1Config = await storage.loadConfig();
      expect(Object.keys(user1Config.data!.sites)).toHaveLength(1);
      expect(user1Config.data!.sites['https://user1.example.com/contao-manager.phar.php']).toBeDefined();
      expect(user1Config.data!.sites['https://user2.example.com/contao-manager.phar.php']).toBeUndefined();

      // Verify user 2 only sees their site
      storage.setCurrentUserId('user2');
      const user2Config = await storage.loadConfig();
      expect(Object.keys(user2Config.data!.sites)).toHaveLength(1);
      expect(user2Config.data!.sites['https://user2.example.com/contao-manager.phar.php']).toBeDefined();
      expect(user2Config.data!.sites['https://user1.example.com/contao-manager.phar.php']).toBeUndefined();

      // Reset to default user
      storage.setCurrentUserId('default_user');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid connection strings', async () => {
      if (skipIfNoDatabase()) return;

      const invalidConfig: StorageConfig = {
        type: StorageType.DATABASE,
        connectionString: 'invalid://connection/string'
      };

      const invalidStorage = new DatabaseStorage(invalidConfig);
      const isAvailable = await invalidStorage.isAvailable();
      expect(isAvailable).toBe(false);

      await invalidStorage.cleanup();
    });

    it('should handle missing connection string', async () => {
      const noConnectionConfig: StorageConfig = {
        type: StorageType.DATABASE
      };

      const noConnectionStorage = new DatabaseStorage(noConnectionConfig);
      const initResult = await noConnectionStorage.initialize();
      expect(initResult.success).toBe(false);
      expect(initResult.error).toContain('connection string');

      await noConnectionStorage.cleanup();
    });
  });
});

// Helper function to check if integration tests should run
function shouldRunIntegrationTests(): boolean {
  return !!(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder'));
}

// Only describe tests if database is available
if (!shouldRunIntegrationTests()) {
  describe('DatabaseStorage Integration Tests', () => {
    it('should skip tests when no database is configured', () => {
      console.log('⏭️  DatabaseStorage integration tests skipped - set DATABASE_URL to run');
      expect(true).toBe(true);
    });
  });
}