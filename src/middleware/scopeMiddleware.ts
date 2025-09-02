import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

export class ScopeMiddleware {
    private authService: AuthService;

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    public requireScope(requiredScope: string) {
        return (req: Request, res: Response, next: NextFunction): void => {
            const activeSite = (req as any).activeSite;
            
            if (!activeSite) {
                res.status(400).json({ error: 'No active site configured' });
                return;
            }

            // Only check scope for cookie authentication (token auth has inherent permissions)
            if (activeSite.authMethod === 'cookie' && activeSite.scope) {
                const endpoint = req.path;
                const method = req.method;
                
                if (!this.authService.checkScopePermission(activeSite.scope, method, endpoint)) {
                    res.status(403).json({ 
                        error: `Access denied: ${method} ${endpoint} requires '${requiredScope}' scope or higher, but user has '${activeSite.scope}' scope` 
                    });
                    return;
                }
            }
            
            next();
        };
    }

    public requireRead = this.requireScope('read');
    public requireUpdate = this.requireScope('update');
    public requireInstall = this.requireScope('install');
    public requireAdmin = this.requireScope('admin');

    public dynamicScopeCheck = (req: Request, res: Response, next: NextFunction): void => {
        const activeSite = (req as any).activeSite;
        
        if (!activeSite) {
            res.status(400).json({ error: 'No active site configured' });
            return;
        }

        // Only check scope for cookie authentication
        if (activeSite.authMethod === 'cookie' && activeSite.scope) {
            const endpoint = req.path;
            const method = req.method;
            
            if (!this.authService.checkScopePermission(activeSite.scope, method, endpoint)) {
                res.status(403).json({ 
                    error: `Access denied: ${method} ${endpoint} requires higher permissions than '${activeSite.scope}' scope` 
                });
                return;
            }
        }
        
        next();
    };
}