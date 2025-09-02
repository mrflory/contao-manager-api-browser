import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/configService';

export class AuthMiddleware {
    private configService: ConfigService;

    constructor(configService: ConfigService) {
        this.configService = configService;
    }

    public requireActiveSite = (req: Request, res: Response, next: NextFunction): void => {
        const activeSite = this.configService.getActiveSite();
        
        if (!activeSite) {
            res.status(400).json({ error: 'No active site configured' });
            return;
        }
        
        // Add activeSite to request for use in route handlers
        (req as any).activeSite = activeSite;
        next();
    };

    public requireAuth = (req: Request, res: Response, next: NextFunction): void => {
        const activeSite = this.configService.getActiveSite();
        
        if (!activeSite) {
            res.status(400).json({ error: 'No active site configured' });
            return;
        }

        // Check if we have valid authentication
        const hasToken = activeSite.authMethod === 'token' && activeSite.token;
        const hasCookieAuth = activeSite.authMethod === 'cookie' && req.headers.cookie;

        if (!hasToken && !hasCookieAuth) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        
        // Add activeSite to request for use in route handlers
        (req as any).activeSite = activeSite;
        next();
    };

    public optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
        const activeSite = this.configService.getActiveSite();
        
        // Add activeSite to request (may be null)
        (req as any).activeSite = activeSite;
        next();
    };
}