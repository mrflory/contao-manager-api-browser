import { Request, Response } from 'express';
import { MockState } from '../types';

export const serverHandlers = {
  getSelfUpdate: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    // Simulate auth error if configured
    if (state.scenarios?.authErrors) {
      return res.status(401).json({
        title: 'Unauthorized',
        detail: 'Authentication failed'
      });
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
      return res.status(401).json({
        title: 'Unauthorized',
        detail: 'Authentication failed'
      });
    }
    res.json(state.contaoInfo);
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
  }
};