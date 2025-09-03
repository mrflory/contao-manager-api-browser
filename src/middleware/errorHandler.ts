import { Request, Response, NextFunction } from 'express';

export class ErrorHandler {
    public static handle(error: Error, _req: Request, res: Response, next: NextFunction): void {
        console.error('Error occurred:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Check if response was already sent
        if (res.headersSent) {
            return next(error);
        }

        // Handle different types of errors
        if (error.message.includes('No active site configured')) {
            res.status(400).json({ error: 'No active site configured' });
            return;
        }

        if (error.message.includes('Invalid token')) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }

        if (error.message.includes('Access denied')) {
            res.status(403).json({ error: error.message });
            return;
        }

        if (error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
            return;
        }

        // Default error response
        res.status(500).json({ 
            error: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : error.message 
        });
    }

    public static asyncWrapper(fn: Function) {
        return (req: Request, res: Response, next: NextFunction) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}