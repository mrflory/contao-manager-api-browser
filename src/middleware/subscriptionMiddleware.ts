import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../generated/prisma';
import { SubscriptionService } from '../services/subscriptionService';
import {
    SubscriptionAction,
    SubscriptionValidationResult
} from '../types/subscriptionTypes';

// Extend Express Request type to include subscription context
declare global {
    namespace Express {
        interface Request {
            subscriptionContext?: any;
            subscriptionService?: SubscriptionService;
        }
    }
}

export class SubscriptionMiddleware {
    public subscriptionService: SubscriptionService;

    constructor(prisma: PrismaClient) {
        this.subscriptionService = new SubscriptionService(prisma);
    }

    /**
     * Middleware to inject subscription service into request
     */
    injectSubscriptionService = (req: Request, _res: Response, next: NextFunction) => {
        req.subscriptionService = this.subscriptionService;
        next();
    };

    /**
     * Middleware to load and inject subscription context
     */
    loadSubscriptionContext = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const context = await this.subscriptionService.getSubscriptionContext(userId);
            if (!context) {
                return res.status(500).json({ error: 'Failed to load subscription context' });
            }

            req.subscriptionContext = context;
            return next();
        } catch (error) {
            console.error('Error loading subscription context:', error);
            return res.status(500).json({ error: 'Subscription service unavailable' });
        }
    };

    /**
     * Middleware factory to check if user can perform specific action
     */
    requireAction = (action: SubscriptionAction) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                const userId = req.userId;
                if (!userId) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                const validation = await this.subscriptionService.validateAction(userId, action);

                if (!validation.canPerformAction) {
                    return this.sendSubscriptionError(res, validation);
                }

                return next();
            } catch (error) {
                console.error('Error checking subscription action:', error);
                return res.status(500).json({ error: 'Subscription validation failed' });
            }
        };
    };

    /**
     * Middleware to check site limit before adding sites
     */
    checkSiteLimit = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const canAdd = await this.subscriptionService.canAddSite(userId);
            if (!canAdd) {
                const context = await this.subscriptionService.getSubscriptionContext(userId);
                if (context) {
                    return res.status(403).json({
                        error: 'Site limit exceeded',
                        subscription: {
                            tier: context.subscription.planType,
                            sitesUsed: context.limits.sitesUsed,
                            sitesMax: context.limits.sitesMax,
                            upgradeRequired: true
                        }
                    });
                }
                return res.status(403).json({ error: 'Site limit exceeded' });
            }

            return next();
        } catch (error) {
            console.error('Error checking site limit:', error);
            return res.status(500).json({ error: 'Site limit validation failed' });
        }
    };

    /**
     * Middleware to check feature access
     */
    requireFeature = (action: SubscriptionAction) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                const userId = req.userId;
                if (!userId) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                const hasAccess = await this.subscriptionService.hasFeatureAccess(userId, action);
                if (!hasAccess) {
                    const context = await this.subscriptionService.getSubscriptionContext(userId);
                    return res.status(403).json({
                        error: 'Feature not available',
                        feature: action,
                        currentTier: context?.subscription.planType || 'unknown',
                        upgradeRequired: true,
                        message: `This feature is not available in your current plan`
                    });
                }

                return next();
            } catch (error) {
                console.error('Error checking feature access:', error);
                return res.status(500).json({ error: 'Feature access validation failed' });
            }
        };
    };

    /**
     * Middleware to handle subscription expiration
     */
    handleExpiredSubscriptions = async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const userId = req.userId;
            if (userId) {
                // Handle expired subscriptions in background
                await this.subscriptionService.handleExpiredSubscription(userId);
            }
            next();
        } catch (error) {
            console.error('Error handling expired subscriptions:', error);
            // Don't block the request, just log the error
            next();
        }
    };

    /**
     * Middleware to add subscription info to response headers
     */
    addSubscriptionHeaders = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.userId;
            if (userId) {
                const context = await this.subscriptionService.getSubscriptionContext(userId);
                if (context) {
                    res.setHeader('X-Subscription-Tier', context.subscription.planType);
                    res.setHeader('X-Sites-Used', context.limits.sitesUsed.toString());
                    res.setHeader('X-Sites-Max', context.limits.sitesMax.toString());

                    if (context.limits.daysUntilExpiry !== undefined) {
                        res.setHeader('X-Days-Until-Expiry', context.limits.daysUntilExpiry.toString());
                    }

                    if (context.limits.isInGracePeriod) {
                        res.setHeader('X-Grace-Period', 'true');
                    }
                }
            }
            next();
        } catch (error) {
            console.error('Error adding subscription headers:', error);
            // Don't block the request
            next();
        }
    };

    /**
     * Helper method to send properly formatted subscription errors
     */
    private sendSubscriptionError(res: Response, validation: SubscriptionValidationResult): Response {
        const statusCode = validation.upgradeRequired ? 402 : 403; // 402 Payment Required for upgrade scenarios

        const errorResponse: any = {
            error: validation.message || 'Action not permitted',
            subscription: {
                upgradeRequired: validation.upgradeRequired || false
            }
        };

        if (validation.limitExceeded) {
            errorResponse.subscription.limitExceeded = validation.limitExceeded;
        }

        if (validation.gracePeriodDays !== undefined) {
            errorResponse.subscription.gracePeriodDays = validation.gracePeriodDays;
        }

        return res.status(statusCode).json(errorResponse);
    }
}

// Action constants for middleware usage
export const SUBSCRIPTION_ACTIONS = {
    ADD_SITE: 'add_site' as SubscriptionAction,
    ACCESS_HISTORY: 'access_history' as SubscriptionAction,
    ACCESS_SNAPSHOTS: 'access_snapshots' as SubscriptionAction,
    ACCESS_LOGGING: 'access_logging' as SubscriptionAction,
    ACCESS_WORKFLOWS: 'access_workflows' as SubscriptionAction,
    API_ACCESS: 'api_access' as SubscriptionAction
} as const;