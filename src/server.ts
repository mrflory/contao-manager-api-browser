import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';

// Services
import { ConfigService } from './services/configService';
import { LoggingService } from './services/loggingService';
import { HistoryService } from './services/historyService';
import { SnapshotService } from './services/snapshotService';
import { AuthService } from './services/authService';
import { ProxyService } from './services/proxyService';

// Storage
import { JsonFileStorageUnified } from './storage';
import { UnifiedStorage, StorageType } from './storage/interfaces';

// Middleware
import { ErrorHandler, ResponseLogger } from './middleware';
import { UserAuthMiddleware } from './middleware/userAuthMiddleware';
import {
    securityHeaders,
    corsOptions,
    generalRateLimit,
    authErrorHandler
} from './middleware/securityMiddleware';

// Routes
import { createAuthRoutes } from './routes/authRoutes';

// Database
import { PrismaClient } from './generated/prisma';

// Types
import type { Request, Response } from 'express';
import type { ApiRequest } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma client for Phase 2 user authentication
const prisma = new PrismaClient();

// Initialize storage and services
const storage: UnifiedStorage = new JsonFileStorageUnified({
    type: StorageType.JSON_FILE,
    dataDir: process.env.DATA_DIR || path.join(process.cwd(), 'data')
});
// ConfigService - will automatically handle browser storage gracefully via StorageFactory
const configService = new ConfigService();
const loggingService = new LoggingService(storage);
const historyService = new HistoryService(storage);
const snapshotService = new SnapshotService(storage);
const authService = new AuthService(configService, loggingService);
const proxyService = new ProxyService(configService, loggingService, authService);

// Initialize middleware
const userAuthMiddleware = new UserAuthMiddleware(prisma);
const responseLogger = new ResponseLogger(loggingService);

// Security middleware
app.use(securityHeaders);
app.use(generalRateLimit);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Response logging middleware
app.use(responseLogger.logRequest);

// Serve React build in production, public in development
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
} else {
    app.use(express.static('public'));
}

// Phase 2: User Authentication Routes
app.use('/api/auth', createAuthRoutes(prisma));

// Configuration endpoints
// Phase 3: Updated to use JWT authentication and user context
app.get('/api/config',
    userAuthMiddleware.requireAuth,
    async (req: Request, res: Response) => {
        try {
            const userId = req.userId!; // TypeScript knows this exists due to middleware
            const config = await configService.getConfigAsync(userId);

            const response = {
                sites: config.sites || {},
                activeSite: config.activeSite,
                hasActiveSite: !!config.activeSite
            };

            res.json(response);
        } catch (error) {
            console.error('Error in /api/config:', error);
            res.status(500).json({ error: 'Failed to load configuration' });
        }
    }
);

// Storage management endpoints (for new storage abstraction)
app.get('/api/storage/type', (_req: Request, res: Response) => {
    try {
        const configuredStorageType = process.env.STORAGE_TYPE || 'json_file';

        res.json({
            storageType: configuredStorageType,
            available: true,
            capabilities: {
                canExport: false,
                canImport: false,
                canMigrate: true,
                supportsBackup: true,
                isClientSide: false
            }
        });
    } catch (error) {
        console.error('Error getting storage type:', error);
        res.status(500).json({ error: 'Failed to get storage type' });
    }
});

// Storage info endpoint
app.get('/api/storage/info', (_req: Request, res: Response) => {
    try {
        const storageInfo = configService.getStorageInfo();
        res.json({
            type: storageInfo.type,
            available: storageInfo.available,
            capabilities: {
                canExport: false,
                canImport: false,
                canMigrate: true,
                supportsBackup: true,
                isClientSide: false
            }
        });
    } catch (error) {
        console.error('Error getting storage info:', error);
        res.status(500).json({ error: 'Failed to get storage info' });
    }
});

// Database storage status endpoint
app.get('/api/storage/database/status', (_req: Request, res: Response) => {
    try {
        // For now, return that database storage is not available
        res.json({
            available: false,
            connected: false,
            error: 'Database storage not configured'
        });
    } catch (error) {
        console.error('Error getting database status:', error);
        res.status(500).json({ error: 'Failed to get database status' });
    }
});

app.post('/api/set-active-site',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        const { url } = req.body;
        const userId = req.userId!;

        if (!url) {
            return res.status(400).json({ error: 'Site URL is required' });
        }

        try {
            const success = await configService.setActiveSiteAsync(url, userId);
            if (success) {
                const activeSite = await configService.getActiveSiteAsync(userId);
                return res.json({ success: true, activeSite });
            } else {
                return res.status(404).json({ error: 'Site not found or not owned by user' });
            }
        } catch (error) {
            console.error('Error setting active site:', error);
            return res.status(500).json({ error: 'Failed to set active site' });
        }
    })
);

app.delete('/api/sites/:url',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        const url = decodeURIComponent(req.params.url);
        const userId = req.userId!;

        const success = await configService.removeSiteAsync(url, userId);
        if (success) {
            return res.json({ success: true });
        } else {
            return res.status(404).json({ error: 'Site not found or not owned by user' });
        }
    })
);

app.post('/api/update-site-name',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        const { url, name } = req.body;
        const userId = req.userId!;

        if (!url || !name) {
            return res.status(400).json({ error: 'URL and name are required' });
        }

        const success = await configService.updateSiteNameAsync(url, name, userId);
        if (success) {
            return res.json({ success: true });
        } else {
            return res.status(404).json({ error: 'Site not found or not owned by user' });
        }
    })
);

// Authentication endpoints
app.get('/api/token-info',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        const userId = req.userId!;
        const tokenInfo = await authService.getTokenInfo(req.headers.cookie, userId);
        res.json({
            success: true,
            ...tokenInfo
        });
    })
);

app.post('/api/save-token',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        const userId = req.userId!;
        const result = await authService.saveToken(req.body, userId);
        res.json(result);
    })
);

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

app.post('/api/save-site-cookie',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        console.log('[SAVE-SITE-COOKIE] Request body:', req.body);
        const userId = req.userId!;
        try {
            const result = await authService.saveSiteCookie(req.body, userId);
            console.log('[SAVE-SITE-COOKIE] Result:', result);
            res.json(result);
        } catch (error) {
            console.error('[SAVE-SITE-COOKIE] Error:', error);
            throw error;
        }
    })
);

// Status and version endpoints
app.post('/api/update-status',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        const userId = req.userId!;

        // Get the active site for this user
        const activeSite = await configService.getActiveSiteAsync(userId);
        if (!activeSite) {
            return res.status(400).json({ error: 'No active site configured for user' });
        }

        // Set the active site context for the proxy service (temporary compatibility)
        (req as any).activeSite = activeSite;

        const result = await proxyService.updateStatus();
        return res.json(result);
    })
);

app.post('/api/update-version-info',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        const userId = req.userId!;

        // Get the active site for this user
        const activeSite = await configService.getActiveSiteAsync(userId);
        if (!activeSite) {
            return res.status(400).json({ error: 'No active site configured for user' });
        }

        // Set the active site context for the proxy service (temporary compatibility)
        (req as any).activeSite = activeSite;

        const result = await proxyService.updateVersionInfo();
        return res.json({
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

// Add site-specific maintenance mode endpoint that bypasses active site issues
app.get('/api/site/:siteUrl/maintenance-mode', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    try {
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        
        // Get site configuration directly without setting as active
        const config = await configService.getConfigAsync();
        const site = config.sites?.[siteUrl];
        
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }
        
        // Use proxyService directly with site information, bypassing active site
        const response = await proxyService.proxyToSpecificSite(
            site,
            '/api/contao/maintenance-mode', 
            'GET',
            null,
            req.headers.cookie
        );
        
        const result = proxyService.handleApiResponse('/contao/maintenance-mode', response);
        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('Maintenance mode error:', error);
        return res.status(500).json({ error: 'Failed to get maintenance mode status' });
    }
}));

// Create proxy routes for all HTTP methods
proxyEndpoints.forEach(endpoint => {
    const methods: ('get' | 'post' | 'put' | 'patch' | 'delete')[] = ['get', 'post', 'put', 'patch', 'delete'];

    methods.forEach(method => {
        app[method](endpoint,
            userAuthMiddleware.requireAuth,
            ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
                const userId = req.userId!;

                // Get the active site for this user
                const activeSite = await configService.getActiveSiteAsync(userId);
                if (!activeSite) {
                    return res.status(400).json({ error: 'No active site configured for user' });
                }

                // Set the active site context for the proxy service (temporary compatibility)
                (req as any).activeSite = activeSite;

                const response = await proxyService.proxyToContaoManager(
                    req.path,
                    req.method as any,
                    req.body,
                    req.headers.cookie
                );

                const result = proxyService.handleApiResponse(req.path, response);
                return res.status(result.status).json(result.data);
            })
        );
    });
});

// Local logs endpoints (our own logging system)
app.get('/api/logs/:siteUrl', ErrorHandler.asyncWrapper(async (req: ApiRequest, res: Response) => {
    try {
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        const result = await loggingService.readLogs(siteUrl);
        res.json(result);
    } catch (error) {
        console.error('[LOGS] Error:', error);
        res.status(500).json({ error: `Failed to read log file: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
}));

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
app.post('/api/history/create', async (req: ApiRequest, res: Response) => {
    try {
        const historyEntry = await historyService.createHistoryEntry(req.body);
        
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

app.put('/api/history/:id', async (req: ApiRequest, res: Response) => {
    console.log('[HISTORY UPDATE] Request received:', {
        id: req.params.id,
        body: req.body,
        contentType: req.headers['content-type'],
        bodyType: typeof req.body
    });
    
    try {
        const { id } = req.params;
        const historyEntry = await historyService.updateHistoryEntry(id, req.body);
        
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

app.get('/api/history/:siteUrl', async (req: ApiRequest, res: Response) => {
    try {
        const { siteUrl } = req.params;
        const decodedSiteUrl = decodeURIComponent(siteUrl);
        
        const result = await historyService.getHistoryForSite(decodedSiteUrl);
        res.json(result);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

app.delete('/api/history/:siteUrl/:id', async (req: ApiRequest, res: Response) => {
    try {
        const { siteUrl, id } = req.params;
        const decodedSiteUrl = decodeURIComponent(siteUrl);
        
        const result = await historyService.deleteHistoryEntry(decodedSiteUrl, id);
        
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

app.get('/api/snapshots/list/:siteUrl', async (req: ApiRequest, res: Response) => {
    try {
        const { siteUrl } = req.params;
        const decodedSiteUrl = decodeURIComponent(siteUrl);
        
        const result = await snapshotService.listSnapshotsForSite(decodedSiteUrl);
        return res.json(result);
    } catch (error) {
        console.error('List snapshots error:', error);
        return res.status(500).json({ error: 'Failed to list snapshots' });
    }
});

app.get('/api/snapshots/:snapshotId/:filename', async (req: ApiRequest, res: Response) => {
    try {
        const { snapshotId, filename } = req.params;
        
        // Validate filename
        if (filename !== 'composer.json' && filename !== 'composer.lock') {
            return res.status(400).json({ error: 'Invalid filename. Must be composer.json or composer.lock' });
        }
        
        const fileBuffer = await snapshotService.getSnapshot(snapshotId, filename as 'composer.json' | 'composer.lock');
        
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

app.get('/api/snapshots/:snapshotId/:filename/content', async (req: ApiRequest, res: Response) => {
    try {
        const { snapshotId, filename } = req.params;
        
        console.log(`[SNAPSHOT API] Getting file content for snapshot ${snapshotId}, file ${filename}`);
        
        const fileData = await snapshotService.getSnapshotFileContent(snapshotId, filename);
        
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

app.delete('/api/snapshots/:snapshotId', async (req: ApiRequest, res: Response) => {
    try {
        const { snapshotId } = req.params;
        
        const success = await snapshotService.deleteSnapshot(snapshotId);
        
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

app.post('/api/snapshots/cleanup/:siteUrl', async (req: ApiRequest, res: Response) => {
    try {
        const { siteUrl } = req.params;
        const decodedSiteUrl = decodeURIComponent(siteUrl);
        const { keepLast = 10 } = req.body;
        
        const result = await snapshotService.cleanupOldSnapshots(decodedSiteUrl, keepLast);
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

async function initializeServices() {
    // Initialize unified storage backend
    console.log('Initializing unified storage backend...');
    const storageInitResult = await storage.initialize();
    if (!storageInitResult.success) {
        console.error('Failed to initialize unified storage backend:', storageInitResult.error);
        process.exit(1);
    }
    
    // Initialize config service (legacy for compatibility)
    console.log('Initializing config service...');
    const configInitResult = await configService.initialize();
    if (!configInitResult.success) {
        console.error('Failed to initialize config service:', configInitResult.error);
        process.exit(1);
    }
    
    console.log('All services initialized successfully');
}

async function startServer() {
    try {
        await initializeServices();

        // Add authentication error handler
        app.use(authErrorHandler);

        const server = app.listen(PORT, () => {
            console.log(`TypeScript Server running on http://localhost:${PORT}`);
            console.log('Phase 2: User Authentication System initialized');
        });

        // Graceful shutdown handling
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n${signal} received. Starting graceful shutdown...`);

            server.close(() => {
                console.log('HTTP server closed.');
            });

            try {
                await prisma.$disconnect();
                console.log('Database connection closed.');
            } catch (error) {
                console.error('Error during database disconnect:', error);
            }

            process.exit(0);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('Failed to start server:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

// Start the server
startServer();