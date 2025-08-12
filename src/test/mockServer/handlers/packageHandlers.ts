import { Request, Response } from 'express';
import { MockState } from '../types';

export const packageHandlers = {
  getRootPackage: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    res.json(state.rootPackage);
  },

  getLocalPackages: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    // Add the root package with key "root"
    const packages = {
      root: state.rootPackage,
      ...state.localPackages
    };
    res.json(packages);
  },

  getLocalPackage: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    const { name } = req.params;
    const decodedName = decodeURIComponent(name);
    
    if (decodedName === 'root') {
      res.json(state.rootPackage);
    } else if (state.localPackages[decodedName]) {
      res.json(state.localPackages[decodedName]);
    } else {
      res.status(404).json({
        title: 'Package not found',
        detail: `Package '${decodedName}' is not installed`
      });
    }
  },

  getCloudData: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    res.json({
      composerJson: state.rootPackage,
      composerLock: {
        '_readme': ['This file locks the dependencies of your project to a known state'],
        'packages': Object.values(state.localPackages),
        'packages-dev': [],
        'platform': {
          'php': '8.2.15'
        }
      },
      platform: {
        'php': '8.2.15',
        'ext-json': '*',
        'ext-openssl': '*'
      },
      localPackages: state.localPackages
    });
  },

  putCloudData: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    const { composerLock, composerJson } = req.body;

    if (!composerLock) {
      return res.status(400).json({
        title: 'Missing composer.lock',
        detail: 'composerLock is required'
      });
    }

    // Create a task to simulate composer install from cloud data
    const mockServer = (global as any).__MOCK_SERVER__;
    if (mockServer) {
      const taskData = {
        name: 'composer/install',
        config: { fromCloud: true }
      };
      
      // This would trigger the task creation process
      return res.status(200).json({
        id: 'cloud-install-task',
        title: 'Installing from Cloud',
        status: 'active',
        console: 'Installing packages from Composer Cloud...',
        cancellable: true,
        autoclose: true,
        audit: false
      });
    }

    res.status(200).json({ success: true });
  }
};