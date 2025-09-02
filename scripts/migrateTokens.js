#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file manually
function loadEnvFile() {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, value] = trimmedLine.split('=', 2);
                if (key && value) {
                    process.env[key] = value;
                }
            }
        }
    }
}

// Load environment variables
loadEnvFile();

// Import our encryption service
const TokenEncryptionService = require('../src/services/tokenEncryption');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'config.json');
const BACKUP_FILE = path.join(__dirname, '..', 'data', 'config.backup.json');

async function migrateTokens() {
    console.log('🔒 Starting token encryption migration...\n');

    // Check if config file exists
    if (!fs.existsSync(CONFIG_FILE)) {
        console.log('❌ Config file not found at:', CONFIG_FILE);
        return;
    }

    // Check if TOKEN_MASTER_KEY is set
    if (!process.env.TOKEN_MASTER_KEY) {
        console.log('❌ TOKEN_MASTER_KEY environment variable is not set!');
        console.log('💡 Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        console.log('💡 Then add it to your .env file: TOKEN_MASTER_KEY=your_generated_key');
        return;
    }

    try {
        // Initialize encryption service
        const tokenEncryption = new TokenEncryptionService();
        console.log('✅ Token encryption service initialized');

        // Create backup
        console.log('📁 Creating backup...');
        fs.copyFileSync(CONFIG_FILE, BACKUP_FILE);
        console.log('✅ Backup created at:', BACKUP_FILE);

        // Read current config
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);

        if (!config.sites) {
            console.log('ℹ️  No sites found in config - nothing to migrate');
            return;
        }

        const siteUrls = Object.keys(config.sites);
        console.log(`\n🔍 Found ${siteUrls.length} sites to check:`);

        let migrationCount = 0;
        let alreadyEncryptedCount = 0;
        const errors = [];

        for (const siteUrl of siteUrls) {
            const site = config.sites[siteUrl];
            console.log(`\n📍 Processing: ${site.name || siteUrl}`);

            if (!site.token) {
                console.log('   ⏭️  No token found - skipping');
                continue;
            }

            // Check if token is already encrypted
            if (tokenEncryption.isTokenEncrypted(site.token)) {
                console.log('   ✅ Already encrypted - skipping');
                alreadyEncryptedCount++;
                continue;
            }

            // Encrypt the token
            try {
                const originalToken = site.token;
                const encryptedToken = tokenEncryption.encryptToken(originalToken, siteUrl);
                
                // Update the site config
                site.token = encryptedToken;
                
                console.log('   🔒 Token encrypted successfully');
                console.log(`   📝 Original: ${originalToken.substring(0, 8)}...`);
                console.log(`   🔐 Encrypted: ${encryptedToken.encrypted.substring(0, 12)}...`);
                
                // Verify the encryption worked by decrypting
                const decryptedToken = tokenEncryption.decryptToken(encryptedToken, siteUrl);
                if (decryptedToken === originalToken) {
                    console.log('   ✅ Encryption verification passed');
                    migrationCount++;
                } else {
                    throw new Error('Decrypted token does not match original');
                }
                
            } catch (error) {
                const errorMsg = `Failed to encrypt token for ${siteUrl}: ${error.message}`;
                console.log(`   ❌ ${errorMsg}`);
                errors.push(errorMsg);
            }
        }

        // Save the updated config
        if (migrationCount > 0) {
            console.log('\n💾 Saving encrypted configuration...');
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            console.log('✅ Configuration saved successfully');
        }

        // Print summary
        console.log('\n📊 Migration Summary:');
        console.log(`   🔒 Tokens encrypted: ${migrationCount}`);
        console.log(`   ✅ Already encrypted: ${alreadyEncryptedCount}`);
        console.log(`   ❌ Errors: ${errors.length}`);

        if (errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }

        if (migrationCount > 0) {
            console.log('\n🎉 Migration completed successfully!');
            console.log(`💾 Backup available at: ${BACKUP_FILE}`);
        } else {
            console.log('\n✨ No migration needed - all tokens are already encrypted');
        }

    } catch (error) {
        console.error('\n💥 Migration failed:', error.message);
        
        // Restore backup if it exists and we haven't started writing yet
        if (fs.existsSync(BACKUP_FILE)) {
            console.log('🔄 Restoring backup...');
            try {
                fs.copyFileSync(BACKUP_FILE, CONFIG_FILE);
                console.log('✅ Backup restored successfully');
            } catch (restoreError) {
                console.error('❌ Failed to restore backup:', restoreError.message);
            }
        }
        process.exit(1);
    }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Token Migration Script');
    console.log('');
    console.log('This script migrates existing clear text OAuth tokens to encrypted format.');
    console.log('');
    console.log('Prerequisites:');
    console.log('  - TOKEN_MASTER_KEY must be set in your .env file');
    console.log('  - A 64-character hex string (32 bytes)');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/migrateTokens.js');
    console.log('  node scripts/migrateTokens.js --help');
    console.log('');
    console.log('The script will:');
    console.log('  1. Create a backup of your current config');
    console.log('  2. Encrypt all plain text tokens');
    console.log('  3. Verify encryption works by testing decryption');
    console.log('  4. Save the updated configuration');
    console.log('');
    process.exit(0);
}

// Run the migration
migrateTokens().catch(console.error);