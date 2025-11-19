import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import axios from 'axios';

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
import { SubscriptionMiddleware } from './middleware/subscriptionMiddleware';
import { requireDatabaseHealth } from './middleware/databaseHealthMiddleware';
import {
    securityHeaders,
    corsOptions,
    generalRateLimit,
    taskPollingRateLimit,
    authErrorHandler
} from './middleware/securityMiddleware';

// Routes
import { createAuthRoutes } from './routes/authRoutes';

// Database
import { PrismaClient } from './generated/prisma';

// Utils
import { dbHealthMonitor } from './utils/databaseHealthMonitor';

// Types
import type { Request, Response } from 'express';
import type { ApiRequest } from './types';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - Required for rate limiting and proper IP detection behind proxies
// Railway, Nginx, and other reverse proxies add X-Forwarded-For headers
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy
} else {
    app.set('trust proxy', true); // Trust all proxies in development
}

// Initialize Prisma client for Phase 2 user authentication
// Configure with connection pooling and timeout settings for Neon.tech
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    },
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'info', 'warn', 'error']
});

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
const subscriptionMiddleware = new SubscriptionMiddleware(prisma);
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

// Subscription middleware for header injection and expiration handling
app.use(subscriptionMiddleware.handleExpiredSubscriptions);
app.use(subscriptionMiddleware.addSubscriptionHeaders);

// Serve React build in production, public in development
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
} else {
    app.use(express.static('public'));
}

// Health check endpoint for Railway deployment
app.get('/api/health', async (_req: Request, res: Response) => {
    try {
        // Check database connection with timeout for Railway health checks
        const dbCheckPromise = prisma.$queryRaw`SELECT 1`;
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database health check timeout')), 5000)
        );

        await Promise.race([dbCheckPromise, timeoutPromise]);

        // Mark database as healthy
        dbHealthMonitor.markHealthy();

        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            storage: process.env.STORAGE_TYPE || 'json_file',
            database: 'connected'
        });
    } catch (error) {
        console.error('Health check failed:', error);

        // Return 200 with degraded status if only DB is down but app is running
        // This prevents Railway from killing the app during transient DB issues
        const isDatabaseError = error instanceof Error &&
            (error.message.includes('timeout') || error.message.includes('connection'));

        if (isDatabaseError) {
            // Mark database as unhealthy
            dbHealthMonitor.markUnhealthy();

            res.status(200).json({
                status: 'degraded',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: 'disconnected',
                error: error instanceof Error ? error.message : 'Database connection failed'
            });
        } else {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
});

// Database status endpoint for frontend
app.get('/api/database/status', (_req: Request, res: Response) => {
    const healthStatus = dbHealthMonitor.getHealthStatus();
    res.json({
        isHealthy: healthStatus.isHealthy,
        status: healthStatus.isHealthy ? 'connected' : 'disconnected',
        lastCheckTime: healthStatus.lastCheckTime,
        consecutiveFailures: healthStatus.consecutiveFailures
    });
});

// Phase 2: User Authentication Routes
app.use('/api/auth', requireDatabaseHealth, createAuthRoutes(prisma));

// Configuration endpoints
// Phase 3: Updated to use JWT authentication and user context
app.get('/api/config',
    requireDatabaseHealth,
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

        // Remove the site configuration
        const success = await configService.removeSiteAsync(url, userId);
        if (!success) {
            return res.status(404).json({ error: 'Site not found or not owned by user' });
        }

        // Clean up related data (logs, history, and snapshots)
        // These operations are non-blocking - we don't fail site deletion if cleanup fails
        try {
            await Promise.all([
                loggingService.clearLogsForSite(url, userId),
                historyService.clearHistoryForSite(url, userId),
                snapshotService.deleteAllSnapshotsForSite(url, userId)
            ]);
        } catch (cleanupError) {
            console.error('Error cleaning up related data for deleted site:', cleanupError);
            // Continue - site is already deleted
        }

        return res.json({ success: true });
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
    subscriptionMiddleware.checkSiteLimit,
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

        const result = await proxyService.updateStatus(userId);
        return res.json(result);
    })
);

app.post('/api/update-version-info',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        const userId = req.userId!;
        const { siteUrl } = req.body;

        // Validate siteUrl parameter
        if (!siteUrl) {
            return res.status(400).json({ error: 'siteUrl parameter is required' });
        }

        // Verify the user has access to this site
        const sites = await configService.getAllSitesAsync(userId);
        if (!sites[siteUrl]) {
            return res.status(404).json({ error: 'Site not found or access denied' });
        }

        // Set the active site temporarily for this operation
        await configService.setActiveSiteAsync(siteUrl, userId);

        const result = await proxyService.updateVersionInfo(userId);
        return res.json({
            success: true,
            versionInfo: result,
            siteUrl: siteUrl
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
    '/api/packages/cloud',
    
    // Logs endpoints from Contao Manager
    '/api/logs'
];

// ============================================================================
// Site-Specific Proxy Endpoints (No Active Site Dependency)
// ============================================================================
// These endpoints take siteUrl as a parameter to avoid race conditions.
// They use proxyToSpecificSite() which explicitly targets a site.

/**
 * Helper function to create site-specific proxy endpoints
 * Reduces code duplication for all site-specific endpoints
 */
const createSiteProxyHandler = (contaoPath: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET') => {
    return ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const siteUrl = decodeURIComponent(req.params.siteUrl);

            // Get site configuration with user context
            const config = await configService.getConfigAsync(userId);
            const site = config.sites?.[siteUrl];

            if (!site) {
                return res.status(404).json({ error: 'Site not found' });
            }

            // Use proxyService directly with site information
            const response = await proxyService.proxyToSpecificSite(
                site,
                contaoPath,
                method,
                method !== 'GET' ? req.body : null,
                req.headers.cookie
            );

            const result = proxyService.handleApiResponse(contaoPath, response);
            return res.status(result.status).json(result.data);
        } catch (error) {
            console.error(`Site proxy error (${contaoPath}):`, error);
            return res.status(500).json({ error: `Failed to proxy request to ${contaoPath}` });
        }
    });
};

// Maintenance mode endpoints
app.get('/api/site/:siteUrl/maintenance-mode', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/contao/maintenance-mode', 'GET'));
app.put('/api/site/:siteUrl/maintenance-mode', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/contao/maintenance-mode', 'PUT'));
app.delete('/api/site/:siteUrl/maintenance-mode', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/contao/maintenance-mode', 'DELETE'));

// Packages endpoints
app.get('/api/site/:siteUrl/packages/root', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/packages/root'));
app.get('/api/site/:siteUrl/packages/cloud', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/packages/cloud'));

// Packages local with dynamic paths (regex to handle /packages/local/ and /packages/local/:packageName)
app.get(/^\/api\/site\/([^\/]+)\/packages\/local(\/.*)?$/, userAuthMiddleware.requireAuth, ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const siteUrl = decodeURIComponent(req.params[0]);
        const packagePath = req.params[1] || '/';

        const config = await configService.getConfigAsync(userId);
        const site = config.sites?.[siteUrl];

        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        const contaoPath = `/api/packages/local${packagePath}`;
        const response = await proxyService.proxyToSpecificSite(site, contaoPath, 'GET', null, req.headers.cookie);
        const result = proxyService.handleApiResponse(contaoPath, response);
        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('Packages local error:', error);
        return res.status(500).json({ error: 'Failed to get packages' });
    }
}));

// Server configuration endpoints
app.get('/api/site/:siteUrl/server/config', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/server/config'));
app.get('/api/site/:siteUrl/server/php-web', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/server/php-web'));
app.get('/api/site/:siteUrl/server/contao', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/server/contao'));
app.get('/api/site/:siteUrl/server/phpinfo', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/server/phpinfo'));
app.get('/api/site/:siteUrl/server/composer', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/server/composer'));
app.get('/api/site/:siteUrl/server/database', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/server/database'));
app.get('/api/site/:siteUrl/server/self-update', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/server/self-update'));

// Session endpoints
app.get('/api/site/:siteUrl/session', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/session', 'GET'));
app.post('/api/site/:siteUrl/session', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/session', 'POST'));
app.delete('/api/site/:siteUrl/session', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/session', 'DELETE'));

// Users endpoints
app.get('/api/site/:siteUrl/users', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/users'));

// Users with username parameter
app.get('/api/site/:siteUrl/users/:username/tokens', userAuthMiddleware.requireAuth, ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        const username = req.params.username;

        const config = await configService.getConfigAsync(userId);
        const site = config.sites?.[siteUrl];

        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        const contaoPath = `/api/users/${username}/tokens`;
        const response = await proxyService.proxyToSpecificSite(site, contaoPath, 'GET', null, req.headers.cookie);
        const result = proxyService.handleApiResponse(contaoPath, response);
        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('Users tokens error:', error);
        return res.status(500).json({ error: 'Failed to get user tokens' });
    }
}));

app.post('/api/site/:siteUrl/users/:username/tokens', userAuthMiddleware.requireAuth, ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        const username = req.params.username;

        const config = await configService.getConfigAsync(userId);
        const site = config.sites?.[siteUrl];

        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        const contaoPath = `/api/users/${username}/tokens`;
        const response = await proxyService.proxyToSpecificSite(site, contaoPath, 'POST', req.body, req.headers.cookie);
        const result = proxyService.handleApiResponse(contaoPath, response);
        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('Generate user token error:', error);
        return res.status(500).json({ error: 'Failed to generate user token' });
    }
}));

app.delete('/api/site/:siteUrl/users/:username/tokens/:tokenId', userAuthMiddleware.requireAuth, ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        const username = req.params.username;
        const tokenId = req.params.tokenId;

        const config = await configService.getConfigAsync(userId);
        const site = config.sites?.[siteUrl];

        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        const contaoPath = `/api/users/${username}/tokens/${tokenId}`;
        const response = await proxyService.proxyToSpecificSite(site, contaoPath, 'DELETE', null, req.headers.cookie);
        const result = proxyService.handleApiResponse(contaoPath, response);
        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('Delete user token error:', error);
        return res.status(500).json({ error: 'Failed to delete user token' });
    }
}));

// Contao endpoints
app.get('/api/site/:siteUrl/contao/database-migration', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/contao/database-migration', 'GET'));
app.put('/api/site/:siteUrl/contao/database-migration', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/contao/database-migration', 'PUT'));
app.delete('/api/site/:siteUrl/contao/database-migration', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/contao/database-migration', 'DELETE'));
app.get('/api/site/:siteUrl/contao/backup', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/contao/backup'));

// Task endpoints - Use taskPollingRateLimit for workflow polling operations
// GET is used for frequent polling during workflow execution
app.get('/api/site/:siteUrl/task', taskPollingRateLimit, userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/task', 'GET'));
app.put('/api/site/:siteUrl/task', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/task', 'PUT'));
app.delete('/api/site/:siteUrl/task', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/task', 'DELETE'));
app.patch('/api/site/:siteUrl/task', userAuthMiddleware.requireAuth, createSiteProxyHandler('/api/task', 'PATCH'));

// Files endpoints
app.get('/api/site/:siteUrl/files/:file', userAuthMiddleware.requireAuth, ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        const file = req.params.file;

        const config = await configService.getConfigAsync(userId);
        const site = config.sites?.[siteUrl];

        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        const contaoPath = `/api/files/${file}`;
        const response = await proxyService.proxyToSpecificSite(site, contaoPath, 'GET', null, req.headers.cookie);
        const result = proxyService.handleApiResponse(contaoPath, response);
        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('Files error:', error);
        return res.status(500).json({ error: 'Failed to get file' });
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

// Special handler for /api/packages/local with dynamic paths
// This must come after the static proxyEndpoints to handle both /api/packages/local/ and /api/packages/local/:name
app.get(/^\/api\/packages\/local(\/.*)?$/,
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
            'GET',
            req.body,
            req.headers.cookie
        );

        const result = proxyService.handleApiResponse(req.path, response);
        return res.status(result.status).json(result.data);
    })
);

// Local logs endpoints (our own logging system)
app.get('/api/logs/:siteUrl',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const siteUrl = decodeURIComponent(req.params.siteUrl);
            const result = await loggingService.readLogs(siteUrl, userId);
            res.json(result);
        } catch (error) {
            console.error('[LOGS] Error:', error);
            res.status(500).json({ error: `Failed to read log file: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
    })
);

app.delete('/api/logs/:siteUrl/cleanup',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const siteUrl = decodeURIComponent(req.params.siteUrl);
            const result = await loggingService.cleanupLogs(siteUrl, userId);
            res.json(result);
        } catch (error) {
            console.error('[LOG-CLEANUP] Error:', error);
            res.status(500).json({
                success: false,
                error: `Failed to cleanup log file: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    })
);

// History API endpoints
app.post('/api/history/create',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const historyEntry = await historyService.createHistoryEntry(req.body, userId);

            if (historyEntry) {
                res.json({ success: true, historyEntry });
            } else {
                res.status(500).json({ error: 'Failed to create history entry' });
            }
        } catch (error) {
            console.error('Create history error:', error);
            res.status(500).json({ error: 'Failed to create history entry' });
        }
    })
);

app.put('/api/history/:id',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        console.log('[HISTORY UPDATE] Request received:', {
            id: req.params.id,
            body: req.body,
            contentType: req.headers['content-type'],
            bodyType: typeof req.body
        });

        try {
            const userId = req.userId!;
            const { id } = req.params;
            const historyEntry = await historyService.updateHistoryEntry(id, req.body, userId);

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
    })
);

app.get('/api/history/:siteUrl',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const { siteUrl } = req.params;
            const decodedSiteUrl = decodeURIComponent(siteUrl);

            const result = await historyService.getHistoryForSite(decodedSiteUrl, userId);
            res.json(result);
        } catch (error) {
            console.error('Get history error:', error);
            res.status(500).json({ error: 'Failed to get history' });
        }
    })
);

app.delete('/api/history/:siteUrl/:id',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const { siteUrl, id } = req.params;
            const decodedSiteUrl = decodeURIComponent(siteUrl);

            const result = await historyService.deleteHistoryEntry(decodedSiteUrl, id, userId);

            if (result) {
                res.json({ success: true, message: 'History entry deleted successfully' });
            } else {
                res.status(404).json({ error: 'History entry not found' });
            }
        } catch (error) {
            console.error('Delete history error:', error);
            res.status(500).json({ error: 'Failed to delete history entry' });
        }
    })
);

// Snapshot API endpoints
app.post('/api/snapshots/create',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { siteUrl, workflowId, stepId } = req.body;

        console.log('[SNAPSHOT API] Request data:', {
            userId,
            siteUrl,
            workflowId,
            stepId
        });

        if (!siteUrl) {
            return res.status(400).json({ error: 'siteUrl is required' });
        }

        // Get the site configuration
        const config = await configService.getConfigAsync(userId);
        const site = config.sites?.[siteUrl];

        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        // Fetch composer files from the server itself
        console.log('[SNAPSHOT API] Fetching composer files from:', siteUrl);
        let composerJson: string | null = null;
        let composerLock: string | null = null;

        try {
            // Fetch composer.json as raw text to avoid axios auto-parsing JSON
            // We need the raw JSON string content, not a parsed object
            const axiosConfig: any = {
                method: 'GET',
                url: `${site.url}/api/files/composer.json`,
                responseType: 'text',  // Critical: get raw text, not parsed JSON
                timeout: 10000
            };

            // Add authentication headers based on site auth method
            if (site.authMethod === 'token' && site.token) {
                axiosConfig.headers = {
                    'Contao-Manager-Auth': site.token
                };
            } else if (site.authMethod === 'cookie' && req.headers.cookie) {
                axiosConfig.headers = {
                    'Cookie': req.headers.cookie
                };
            }

            const composerJsonResponse = await axios(axiosConfig);

            if (composerJsonResponse.status === 200 && composerJsonResponse.data) {
                // With responseType: 'text', data should always be a string
                if (typeof composerJsonResponse.data === 'string' && composerJsonResponse.data.trim().length > 0) {
                    // Validate it's valid JSON
                    try {
                        JSON.parse(composerJsonResponse.data);
                        composerJson = composerJsonResponse.data;
                    } catch (parseError) {
                        console.error('[SNAPSHOT API] Invalid JSON in composer.json:', parseError);
                        composerJson = null;
                    }
                }
            }
        } catch (error) {
            console.warn('[SNAPSHOT API] Could not fetch composer.json:', error);
        }
        
        try {
            // Fetch composer.lock as raw text to avoid axios auto-parsing JSON
            const axiosConfig: any = {
                method: 'GET',
                url: `${site.url}/api/files/composer.lock`,
                responseType: 'text',  // Critical: get raw text, not parsed JSON
                timeout: 10000
            };

            // Add authentication headers based on site auth method
            if (site.authMethod === 'token' && site.token) {
                axiosConfig.headers = {
                    'Contao-Manager-Auth': site.token
                };
            } else if (site.authMethod === 'cookie' && req.headers.cookie) {
                axiosConfig.headers = {
                    'Cookie': req.headers.cookie
                };
            }

            const composerLockResponse = await axios(axiosConfig);

            if (composerLockResponse.status === 200 && composerLockResponse.data) {
                // With responseType: 'text', data should always be a string
                if (typeof composerLockResponse.data === 'string' && composerLockResponse.data.trim().length > 0) {
                    // Validate it's valid JSON
                    try {
                        JSON.parse(composerLockResponse.data);
                        composerLock = composerLockResponse.data;
                    } catch (parseError) {
                        console.error('[SNAPSHOT API] Invalid JSON in composer.lock:', parseError);
                        composerLock = null;
                    }
                }
            }
        } catch (error) {
            console.warn('[SNAPSHOT API] Could not fetch composer.lock:', error);
        }
        
        if (!composerJson && !composerLock) {
            return res.status(400).json({ error: 'Could not fetch composer.json or composer.lock files' });
        }

        const snapshot = await snapshotService.createSnapshot({
            siteUrl,
            composerJson: composerJson || undefined,
            composerLock: composerLock || undefined,
            workflowId,
            stepId
        }, userId);
        
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

app.get('/api/snapshots/list/:siteUrl',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { siteUrl } = req.params;
        const decodedSiteUrl = decodeURIComponent(siteUrl);

            const result = await snapshotService.listSnapshotsForSite(decodedSiteUrl, userId);
            return res.json(result);
        } catch (error) {
            console.error('List snapshots error:', error);
            return res.status(500).json({ error: 'Failed to list snapshots' });
        }
    })
);

app.get('/api/snapshots/:snapshotId/:filename',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { snapshotId, filename } = req.params;

        // Validate filename
        if (filename !== 'composer.json' && filename !== 'composer.lock') {
            return res.status(400).json({ error: 'Invalid filename. Must be composer.json or composer.lock' });
        }

        const fileBuffer = await snapshotService.getSnapshot(snapshotId, filename as 'composer.json' | 'composer.lock', userId);
        
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
    })
);

app.get('/api/snapshots/:snapshotId/:filename/content',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { snapshotId, filename } = req.params;

        console.log(`[SNAPSHOT API] Getting file content for snapshot ${snapshotId}, file ${filename}, userId ${userId}`);

        const fileData = await snapshotService.getSnapshotFileContent(snapshotId, filename, userId);

        if (!fileData) {
            return res.status(404).json({ error: 'Snapshot file not found' });
        }

        console.log(`[SNAPSHOT API] File data type: ${typeof fileData.content}, length: ${fileData.content?.length || 0}, first 100 chars: ${typeof fileData.content === 'string' ? fileData.content.substring(0, 100) : '[not a string]'}`);

        // Return the content wrapped in a JSON response object
        // This ensures consistent handling by axios and prevents content corruption
        return res.json({
            content: fileData.content,
            size: fileData.size,
            filename
        });

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
    })
);

app.delete('/api/snapshots/:snapshotId',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const { snapshotId } = req.params;

        const success = await snapshotService.deleteSnapshot(snapshotId, userId);

            if (success) {
                return res.json({ success: true });
            } else {
                return res.status(404).json({ error: 'Snapshot not found' });
            }
        } catch (error) {
            console.error('Delete snapshot error:', error);
            return res.status(500).json({ error: 'Failed to delete snapshot' });
        }
    })
);

app.post('/api/snapshots/cleanup/:siteUrl',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
    try {
            const userId = req.userId!;
            const { siteUrl } = req.params;
            const decodedSiteUrl = decodeURIComponent(siteUrl);
            const { keepLast = 10 } = req.body;

            const result = await snapshotService.cleanupOldSnapshots(decodedSiteUrl, keepLast, userId);
            return res.json({ success: true, ...result });
        } catch (error) {
            console.error('Cleanup snapshots error:', error);
            return res.status(500).json({
                success: false,
                error: `Failed to cleanup snapshots: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    })
);

// Serve React app for all non-API routes
app.get('/', (_req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
});

// Phase 3.2: Subscription Management API Endpoints
app.get('/api/subscription/status',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const context = await subscriptionMiddleware.subscriptionService.getSubscriptionContext(userId);

            if (!context) {
                return res.status(500).json({ error: 'Failed to load subscription' });
            }

            return res.json({
                subscription: {
                    tier: context.subscription.planType,
                    status: context.subscription.status,
                    startedAt: context.subscription.startedAt,
                    expiresAt: context.subscription.expiresAt
                },
                limits: context.limits,
                features: context.features
            });
        } catch (error) {
            console.error('Error getting subscription status:', error);
            return res.status(500).json({ error: 'Failed to get subscription status' });
        }
    })
);

app.get('/api/subscription/features',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const subscription = await subscriptionMiddleware.subscriptionService.getUserSubscription(userId);

            if (!subscription) {
                return res.status(500).json({ error: 'No subscription found' });
            }

            return res.json({
                features: subscription.features,
                tier: subscription.planType
            });
        } catch (error) {
            console.error('Error getting subscription features:', error);
            return res.status(500).json({ error: 'Failed to get subscription features' });
        }
    })
);

app.get('/api/subscription/limits',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const limits = await subscriptionMiddleware.subscriptionService.getSubscriptionLimits(userId);

            if (!limits) {
                return res.status(500).json({ error: 'Failed to get subscription limits' });
            }

            return res.json({
                limits,
                canAddSites: limits.canAddSites,
                sitesRemaining: limits.sitesMax - limits.sitesUsed
            });
        } catch (error) {
            console.error('Error getting subscription limits:', error);
            return res.status(500).json({ error: 'Failed to get subscription limits' });
        }
    })
);

app.post('/api/subscription/validate-action',
    userAuthMiddleware.requireAuth,
    ErrorHandler.asyncWrapper(async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const { action } = req.body;

            if (!action) {
                return res.status(400).json({ error: 'Action is required' });
            }

            const validation = await subscriptionMiddleware.subscriptionService.validateAction(userId, action);
            return res.json(validation);
        } catch (error) {
            console.error('Error validating subscription action:', error);
            return res.status(500).json({ error: 'Failed to validate action' });
        }
    })
);

app.get('/api/subscription/plans',
    ErrorHandler.asyncWrapper(async (_req: Request, res: Response) => {
        try {
            // Import subscription types dynamically to avoid circular dependencies
            const { SUBSCRIPTION_TIERS } = await import('./types/subscriptionTypes');

            const plans = Object.values(SUBSCRIPTION_TIERS).map(plan => ({
                tier: plan.tier,
                name: plan.name,
                price: plan.price,
                currency: plan.currency,
                interval: plan.interval,
                features: plan.features,
                description: plan.description,
                popular: plan.popular || false
            }));

            return res.json({ plans });
        } catch (error) {
            console.error('Error getting subscription plans:', error);
            return res.status(500).json({ error: 'Failed to get subscription plans' });
        }
    })
);

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
        console.log('\n========================================');
        console.log('🚀 Starting Contao Manager API Server');
        console.log(`📅 ${new Date().toISOString()}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`💾 Storage: ${process.env.STORAGE_TYPE || 'json_file'}`);
        console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Configured (Neon.tech)' : 'Not configured'}`);
        console.log('========================================\n');

        // Test database connection before initializing services
        console.log('🔌 Testing database connection...');
        try {
            await prisma.$connect();
            console.log('✓ Database connection established successfully');
        } catch (dbError) {
            console.error('✗ Database connection failed:', dbError);
            console.log('⚠️  Continuing with degraded mode (database unavailable)');
        }

        await initializeServices();

        // Add authentication error handler
        app.use(authErrorHandler);

        const server = app.listen(PORT, () => {
            console.log('\n========================================');
            console.log(`✓ Server running on http://localhost:${PORT}`);
            console.log('✓ Phase 2: User Authentication System initialized');
            console.log('✓ Health check: /api/health');
            console.log('✓ Database status: /api/database/status');
            console.log('========================================\n');
        });

        // Graceful shutdown handling
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n========================================`);
            console.log(`${signal} received - Starting graceful shutdown`);
            console.log(`Uptime: ${Math.floor(process.uptime())}s`);
            console.log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
            console.log(`========================================`);

            // Close server first to stop accepting new connections
            server.close(() => {
                console.log('✓ HTTP server closed - no longer accepting connections');
            });

            // Disconnect from database
            try {
                await prisma.$disconnect();
                console.log('✓ Database connection closed cleanly');
            } catch (error) {
                console.error('✗ Error during database disconnect:', error);
            }

            console.log('✓ Graceful shutdown complete');
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