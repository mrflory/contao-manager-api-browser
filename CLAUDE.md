# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start the production server (serves React build)
- `npm run dev` - Start development server with nodemon auto-reload (serves static files)
- `npm run dev:react` - Start Vite development server for React (development mode with hot reload)
- `npm run build` - Build React application for production
- `npm run preview` - Preview production build locally
- `node server.js` - Direct server execution

## Architecture Overview

This is a Node.js proxy application that provides a web interface for interacting with Contao Manager APIs. The application consists of three main components:

### Server Layer (`server.js`)
- **Express.js server** serving both API endpoints and static files
- **Proxy functionality** - forwards API requests to external Contao Manager instances
- **Two main API endpoints**:
  - `POST /api/validate-token` - Validates API token with Contao Manager
  - `POST /api/update-status` - Fetches composer and self-update status using token authentication

### Frontend (React Application)
- **React single-page application** with TypeScript
- **Multi-page interface**:
  - Sites overview table with all configured sites
  - Site details page with function buttons
  - Add site page for OAuth flow
- **Routing** - React Router for navigation between pages
- **Modal interface** - API call results displayed in modals
- **OAuth redirect flow** - redirects to Contao Manager for token generation
- **Token extraction** - parses access token from URL fragment after OAuth redirect
- **Client-side token management** - stores authentication token in memory and localStorage

### Authentication Flow (OAuth Token-based)
1. User enters Contao Manager URL and selects required permissions (scope)
2. Application redirects to Contao Manager OAuth endpoint with parameters:
   - `response_type=token`
   - `scope` (read, update, install, admin)
   - `client_id` (application name)
   - `redirect_uri` (callback URL with #token fragment)
3. User authenticates with Contao Manager (including TOTP if required)
4. Contao Manager redirects back with access token in URL fragment
5. Frontend extracts token from URL and stores it client-side
6. Token is used for API calls with `Contao-Manager-Auth: ${token}` header

## Key Technical Details

- **No database** - stateless proxy architecture
- **CORS enabled** for cross-origin requests
- **OAuth token authentication** - supports TOTP/2FA through Contao Manager's built-in flow
- **Error handling** returns structured JSON responses with appropriate HTTP status codes
- **Timeout handling** - 10 second timeout on external API calls
- **Static file serving** from `public/` directory

## Common Issues

- **"Invalid token"** errors indicate token has expired or is malformed
- **Connection timeouts** may occur if the target Contao Manager is slow or unreachable
- **Token expiration** requires re-authentication through the OAuth flow