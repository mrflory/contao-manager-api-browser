---
layout: default
title: Troubleshooting
nav_order: 5
description: "Solutions to common issues and problems with Contao Manager API Browser"
---

# Troubleshooting
{: .no_toc }

Common issues and their solutions to help you get the most out of your Contao Manager API Browser.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Installation and Setup Issues

### Node.js Version Problems

**Problem**: Application fails to start with Node.js version errors
{: .label .label-red }

**Solution**: 
- Ensure you have Node.js 18 or higher installed
- Check your version: `node --version`
- Update Node.js from [nodejs.org](https://nodejs.org/)
- Use a Node.js version manager like `nvm` for easier version management

### Dependency Installation Failures

**Problem**: `npm install` fails with permission or network errors
{: .label .label-red }

**Solution**:
- **Permission issues**: Use `sudo npm install` (Linux/Mac) or run as administrator (Windows)
- **Network issues**: Try `npm install --registry https://registry.npmjs.org/`
- **Cache issues**: Clear npm cache with `npm cache clean --force`
- **Firewall**: Ensure npm can access registry.npmjs.org

### Port Already in Use

**Problem**: "Port 3000 already in use" or "Port 5173 already in use"
{: .label .label-red }

**Solution**:
- **Find the process**: `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)
- **Kill the process**: `kill -9 <PID>` or stop other applications using the port
- **Use different ports**: Set environment variables `PORT=3001` for backend, configure Vite port in `vite.config.ts`

---

## Authentication and Token Issues

### "Invalid Token" Errors

**Problem**: API calls fail with "Invalid token" or "Unauthorized" errors
{: .label .label-red }

**Solution**:
1. **Token expiration**: OAuth tokens expire after a period
   - Navigate to site settings and click "Refresh Token"
   - Complete the OAuth flow again
2. **Token corruption**: Data file may be corrupted
   - Remove the site and re-add it
   - Complete authentication process again
3. **Contao Manager updates**: Manager updates may invalidate tokens
   - Re-authenticate after Contao Manager updates

### OAuth Flow Not Working

**Problem**: Redirected to Contao Manager but authentication fails
{: .label .label-red }

**Solution**:
- **URL verification**: Ensure Contao Manager URL is correct and accessible
- **HTTPS requirement**: OAuth requires HTTPS in production environments
- **Firewall/Network**: Check that you can access the Contao Manager directly
- **Browser issues**: Try different browser or clear cookies/cache
- **TOTP errors**: Ensure two-factor authentication codes are entered correctly

### Permission Scope Issues

**Problem**: "Insufficient permissions" for operations
{: .label .label-red }

**Solution**:
- **Check current scope**: View token information in site details
- **Re-authenticate with higher scope**: 
  - Remove site and re-add with `admin` scope
  - Or use the "Change Permissions" option in site settings
- **Operation requirements**:
  - `read`: Status and information viewing
  - `update`: Composer updates and self-updates
  - `install`: Package installation/removal
  - `admin`: All operations including system settings

---

## Connection and Network Issues

### Site Unreachable Errors

**Problem**: "Cannot connect to site" or timeout errors
{: .label .label-red }

**Solution**:
- **URL verification**: Test the Contao Manager URL directly in browser
- **Network connectivity**: Ensure server can reach the target site
- **Firewall rules**: Check outbound HTTPS connections are allowed
- **DNS resolution**: Verify domain name resolves correctly
- **SSL/TLS issues**: Check certificate validity and chain

### Slow Response Times

**Problem**: Operations take very long to complete or timeout
{: .label .label-red }

**Solution**:
- **Server resources**: Check if Contao Manager server is overloaded
- **Network latency**: Test connection speed to target server
- **Composer operations**: Large updates naturally take time
- **Timeout configuration**: Increase timeout values in `config.json`
- **Background processes**: Some operations continue even if UI times out

### CORS (Cross-Origin) Errors

**Problem**: Browser console shows CORS policy errors
{: .label .label-red }

**Solution**:
- **Development mode**: Ensure both frontend and backend servers are running
- **Production mode**: CORS is handled internally when serving from same origin
- **Proxy issues**: If using reverse proxy, configure CORS headers properly

---

## Workflow and Operation Issues

### Workflow Execution Failures

**Problem**: Composer updates or workflows fail mid-execution
{: .label .label-red }

**Solution**:
1. **Check workflow history**: Review detailed error messages in History tab
2. **Server resources**: Ensure adequate disk space and memory
3. **Composer issues**: 
   - Check `composer.json` syntax
   - Verify package repository accessibility
   - Clear Composer cache on target server
4. **Recovery options**:
   - Use "Retry" option for failed steps
   - Manually resolve issues and resume workflow
   - Check if rollback is available

### Partial Workflow Completion

**Problem**: Workflow stops partway through without clear error
{: .label .label-red }

**Solution**:
- **Check Contao Manager logs**: Access logs directly on target server
- **System resource limits**: Check PHP memory limit, execution time
- **Network interruption**: Verify stable connection during operation
- **Resume capability**: Some workflows can be resumed from last successful step

### History Not Recording

**Problem**: Workflow history is missing or incomplete
{: .label .label-red }

**Solution**:
- **Storage permissions**: Check write permissions on `data/` directory
- **Disk space**: Ensure adequate disk space for log files
- **Service restart**: Restart the API Browser application
- **Manual cleanup**: Remove corrupted history files if necessary

---

## User Interface Issues

### Page Not Loading Properly

**Problem**: Blank pages, missing content, or JavaScript errors
{: .label .label-red }

**Solution**:
- **Browser compatibility**: Use modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- **JavaScript enabled**: Ensure JavaScript is enabled in browser
- **Browser cache**: Clear browser cache and hard refresh (Ctrl+Shift+R)
- **Ad blockers**: Disable ad blockers that might interfere with scripts
- **Console errors**: Check browser console for specific error messages

### Theme/Styling Issues

**Problem**: Interface appears broken or unstyled
{: .label .label-red }

**Solution**:
- **CSS loading**: Check if stylesheets are loading properly
- **Dark mode issues**: Try switching between light/dark themes
- **Browser zoom**: Reset browser zoom to 100%
- **Custom CSS**: Disable browser extensions that modify page styles

### Mobile Interface Problems

**Problem**: Interface not responsive on mobile devices
{: .label .label-red }

**Solution**:
- **Viewport settings**: Browser should detect mobile properly
- **Touch interactions**: Ensure touch events are working
- **Screen rotation**: Test both portrait and landscape orientations
- **Mobile browser**: Try different mobile browsers

---

## Data and Configuration Issues

### Configuration File Problems

**Problem**: Settings not saving or data.json corruption
{: .label .label-red }

**Solution**:
- **File permissions**: Ensure write access to `data/config.json`
- **JSON validity**: Validate JSON syntax using online validator
- **Backup restoration**: Restore from backup if available
- **Manual recreation**: Remove corrupted file and reconfigure sites

### Lost Site Data

**Problem**: Sites disappear from dashboard or settings are lost
{: .label .label-red }

**Solution**:
- **File integrity**: Check if `data/config.json` exists and is readable
- **Backup recovery**: Restore from previous backup
- **Re-add sites**: Add sites again if configuration is lost
- **Prevent future loss**: Regularly backup `data/` directory

---

## Development and Testing Issues

### Mock Server Problems

**Problem**: Mock server not starting or responding incorrectly
{: .label .label-red }

**Solution**:
- **Port conflicts**: Ensure port 3001 is available
- **Process conflicts**: Kill existing mock server processes
- **Restart command**: Use `npm run mock:server` to restart
- **Scenario loading**: Check if test scenarios are loading correctly

### Build Failures

**Problem**: `npm run build` fails with TypeScript or compilation errors
{: .label .label-red }

**Solution**:
- **Dependencies**: Ensure all dependencies are installed (`npm install`)
- **TypeScript errors**: Fix type errors shown in compilation output
- **Clean build**: Delete `dist/` directory and rebuild
- **Node.js version**: Ensure compatible Node.js version (18+)

---

## Performance and Optimization

### Slow Application Performance

**Problem**: Interface feels sluggish or unresponsive
{: .label .label-red }

**Solution**:
- **System resources**: Check available RAM and CPU usage
- **Database size**: Large history files can slow performance
- **Browser performance**: Close other tabs/applications consuming resources
- **Clear data**: Archive or remove old workflow history

### Memory Usage Issues

**Problem**: High memory consumption or crashes
{: .label .label-red }

**Solution**:
- **Restart application**: Periodic restarts can help with memory leaks
- **History cleanup**: Remove old workflow history periodically
- **Browser tabs**: Limit number of open browser tabs
- **System monitoring**: Use system monitor to identify memory issues

---

## Advanced Troubleshooting

### Debug Mode

Enable detailed logging for troubleshooting:

1. **Server logs**: Start with `DEBUG=* npm run dev` for verbose logging
2. **Browser console**: Monitor browser console for client-side errors
3. **Network tab**: Check API requests/responses in browser dev tools
4. **Service logs**: Individual service logs available in application output

### Log Files

Important log locations:
- **Application logs**: Console output when running in development
- **Workflow history**: `data/history/` directory
- **Configuration**: `data/config.json`
- **Browser logs**: Developer tools console

### Safe Mode Testing

Test with minimal configuration:
1. **Fresh install**: Clone repository to new directory
2. **Mock server**: Test with `npm run mock:server` only
3. **Minimal config**: Test with single site configuration
4. **Default settings**: Reset all configuration to defaults

---

## Getting Additional Help

### Self-Diagnosis Steps

Before seeking help:
1. **Check error messages**: Note exact error messages and circumstances
2. **Reproduce issue**: Verify the issue happens consistently
3. **Test isolation**: Use mock server to isolate problems
4. **Browser console**: Check for JavaScript errors
5. **Network requests**: Monitor failed API calls

### Community Support

**GitHub Issues**
: [Report bugs and request features](https://github.com/mrflory/contao-manager-api-browser/issues)

**Documentation**
: Review other sections of this documentation for related solutions

**Contao Community**
: Check official Contao documentation for Contao Manager specific issues

### Reporting Issues

When reporting issues, include:
- **Environment**: Operating system, Node.js version, browser
- **Steps to reproduce**: Exact steps that cause the issue
- **Error messages**: Complete error messages and stack traces
- **Screenshots**: Visual evidence of the problem
- **Configuration**: Relevant configuration details (remove sensitive data)

---

**Still need help?** [Open an issue on GitHub](https://github.com/mrflory/contao-manager-api-browser/issues) with detailed information about your problem.