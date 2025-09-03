import { Request, Response } from 'express';
import { MockState } from '../types';

export const logsHandlers = {
  getLogs: (_getState: () => MockState) => {
    return (_req: Request, res: Response) => {
      console.log('[MOCK] GET /api/logs - Fetching log files list');
      
      // Mock log files data based on swagger.yaml LogFile schema
      const mockLogFiles = [
        {
          name: 'prod',
          size: 2048576,  // 2MB
          mtime: '2024-01-15T10:30:00Z',
          lines: 15432
        },
        {
          name: 'dev',
          size: 512000,   // 512KB
          mtime: '2024-01-14T16:45:00Z',
          lines: 4821
        },
        {
          name: 'error',
          size: 102400,   // 100KB
          mtime: '2024-01-13T09:15:00Z',
          lines: 892
        },
        {
          name: 'cron',
          size: 256000,   // 256KB
          mtime: '2024-01-12T12:20:00Z',
          lines: 2340
        },
        {
          name: 'mail',
          size: 51200,    // 50KB
          mtime: '2024-01-11T14:55:00Z',
          lines: 456
        }
      ];
      
      return res.status(200).json(mockLogFiles);
    };
  },

  getLogContent: (_getState: () => MockState) => {
    return (req: Request, res: Response) => {
      const { file } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      console.log(`[MOCK] GET /api/logs/${file} - Fetching log content (limit: ${limit})`);
      
      // Mock log content - simulate actual log entries
      const mockLogEntries = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        level: ['INFO', 'WARNING', 'ERROR'][Math.floor(Math.random() * 3)],
        message: `Mock log entry ${i + 1} for ${file}.log`,
        context: {
          file: `src/Controller/MockController.php`,
          line: Math.floor(Math.random() * 200) + 1
        }
      }));
      
      return res.status(200).json(mockLogEntries);
    };
  }
};