# Contao Manager API Browser

A web-based interface for managing multiple Contao Manager instances through their APIs. This application provides a centralized dashboard to monitor update status, manage API tokens, and interact with Contao Manager installations.

## Features

- **Multi-site Management**: Manage multiple Contao Manager instances from one interface
- **OAuth Authentication**: Secure token generation through Contao Manager's built-in OAuth flow
- **Update Monitoring**: Check composer and self-update status across all your sites
- **Token Management**: Store and manage API tokens securely
- **Responsive Interface**: Clean, user-friendly web interface built with React
- **TOTP Support**: Works with Two-Factor Authentication enabled Contao Manager instances

## Prerequisites

- Node.js 18+ and npm
- Access to one or more Contao Manager installations
- Network connectivity to your Contao Manager instances

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd contao-manager-api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up configuration**:
   ```bash
   # Copy the example configuration
   cp data/config.example.json data/config.json
   ```

4. **Build the React application** (for production):
   ```bash
   npm run build
   ```

## Usage

### Development Mode

Start both the API server and React development server:
```bash
# Start API server with auto-reload
npm run dev

# In another terminal, start React development server
npm run dev:react
```

The application will be available at:
- API Server: http://localhost:3000
- React Dev Server: http://localhost:5173

### Production Mode

```bash
# Build and start production server
npm run build
npm start
```

The application will be available at http://localhost:3000

## Configuration

The application stores site configurations in `data/config.json`. This file is automatically created when you add your first site through the web interface.

### Example Configuration Structure:
```json
{
  "sites": {
    "https://example.com/contao-manager.phar.php": {
      "name": "Example Site",
      "url": "https://example.com/contao-manager.phar.php",
      "token": "your-api-token-here",
      "lastUsed": "2025-01-01T00:00:00.000Z"
    }
  },
  "activeSite": "https://example.com/contao-manager.phar.php"
}
```

## Adding Sites

1. **Access the Application**: Open your browser and navigate to the application URL
2. **Enter Contao Manager URL**: Provide the full URL to your Contao Manager (e.g., `https://example.com/contao-manager.phar.php`)
3. **Select Permissions**: Choose the required API scope:
   - `read`: View-only access
   - `update`: Read + update capabilities
   - `install`: Read + update + package installation
   - `admin`: Full administrative access
4. **OAuth Authentication**: You'll be redirected to your Contao Manager for authentication
5. **Complete Setup**: After authentication, the token will be automatically extracted and saved

## API Endpoints

The application provides several API endpoints:

- `POST /api/validate-token` - Validate API token with Contao Manager
- `POST /api/update-status` - Fetch composer and self-update status
- `GET /api/config` - Get current configuration
- `POST /api/set-active-site` - Set active site
- `POST /api/save-token` - Save new API token
- `DELETE /api/sites/:url` - Remove a site

## Authentication & Security

- **OAuth Flow**: Uses Contao Manager's built-in OAuth for secure token generation
- **Token Storage**: API tokens are stored locally in the configuration file
- **CORS Support**: Configured for cross-origin requests
- **No Database**: Stateless proxy architecture for simplicity
- **Timeout Handling**: 10-second timeout on external API calls

## Troubleshooting

### Common Issues

**"Invalid token" errors**
- Token may have expired - regenerate through OAuth flow
- Check that the token has sufficient permissions for the requested operation

**Connection timeouts**
- Verify the Contao Manager URL is correct and accessible
- Check that your server can reach the target Contao Manager instance
- Ensure firewall settings allow outbound connections

**Permission errors**
- Different operations require different API scopes:
  - Composer status: `read` or higher
  - Self-update status: `update` or higher
- Regenerate token with appropriate permissions if needed

## Development

### Project Structure
```
├── server.js              # Express.js API server
├── src/                   # React application source
│   ├── App.tsx            # Main application component
│   ├── components/        # Reusable components
│   ├── pages/             # Page components
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── data/                  # Configuration storage
│   └── config.example.json
├── public/                # Static files for development
└── dist/                  # Built React application
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development API server with auto-reload
- `npm run dev:react` - Start Vite development server for React
- `npm run build` - Build React application for production
- `npm run preview` - Preview production build locally

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the [Contao Manager documentation](https://docs.contao.org/manual/en/installation/contao-manager/)
- Open an issue in this repository