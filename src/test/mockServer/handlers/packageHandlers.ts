import { Request, Response } from 'express';
import { MockState } from '../types';

export const packageHandlers = {
  getRootPackage: (getState: () => MockState) => (_req: Request, res: Response) => {
    const state = getState();
    return res.json(state.rootPackage);
  },

  getLocalPackages: (getState: () => MockState) => (_req: Request, res: Response) => {
    const state = getState();
    // Add the root package with key "root"
    const packages = {
      root: state.rootPackage,
      ...state.localPackages
    };
    return res.json(packages);
  },

  getLocalPackage: (getState: () => MockState) => (req: Request, res: Response) => {
    const state = getState();
    const { name } = req.params;
    const decodedName = decodeURIComponent(name);
    
    if (decodedName === 'root') {
      return res.json(state.rootPackage);
    } else if (state.localPackages[decodedName]) {
      return res.json(state.localPackages[decodedName]);
    } else {
      return res.status(404).json({
        title: 'Package not found',
        detail: `Package '${decodedName}' is not installed`
      });
    }
  },

  getCloudData: (getState: () => MockState) => (_req: Request, res: Response) => {
    const state = getState();
    return res.json({
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

  putCloudData: (_getState: () => MockState) => (req: Request, res: Response) => {
    // Note: state is not currently used but available if needed
    // const state = getState();
    const { composerLock } = req.body;

    if (!composerLock) {
      return res.status(400).json({
        title: 'Missing composer.lock',
        detail: 'composerLock is required'
      });
    }

    // Create a task to simulate composer install from cloud data
    const mockServer = (global as any).__MOCK_SERVER__;
    if (mockServer) {
      // Task data structure for cloud install
      /* const taskData = {
        name: 'composer/install',
        config: { fromCloud: true }
      }; */
      
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

    return res.status(200).json({ success: true });
  }
};