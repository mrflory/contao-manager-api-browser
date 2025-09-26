import * as fs from 'fs';
import * as path from 'path';
import { BaseStorage, StorageConfig, StorageResult } from './interfaces';
import { AppConfig, AuthMethod } from '../types';
import TokenEncryptionService from '../services/tokenEncryption';

/**
 * JSON file-based storage implementation
 * Refactored from the original ConfigService logic
 */
export class JsonFileStorage extends BaseStorage {
  private readonly tokenFile: string;
  private tokenEncryption: TokenEncryptionService | null;

  constructor(config: StorageConfig) {
    super(config);
    
    const dataDir = config.dataDir || path.join(process.cwd(), 'data');
    this.tokenFile = path.join(dataDir, 'config.json');
    
    // Initialize encryption service
    try {
      this.tokenEncryption = new TokenEncryptionService();
    } catch (error) {
      console.error('Failed to initialize token encryption service:', error);
      console.error('Please set TOKEN_MASTER_KEY in your .env file');
      this.tokenEncryption = null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const dataDir = path.dirname(this.tokenFile);
      
      // Check if we can access the data directory
      if (!fs.existsSync(dataDir)) {
        // Try to create it
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch (createError) {
          console.error('Cannot create data directory:', createError);
          return false;
        }
      }
      
      // Check if we can write to the directory
      try {
        fs.accessSync(dataDir, fs.constants.W_OK);
        return true;
      } catch (accessError) {
        console.error('Cannot write to data directory:', accessError);
        return false;
      }
    } catch (error) {
      console.error('Error checking file storage availability:', error);
      return false;
    }
  }

  async initialize(): Promise<StorageResult<boolean>> {
    try {
      const dataDir = path.dirname(this.tokenFile);
      
      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // If config file doesn't exist, create an empty one
      if (!fs.existsSync(this.tokenFile)) {
        const emptyConfig: AppConfig = { sites: {}, activeSite: null };
        const saveResult = await this.saveConfig(emptyConfig);
        if (!saveResult.success) {
          return this.createStorageResult(false, false, saveResult.error);
        }
      }
      
      return this.createStorageResult(true, true);
    } catch (error) {
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for file storage
    return Promise.resolve();
  }

  async loadConfig(userId?: string): Promise<StorageResult<AppConfig>> {
    try {
      // Note: JsonFileStorage ignores userId parameter since it's single-tenant by design
      if (userId) {
        console.warn('JsonFileStorage: userId parameter ignored - this storage type does not support multi-tenancy');
      }

      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8');
        const config = JSON.parse(data);

        // Handle migrations and token decryption
        const migratedConfig = await this.handleMigrations(config);

        return this.createStorageResult(true, migratedConfig);
      }

      // Return empty config if file doesn't exist
      return this.createStorageResult(true, { sites: {}, activeSite: null });
    } catch (error) {
      console.error('Error loading config:', error instanceof Error ? error.message : 'Unknown error');
      return this.createStorageResult(false, { sites: {}, activeSite: null },
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async saveConfig(config: AppConfig, userId?: string): Promise<StorageResult<boolean>> {
    try {
      // Note: JsonFileStorage ignores userId parameter since it's single-tenant by design
      if (userId) {
        console.warn('JsonFileStorage: userId parameter ignored - this storage type does not support multi-tenancy');
      }

      // Create a deep copy to avoid modifying the original config
      const configToSave = JSON.parse(JSON.stringify(config));
      
      // Encrypt tokens before saving
      if (this.tokenEncryption && configToSave.sites) {
        Object.keys(configToSave.sites).forEach(siteUrl => {
          const site = configToSave.sites[siteUrl];
          if (site.token && typeof site.token === 'string') {
            // Only encrypt if token is a plain string (not already encrypted)
            try {
              site.token = this.tokenEncryption!.encryptToken(site.token, siteUrl);
            } catch (error) {
              console.error(`Failed to encrypt token for site ${siteUrl}:`, 
                error instanceof Error ? error.message : 'Unknown error');
              // Keep original token if encryption fails
            }
          }
        });
      }
      
      // Ensure data directory exists
      const dataDir = path.dirname(this.tokenFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(this.tokenFile, JSON.stringify(configToSave, null, 2));
      return this.createStorageResult(true, true);
    } catch (error) {
      console.error('Error saving config:', error instanceof Error ? error.message : 'Unknown error');
      return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle configuration migrations and token decryption
   * This preserves the original migration logic from ConfigService
   */
  private async handleMigrations(config: any): Promise<AppConfig> {
    let migrationNeeded = false;
    
    // Migrate old format to new format
    if (config.token && config.managerUrl) {
      console.log('Migrating old config format to multi-site format');
      const oldConfig = { ...config };
      const newConfig: AppConfig = {
        sites: {
          [oldConfig.managerUrl]: {
            name: this.extractSiteName(oldConfig.managerUrl),
            url: oldConfig.managerUrl,
            token: oldConfig.token,
            authMethod: 'token' as AuthMethod,
            lastUsed: new Date().toISOString()
          }
        },
        activeSite: oldConfig.managerUrl
      };
      
      // Save the migrated config
      await this.saveConfig(newConfig);
      return newConfig;
    }
    
    // Migrate sites without authMethod to token-based auth
    if (config.sites) {
      Object.keys(config.sites).forEach(siteUrl => {
        const site = config.sites[siteUrl];
        
        if (!site.authMethod && site.token) {
          site.authMethod = 'token';
          migrationNeeded = true;
        }
        
        // Fix sites that might have read scope as default (should be admin)
        if (!site.scope || (site.authMethod === 'cookie' && site.scope === 'read')) {
          site.scope = 'admin';
          migrationNeeded = true;
        }
        
        // Decrypt encrypted tokens for runtime use
        if (this.tokenEncryption && site.token && this.tokenEncryption.isTokenEncrypted(site.token)) {
          try {
            site.token = this.tokenEncryption.decryptToken(site.token, siteUrl);
          } catch (error) {
            console.error(`Failed to decrypt token for site ${siteUrl}:`, 
              error instanceof Error ? error.message : 'Unknown error');
            delete site.token; // Remove invalid encrypted token
          }
        }
      });
      
      if (migrationNeeded) {
        console.log('Migrating existing sites to include authMethod field');
        await this.saveConfig(config);
      }
    }
    
    return config as AppConfig;
  }
}