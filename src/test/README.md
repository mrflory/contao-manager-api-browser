# Contao Manager API Testing Suite

This directory contains comprehensive automated tests for the Contao Manager API workflow system, including a sophisticated mock server that simulates all Contao Manager API endpoints.

## Overview

The testing suite provides:

- **Mock Contao Manager API Server** - Full simulation of all endpoints with configurable responses
- **Scenario-Based Testing** - Pre-defined test scenarios for different conditions and edge cases  
- **Integration Tests** - End-to-end workflow testing with the mock server
- **Component Tests** - React component testing with mocked dependencies
- **Error Simulation** - Comprehensive error condition testing
- **Performance Testing** - Network latency and timeout simulation

## Architecture

```
src/test/
├── mockServer/              # Mock Contao Manager API server
│   ├── MockServer.ts       # Main server implementation
│   ├── types.ts           # Type definitions
│   ├── state.ts           # Default state factory
│   ├── scenarioLoader.ts  # Scenario management
│   └── handlers/          # Endpoint handlers
├── scenarios/             # Test scenario configurations
│   ├── happy-path.json    # Success scenarios
│   ├── error-scenarios.json # Error conditions
│   └── edge-cases.json    # Edge case scenarios
├── integration/          # Integration tests
├── components/          # React component tests  
├── utils/              # Test utilities and helpers
└── setup.ts           # Test environment setup
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Categories
```bash
# Integration tests only
npx jest --testPathPattern=integration

# Component tests only  
npx jest --testPathPattern=components

# Mock server tests
npx jest --testPathPattern=mockServer
```

## Test Scenarios

### Happy Path Scenarios
Located in `scenarios/happy-path.json`:

- **complete-update-success** - Full workflow succeeds without issues
- **no-updates-needed** - No manager updates or migrations required
- **manager-update-only** - Only manager needs updating
- **migrations-only** - Only database migrations needed
- **dry-run-success** - Composer dry run completes successfully

### Error Scenarios  
Located in `scenarios/error-scenarios.json`:

- **composer-update-failure** - Dependency conflicts prevent updates
- **migration-failure** - Database migration constraint violations  
- **manager-update-failure** - Permission issues during manager update
- **authentication-error** - API authentication failures
- **pending-tasks-blocking** - Existing tasks prevent workflow start
- **high-latency-network** - Very slow network conditions

### Edge Cases
Located in `scenarios/edge-cases.json`:

- **multiple-migration-cycles** - Multiple rounds of migrations needed
- **empty-migration-hash** - Migration check returns empty hash
- **partial-task-completion** - Task partially completes then fails
- **manager-not-supported** - Manager version doesn't support self-update
- **large-migration-set** - Very large number of pending migrations
- **mixed-package-states** - Complex package dependency states

## Mock Server

### Starting the Mock Server
```typescript
import { MockServer } from './mockServer/MockServer';

const mockServer = new MockServer();
await mockServer.start(3001);
```

### Loading Scenarios
```typescript
import { scenarioLoader } from './mockServer/scenarioLoader';

await scenarioLoader.loadAllScenarios();
const scenario = scenarioLoader.getScenario('happy-path.complete-update-success');
mockServer.loadScenario(scenario);
```

### API Endpoints

The mock server implements all Contao Manager API endpoints:

#### Server Information
- `GET /api/server/self-update` - Manager update information
- `GET /api/server/config` - Server configuration
- `GET /api/server/php-web` - PHP web version info
- `GET /api/server/contao` - Contao installation info

#### Task Management
- `GET /api/task` - Get current task status
- `PUT /api/task` - Create new task
- `PATCH /api/task` - Update task status (abort)
- `DELETE /api/task` - Delete completed task

#### Database Migrations
- `GET /api/contao/database-migration` - Get migration status
- `PUT /api/contao/database-migration` - Start migration check/execution
- `DELETE /api/contao/database-migration` - Delete migration task

#### Packages
- `GET /api/packages/root` - Root package information
- `GET /api/packages/local/` - Local package listing

#### Maintenance & Backup
- `GET/PUT/DELETE /api/contao/maintenance-mode` - Maintenance mode control
- `GET /api/contao/backup` - Backup listing

### Realistic Behavior Simulation

The mock server simulates realistic API behavior:

- **Task Execution Timing** - Tasks take realistic time to complete
- **Status Transitions** - Proper active → complete/error status flow
- **Network Latency** - Configurable response delays
- **Error Conditions** - Authentication, permission, and validation errors
- **State Consistency** - Maintains consistent internal state

## Writing Tests

### Integration Tests

Test complete workflows with the mock server:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflow } from '../../backup/useWorkflowOld';
import { withMockServer, loadScenario, TestContext } from '../utils/testHelpers';

describe('Workflow Integration Tests', () => {
  let testContext: TestContext;

  beforeEach(async () => {
    testContext = await setupTestEnvironment();
  });

  afterEach(async () => {
    await teardownTestEnvironment(testContext);
  });

  test('complete workflow succeeds', async () => {
    loadScenario(testContext.mockServer, 'happy-path.complete-update-success');

    const { result } = renderHook(() => useWorkflow());

    act(() => {
      result.current.initializeWorkflow({ performDryRun: true });
    });

    await act(async () => {
      result.current.startWorkflow();
    });

    await waitFor(() => {
      expect(result.current.state).toBeWorkflowComplete();
    }, { timeout: 10000 });
  });
});
```

### Component Tests

Test React components with mocked dependencies:

```typescript
import { renderWithProviders, mockUseWorkflow } from '../utils/mockHelpers';
import { UpdateWorkflow } from '../../components/UpdateWorkflow';

test('shows start button when workflow is ready', () => {
  const state = createMockWorkflowState();
  mockUseWorkflowHook.mockReturnValue(mockUseWorkflow(state));

  renderWithProviders(<UpdateWorkflow />);

  expect(screen.getByText('Start Update Workflow')).toBeInTheDocument();
});
```

### Custom Jest Matchers

The test suite includes custom Jest matchers for workflow testing:

```typescript
// Check workflow status
expect(workflowState).toHaveWorkflowStatus('running');

// Check step status
expect(workflowState).toHaveStepWithStatus('composer-update', 'complete');
expect(workflowState).toHaveCompletedStep('check-tasks');
expect(workflowState).toHaveActiveStep('composer-update');

// Check workflow position
expect(workflowState).toBeAtStep('check-migrations-loop');

// Check step order
expect(workflowState).toHaveStepsInOrder([
  'check-tasks', 'check-manager', 'composer-update'
]);

// Check error conditions
expect(workflowState).toHaveErrorInStep('composer-update', 'Dependency conflict');

// Check completion
expect(workflowState).toBeWorkflowComplete();
expect(workflowState).toHavePendingMigrations();
```

## Test Utilities

### Test Helpers

- **setupTestEnvironment()** - Create mock server and test context
- **teardownTestEnvironment()** - Clean up test resources
- **loadScenario()** - Load and apply scenario to mock server
- **createTestApiClient()** - Create API client for mock server
- **waitFor()** - Wait for conditions with timeout
- **mockConsole()** - Mock console methods for clean test output

### Mock Helpers

- **renderWithProviders()** - Render components with Chakra UI and Router
- **createMockWorkflowState()** - Create workflow state for testing
- **mockUseWorkflow()** - Mock the useWorkflow hook
- **setupFetchMock()** - Mock global fetch for API calls

## Test Data Management

### Creating New Scenarios

Add new scenarios to the appropriate JSON file:

```json
{
  "name": "my-new-scenario",
  "description": "Description of what this scenario tests",
  "state": {
    "selfUpdate": {
      "current_version": "1.9.4",
      "latest_version": "1.9.5"
    },
    "scenarios": {
      "taskFailures": {
        "composer/update": "Custom error message"
      }
    }
  }
}
```

### Dynamic Scenario Creation

Create scenarios programmatically:

```typescript
import { scenarioLoader } from '../mockServer/scenarioLoader';

const dynamicScenario = scenarioLoader.createDynamicScenario(
  'test-scenario',
  'Testing specific condition',
  {
    selfUpdate: { current_version: '1.9.5', latest_version: '1.9.5' },
    scenarios: { networkLatency: 1000 }
  }
);

mockServer.loadScenario(dynamicScenario);
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Push to main branch
- Scheduled daily runs

### Test Configuration

The Jest configuration supports both Node.js and browser environments:

- **Node.js environment** - Integration tests with mock server
- **JSDOM environment** - React component tests
- **Coverage reporting** - HTML and LCOV formats
- **Global setup/teardown** - Mock server lifecycle management

## Debugging Tests

### Verbose Logging

Enable detailed logging:
```bash
npm test -- --verbose
```

### Debug Specific Tests
```bash
npm test -- --testNamePattern="composer update failure"
```

### Mock Server Debugging

The mock server logs all requests and responses:
```
[MOCK] PUT /api/task {"name":"composer/update","config":{"dry_run":true}}
[MOCK] Loaded scenario: error-scenarios.composer-update-failure
```

### Console Output

Console methods are mocked by default. To see actual console output:
```typescript
// In test file
const consoleMock = mockConsole();
// ... run tests
consoleMock.restore();
```

## Performance Testing

### Load Testing

Test workflow under various network conditions:
```typescript
loadScenario(mockServer, 'error-scenarios.high-latency-network');
// Tests will include 2000ms network latency
```

### Memory Testing

Monitor memory usage during long-running tests:
```bash
npm run test:coverage -- --detectLeaks
```

### Timeout Configuration

Adjust timeouts for slow systems:
```typescript
await waitFor(() => {
  expect(condition).toBeTruthy();
}, { timeout: 15000 }); // 15 second timeout
```

## Troubleshooting

### Common Issues

1. **Port Conflicts** - Mock server uses random ports to avoid conflicts
2. **Timeout Errors** - Increase timeout values for slow systems
3. **Scenario Loading** - Verify scenario files exist and are valid JSON
4. **Mock Server State** - Reset state between tests with `mockServer.reset()`

### Test Isolation

Each test gets a fresh mock server instance:
```typescript
beforeEach(async () => {
  testContext = await setupTestEnvironment(); // Fresh server
});

afterEach(async () => {
  await teardownTestEnvironment(testContext); // Cleanup
});
```

### Debugging Failed Tests

1. Check mock server logs for request/response details
2. Verify scenario configuration matches test expectations  
3. Add debug logging to test code
4. Use Jest's `--bail` flag to stop on first failure

## Best Practices

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names that explain the scenario
- Keep tests focused on single behaviors
- Use setup/teardown for common initialization

### Mock Server Usage

- Load appropriate scenarios for each test case
- Reset server state between tests
- Use realistic timing for task simulation
- Test both success and failure paths

### Assertion Strategies

- Use custom matchers for workflow-specific assertions
- Test intermediate states, not just final outcomes
- Verify error messages and status codes
- Check timing and performance characteristics

### Test Data

- Keep scenario files focused and minimal
- Use descriptive scenario names
- Document complex scenarios with comments
- Validate scenario structure in tests