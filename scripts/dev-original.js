#!/usr/bin/env node

/**
 * Development script to restore original components
 * Usage: npm run dev:original
 */

const fs = require('fs');
const path = require('path');

const ROUTER_FILE = path.join(__dirname, '../src/App.tsx');
const BACKUP_FILE = path.join(__dirname, '../src/App.tsx.backup');

if (fs.existsSync(BACKUP_FILE)) {
  fs.copyFileSync(BACKUP_FILE, ROUTER_FILE);
  console.log('🔄 Restored original App.tsx');
  console.log('📋 Original components are now active');
} else {
  console.log('❌ No backup file found. Cannot restore original components.');
  console.log('💡 Make sure to run "npm run dev:refactored" first to create a backup.');
}