/**
 * Better Auth Migration Script
 *
 * Migrates existing users from the legacy authentication system to Better Auth.
 * This script:
 * 1. Reads all users from the legacy `users` table
 * 2. Creates corresponding records in Better Auth's `account` table
 * 3. Preserves user IDs for relationship integrity (sites, subscriptions)
 * 4. Maintains bcrypt password hashes (compatible with Better Auth)
 *
 * Run with: npm run migrate:better-auth
 */

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function migrateUsers() {
  console.log('\n========================================');
  console.log('Better Auth User Migration');
  console.log('========================================\n');

  console.log('[1/4] Fetching existing users...');

  // Get all users from the legacy system
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      passwordHash: true,
      emailVerified: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(`     Found ${users.length} users to process\n`);

  if (users.length === 0) {
    console.log('     No users to migrate. Exiting.\n');
    return { migrated: 0, skipped: 0, failed: 0 };
  }

  console.log('[2/4] Checking existing Better Auth accounts...');

  // Check which users already have Better Auth accounts
  const existingAccounts = await prisma.account.findMany({
    where: {
      providerId: 'credential',
    },
    select: {
      userId: true,
    },
  });

  const existingUserIds = new Set(existingAccounts.map((a) => a.userId));
  console.log(`     Found ${existingUserIds.size} existing Better Auth accounts\n`);

  console.log('[3/4] Migrating users to Better Auth...\n');

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    try {
      // Skip if user already has a Better Auth account
      if (existingUserIds.has(user.id)) {
        console.log(`  [SKIP] ${user.email} - Already migrated`);
        skipped++;
        continue;
      }

      // Skip inactive users
      if (!user.isActive) {
        console.log(`  [SKIP] ${user.email} - User is inactive`);
        skipped++;
        continue;
      }

      // Create Better Auth account record for credential provider
      // The password hash is stored in the account table for Better Auth
      await prisma.account.create({
        data: {
          id: `acc_${user.id}`, // Generate unique account ID
          userId: user.id,
          accountId: user.email, // For credential provider, accountId is the email
          providerId: 'credential', // Better Auth credential provider
          password: user.passwordHash, // bcrypt hash is directly compatible
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });

      // Update user record with name if not set
      if (!user.name) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            name: user.email.split('@')[0],
          },
        });
      }

      console.log(`  [OK]   ${user.email} - Migrated successfully`);
      migrated++;
    } catch (error: any) {
      console.error(`  [FAIL] ${user.email} - ${error.message}`);
      failed++;
    }
  }

  console.log('\n[4/4] Verifying migration...');

  // Verify that all migrated users can be found
  const verificationResults = await prisma.account.findMany({
    where: {
      providerId: 'credential',
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          _count: {
            select: {
              sites: true,
              subscriptions: true,
            },
          },
        },
      },
    },
  });

  console.log(`     Total Better Auth accounts: ${verificationResults.length}`);
  console.log(`     Users with sites: ${verificationResults.filter((a) => a.user._count.sites > 0).length}`);
  console.log(`     Users with subscriptions: ${verificationResults.filter((a) => a.user._count.subscriptions > 0).length}`);

  return { migrated, skipped, failed };
}

async function verifySiteRelationships() {
  console.log('\n========================================');
  console.log('Verifying Site Relationships');
  console.log('========================================\n');

  const sites = await prisma.site.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  console.log(`Total sites: ${sites.length}`);

  const orphanedSites = sites.filter((s) => !s.user);
  if (orphanedSites.length > 0) {
    console.warn(`WARNING: ${orphanedSites.length} orphaned sites found!`);
    orphanedSites.forEach((s) => {
      console.warn(`  - Site ${s.url} (ID: ${s.id}) has no associated user`);
    });
  } else {
    console.log('All sites have valid user relationships');
  }

  return { total: sites.length, orphaned: orphanedSites.length };
}

async function verifySubscriptionRelationships() {
  console.log('\n========================================');
  console.log('Verifying Subscription Relationships');
  console.log('========================================\n');

  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  console.log(`Total subscriptions: ${subscriptions.length}`);

  const orphanedSubs = subscriptions.filter((s) => !s.user);
  if (orphanedSubs.length > 0) {
    console.warn(`WARNING: ${orphanedSubs.length} orphaned subscriptions found!`);
    orphanedSubs.forEach((s) => {
      console.warn(`  - Subscription ${s.id} has no associated user`);
    });
  } else {
    console.log('All subscriptions have valid user relationships');
  }

  return { total: subscriptions.length, orphaned: orphanedSubs.length };
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Better Auth Migration Script                        ║');
  console.log('║           Contao Update & Backup Service                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Connect to database
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connected successfully!\n');

    // Run migration
    const migrationResult = await migrateUsers();

    // Verify relationships
    const siteResult = await verifySiteRelationships();
    const subscriptionResult = await verifySubscriptionRelationships();

    // Print summary
    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================\n');

    console.log('User Migration:');
    console.log(`  - Migrated: ${migrationResult.migrated}`);
    console.log(`  - Skipped:  ${migrationResult.skipped}`);
    console.log(`  - Failed:   ${migrationResult.failed}`);

    console.log('\nRelationship Integrity:');
    console.log(`  - Sites: ${siteResult.total} total, ${siteResult.orphaned} orphaned`);
    console.log(`  - Subscriptions: ${subscriptionResult.total} total, ${subscriptionResult.orphaned} orphaned`);

    if (migrationResult.failed > 0 || siteResult.orphaned > 0 || subscriptionResult.orphaned > 0) {
      console.log('\n⚠️  Migration completed with warnings. Please review the output above.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

    console.log('\nNext steps:');
    console.log('  1. Test login with existing user credentials');
    console.log('  2. Verify site access for migrated users');
    console.log('  3. Test passkey registration for a user');
    console.log('  4. Test 2FA enrollment for a user');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\nDatabase connection closed.');
  }
}

// Run migration
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
