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
  }
};