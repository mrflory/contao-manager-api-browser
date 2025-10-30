import { Request, Response, NextFunction } from 'express';
import { dbHealthMonitor } from '../utils/databaseHealthMonitor';

/**
 * Middleware to check database health before processing requests
 * Returns 503 Service Unavailable when database is down
 */
export const requireDatabaseHealth = (_req: Request, res: Response, next: NextFunction): void => {
    if (!dbHealthMonitor.isDatabaseHealthy()) {
        res.status(503).json({
            error: 'Service temporarily unavailable',
            message: 'Database connection is currently unavailable. Please try again in a few moments.',
            status: 'degraded',
            timestamp: new Date().toISOString()
        });
        return;
    }
    next();
};
