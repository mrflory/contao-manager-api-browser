---
layout: default
title: Getting Started
nav_order: 2
description: "Installation and setup guide for Contao Manager API Browser"
---

# Getting Started
{: .no_toc }

Get your Contao Manager API Browser up and running in minutes with this step-by-step guide.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

Before installing, make sure you have:

- **Node.js 18 or higher** and npm installed
- **Access to Contao Manager instances** you want to manage
- **Network connectivity** from your server to the Contao Manager instances

## Installation

### Option 1: Quick Start (Recommended)

Clone the repository and install dependencies:

```bash
git clone https://github.com/mrflory/contao-manager-api-browser.git
cd contao-manager-api-browser
npm install
```

### Option 2: Download Release

Download the latest release from the [GitHub releases page](https://github.com/mrflory/contao-manager-api-browser/releases) and extract the files.

## Running the Application

### Development Mode

For development or testing, start both the backend and frontend servers:

```bash
# Start both servers with one command (recommended)
npm run dev:full
```

This will start:
- Backend API server on `http://localhost:3000`
- Frontend development server on `http://localhost:5173`

**Access the application at: `http://localhost:5173`**

#### Alternative Development Commands

```bash
# Start servers separately (use different terminals)
npm run dev        # Backend only (port 3000)
npm run dev:react  # Frontend only (port 5173)
```

### Production Mode

For production deployment:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

The application will serve both frontend and API on `http://localhost:3000`

---

## First-Time Setup

### 1. Access the Application

Open your web browser and navigate to:
- **Development**: `http://localhost:5173`
- **Production**: `http://localhost:3000`

### 2. Add Your First Site

1. Click **"Add New Site"** button on the main dashboard
2. Enter your **Contao Manager URL**:
   ```
   https://yourdomain.com/contao-manager.phar.php
   ```
3. Select the appropriate **permission scope**:
   - **read**: View-only access to status and information
   - **update**: Read access plus composer and self-update capabilities  
   - **install**: Update access plus package installation/removal
   - **admin**: Full administrative access to all features

### 3. Complete Authentication

The application will redirect you to your Contao Manager for OAuth authentication:

1. **Log in** to your Contao Manager with your credentials
2. **Enter TOTP code** if two-factor authentication is enabled
3. **Authorize the application** to access your Contao Manager
4. You'll be **redirected back** to the API Browser with an active token

### 4. Start Managing

Once authenticated, you can:
- View site status and system information
- Execute composer updates and other operations
- Monitor workflow progress and history
- Manage multiple sites from the same dashboard

---

## Configuration

### Automatic Configuration

The application automatically creates a `data/config.json` file when you add your first site. This file contains:

```json
{
  "sites": {
    "https://example.com/contao-manager.phar.php": {
      "name": "Example Site",
      "url": "https://example.com/contao-manager.phar.php",
      "token": "your-oauth-token",
      "scope": "admin",
      "lastUsed": "2025-01-01T00:00:00.000Z"
    }
  },
  "activeSite": "https://example.com/contao-manager.phar.php"
}
```

### Manual Configuration

You can manually edit the `data/config.json` file if needed, but it's recommended to use the web interface for all configuration changes.

---

## Testing with Mock Server

For safe development and testing without affecting real Contao Manager instances:

### 1. Start the Mock Server

```bash
npm run mock:server
```

The mock server runs on `http://localhost:3001`

### 2. Add Test Site

In the API Browser, add a new site with:
- **URL**: `http://localhost:3001/contao-manager.phar.php`
- **Scope**: `admin` (for full feature testing)

### 3. Test Features

The mock server provides realistic responses for:
- Site information and status
- Composer operations and updates
- Workflow execution and history
- Error scenarios and edge cases

---

## Deployment Options

### Local Network Deployment

Run on a local server accessible to your team:

1. Build and start the production server
2. Configure firewall to allow access on port 3000
3. Access via `http://your-server-ip:3000`

### Docker Deployment

Create a `Dockerfile` for containerized deployment:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Reverse Proxy Setup

For production environments, consider using a reverse proxy (nginx, Apache) to:
- Serve over HTTPS
- Handle SSL certificates
- Provide custom domain access

---

## Next Steps

Now that your Contao Manager API Browser is running:

1. **[Learn how to use the interface]({{ site.baseurl }}/user-guide)** - Complete user guide
2. **[View screenshots of key features]({{ site.baseurl }}/screenshots)** - Visual overview
3. **[Troubleshoot common issues]({{ site.baseurl }}/troubleshooting)** - Solutions to common problems

---

## Need Help?

If you encounter issues during installation or setup:

1. Check the [Troubleshooting Guide]({{ site.baseurl }}/troubleshooting)
2. Test with the mock server to isolate issues
3. Review logs in the browser developer console
4. [Report bugs or request help](https://github.com/mrflory/contao-manager-api-browser/issues) on GitHub

---

**Ready to manage your Contao sites more efficiently? [Continue to the User Guide →]({{ site.baseurl }}/user-guide)**