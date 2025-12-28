import { Request, Response } from 'express';
import { MockState } from '../types';

// Mock snapshot storage for the test server
interface MockSnapshot {
  id: string;
  siteUrl: string;
  timestamp: string;
  files: {
    'composer.json'?: {
      size: number;
      exists: boolean;
      content?: string;
    };
    'composer.lock'?: {
      size: number;
      exists: boolean;
      content?: string;
    };
  };
  workflowId?: string;
  stepId?: string;
}

// In-memory snapshot storage for testing
let mockSnapshots: MockSnapshot[] = [];

// Mock composer files for automatic fetching
const MOCK_COMPOSER_JSON = JSON.stringify({
  "name": "contao/managed-edition",
  "type": "project",
  "require": {
    "php": "^8.1",
    "contao/core-bundle": "^5.3"
  }
}, null, 2);

const MOCK_COMPOSER_LOCK = JSON.stringify({
  "_readme": ["This file locks the dependencies"],
  "content-hash": "5c3c5d4b2f1234567890abcdef1234567890abcd",
  "packages": []
}, null, 2);

export const snapshotsHandlers = {
  createSnapshot: (_getState: () => MockState) => {
    return (req: Request, res: Response) => {
      const { siteUrl, workflowId, stepId } = req.body;
      let { composerJson, composerLock } = req.body;

      console.log(`[MOCK] POST /api/snapshots/create - Creating snapshot for: ${siteUrl}`);

      if (!siteUrl) {
        return res.status(400).json({ error: 'siteUrl is required' });
      }

      // If no composer files provided, fetch them automatically (simulate real backend behavior)
      if (!composerJson && !composerLock) {
        console.log(`[MOCK] No composer files provided, fetching from mock filesystem...`);
        composerJson = MOCK_COMPOSER_JSON;
        composerLock = MOCK_COMPOSER_LOCK;
      }
      
      // Generate mock snapshot ID
      const hostname = siteUrl.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').split('.')[0] + 'Z';
      const snapshotId = `${hostname}-${timestamp}`;
      
      const snapshot: MockSnapshot = {
        id: snapshotId,
        siteUrl,
        timestamp: new Date().toISOString(),
        files: {},
        workflowId,
        stepId
      };
      
      if (composerJson) {
        snapshot.files['composer.json'] = {
          size: Buffer.byteLength(composerJson, 'utf8'),
          exists: true,
          content: composerJson
        };
      }
      
      if (composerLock) {
        snapshot.files['composer.lock'] = {
          size: Buffer.byteLength(composerLock, 'utf8'),
          exists: true,
          content: composerLock
        };
      }
      
      // Store in memory
      mockSnapshots.push(snapshot);
      
      // Return response without internal content field
      const responseSnapshot = {
        id: snapshot.id,
        siteUrl: snapshot.siteUrl,
        timestamp: snapshot.timestamp,
        files: Object.fromEntries(
          Object.entries(snapshot.files).map(([key, value]) => [
            key,
            { size: value.size, exists: value.exists }
          ])
        ),
        workflowId: snapshot.workflowId,
        stepId: snapshot.stepId
      };
      
      return res.json({ success: true, snapshot: responseSnapshot });
    };
  },

  listSnapshots: (_getState: () => MockState) => {
    return (req: Request, res: Response) => {
      const { siteUrl } = req.params;
      const decodedSiteUrl = decodeURIComponent(siteUrl);
      
      console.log(`[MOCK] GET /api/snapshots/list/${decodedSiteUrl} - Listing snapshots`);
      
      // Filter snapshots by site URL
      const siteSnapshots = mockSnapshots
        .filter(snapshot => snapshot.siteUrl === decodedSiteUrl)
        .map(snapshot => ({
          id: snapshot.id,
          siteUrl: snapshot.siteUrl,
          timestamp: snapshot.timestamp,
          files: Object.fromEntries(
            Object.entries(snapshot.files).map(([key, value]) => [
              key,
              { size: value.size, exists: value.exists }
            ])
          ),
          workflowId: snapshot.workflowId,
          stepId: snapshot.stepId
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return res.json({
        success: true,
        snapshots: siteSnapshots,
        total: siteSnapshots.length,
        siteUrl: decodedSiteUrl
      });
    };
  },

  downloadSnapshot: (_getState: () => MockState) => {
    return (req: Request, res: Response) => {
      const { snapshotId, filename } = req.params;
      
      console.log(`[MOCK] GET /api/snapshots/${snapshotId}/${filename} - Downloading snapshot file`);
      
      // Validate filename
      if (filename !== 'composer.json' && filename !== 'composer.lock') {
        return res.status(400).json({ error: 'Invalid filename. Must be composer.json or composer.lock' });
      }
      
      // Find snapshot
      const snapshot = mockSnapshots.find(s => s.id === snapshotId);
      if (!snapshot) {
        return res.status(404).json({ error: 'Snapshot not found' });
      }
      
      // Get file content
      const fileData = snapshot.files[filename as 'composer.json' | 'composer.lock'];
      if (!fileData || !fileData.exists || !fileData.content) {
        return res.status(404).json({ error: 'Snapshot file not found' });
      }
      
      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${snapshotId}-${filename}"`);
      return res.send(fileData.content);
    };
  },

  deleteSnapshot: (_getState: () => MockState) => {
    return (req: Request, res: Response) => {
      const { snapshotId } = req.params;
      
      console.log(`[MOCK] DELETE /api/snapshots/${snapshotId} - Deleting snapshot`);
      
      const initialLength = mockSnapshots.length;
      mockSnapshots = mockSnapshots.filter(s => s.id !== snapshotId);
      
      if (mockSnapshots.length === initialLength) {
        return res.status(404).json({ error: 'Snapshot not found' });
      }
      
      return res.json({ success: true });
    };
  },

  cleanupSnapshots: (_getState: () => MockState) => {
    return (req: Request, res: Response) => {
      const { siteUrl } = req.params;
      const decodedSiteUrl = decodeURIComponent(siteUrl);
      const { keepLast = 10 } = req.body;
      
      console.log(`[MOCK] POST /api/snapshots/cleanup/${decodedSiteUrl} - Cleaning up snapshots, keeping last ${keepLast}`);
      
      // Get site snapshots sorted by timestamp (newest first)
      const siteSnapshots = mockSnapshots
        .filter(snapshot => snapshot.siteUrl === decodedSiteUrl)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (siteSnapshots.length <= keepLast) {
        return res.json({ success: true, deletedCount: 0 });
      }
      
      // Remove old snapshots
      const toDelete = siteSnapshots.slice(keepLast);
      const toDeleteIds = new Set(toDelete.map(s => s.id));
      
      const initialLength = mockSnapshots.length;
      mockSnapshots = mockSnapshots.filter(s => !toDeleteIds.has(s.id));
      const deletedCount = initialLength - mockSnapshots.length;
      
      return res.json({ success: true, deletedCount });
    };
  },

  // Helper method to reset snapshots for testing
  resetSnapshots: () => {
    mockSnapshots = [];
    console.log('[MOCK] Reset snapshots storage');
  }
};