import { Request, Response, NextFunction } from 'express';
import { UserAuthService } from '../services/userAuthService';
import { PrismaClient } from '@prisma/client';
// Import shared Express type declarations (side-effect import for global augmentation)
import '../types/express';

export interface AuthMiddlewareOptions {
    required?: boolean; // If false, middleware continues even if no token is provided
}

export class UserAuthMiddleware {
    private userAuthService: UserAuthService;

    constructor(prisma: PrismaClient) {
        this.userAuthService = new UserAuthService(prisma);
    }

    /**
     * Middleware to validate JWT tokens and attach user to request
     */
    public authenticate = (options: AuthMiddlewareOptions = { required: true }) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                // Extract token from Authorization header
                const authHeader = req.headers.authorization;
                let token: string | undefined;

                if (authHeader && authHeader.startsWith('Bearer ')) {
                    token = authHeader.substring(7); // Remove 'Bearer ' prefix
                }

                // If no token provided and it's not required, continue
                if (!token && !options.required) {
                    return next();
                }

                // If no token provided and it's required, return error
                if (!token) {
                    return res.status(401).json({
                        success: false,
                        error: 'Access token required'
                    });
                }

                // Verify token and get user
                try {
                    const user = await this.userAuthService.getUserFromToken(token);

                    // Attach user to request object
                    req.user = user;
                    req.userId = user.id;

                    next();
                } catch (error) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid or expired access token'
                    });
                }
            } catch (error) {
                console.error('Auth middleware error:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        };
    };

    /**
     * Middleware to require authenticated user (shorthand)
     */
    public requireAuth = this.authenticate({ required: true });

    /**
     * Middleware to optionally authenticate user
     */
    public optionalAuth = this.authenticate({ required: false });

    /**
     * Middleware to check if user has verified email
     */
    public requireVerifiedEmail = (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }

        if (req.user.emailVerified === null) {
            res.status(403).json({
                success: false,
                error: 'Email verification required'
            });
            return;
        }

        next();
    };

    /**
     * Middleware to check subscription limits (placeholder for Phase 3)
     */
    public checkSubscriptionLimits = (_req: Request, _res: Response, next: NextFunction): void => {
        // This will be implemented in Phase 3 - Subscription Management
        // For now, just continue
        next();
    };
}

