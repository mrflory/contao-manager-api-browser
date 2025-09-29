#!/usr/bin/env ts-node

/**
 * Database Migration Script for Phase 1
 *
 * This script handles migration from JSON file storage to PostgreSQL database.
 * It provides safe migration with rollback capabilities and data validation.
 *
 * Usage:
 *   npm run migrate:database
 *   ts-node src/scripts/migrate-database.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '../generated/prisma';
import { StorageFactory } from '../storage/StorageFactory';
import { StorageType, StorageConfig } from '../storage/interfaces';
import { JsonFileStorageUnified } from '../storage/JsonFileStorageUnified';
import { DatabaseStorage } from '../storage/DatabaseStorage';
// import { AppConfig } from '../types';

class DatabaseMigrator {
  private prisma: PrismaClient;
  private sourceStorage: JsonFileStorageUnified;
  private targetStorage: DatabaseStorage;

  constructor() {
    // Initialize Prisma client
    this.prisma = new PrismaClient();

    // Create source storage (JSON file)
    const sourceConfig: StorageConfig = {
      type: StorageType.JSON_FILE,
      dataDir: process.env.DATA_DIR || './data'
    };
    this.sourceStorage = StorageFactory.createStorage(sourceConfig) as JsonFileStorageUnified;

    // Create target storage (Database)
    const targetConfig: StorageConfig = {
      type: StorageType.DATABASE,
      connectionString: process.env.DATABASE_URL
    };
    this.targetStorage = StorageFactory.createStorage(targetConfig) as DatabaseStorage;
  }

  /**
   * Check if migration is needed
   */
  async checkMigrationNeeded(): Promise<boolean> {
    try {
      // Check if JSON file config exists
      const sourceAvailable = await this.sourceStorage.isAvailable();
      if (!sourceAvailable) {
        console.log('No JSON file storage found - migration not needed');
        return false;
      }

      // Check if database is empty
      const userCount = await this.prisma.user.count();
      const siteCount = await this.prisma.site.count();

      if (userCount === 0 && siteCount === 0) {
        console.log('Database is empty - migration needed');
        return true;
      }

      console.log(`Database already has ${userCount} users and ${siteCount} sites`);

      // Ask user if they want to proceed anyway
      if (process.env.FORCE_MIGRATION === 'true') {
        console.log('FORCE_MIGRATION=true - proceeding with migration');
        return true;
      }

      console.log('Use FORCE_MIGRATION=true to migrate anyway');
      return false;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Validate source data before migration
   */
  async validateSourceData(): Promise<{valid: boolean, issues: string[]}> {
    try {
      const configResult = await this.sourceStorage.loadConfig();
      if (!configResult.success || !configResult.data) {
        return {
          valid: false,
          issues: [`Failed to load source config: ${configResult.error}`]
        };
      }

      const config = configResult.data;
      const issues: string[] = [];

      // Check basic structure
      if (!config.sites || typeof config.sites !== 'object') {
        issues.push('Invalid sites structure in config');
      }

      // Check each site
      let siteCount = 0;
      for (const [url, site] of Object.entries(config.sites)) {
        siteCount++;
        if (!site || typeof site !== 'object') {
          issues.push(`Invalid site config for ${url}`);
          continue;
        }

        const siteConfig = site as any;
        if (!siteConfig.name || !siteConfig.url) {
          issues.push(`Missing required fields for site ${url}`);
        }

        if (!siteConfig.authMethod || !['token', 'cookie'].includes(siteConfig.authMethod)) {
          issues.push(`Invalid auth method for site ${url}`);
        }

        if (siteConfig.authMethod === 'token' && !siteConfig.token) {
          issues.push(`Missing token for token-based auth site ${url}`);
        }
      }

      console.log(`Found ${siteCount} sites to migrate`);

      return {
        valid: issues.length === 0,
        issues: issues
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Error validating source data: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Perform the actual migration
   */
  async performMigration(): Promise<{success: boolean, error?: string}> {
    try {
      console.log('Starting database migration...');

      // Load source config
      const configResult = await this.sourceStorage.loadConfig();
      if (!configResult.success || !configResult.data) {
        return { success: false, error: `Failed to load source config: ${configResult.error}` };
      }

      const config = configResult.data;

      // Initialize target storage
      const initResult = await this.targetStorage.initialize();
      if (!initResult.success) {
        return { success: false, error: `Failed to initialize target storage: ${initResult.error}` };
      }

      // Migrate the configuration
      const saveResult = await this.targetStorage.saveConfig(config);
      if (!saveResult.success) {
        return { success: false, error: `Failed to save config to target storage: ${saveResult.error}` };
      }

      // Verify migration by loading from target
      const verifyResult = await this.targetStorage.loadConfig();
      if (!verifyResult.success || !verifyResult.data) {
        return { success: false, error: `Migration verification failed: ${verifyResult.error}` };
      }

      // Compare site counts
      const sourceSiteCount = Object.keys(config.sites).length;
      const targetSiteCount = Object.keys(verifyResult.data.sites).length;

      if (sourceSiteCount !== targetSiteCount) {
        return {
          success: false,
          error: `Site count mismatch: source=${sourceSiteCount}, target=${targetSiteCount}`
        };
      }

      console.log(`Successfully migrated ${sourceSiteCount} sites to database`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during migration'
      };
    }
  }

  /**
   * Create a backup of the source data before migration
   */
  async createBackup(): Promise<{success: boolean, backupPath?: string, error?: string}> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups');
      const backupPath = path.join(backupDir, `config-backup-${timestamp}.json`);

      // Ensure backup directory exists
      await fs.mkdir(backupDir, { recursive: true });

      // Load and save config
      const configResult = await this.sourceStorage.loadConfig();
      if (!configResult.success || !configResult.data) {
        return { success: false, error: `Failed to load config for backup: ${configResult.error}` };
      }

      await fs.writeFile(backupPath, JSON.stringify(configResult.data, null, 2), 'utf-8');

      console.log(`Created backup at: ${backupPath}`);
      return { success: true, backupPath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating backup'
      };
    }
  }

  /**
   * Run the complete migration process
   */
  async migrate(): Promise<void> {
    console.log('🚀 Starting database migration process...\n');

    try {
      // Check if migration is needed
      const migrationNeeded = await this.checkMigrationNeeded();
      if (!migrationNeeded) {
        console.log('✅ Migration not needed - exiting');
        return;
      }

      // Validate source data
      console.log('🔍 Validating source data...');
      const validation = await this.validateSourceData();
      if (!validation.valid) {
        console.error('❌ Source data validation failed:');
        validation.issues.forEach(issue => console.error(`  - ${issue}`));
        process.exit(1);
      }
      console.log('✅ Source data validation passed');

      // Create backup
      console.log('💾 Creating backup...');
      const backup = await this.createBackup();
      if (!backup.success) {
        console.error(`❌ Backup failed: ${backup.error}`);
        process.exit(1);
      }
      console.log(`✅ Backup created: ${backup.backupPath}`);

      // Perform migration
      console.log('📦 Performing migration...');
      const migration = await this.performMigration();
      if (!migration.success) {
        console.error(`❌ Migration failed: ${migration.error}`);
        console.log(`💡 Your data is safely backed up at: ${backup.backupPath}`);
        process.exit(1);
      }

      console.log('✅ Migration completed successfully!');
      console.log('\n🎉 Database migration complete!');
      console.log('📝 Next steps:');
      console.log('  1. Update your .env file: STORAGE_TYPE=database');
      console.log('  2. Set your DATABASE_URL to your Neon.tech connection string');
      console.log('  3. Restart your application');
      console.log(`  4. Your backup is saved at: ${backup.backupPath}`);

    } catch (error) {
      console.error('❌ Migration process failed:', error);
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
      await this.sourceStorage.cleanup();
      await this.targetStorage.cleanup();
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  migrator.migrate().catch(console.error);
}

export default DatabaseMigrator;