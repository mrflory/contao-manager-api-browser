# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start production server (TypeScript backend serving React build)
- `npm run dev` - Start development server with TypeScript backend and auto-reload
- `npm run dev:react` - Start Vite development server for React frontend
- `npm run dev:full` - Start both backend and frontend development servers concurrently
- `npm run build` - Build complete application (backend + frontend)
- `npm run build:server` - Build TypeScript backend only
- `npm run lint` - Run ESLint code quality checks
- `npm run test` - Run Jest test suite
- `npm run test:watch` - Run Jest tests in watch mode
- `npm run test:coverage` - Generate test coverage reports
- `npm run mock:server` - Start TypeScript mock server for testing

## Architecture Overview

This is a Node.js proxy application that provides a modern web interface for interacting with Contao Manager APIs. The application uses a modular, service-oriented architecture with three main layers:

### Server Layer (TypeScript Backend - `src/server.ts`)
- **Express.js TypeScript server** with modular service architecture
- **Service-oriented design** with dedicated services:
  - `ConfigService` - Site configuration and storage management
  - `AuthService` - OAuth token validation and authentication
  - `ProxyService` - API forwarding to Contao Manager instances
  - `LoggingService` - Request/response logging and audit trails
  - `HistoryService` - Workflow execution history tracking
  - `SnapshotService` - System state capture and management
- **Comprehensive API endpoints** for site management, authentication, and workflow execution
- **Middleware architecture** with authentication, scope validation, and response logging

### Frontend (React Application)
- **React v19 single-page application** with TypeScript and modular architecture
- **Chakra UI v3** for component library and theming
- **Service Layer Architecture**:
  - Centralized API management with `apiCallService`
  - Authentication service for OAuth flows
  - Specialized services (Expert, Task, Logs) with proper error handling
- **Custom Hooks**:
  - `useApiCall` for consistent API state management
  - `useAuth` for authentication flows
  - `useModalState` for dialog management
  - `useToastNotifications` for user feedback
- **Modular Components**:
  - **Pages**: Sites overview, site details, add site
  - **Display**: Loading states, empty states, version badges
  - **Forms**: URL input, scope selector with validation
  - **Modals**: API result display, confirmation dialogs
  - **Site Details**: Dedicated tabs (Info, Expert, Logs, Management)
  - **Workflow**: Timeline-based execution, step management, user confirmations
- **Workflow Engine**: Timeline-based execution system with:
  - Generic workflow engine supporting multiple workflow types
  - Timeline item abstraction for reusable workflow steps
  - State management with execution history and context
  - Event-driven architecture with pausable/resumable execution
  - Integration with history service for audit trails
- **Routing** - React Router v7 for navigation between pages
- **OAuth redirect flow** - redirects to Contao Manager for token generation
- **Token extraction** - parses access token from URL fragment after OAuth redirect
- **Server-side token storage** - tokens stored in `data/config.json` file on server
- **Theme support** - Dark/light mode toggle using next-themes integration

### Authentication Flow (OAuth Token-based)
1. User enters Contao Manager URL and selects required permissions (scope)
2. Application redirects to Contao Manager OAuth endpoint with parameters:
   - `response_type=token`
   - `scope` (read, update, install, admin)
   - `client_id` (application name)
   - `redirect_uri` (callback URL with #token fragment)
3. User authenticates with Contao Manager (including TOTP if required)
4. Contao Manager redirects back with access token in URL fragment
5. Frontend extracts token from URL and sends it to server for storage in `data/config.json`
6. Server stores site configuration with token and uses it for subsequent API calls

## Key Technical Details

- **Full TypeScript Stack** - Both frontend and backend written in TypeScript with strict type safety
- **Service-Oriented Architecture** - Modular backend services with clear separation of concerns
- **Workflow Engine** - Generic timeline-based execution system for complex multi-step operations
- **JSON File Storage** - No database dependency, uses `data/config.json` for configuration
- **OAuth Token Authentication** - Supports TOTP/2FA through Contao Manager integration
- **Request/Response Logging** - Comprehensive audit trails with structured logging
- **History Tracking** - Workflow execution history with detailed step information
- **Modern React Architecture** - React v19 with Chakra UI v3 component system
- **Build System** - Vite for frontend, separate TypeScript compilation for backend
- **Development Tooling** - ESLint, Jest testing, multiple TypeScript configurations

## Common Issues

- **Token errors** - "Invalid token" indicates expired/malformed tokens, requires OAuth re-authentication
- **Connection timeouts** - Target Contao Manager may be slow or unreachable
- **TypeScript compilation** - Ensure proper imports and type definitions across services
- **Workflow execution** - Check timeline state and execution history for debugging
- **Build issues** - Verify TypeScript configurations for backend vs frontend builds

## Project Structure

### Backend Services (`src/services/`)
- `configService.ts` - Site configuration and JSON storage management
- `authService.ts` - OAuth token validation and authentication logic
- `proxyService.ts` - API forwarding to Contao Manager instances
- `loggingService.ts` - Request/response logging and audit trails
- `historyService.ts` - Workflow execution history tracking
- `snapshotService.ts` - System state capture and management

### Workflow System (`src/workflow/`)
- `engine/` - Generic timeline-based workflow execution engine
- `items/` - Specific workflow step implementations
- `hooks/` - React hooks for workflow state management
- `ui/` - Workflow visualization and user interaction components

### Frontend Components (`src/components/`)
- `ui/` - Chakra UI v3 custom components (dialogs, timelines, etc.)
- `workflow/` - Workflow-specific UI components
- `site-details/` - Site management interface components
- `modals/` - Dialog and confirmation components

### Development Guidelines
- **TypeScript First** - All new code must be TypeScript with proper typing
- **Service Architecture** - Use dependency injection and service abstraction
- **Workflow Design** - Extend timeline items for new workflow steps
- **Component Patterns** - Follow Chakra UI v3 composition patterns
- **Error Handling** - Implement proper error boundaries and user feedback

## Testing Infrastructure

### Mock Server (`src/test/mockServer/`)
TypeScript-based mock server simulating the complete Contao Manager API:
- **Command**: `npm run mock:server` (starts on http://localhost:3001)
- **Scenarios**: JSON-based test scenarios (happy-path, error-scenarios, edge-cases)
- **Features**: OAuth simulation, realistic timing, web interface for scenario control

### Testing Workflow
1. Start mock server: `npm run mock:server`
2. Add test site: `http://localhost:3001/contao-manager.phar.php`
3. Use OAuth scope: `admin` for full testing coverage
4. Test complete workflows end-to-end
5. Switch scenarios via API or web interface

### Testing Commands
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage reports

### Scenario Management
```bash
# Load specific scenario
curl -X POST http://localhost:3001/mock/scenario -H "Content-Type: application/json" \
  -d '{"scenario": "error-scenarios.composer-update-failure"}'

# Reset to default
curl -X POST http://localhost:3001/mock/reset
```