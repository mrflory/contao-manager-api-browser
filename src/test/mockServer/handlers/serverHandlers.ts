import { Request, Response } from 'express';
import { MockState } from '../types';
import { realResponseData } from '../realResponseData';

// Helper function to handle common error responses
const handleError = (res: Response, errorType: keyof typeof realResponseData.errorResponses, customMessage?: string) => {
  const errorResponse = realResponseData.errorResponses[errorType];
  if (customMessage && typeof errorResponse.body === 'object') {
    const modifiedBody = { ...errorResponse.body, detail: customMessage };
    return res.status(errorResponse.status).json(modifiedBody);
  }
  return res.status(errorResponse.status).json(errorResponse.body);
};

export const serverHandlers = {
  getSelfUpdate: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    // Simulate auth error if configured
    if (state.scenarios?.authErrors) {
      return handleError(res, 'unauthorized');
    }

    // Add network latency if configured
    const latency = state.scenarios?.networkLatency || 0;
    if (latency > 0) {
      setTimeout(() => {
        if (!res.headersSent) {
          res.json(state.selfUpdate);
        }
      }, latency);
    } else {
      res.json(state.selfUpdate);
    }
  },

  getConfig: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    res.json(state.serverConfig);
  },

  getPhpWeb: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    res.json(state.phpWeb);
  },

  getContao: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    // Simulate auth error if configured
    if (state.scenarios?.authErrors) {
      return handleError(res, 'unauthorized');
    }

    // Add network latency if configured
    const latency = state.scenarios?.networkLatency || 0;
    if (latency > 0) {
      setTimeout(() => {
        if (!res.headersSent) {
          res.json(state.contaoInfo || realResponseData.contaoConfig);
        }
      }, latency);
    } else {
      res.json(state.contaoInfo || realResponseData.contaoConfig);
    }
  },

  getPhpCli: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    res.json({
      version: state.phpWeb.version,
      version_id: state.phpWeb.version_id,
      problem: state.phpWeb.problem
    });
  },

  getComposer: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    
    // Check if composer update failure scenario is active
    if (state.scenarios?.taskFailures?.['composer/update']) {
      res.json({
        json: {
          found: true,
          valid: false,
          problem: 'Dependency conflict detected'
        },
        lock: {
          found: true,
          fresh: false,
          problem: 'Lock file is outdated'
        },
        vendor: {
          found: true,
          problem: 'Some packages have dependency conflicts'
        }
      });
    } else {
      res.json({
        json: {
          found: true,
          valid: true
        },
        lock: {
          found: true,
          fresh: true
        },
        vendor: {
          found: true
        }
      });
    }
  },

  getDatabase: (getState: () => MockState) => (req: Request, res: Response) => {
    res.json({
      url: 'mysql://user:pass@localhost/contao_db',
      pattern: '^mysql:\\/\\/[^:]+:[^@]+@[^:\\/]+(?::\\d+)?\\/\\w+$',
      status: {
        type: 'empty',
        total: 0,
        warnings: 0
      }
    });
  },

  getAdminUser: (getState: () => MockState) => (req: Request, res: Response) => {
    res.json({
      hasUser: true
    });
  },

  getPhpInfo: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    
    // Return HTML content similar to actual phpinfo() output
    const phpInfoHtml = `<!DOCTYPE html>
<html>
<head>
    <title>PHP ${state.phpWeb.version} - phpinfo()</title>
    <meta name="ROBOTS" content="NOINDEX,NOFOLLOW,NOARCHIVE,NOSNIPPET">
    <style>
        body {background-color: #fff; color: #222; font-family: sans-serif;}
        table {border-collapse: collapse; width: 100%; box-shadow: 1px 2px 3px #ccc;}
        .center {text-align: center;}
        .center table { margin: 1em auto; text-align: left;}
        .center th { text-align: center !important; }
        td, th { border: 1px solid #666; font-size: 75%; vertical-align: baseline; padding: 4px 5px;}
        h1 {font-size: 150%;}
        h2 {font-size: 125%;}
        .p {text-align: left;}
        .e {background-color: #ccf; width: 300px; font-weight: bold;}
        .h {background-color: #99c; font-weight: bold;}
        .v {background-color: #ddd; max-width: 300px; overflow-x: auto;}
        .vr {background-color: #ccc; text-align: right; width: 260px;}
        img {float: right; border: 0;}
        hr {width: 600px; background-color: #ccc; border: 0; height: 1px;}
    </style>
</head>
<body>
    <div class="center">
        <table>
            <tr class="h"><th>PHP Version ${state.phpWeb.version}</th></tr>
        </table>
        <br />
        
        <h2>PHP Core</h2>
        <table>
            <tr><td class="e">PHP Version</td><td class="v">${state.phpWeb.version}</td></tr>
            <tr><td class="e">System</td><td class="v">Linux localhost 5.15.0-88-generic #98-Ubuntu SMP Mon Oct 2 15:18:56 UTC 2023 x86_64</td></tr>
            <tr><td class="e">Build Date</td><td class="v">Dec 21 2023 15:37:27</td></tr>
            <tr><td class="e">Server API</td><td class="v">FPM/FastCGI</td></tr>
            <tr><td class="e">Configuration File (php.ini) Path</td><td class="v">/etc/php/8.2/fpm</td></tr>
            <tr><td class="e">Loaded Configuration File</td><td class="v">/etc/php/8.2/fpm/php.ini</td></tr>
        </table>
        
        <h2>PHP Extensions</h2>
        <table>
            <tr><td class="e">Core</td><td class="v">enabled</td></tr>
            <tr><td class="e">curl</td><td class="v">enabled</td></tr>
            <tr><td class="e">dom</td><td class="v">enabled</td></tr>
            <tr><td class="e">gd</td><td class="v">enabled</td></tr>
            <tr><td class="e">imagick</td><td class="v">enabled</td></tr>
            <tr><td class="e">intl</td><td class="v">enabled</td></tr>
            <tr><td class="e">json</td><td class="v">enabled</td></tr>
            <tr><td class="e">mbstring</td><td class="v">enabled</td></tr>
            <tr><td class="e">mysqli</td><td class="v">enabled</td></tr>
            <tr><td class="e">pdo</td><td class="v">enabled</td></tr>
            <tr><td class="e">pdo_mysql</td><td class="v">enabled</td></tr>
            <tr><td class="e">xml</td><td class="v">enabled</td></tr>
            <tr><td class="e">zip</td><td class="v">enabled</td></tr>
        </table>
        
        <h2>Configuration</h2>
        <table>
            <tr><td class="e">memory_limit</td><td class="v">512M</td></tr>
            <tr><td class="e">max_execution_time</td><td class="v">30</td></tr>
            <tr><td class="e">upload_max_filesize</td><td class="v">64M</td></tr>
            <tr><td class="e">post_max_size</td><td class="v">64M</td></tr>
            <tr><td class="e">date.timezone</td><td class="v">UTC</td></tr>
        </table>
        
        <h2>OpCache</h2>
        <table>
            <tr><td class="e">opcache.enable</td><td class="v">On</td></tr>
            <tr><td class="e">opcache.memory_consumption</td><td class="v">128M</td></tr>
            <tr><td class="e">opcache.interned_strings_buffer</td><td class="v">8</td></tr>
            <tr><td class="e">opcache.max_accelerated_files</td><td class="v">10000</td></tr>
        </table>
    </div>
</body>
</html>`;

    // Return JSON with HTML content as expected by the API specification
    res.json({
      html: phpInfoHtml
    });
  },

  // User management endpoints
  getUsers: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    if (state.scenarios?.authErrors) {
      return handleError(res, 'unauthorized');
    }
    res.json(state.users || realResponseData.users);
  },

  getUser: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    const username = req.params.username;
    
    if (state.scenarios?.authErrors) {
      return handleError(res, 'unauthorized');
    }

    const users = state.users || realResponseData.users;
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return handleError(res, 'notFound');
    }
    
    res.json(user);
  },

  // Package endpoints
  getPackagesLocal: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    if (state.scenarios?.authErrors) {
      return handleError(res, 'unauthorized');
    }

    const packages = state.localPackages || realResponseData.packages.local;
    
    // Add network latency if configured
    const latency = state.scenarios?.networkLatency || 0;
    if (latency > 0) {
      setTimeout(() => {
        if (!res.headersSent) {
          res.json(packages);
        }
      }, latency);
    } else {
      res.json(packages);
    }
  },

  getPackagesRoot: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    if (state.scenarios?.authErrors) {
      return handleError(res, 'unauthorized');
    }

    const rootPackage = state.rootPackage || realResponseData.packages.root;
    res.json(rootPackage);
  },

  getPackageLocal: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    const packageName = req.params.name;
    
    if (state.scenarios?.authErrors) {
      return handleError(res, 'unauthorized');
    }

    const packages = state.localPackages || realResponseData.packages.local;
    const packageInfo = packages[packageName];
    
    if (!packageInfo) {
      return handleError(res, 'notFound');
    }
    
    res.json(packageInfo);
  },

  // Backup endpoints
  getBackups: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    if (state.scenarios?.authErrors) {
      return handleError(res, 'unauthorized');
    }

    const backups = state.backups || realResponseData.backups;
    res.json(backups);
  },

  // Enhanced 404 handler for missing endpoints
  notFound: (req: Request, res: Response) => {
    const errorResponse = realResponseData.errorResponses.notFound;
    res.status(errorResponse.status).send(errorResponse.body);
  },

  // Enhanced error handlers for specific scenarios
  handleServiceUnavailable: (res: Response, customMessage?: string) => {
    return handleError(res, 'serviceUnavailable', customMessage);
  },

  handleForbidden: (res: Response, customMessage?: string) => {
    return handleError(res, 'forbidden', customMessage);
  },

  handleInternalError: (res: Response, customMessage?: string) => {
    return handleError(res, 'internalError', customMessage);
  },

  handleNotImplemented: (res: Response, customMessage?: string) => {
    return handleError(res, 'notImplemented', customMessage);
  }
};