import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../services/loggingService';

export class ResponseLogger {
    private loggingService: LoggingService;

    constructor(loggingService: LoggingService) {
        this.loggingService = loggingService;
    }

    public logRequest = (req: Request, res: Response, next: NextFunction): void => {
        const startTime = Date.now();
        const originalSend = res.send;
        const originalJson = res.json;
        
        let responseData: any = null;

        // Capture response data
        res.send = function(data: any) {
            responseData = data;
            return originalSend.call(this, data);
        };

        res.json = function(data: any) {
            responseData = data;
            return originalJson.call(this, data);
        };

        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const activeSite = (req as any).activeSite;
            
            // Only log API calls to external services, not our own endpoints
            if (activeSite && req.path.startsWith('/api/') && 
                !req.path.startsWith('/api/config') && 
                !req.path.startsWith('/api/logs') && 
                !req.path.startsWith('/api/history')) {
                
                console.log(`[REQUEST-LOG] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
                
                // Don't log sensitive request data
                let requestData = null;
                if (req.body && !req.path.includes('session') && !req.path.includes('auth')) {
                    requestData = req.body;
                }
                
                // Log to file for the active site
                this.loggingService.logApiCall(
                    activeSite.url,
                    req.method,
                    req.path,
                    res.statusCode,
                    requestData,
                    responseData,
                    res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null
                );
            }
        });

        next();
    };

    public logProxyRequest(siteUrl: string, method: string, endpoint: string, statusCode: number, requestData?: any, responseData?: any, error?: string) {
        this.loggingService.logApiCall(siteUrl, method, endpoint, statusCode, requestData, responseData, error);
    }
}