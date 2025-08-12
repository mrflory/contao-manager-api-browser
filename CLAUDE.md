# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start the production server (serves React build)
- `npm run dev` - Start development server with nodemon auto-reload (serves static files)
- `npm run dev:react` - Start Vite development server for React (development mode with hot reload)
- `npm run dev:full` - Start both backend and frontend development servers concurrently
- `npm run build` - Build React application for production
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally
- `npm run test` - Run Jest test suite
- `npm run test:watch` - Run Jest tests in watch mode
- `npm run test:coverage` - Run Jest tests with coverage reporting
- `npm run test:react19-compat` - Test React v19 compatibility
- `npm run test:chakra-v3-compat` - Test Chakra UI v3 compatibility
- `npm run test:build` - Build and preview to test production build
- `node server.js` - Direct server execution

## Architecture Overview

This is a Node.js proxy application that provides a modern web interface for interacting with Contao Manager APIs. The application uses a modular, service-oriented architecture with three main layers:

### Server Layer (`server.js`)
- **Express.js server** serving both API endpoints and static files
- **Proxy functionality** - forwards API requests to external Contao Manager instances
- **Six main API endpoints**:
  - `POST /api/set-active-site` - Sets the active site in multi-site configuration
  - `POST /api/update-site-name` - Updates the display name for a site
  - `POST /api/save-token` - Saves OAuth token for a site after authentication
  - `POST /api/validate-token` - Validates API token with Contao Manager
  - `POST /api/update-version-info` - Fetches version information for a site
  - `POST /api/update-status` - Fetches composer and self-update status using token authentication

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
  - **Workflow**: Step components, confirmations, operations
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

- **No database** - uses JSON file storage (`data/config.json`) for site configurations and tokens
- **CORS enabled** for cross-origin requests
- **OAuth token authentication** - supports TOTP/2FA through Contao Manager's built-in flow
- **Server-side token persistence** - multi-site token management with automatic saving
- **Error handling** returns structured JSON responses with appropriate HTTP status codes
- **Timeout handling** - 10 second timeout on external API calls
- **Static file serving** from `public/` directory
- **Modern React patterns** - Uses React v19 features and concurrent rendering
- **Chakra UI v3 architecture** - Component composition with custom UI components
- **TypeScript strict mode** - Full type safety across frontend and backend
- **ESLint integration** - Code quality enforcement with React and TypeScript rules
- **Vite build system** - Fast development and optimized production builds

## Common Issues

- **"Invalid token"** errors indicate token has expired or is malformed
- **Connection timeouts** may occur if the target Contao Manager is slow or unreachable
- **Token expiration** requires re-authentication through the OAuth flow
- **Build errors** after React v19 upgrade - check component prop types and concurrent features
- **Chakra UI v3 migration** - Modal components replaced with Dialog, some prop changes required

## Component Architecture

### Custom UI Components (src/components/ui/)
Following Chakra UI v3 patterns, custom components include:
- `accordion.tsx` - Accordion to show/hide sections
- `button.tsx` - Enhanced button variants
- `checkbox.tsx` - Enhanced checkbox components
- `close-button.tsx` - Dialog and modal close buttons
- `color-mode.tsx` - Theme switching utilities
- `dialog.tsx` - Modal replacement with new Dialog API
- `field.tsx` - Form field wrapper components
- `progress.tsx` - Component for a progress bar
- `provider.tsx` - Chakra UI theme and color mode provider
- `select.tsx` - Enhanced select components
- `timeline.tsx` - Workflow timeline visualization
- `toaster.tsx` - Toast notification system
- `toggle-tip.tsx` - Enhanced toggle with tooltip functionality
- `tooltip.tsx` - Enhanced tooltip components

### Development Guidelines
- Use TypeScript for all new code
- Follow Chakra UI v3 component composition patterns
- Utilize React v19 concurrent features where appropriate
- Implement proper error boundaries and loading states
- Maintain responsive design across all components