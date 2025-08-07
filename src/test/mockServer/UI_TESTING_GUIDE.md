# UI Testing with Mock Contao Manager

This guide shows you how to use the mock Contao Manager server to test the update workflow directly in your UI.

## Quick Start

1. **Start the mock server:**
   ```bash
   npm run mock:server
   # or with custom port
   npm run mock:server:port 3001
   ```

2. **Add localhost as a site in your frontend:**
   - URL: `http://localhost:3001`
   - Use any OAuth scope (recommend `admin` for full testing)

3. **Perform the update workflow as normal!**

## Available Scenarios

The mock server comes with pre-configured scenarios that simulate different Contao Manager states:

### 🎯 Happy Path Scenarios
- **`happy-path.complete-update-success`** - Complete update workflow with self-update and migrations
- **`happy-path.migrations-only`** - Only database migrations needed
- **`happy-path.self-update-only`** - Only manager self-update needed
- **`happy-path.no-updates`** - System is already up to date
- **`happy-path.backup-and-update`** - Update workflow with backup creation

### ❌ Error Scenarios  
- **`error-scenarios.composer-update-failure`** - Composer update fails with dependency conflicts
- **`error-scenarios.migration-failure`** - Database migration fails
- **`error-scenarios.authentication-error`** - All API calls return 401 Unauthorized
- **`error-scenarios.network-timeout`** - Simulate slow/failing network
- **`error-scenarios.disk-space-full`** - Insufficient disk space errors
- **`error-scenarios.permission-errors`** - File permission issues
- **`error-scenarios.maintenance-mode-stuck`** - Maintenance mode cannot be disabled

### 🔧 Edge Cases
- **`edge-cases.high-latency-network`** - Very slow network responses (2s delay)
- **`edge-cases.rapid-state-changes`** - Tasks change status very quickly
- **`edge-cases.large-migration-set`** - Many database operations
- **`edge-cases.concurrent-operations`** - Multiple operations attempted

## Scenario Management

### Change Scenario During Testing

You can switch scenarios while the UI is running using API calls:

```bash
# Load a specific scenario
curl -X POST http://localhost:3001/mock/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "error-scenarios.composer-update-failure"}'

# Reset to default state
curl -X POST http://localhost:3001/mock/reset

# Check current state
curl http://localhost:3001/mock/state
```

### List All Available Scenarios

```bash
curl http://localhost:3001/mock/scenarios
```

## UI Testing Workflows

### 1. Test Happy Path Update
```bash
# Start with default scenario (happy path)
npm run mock:server

# In your UI:
# 1. Add http://localhost:3001 as site
# 2. Navigate to site details
# 3. Perform update workflow
# 4. Observe: self-update → migrations → completion
```

### 2. Test Error Handling
```bash
# Start mock server
npm run mock:server

# Switch to error scenario
curl -X POST http://localhost:3001/mock/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "error-scenarios.composer-update-failure"}'

# In your UI:
# 1. Start update workflow  
# 2. Observe error handling and user feedback
# 3. Test retry mechanisms
```

### 3. Test Network Conditions
```bash
# Test with high latency
curl -X POST http://localhost:3001/mock/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "edge-cases.high-latency-network"}'

# Test timeout handling
curl -X POST http://localhost:3001/mock/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "error-scenarios.network-timeout"}'
```

## Authentication Flow

The mock server automatically handles OAuth authentication:

1. **OAuth Authorization**: `GET /oauth2/authorize` redirects back with a mock token
2. **Token Exchange**: `POST /oauth2/token` returns a valid mock token  
3. **API Access**: All `/api/*` endpoints accept any Bearer token

**No real authentication setup required** - just add the localhost URL and use any scope.

## Debugging and Monitoring

### Console Output
The mock server provides detailed logging:
```
[MOCK] GET /api/server/self-update
[OAUTH] Authorization request: { response_type: 'token', scope: 'admin' }
[TASK] Task created: composer/update
[MIGRATION] Migration started with 5 operations
```

### Health Check
Check if the server is running: `GET http://localhost:3001/health`

### State Inspection
View current mock state: `GET http://localhost:3001/mock/state`

## Advanced Testing Scenarios

### Multi-Step Workflow Testing
```bash
# 1. Start with no updates needed
curl -X POST http://localhost:3001/mock/scenario -d '{"scenario": "happy-path.no-updates"}'

# 2. Switch to updates available mid-session
curl -X POST http://localhost:3001/mock/scenario -d '{"scenario": "happy-path.complete-update-success"}'

# 3. Test UI refresh/polling behavior
```

### Error Recovery Testing
```bash
# 1. Start update that will fail
curl -X POST http://localhost:3001/mock/scenario -d '{"scenario": "error-scenarios.composer-update-failure"}'

# 2. Let update fail in UI
# 3. Switch to success scenario
curl -X POST http://localhost:3001/mock/scenario -d '{"scenario": "happy-path.complete-update-success"}'

# 4. Test retry functionality
```

### Performance Testing
```bash
# Test with slow responses
curl -X POST http://localhost:3001/mock/scenario -d '{"scenario": "edge-cases.high-latency-network"}'

# Test with rapid changes
curl -X POST http://localhost:3001/mock/scenario -d '{"scenario": "edge-cases.rapid-state-changes"}'
```

## Tips for Effective UI Testing

1. **Start with Happy Path**: Always test the normal flow first
2. **Test Error States**: Verify user feedback and recovery options  
3. **Check Loading States**: Confirm spinners and progress indicators
4. **Test Polling**: Verify automatic status updates work correctly
5. **Validate User Actions**: Ensure buttons disable/enable appropriately
6. **Test Navigation**: Confirm users can navigate during long operations

## Scenario Customization

You can modify scenarios in the JSON files:
- `src/test/scenarios/happy-path.json`
- `src/test/scenarios/error-scenarios.json`
- `src/test/scenarios/edge-cases.json`

Or create new scenarios by calling the mock state management endpoints.

## Troubleshooting

**Server won't start**: Check if port 3001 is already in use
```bash
lsof -i :3001
```

**OAuth not working**: Ensure your frontend's OAuth redirect URL includes the mock server port

**Scenarios not loading**: Verify JSON files exist in `src/test/scenarios/`

**API calls failing**: Check CORS headers - mock server allows all origins by default

## Integration with Real Testing

This mock server is perfect for:
- **Manual UI testing** during development
- **Automated browser tests** (Playwright, Cypress)
- **Demo scenarios** for stakeholders  
- **Integration testing** of the complete workflow

The mock server runs independently of your main application, so you can test the UI without needing a real Contao Manager instance.