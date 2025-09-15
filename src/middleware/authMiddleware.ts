import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/configService';

export class AuthMiddleware {
    private configService: ConfigService;

    constructor(configService: ConfigService) {
        this.configService = configService;
    }

    public requireActiveSite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const activeSite = await this.configService.getActiveSiteAsync();
            
            if (!activeSite) {
                res.status(400).json({ error: 'No active site configured' });
                return;
            }
            
            // Add activeSite to request for use in route handlers
            (req as any).activeSite = activeSite;
            next();
        } catch (error) {
            console.error('Error getting active site in requireActiveSite:', error);
            res.status(500).json({ error: 'Storage operation failed' });
        }
    };

    public requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const activeSite = await this.configService.getActiveSiteAsync();
            
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
        } catch (error) {
            console.error('Error getting active site in requireAuth:', error);
            res.status(500).json({ error: 'Storage operation failed' });
        }
    };

    public optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const activeSite = await this.configService.getActiveSiteAsync();
            
            // Add activeSite to request (may be null)
            (req as any).activeSite = activeSite;
            next();
        } catch (error) {
            console.error('Error getting active site in optionalAuth:', error);
            // For optional auth, continue without active site on error
            (req as any).activeSite = null;
            next();
        }
    };
}