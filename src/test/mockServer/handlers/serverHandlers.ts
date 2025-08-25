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
    
    // Return comprehensive PHP information similar to phpinfo()
    res.json({
      version: state.phpWeb.version,
      version_id: state.phpWeb.version_id,
      platform: state.phpWeb.platform || 'Linux',
      extensions: {
        core: true,
        date: true,
        libxml: true,
        openssl: true,
        pcre: true,
        sqlite3: true,
        zlib: true,
        ctype: true,
        curl: true,
        dom: true,
        fileinfo: true,
        filter: true,
        ftp: true,
        hash: true,
        iconv: true,
        json: true,
        mbstring: true,
        mysqlnd: true,
        mysqli: true,
        pdo: true,
        pdo_mysql: true,
        pdo_sqlite: true,
        phar: true,
        posix: true,
        readline: true,
        reflection: true,
        session: true,
        simplexml: true,
        spl: true,
        standard: true,
        tokenizer: true,
        xml: true,
        xmlreader: true,
        xmlwriter: true,
        zip: true,
        // Contao-specific extensions
        gd: true,
        imagick: true,
        intl: true,
        tidy: true,
        xsl: true
      },
      settings: {
        memory_limit: '512M',
        max_execution_time: '30',
        upload_max_filesize: '64M',
        post_max_size: '64M',
        opcache_enabled: true,
        opcache_memory_consumption: '128',
        date_default_timezone: 'UTC'
      },
      sapi_name: 'fpm-fcgi',
      system: 'Linux localhost 5.15.0-88-generic #98-Ubuntu SMP Mon Oct 2 15:18:56 UTC 2023 x86_64',
      build_date: 'Dec 21 2023 15:37:27'
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