---
layout: default
title: User Guide
nav_order: 3
description: "Complete guide to using the Contao Manager API Browser interface"
---

# User Guide
{: .no_toc }

Learn how to efficiently manage your Contao sites using the API Browser interface.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Dashboard Overview

The main dashboard provides a centralized view of all your Contao Manager instances. Each site is displayed as a card showing:

- **Site name** and URL
- **Current status** (online, updating, error)
- **Last activity** timestamp
- **Quick access buttons** for common operations
- **Permission scope** indicator

### Navigation Elements

- **Add New Site** - Add additional Contao Manager instances
- **Site Cards** - Click any site card to access detailed management
- **Theme Toggle** - Switch between light and dark modes
- **Settings Menu** - Access global application settings

---

## Adding Sites

### Step 1: Site Information

1. Click **"Add New Site"** from the dashboard
2. Enter the full **Contao Manager URL**:
   ```
   https://yourdomain.com/contao-manager.phar.php
   ```
3. Provide a **display name** (optional - will auto-generate from URL)

### Step 2: Permission Scope

Select the appropriate permission level for this site:

**Read**
: View site information, status, and logs. No modification capabilities.

**Update**
: Read permissions plus composer updates and Contao Manager self-updates.

**Install**
: Update permissions plus package installation, removal, and configuration changes.

**Admin**
: Full access to all Contao Manager features including server settings and advanced operations.

{: .highlight }
**Tip**: Start with the minimum scope needed. You can always re-authenticate with higher permissions later.

### Step 3: Authentication Flow

The application will redirect you to your Contao Manager for secure OAuth authentication:

1. **Login** with your Contao Manager credentials
2. **Two-Factor Authentication** - Enter TOTP code if enabled
3. **Authorize Application** - Grant the requested permissions
4. **Automatic Redirect** - Return to API Browser with active token

---

## Managing Sites

### Site Details Interface

Click any site card to access the detailed management interface with these tabs:

#### Info Tab
- **System Information** - PHP version, Contao version, server details
- **Site Status** - Current operational status and health checks
- **Token Information** - Authentication scope and expiration
- **Quick Actions** - Common operations like refresh and settings

#### Expert Tab
- **Advanced Operations** - Direct API access and advanced features
- **System Commands** - Execute specific Contao Manager operations
- **Debug Information** - Detailed system state and configuration
- **Performance Metrics** - Response times and system resource usage

#### Logs Tab
- **Operation History** - Chronological list of all executed operations
- **Request/Response Logs** - Detailed API communication logs
- **Error Tracking** - Failed operations with error details
- **Audit Trail** - Complete record for compliance and debugging

#### History Tab
- **Workflow Executions** - Timeline view of complex operations
- **Step-by-Step Details** - Individual workflow step information
- **Execution Context** - Parameters and conditions for each workflow
- **Success/Failure Analysis** - Outcome details and troubleshooting data

---

## Workflow Operations

### Composer Updates

The most common operation is executing composer updates through automated workflows:

#### Starting a Composer Update

1. **Navigate** to a site's management interface
2. **Click** the "Update Composer" button
3. **Review** the workflow steps that will be executed
4. **Confirm** to start the automated process

#### Workflow Execution

The workflow progresses through these phases:

1. **Preparation** - Validate system state and requirements
2. **Backup Creation** - Create system snapshot (if enabled)
3. **Dependency Analysis** - Check package requirements and conflicts
4. **Download Packages** - Fetch updated packages from repositories
5. **Installation** - Apply updates and regenerate autoloader
6. **Verification** - Confirm successful installation
7. **Cleanup** - Remove temporary files and caches

#### Monitoring Progress

- **Timeline Visualization** - See current step and overall progress
- **Real-time Updates** - Status changes appear immediately
- **Step Details** - Click any step to see detailed information
- **Pause/Resume** - Temporarily halt workflows if needed

#### Handling Workflow Issues

If a workflow encounters problems:

- **Error Details** - View specific error messages and stack traces
- **Recovery Options** - Retry failed steps or skip non-critical operations
- **Manual Intervention** - Pause workflow for manual problem resolution
- **Rollback Capability** - Restore from backup if available

---

## Site Management Features

### Token Management

#### Refreshing Tokens

OAuth tokens expire periodically. To refresh:

1. **Navigate** to site settings
2. **Click** "Refresh Token"
3. **Complete** re-authentication flow
4. **Verify** new token scope and permissions

#### Changing Permissions

To modify permission scope:

1. **Remove** the existing site
2. **Re-add** the site with new permission scope
3. **Complete** authentication with updated permissions

### Site Status Monitoring

#### Health Checks

The application continuously monitors:

- **Connectivity** - Can the Contao Manager be reached?
- **Authentication** - Is the token still valid?
- **System Health** - Are there any critical errors?
- **Update Status** - Are updates available or in progress?

#### Status Indicators

- **🟢 Online** - Site accessible and functioning normally
- **🟡 Updating** - Operation in progress
- **🔴 Error** - Issue requiring attention
- **⚫ Offline** - Site unreachable or not responding

### Data Management

#### Export Site Data

Export site configuration and history:

1. **Access** site settings menu
2. **Select** "Export Data"
3. **Choose** data types to include
4. **Download** JSON file with complete site information

#### Remove Sites

To remove a site from management:

1. **Navigate** to site settings
2. **Click** "Remove Site"
3. **Confirm** removal action
4. **Token cleanup** happens automatically

---

## User Interface Features

### Theme Customization

#### Dark/Light Mode

Toggle between themes using:
- **Header toggle button** - Instant theme switching
- **System preference** - Automatic based on OS settings
- **Persistent choice** - Remember your preference across sessions

#### Responsive Design

The interface adapts to different screen sizes:
- **Desktop** - Full feature set with multi-column layouts
- **Tablet** - Optimized touch interface with condensed navigation
- **Mobile** - Streamlined interface focused on essential functions

### Navigation Efficiency

#### Keyboard Shortcuts

Common shortcuts for power users:
- **`Ctrl/Cmd + N`** - Add new site
- **`Ctrl/Cmd + R`** - Refresh current view
- **`Ctrl/Cmd + D`** - Toggle dark mode
- **`Esc`** - Close modals and return to previous view

#### Quick Actions

Fast access to common operations:
- **Site card hover** - Reveal quick action buttons
- **Context menus** - Right-click for additional options
- **Bulk operations** - Select multiple sites for batch operations

---

## Best Practices

### Permission Management

- **Principle of Least Privilege** - Grant minimum permissions needed
- **Regular Review** - Audit permissions periodically
- **Scope Separation** - Use different scopes for different team members
- **Token Rotation** - Refresh tokens regularly for security

### Workflow Planning

- **Maintenance Windows** - Schedule updates during low-traffic periods
- **Staging First** - Test updates on staging environments
- **Backup Verification** - Confirm backups before major updates
- **Monitoring** - Watch for issues during and after updates

### Organization

- **Consistent Naming** - Use clear, descriptive site names
- **Group Related Sites** - Organize by client, environment, or purpose
- **Documentation** - Keep notes about site-specific requirements
- **History Review** - Regularly check execution history for patterns

---

## Advanced Features

### API Integration

The browser provides programmatic access for automation:
- **REST API endpoints** - Integrate with external systems
- **Webhook support** - Receive notifications about workflow completion
- **Batch operations** - Execute operations across multiple sites
- **Custom workflows** - Define site-specific operation sequences

### Multi-User Scenarios

For team environments:
- **Shared configuration** - Deploy with common site configurations
- **Access logging** - Track who performed what operations
- **Permission inheritance** - Define team-based access patterns
- **Conflict resolution** - Handle concurrent operations gracefully

---

## Need Help?

If you need assistance with any features:

1. **[Check troubleshooting guide]({{ site.baseurl }}/troubleshooting)** - Solutions to common issues
2. **[View screenshots]({{ site.baseurl }}/screenshots)** - Visual guides for all features
3. **Test with mock server** - Practice operations safely
4. **[Get community support](https://github.com/mrflory/contao-manager-api-browser/issues)** - Ask questions and report issues

---

**Ready to see the interface in action? [View Screenshots →]({{ site.baseurl }}/screenshots)**