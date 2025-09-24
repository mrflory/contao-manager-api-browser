#!/usr/bin/env ts-node

/**
 * Database Seeder Script for Phase 1
 *
 * This script seeds the database with sample data for development and testing.
 * It creates a default user with sample sites for testing the application.
 *
 * Usage:
 *   npm run seed:database
 *   ts-node src/scripts/seed-database.ts
 */

import { PrismaClient } from '../generated/prisma';

class DatabaseSeeder {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Clear existing data (for fresh seeding)
   */
  async clearData(): Promise<void> {
    console.log('🧹 Clearing existing data...');

    // Delete in correct order to respect foreign key constraints
    await this.prisma.usageLog.deleteMany();
    await this.prisma.session.deleteMany();
    await this.prisma.site.deleteMany();
    await this.prisma.subscription.deleteMany();
    await this.prisma.user.deleteMany();

    console.log('✅ Data cleared');
  }

  /**
   * Create sample users
   */
  async createUsers(): Promise<void> {
    console.log('👤 Creating sample users...');

    // Create default user for Phase 1
    const defaultUser = await this.prisma.user.create({
      data: {
        id: 'default_user',
        email: 'admin@example.com',
        passwordHash: '$2b$10$placeholder.hash.for.phase1.testing.purposes',
        emailVerified: new Date(),
        isActive: true,
        subscriptions: {
          create: {
            planType: 'free',
            status: 'active',
            features: {
              maxSites: 5,
              apiCallsPerMonth: 1000,
              supportLevel: 'community'
            }
          }
        }
      }
    });

    // Create additional test user
    const testUser = await this.prisma.user.create({
      data: {
        id: 'test_user_2',
        email: 'developer@example.com',
        passwordHash: '$2b$10$placeholder.hash.for.phase1.testing.purposes',
        emailVerified: new Date(),
        isActive: true,
        subscriptions: {
          create: {
            planType: 'pro',
            status: 'active',
            features: {
              maxSites: 25,
              apiCallsPerMonth: 10000,
              supportLevel: 'priority'
            }
          }
        }
      }
    });

    console.log(`✅ Created users: ${defaultUser.email}, ${testUser.email}`);
  }

  /**
   * Create sample sites with various configurations
   */
  async createSites(): Promise<void> {
    console.log('🌐 Creating sample sites...');

    // Sample sites for default user
    const sites = [
      {
        userId: 'default_user',
        name: 'Local Development Site',
        url: 'http://localhost:8080/contao-manager.phar.php',
        authMethod: 'token',
        scope: 'admin',
        token: 'dev_token_12345abcdef'
      },
      {
        userId: 'default_user',
        name: 'Production Contao Site',
        url: 'https://example.com/contao-manager.phar.php',
        authMethod: 'token',
        scope: 'read',
        token: 'prod_token_67890ghijkl'
      },
      {
        userId: 'default_user',
        name: 'Staging Environment',
        url: 'https://staging.example.com/contao-manager.phar.php',
        authMethod: 'cookie',
        scope: 'update',
        token: null // No token for cookie auth
      },
      {
        userId: 'test_user_2',
        name: 'Client Website A',
        url: 'https://client-a.com/contao-manager.phar.php',
        authMethod: 'token',
        scope: 'install',
        token: 'client_a_token_mnopqr'
      },
      {
        userId: 'test_user_2',
        name: 'Client Website B',
        url: 'https://client-b.com/contao-manager.phar.php',
        authMethod: 'token',
        scope: 'admin',
        token: 'client_b_token_stuvwx'
      }
    ];

    for (const siteData of sites) {
      let tokenEncrypted = '';

      // For Phase 1, store tokens directly (encryption handled at application level)
      // In Phase 2+, we'll implement proper site-specific encryption
      if (siteData.token) {
        tokenEncrypted = siteData.token; // Store token directly for Phase 1
      }

      const site = await this.prisma.site.create({
        data: {
          userId: siteData.userId,
          name: siteData.name,
          url: siteData.url,
          tokenEncrypted: tokenEncrypted,
          authMethod: siteData.authMethod,
          scope: siteData.scope,
          versionInfo: {
            contaoManagerVersion: '1.8.0',
            phpVersion: '8.2.0',
            contaoVersion: '5.3.0',
            lastUpdated: new Date().toISOString()
          },
          lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last 7 days
        }
      });

      console.log(`  ✅ Created site: ${site.name}`);
    }
  }

  /**
   * Create sample usage logs for analytics testing
   */
  async createUsageLogs(): Promise<void> {
    console.log('📊 Creating sample usage logs...');

    const users = await this.prisma.user.findMany({
      include: { sites: true }
    });

    const actionTypes = [
      'site_info',
      'composer_install',
      'composer_update',
      'contao_install',
      'contao_update',
      'file_download',
      'config_save',
      'api_error'
    ];

    const apiEndpoints = [
      '/api/server',
      '/api/composer',
      '/api/contao/install',
      '/api/contao/update',
      '/api/files',
      '/api/config'
    ];

    // Generate usage logs for the past 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const user of users) {
      // Generate 20-50 logs per user
      const logCount = Math.floor(Math.random() * 30) + 20;

      for (let i = 0; i < logCount; i++) {
        const randomSite = user.sites[Math.floor(Math.random() * user.sites.length)];
        const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
        const apiEndpoint = apiEndpoints[Math.floor(Math.random() * apiEndpoints.length)];
        const timestamp = new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()));

        // Simulate some errors
        const isError = Math.random() < 0.1; // 10% error rate
        const duration = isError ? null : Math.floor(Math.random() * 2000) + 100; // 100-2100ms

        await this.prisma.usageLog.create({
          data: {
            userId: user.id,
            siteId: randomSite ? randomSite.id : null,
            actionType: isError ? `${actionType}_error` : actionType,
            apiEndpoint: apiEndpoint,
            timestamp: timestamp,
            duration: duration,
            requestData: {
              userAgent: 'Mozilla/5.0 (compatible; Contao Manager Browser)',
              method: ['GET', 'POST', 'PUT'][Math.floor(Math.random() * 3)]
            },
            responseData: isError ? {
              error: 'Sample error message',
              statusCode: [400, 401, 403, 500][Math.floor(Math.random() * 4)]
            } : {
              statusCode: 200,
              success: true
            }
          }
        });
      }
    }

    console.log(`✅ Created usage logs for analytics testing`);
  }

  /**
   * Create sample sessions for testing
   */
  async createSessions(): Promise<void> {
    console.log('🔐 Creating sample sessions...');

    const users = await this.prisma.user.findMany();

    for (const user of users) {
      // Create 1-3 sessions per user
      const sessionCount = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < sessionCount; i++) {
        const sessionToken = `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

        await this.prisma.session.create({
          data: {
            userId: user.id,
            sessionToken: sessionToken,
            expiresAt: expiresAt,
            ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
            userAgent: 'Mozilla/5.0 (compatible; Contao Manager Browser/1.0)'
          }
        });
      }
    }

    console.log(`✅ Created sample sessions`);
  }

  /**
   * Run the complete seeding process
   */
  async seed(clearFirst: boolean = true): Promise<void> {
    console.log('🌱 Starting database seeding process...\n');

    try {
      if (clearFirst) {
        await this.clearData();
      }

      await this.createUsers();
      await this.createSites();
      await this.createUsageLogs();
      await this.createSessions();

      console.log('\n🎉 Database seeding complete!');
      console.log('📝 Seeded data summary:');

      const userCount = await this.prisma.user.count();
      const siteCount = await this.prisma.site.count();
      const logCount = await this.prisma.usageLog.count();
      const sessionCount = await this.prisma.session.count();

      console.log(`  - Users: ${userCount}`);
      console.log(`  - Sites: ${siteCount}`);
      console.log(`  - Usage logs: ${logCount}`);
      console.log(`  - Sessions: ${sessionCount}`);

      console.log('\n💡 Test the application with:');
      console.log('  - Default user: admin@example.com');
      console.log('  - Test user: developer@example.com');
      console.log('  - Sample sites with various auth methods and scopes');

    } catch (error) {
      console.error('❌ Seeding process failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  const clearFirst = !process.argv.includes('--append');

  seeder.seed(clearFirst).catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export default DatabaseSeeder;