# 🚀 Mock Server UI Testing - Quick Start

## Step 1: Start the Mock Server

```bash
npm run mock:server
```

The server starts on `http://localhost:3001` and shows:
```
🚀 Starting Contao Manager Mock Server for UI Testing
================================================

✅ Mock server running on http://localhost:3001
```

## Step 2: Add Mock Site to Your Frontend

1. **Start your frontend application** (if not already running):
   ```bash
   npm run dev:full
   # or just the frontend: npm run dev:react
   ```

2. **Navigate to your frontend** (usually http://localhost:5173)

3. **Add a new site** with these settings:
   - **Site URL**: `http://localhost:3001/contao-manager.phar.php` 
   - **OAuth Scope**: `admin` (recommended for full testing)
   - **Site Name**: `Mock Test Server` (or any name you prefer)

4. **Authenticate** - The mock server will show a consent page, click "Allow Access" to complete OAuth flow and get redirected back with a valid token

> **✅ Success**: After OAuth completion, your frontend should show "Token saved successfully" and the site should appear as authenticated and ready for testing.

> **Note**: If you visit `http://localhost:3001` directly in your browser, you'll see a helpful mock server interface with scenario control buttons and API endpoint documentation.

## Step 3: Test the Update Workflow

1. **Navigate to the site details page** of your mock server site
2. **Click "Check for Updates"** or equivalent button
3. **Observe the workflow**:
   - Manager self-update available (1.9.4 → 1.9.5)
   - Update should proceed through all steps
   - Complete successfully

## Step 4: Test Error Scenarios (Optional)

While your UI is open, you can switch scenarios:

```bash
# Test composer update failure
curl -X POST http://localhost:3001/mock/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "error-scenarios.composer-update-failure"}'

# Test authentication errors  
curl -X POST http://localhost:3001/mock/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "error-scenarios.authentication-error"}'

# Reset to default (success)
curl -X POST http://localhost:3001/mock/reset
```

Now try the update workflow again to see error handling!

## Available Test Scenarios

- ✅ **Default**: Complete update success (manager + migrations)
- ❌ **composer-update-failure**: Dependencies fail to resolve
- ❌ **authentication-error**: All API calls return 401
- 🔄 **Reset**: Back to default successful state

## Quick Debug Commands

```bash
# Check server health
curl http://localhost:3001/health

# View current mock state
curl http://localhost:3001/mock/state

# List all scenarios
curl http://localhost:3001/mock/scenarios
```

## Stop the Server

Press `Ctrl+C` in the terminal where the mock server is running.

---

## ✨ That's it!

You now have a fully functional mock Contao Manager for UI testing. The mock server:

- ✅ Handles OAuth authentication automatically
- ✅ Simulates realistic API responses
- ✅ Supports different test scenarios
- ✅ Works with your existing frontend code
- ✅ No real Contao Manager instance needed

Perfect for development, testing, and demos!