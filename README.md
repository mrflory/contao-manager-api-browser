# Contao Manager API Browser

A modern web-based interface for managing multiple Contao Manager instances through their APIs. This TypeScript application provides a centralized dashboard with workflow automation, comprehensive monitoring, and secure token management for your Contao installations.

## Features

- **Multi-site Management**: Manage multiple Contao Manager instances from one centralized interface
- **OAuth Authentication**: Secure token generation through Contao Manager's built-in OAuth flow with TOTP support
- **Workflow Automation**: Timeline-based execution system for complex multi-step operations like composer updates
- **Comprehensive Monitoring**: Real-time status tracking for composer updates, self-updates, and system health
- **History & Audit Trails**: Complete execution history with detailed logging for all operations
- **Modern UI**: Built with React v19 and Chakra UI v3 with dark/light mode support
- **Full TypeScript Stack**: Type-safe development with comprehensive error handling

## Prerequisites

- Node.js 18+ and npm
- Access to one or more Contao Manager installations
- Network connectivity to your Contao Manager instances

## Quick Start

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd contao-manager-api
   npm install
   ```

2. **Start Development Servers**:
   ```bash
   # Option 1: Start both servers with one command
   npm run dev:full
   
   # Option 2: Start servers separately (in different terminals)
   npm run dev        # Backend server (port 3000)
   npm run dev:react  # Frontend server (port 5173)
   ```

3. **Access the Application**:
   - Open http://localhost:5173 in your browser (React dev server)
   - The backend API runs on http://localhost:3000

4. **Add Your First Site**:
   - Enter your Contao Manager URL (e.g., `https://example.com/contao-manager.phar.php`)
   - Select the appropriate permissions scope
   - Complete OAuth authentication through your Contao Manager

## Production Setup

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

The application will serve the built React frontend and API backend on http://localhost:3000

## Using the Application

### Managing Sites

1. **Adding Sites**: Click "Add New Site" and provide:
   - Contao Manager URL (full path to contao-manager.phar.php)
   - Permission scope (read, update, install, or admin)
   - Complete OAuth authentication

2. **Site Operations**: For each site you can:
   - View system information and status
   - Execute composer updates with workflow automation
   - Browse logs and execution history
   - Manage API tokens and permissions

3. **Workflow Automation**: Complex operations like composer updates run as automated workflows with:
   - Step-by-step progress visualization
   - Pause/resume capabilities
   - Complete audit trails
   - Error handling and recovery

### Permission Scopes

- **read**: View-only access to status and information
- **update**: Read access plus composer and self-update capabilities
- **install**: Update access plus package installation/removal
- **admin**: Full administrative access to all features

### Development Commands

For developers working on this application:

```bash
npm run dev          # Start TypeScript backend with auto-reload
npm run dev:react    # Start React development server (port 5173)
npm run dev:full     # Start both backend and frontend concurrently
npm run build        # Build complete application
npm run test         # Run Jest test suite
npm run lint         # Run ESLint code quality checks
npm run mock:server  # Start mock Contao Manager for testing
```

## Configuration

The application automatically creates `data/config.json` when you add your first site. All configuration is managed through the web interface - no manual file editing required.

### Configuration Structure:
```json
{
  "sites": {
    "https://example.com/contao-manager.phar.php": {
      "name": "Example Site",
      "url": "https://example.com/contao-manager.phar.php", 
      "token": "oauth-token-from-contao-manager",
      "scope": "admin",
      "lastUsed": "2025-01-01T00:00:00.000Z"
    }
  },
  "activeSite": "https://example.com/contao-manager.phar.php"
}
```

## Architecture

This application features a modern TypeScript architecture:

### Backend (TypeScript Express Server)
- **Service-oriented architecture** with dedicated services for configuration, authentication, proxying, logging, and history
- **Comprehensive API endpoints** for site management and workflow execution  
- **Request/response logging** with complete audit trails
- **OAuth token validation** and secure API forwarding

### Frontend (React v19 + Chakra UI v3)
- **Modern React architecture** with TypeScript throughout
- **Workflow engine** for complex multi-step operations
- **Custom hooks** for API management, authentication, and state handling
- **Responsive design** with dark/light mode support

### Key Features
- **No database required** - uses JSON file storage for simplicity
- **Full TypeScript stack** with comprehensive type safety
- **Workflow automation** with timeline visualization and pause/resume
- **OAuth integration** supporting TOTP/2FA authentication
- **Mock server** for development and testing

## Troubleshooting

### Common Issues

**"Invalid token" errors**
- Token may have expired - use "Refresh Token" in site settings or re-authenticate via OAuth
- Verify the token has sufficient scope for the requested operation
- Check that your Contao Manager instance is accessible

**Connection timeouts or unreachable sites**
- Verify the Contao Manager URL is correct and accessible from your server
- Check firewall settings allow outbound HTTPS connections
- Ensure the target Contao Manager is not behind authentication or VPN

**Workflow execution issues**
- Check the History tab for detailed execution logs and error messages  
- Workflows can be paused/resumed if they encounter temporary issues
- Use the mock server (`npm run mock:server`) to test workflow functionality

**Permission scope issues**
- Different operations require different scopes (read < update < install < admin)
- Re-authenticate with higher permissions if needed for advanced operations

## Development & Testing

### Testing with Mock Server

For safe development and testing without affecting real Contao Manager instances:

1. **Start mock server**: `npm run mock:server` (runs on http://localhost:3001)
2. **Add test site**: Use URL `http://localhost:3001/contao-manager.phar.php`  
3. **Use admin scope**: Select "admin" permissions for full feature testing
4. **Test workflows**: Execute composer updates and other operations safely

The mock server includes realistic response timing, error scenarios, and a web interface for scenario management.

### Project Structure
```
├── src/
│   ├── server.ts          # TypeScript Express server  
│   ├── services/          # Backend services (Config, Auth, Proxy, etc.)
│   ├── workflow/          # Workflow engine and timeline items
│   ├── components/        # React components and UI
│   ├── pages/             # Page components  
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript definitions
├── src/test/mockServer/   # Mock Contao Manager for testing
├── data/                  # Configuration storage
└── dist/                  # Built application
```

### Contributing

1. Fork the repository and create a feature branch
2. Use TypeScript throughout with proper type definitions  
3. Follow existing code patterns and service architecture
4. Test with the mock server before submitting
5. Run `npm run lint` and `npm test` to ensure code quality
6. Submit a pull request with a clear description

## Support

For issues, questions, or feature requests:
- Check the troubleshooting section above
- Test with the mock server to isolate issues  
- Review the [Contao Manager API documentation](https://docs.contao.org/manual/en/installation/contao-manager/)
- Open an issue in this repository with detailed information

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.