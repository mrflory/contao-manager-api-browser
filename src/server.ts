import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Services
import { ConfigService } from './services/configService';
import { LoggingService } from './services/loggingService';
import { HistoryService } from './services/historyService';
import { SnapshotService } from './services/snapshotService';
import { AuthService } from './services/authService';
import { ProxyService } from './services/proxyService';

// Middleware
import { ErrorHandler, AuthMiddleware, ScopeMiddleware, ResponseLogger } from './middleware';

// Types
import type { Request, Response } from 'express';
import type { ApiRequest } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const configService = new ConfigService();
const loggingService = new LoggingService();
const historyService = new HistoryService();
const snapshotService = new SnapshotService();
const authService = new AuthService(configService, loggingService);
const proxyService = new ProxyService(configService, loggingService, authService);

// Initialize middleware
const authMiddleware = new AuthMiddleware(configService);
const scopeMiddleware = new ScopeMiddleware(authService);
const responseLogger = new ResponseLogger(loggingService);

app.use(cors());
app.use(express.json());

// Response logging middleware
app.use(responseLogger.logRequest);

// Serve React build in production, public in development
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
} else {
    app.use(express.static('public'));
}

// Configuration endpoints
app.get('/api/config', (_req: Request, res: Response) => {
    try {
        console.log('Loading config for /api/config endpoint');
        const config = configService.getConfig();
        const activeSite = configService.getActiveSite();
        
        const response = { 
            sites: config.sites || {},
            activeSite: activeSite,
            hasActiveSite: !!activeSite
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error in /api/config:', error);
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

app.post('/api/set-active-site', (req: ApiRequest, res: Response) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'Site URL is required' });
    }
    
    if (configService.setActiveSite(url)) {
        const activeSite = configService.getActiveSite();
        return res.json({ success: true, activeSite });
    } else {
        return res.status(404).json({ error: 'Site not found' });
    }
});

app.delete('/api/sites/:url', (req: ApiRequest, res: Response) => {
    const url = decodeURIComponent(req.params.url);
    
    if (configService.removeSite(url)) {
        return res.json({ success: true });
    } else {
        return res.status(404).json({ error: 'Site not found' });
    }
});

app.post('/api/update-site-name', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    const { url, name } = req.body;
    
    if (!url || !name) {
        return res.status(400).json({ error: 'URL and name are required' });
    }
    
    if (configService.updateSiteName(url, name)) {
        return res.json({ success: true });
    } else {
        return res.status(404).json({ error: 'Site not found' });
    }
}));

// Authentication endpoints
app.get('/api/token-info', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    const tokenInfo = await authService.getTokenInfo(req.headers.cookie);
    res.json({
        success: true,
        ...tokenInfo
    });
}));

app.post('/api/save-token', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    const result = await authService.saveToken(req.body);
    res.json(result);
}));

app.post('/api/validate-token', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    const result = await authService.validateToken(req.body);
    res.json(result);
}));

app.post('/api/cookie-auth', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    const result = await authService.cookieAuth(req.body);
    
    if (result.success) {
        // Extract cookies from response headers if needed
        // This is a simplified version - you may need to handle cookies properly
        res.json(result);
    } else {
        res.status(401).json(result);
    }
}));

app.post('/api/cookie-session-check', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    const { managerUrl } = req.body;
    const result = await authService.cookieSessionCheck(managerUrl, req.headers.cookie || '');
    res.json(result);
}));

app.post('/api/cookie-logout', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    const { managerUrl } = req.body;
    const result = await authService.cookieLogout(managerUrl, req.headers.cookie || '');
    res.json(result);
}));

app.post('/api/save-site-cookie', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    const result = authService.saveSiteCookie(req.body);
    res.json(result);
}));

// Status and version endpoints
app.post('/api/update-status', 
    authMiddleware.requireActiveSite,
    scopeMiddleware.dynamicScopeCheck,
    ErrorHandler.asyncWrapper(async (_req: ApiRequest, res: Response) => {
        const result = await proxyService.updateStatus();
        res.json(result);
    })
);

app.post('/api/update-version-info', 
    authMiddleware.requireActiveSite,
    scopeMiddleware.dynamicScopeCheck,
    ErrorHandler.asyncWrapper(async (_req: ApiRequest, res: Response) => {
        const result = await proxyService.updateVersionInfo();
        res.json({ 
            success: true, 
            versionInfo: result
        });
    })
);

// Generic proxy endpoints for Contao Manager API
const proxyEndpoints = [
    // Server Configuration endpoints
    '/api/server/config',
    '/api/server/php-web',
    '/api/server/contao',
    '/api/server/phpinfo',
    '/api/server/composer',
    '/api/server/database',
    '/api/server/self-update',
    
    // Session endpoints
    '/api/session',
    
    // Users endpoints
    '/api/users',
    '/api/users/:username/tokens',
    '/api/users/:username/tokens/:id',
    
    // Contao API endpoints
    '/api/contao/database-migration',
    '/api/contao/backup',
    '/api/contao/maintenance-mode',
    
    // Tasks endpoints
    '/api/task',
    
    // Files endpoints
    '/api/files',
    '/api/files/:file',
    
    // Packages endpoints
    '/api/packages/root',
    '/api/packages/local/',
    '/api/packages/cloud',
    
    // Logs endpoints from Contao Manager
    '/api/logs'
];


// Create proxy routes for all HTTP methods
proxyEndpoints.forEach(endpoint => {
    const methods: ('get' | 'post' | 'put' | 'patch' | 'delete')[] = ['get', 'post', 'put', 'patch', 'delete'];
    
    methods.forEach(method => {
        app[method](endpoint, 
            authMiddleware.requireAuth,
            scopeMiddleware.dynamicScopeCheck,
            ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
                const response = await proxyService.proxyToContaoManager(
                    req.path, 
                    req.method as any, 
                    req.body,
                    req.headers.cookie
                );
                
                const result = proxyService.handleApiResponse(req.path, response);
                res.status(result.status).json(result.data);
            })
        );
    });
});

// Local logs endpoints (our own logging system)
app.get('/api/logs/:siteUrl', (req: ApiRequest, res: Response) => {
    try {
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        const result = loggingService.readLogs(siteUrl);
        res.json(result);
    } catch (error) {
        console.error('[LOGS] Error:', error);
        res.status(500).json({ error: `Failed to read log file: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
});

app.delete('/api/logs/:siteUrl/cleanup', (req: ApiRequest, res: Response) => {
    try {
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        const result = loggingService.cleanupLogs(siteUrl);
        res.json(result);
    } catch (error) {
        console.error('[LOG-CLEANUP] Error:', error);
        res.status(500).json({ 
            success: false,
            error: `Failed to cleanup log file: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
});

// History API endpoints
app.post('/api/history/create', (req: ApiRequest, res: Response) => {
    try {
        const historyEntry = historyService.createHistoryEntry(req.body);
        
        if (historyEntry) {
            res.json({ success: true, historyEntry });
        } else {
            res.status(500).json({ error: 'Failed to create history entry' });
        }
    } catch (error) {
        console.error('Create history error:', error);
        res.status(500).json({ error: 'Failed to create history entry' });
    }
});

app.put('/api/history/:id', (req: ApiRequest, res: Response) => {
    console.log('[HISTORY UPDATE] Request received:', {
        id: req.params.id,
        body: req.body,
        contentType: req.headers['content-type'],
        bodyType: typeof req.body
    });
    
    try {
        const { id } = req.params;
        const historyEntry = historyService.updateHistoryEntry(id, req.body);
        
        console.log('[HISTORY UPDATE] Service result:', historyEntry ? 'Success' : 'Not found');
        
        if (historyEntry) {
            res.json({ success: true, historyEntry });
        } else {
            console.log('[HISTORY UPDATE] History entry not found for ID:', id);
            res.status(404).json({ error: 'History entry not found' });
        }
    } catch (error) {
        console.error('[HISTORY UPDATE] Error caught:', error);
        console.error('[HISTORY UPDATE] Error stack:', error instanceof Error ? error.stack : 'No stack');
        res.status(500).json({ error: 'Failed to update history entry' });
    }
});

app.get('/api/history/:siteUrl', (req: ApiRequest, res: Response) => {
    try {
        const { siteUrl } = req.params;
        const decodedSiteUrl = decodeURIComponent(siteUrl);
        
        const result = historyService.getHistoryForSite(decodedSiteUrl);
        res.json(result);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

app.delete('/api/history/:siteUrl/:id', (req: ApiRequest, res: Response) => {
    try {
        const { siteUrl, id } = req.params;
        const decodedSiteUrl = decodeURIComponent(siteUrl);
        
        const result = historyService.deleteHistoryEntry(decodedSiteUrl, id);
        
        if (result) {
            res.json({ success: true, message: 'History entry deleted successfully' });
        } else {
            res.status(404).json({ error: 'History entry not found' });
        }
    } catch (error) {
        console.error('Delete history error:', error);
        res.status(500).json({ error: 'Failed to delete history entry' });
    }
});

// Snapshot API endpoints  
app.post('/api/snapshots/create', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    try {
        const { siteUrl, workflowId, stepId } = req.body;
        
        console.log('[SNAPSHOT API] Request data:', {
            siteUrl,
            workflowId,
            stepId
        });
        
        if (!siteUrl) {
            return res.status(400).json({ error: 'siteUrl is required' });
        }
        
        // Fetch composer files from the server itself
        console.log('[SNAPSHOT API] Fetching composer files from:', siteUrl);
        let composerJson: string | null = null;
        let composerLock: string | null = null;
        
        try {
            // Use the existing proxy service to fetch files
            const composerJsonResponse = await proxyService.proxyToContaoManager('/api/files/composer.json', 'GET');
            console.log('[SNAPSHOT API] composer.json response:', {
                status: composerJsonResponse.status,
                dataType: typeof composerJsonResponse.data,
                dataLength: composerJsonResponse.data ? (typeof composerJsonResponse.data === 'string' ? composerJsonResponse.data.length : JSON.stringify(composerJsonResponse.data).length) : 0,
                dataPreview: typeof composerJsonResponse.data === 'string' ? composerJsonResponse.data.substring(0, 100) : JSON.stringify(composerJsonResponse.data).substring(0, 100)
            });
            if (composerJsonResponse.status === 200 && composerJsonResponse.data) {
                const isEmptyObject = typeof composerJsonResponse.data === 'object' && Object.keys(composerJsonResponse.data).length === 0;
                if (!isEmptyObject) {
                    composerJson = typeof composerJsonResponse.data === 'string' 
                        ? composerJsonResponse.data 
                        : JSON.stringify(composerJsonResponse.data, null, 2);
                }
                console.log('[SNAPSHOT API] Processing composer.json:', {
                    hasContent: !!composerJson,
                    contentLength: composerJson?.length || 0,
                    isEmptyObject,
                    skippedDueToEmptyObject: isEmptyObject
                });
            }
        } catch (error) {
            console.warn('[SNAPSHOT API] Could not fetch composer.json:', error);
        }
        
        try {
            const composerLockResponse = await proxyService.proxyToContaoManager('/api/files/composer.lock', 'GET');
            console.log('[SNAPSHOT API] composer.lock response:', {
                status: composerLockResponse.status,
                dataType: typeof composerLockResponse.data,
                dataLength: composerLockResponse.data ? (typeof composerLockResponse.data === 'string' ? composerLockResponse.data.length : JSON.stringify(composerLockResponse.data).length) : 0,
                dataPreview: typeof composerLockResponse.data === 'string' ? composerLockResponse.data.substring(0, 100) : JSON.stringify(composerLockResponse.data).substring(0, 100)
            });
            if (composerLockResponse.status === 200 && composerLockResponse.data) {
                const isEmptyObject = typeof composerLockResponse.data === 'object' && Object.keys(composerLockResponse.data).length === 0;
                if (!isEmptyObject) {
                    composerLock = typeof composerLockResponse.data === 'string' 
                        ? composerLockResponse.data 
                        : JSON.stringify(composerLockResponse.data, null, 2);
                }
                console.log('[SNAPSHOT API] Processing composer.lock:', {
                    hasContent: !!composerLock,
                    contentLength: composerLock?.length || 0,
                    isEmptyObject,
                    skippedDueToEmptyObject: isEmptyObject
                });
            }
        } catch (error) {
            console.warn('[SNAPSHOT API] Could not fetch composer.lock:', error);
        }
        
        if (!composerJson && !composerLock) {
            return res.status(400).json({ error: 'Could not fetch composer.json or composer.lock files' });
        }
        
        console.log('[SNAPSHOT API] Fetched files:', {
            hasComposerJson: !!composerJson,
            composerJsonLength: composerJson?.length || 0,
            hasComposerLock: !!composerLock,
            composerLockLength: composerLock?.length || 0
        });
        
        const snapshot = await snapshotService.createSnapshot({
            siteUrl,
            composerJson: composerJson || undefined,
            composerLock: composerLock || undefined,
            workflowId,
            stepId
        });
        
        if (snapshot) {
            return res.json({ success: true, snapshot });
        } else {
            return res.status(500).json({ error: 'Failed to create snapshot' });
        }
    } catch (error) {
        console.error('Create snapshot error:', error);
        return res.status(500).json({ error: 'Failed to create snapshot' });
    }
}));

app.get('/api/snapshots/list/:siteUrl', (req: ApiRequest, res: Response) => {
    try {
        const { siteUrl } = req.params;
        const decodedSiteUrl = decodeURIComponent(siteUrl);
        
        const result = snapshotService.listSnapshotsForSite(decodedSiteUrl);
        return res.json(result);
    } catch (error) {
        console.error('List snapshots error:', error);
        return res.status(500).json({ error: 'Failed to list snapshots' });
    }
});

app.get('/api/snapshots/:snapshotId/:filename', (req: ApiRequest, res: Response) => {
    try {
        const { snapshotId, filename } = req.params;
        
        // Validate filename
        if (filename !== 'composer.json' && filename !== 'composer.lock') {
            return res.status(400).json({ error: 'Invalid filename. Must be composer.json or composer.lock' });
        }
        
        const fileBuffer = snapshotService.getSnapshot(snapshotId, filename as 'composer.json' | 'composer.lock');
        
        if (!fileBuffer) {
            return res.status(404).json({ error: 'Snapshot file not found' });
        }
        
        // Set appropriate headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${snapshotId}-${filename}"`);
        return res.send(fileBuffer);
        
    } catch (error) {
        console.error('Get snapshot error:', error);
        return res.status(500).json({ error: 'Failed to get snapshot' });
    }
});

app.get('/api/snapshots/:snapshotId/:filename/content', (req: ApiRequest, res: Response) => {
    try {
        const { snapshotId, filename } = req.params;
        
        console.log(`[SNAPSHOT API] Getting file content for snapshot ${snapshotId}, file ${filename}`);
        
        const fileData = snapshotService.getSnapshotFileContent(snapshotId, filename);
        
        if (!fileData) {
            return res.status(404).json({ error: 'Snapshot file not found' });
        }
        
        // Determine content type based on filename
        let contentType = 'text/plain';
        if (filename.endsWith('.json')) {
            contentType = 'application/json';
        }
        
        // Set appropriate headers for content display (not download)
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileData.size.toString());
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour since snapshots are immutable
        
        return res.send(fileData.content);
        
    } catch (error) {
        console.error('[SNAPSHOT API] Get snapshot content error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to get snapshot content';
        
        // Handle specific error types with appropriate status codes
        if (errorMessage.includes('Invalid filename')) {
            return res.status(400).json({ error: errorMessage });
        }
        if (errorMessage.includes('not found')) {
            return res.status(404).json({ error: errorMessage });
        }
        if (errorMessage.includes('too large')) {
            return res.status(413).json({ error: errorMessage });
        }
        
        return res.status(500).json({ error: errorMessage });
    }
});

app.delete('/api/snapshots/:snapshotId', (req: ApiRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        
        const success = snapshotService.deleteSnapshot(snapshotId);
        
        if (success) {
            return res.json({ success: true });
        } else {
            return res.status(404).json({ error: 'Snapshot not found' });
        }
    } catch (error) {
        console.error('Delete snapshot error:', error);
        return res.status(500).json({ error: 'Failed to delete snapshot' });
    }
});

app.post('/api/snapshots/cleanup/:siteUrl', (req: ApiRequest, res: Response) => {
    try {
        const { siteUrl } = req.params;
        const decodedSiteUrl = decodeURIComponent(siteUrl);
        const { keepLast = 10 } = req.body;
        
        const result = snapshotService.cleanupOldSnapshots(decodedSiteUrl, keepLast);
        return res.json({ success: true, ...result });
    } catch (error) {
        console.error('Cleanup snapshots error:', error);
        return res.status(500).json({ 
            success: false,
            error: `Failed to cleanup snapshots: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
});

// Serve React app for all non-API routes
app.get('/', (_req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
});

// Catch-all handler for React Router (MUST be last)
app.get('/*splat', (req, res) => {
    // Don't handle API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Serve React app for all other routes
    if (process.env.NODE_ENV === 'production') {
        return res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    } else {
        return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
});

// Error handling middleware (must be last)
app.use(ErrorHandler.handle);

app.listen(PORT, () => {
    console.log(`TypeScript Server running on http://localhost:${PORT}`);
});

export default app;