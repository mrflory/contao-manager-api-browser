import { Request, Response, NextFunction } from 'express';
import { SubscriptionMiddleware } from '../../middleware/subscriptionMiddleware';
import { SubscriptionService } from '../../services/subscriptionService';
import { PrismaClient } from '../../generated/prisma';
import { SubscriptionTier, SubscriptionStatus } from '../../types/subscriptionTypes';

// Mock PrismaClient
jest.mock('../../generated/prisma');

// Mock SubscriptionService
jest.mock('../../services/subscriptionService');

describe('SubscriptionMiddleware', () => {
    let subscriptionMiddleware: SubscriptionMiddleware;
    let mockSubscriptionService: jest.Mocked<SubscriptionService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

        mockSubscriptionService = {
            canAddSite: jest.fn(),
            hasFeatureAccess: jest.fn(),
            getSubscriptionContext: jest.fn(),
            handleExpiredSubscription: jest.fn(),
            validateAction: jest.fn()
        } as any;

        subscriptionMiddleware = new SubscriptionMiddleware(mockPrisma);
        (subscriptionMiddleware as any).subscriptionService = mockSubscriptionService;

        mockRequest = {
            userId: 'user-1'
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis()
        };

        nextFunction = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('checkSiteLimit', () => {
        it('should call next() when user can add sites', async () => {
            mockSubscriptionService.canAddSite.mockResolvedValue(true);

            await subscriptionMiddleware.checkSiteLimit(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockSubscriptionService.canAddSite).toHaveBeenCalledWith('user-1');
            expect(nextFunction).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should return 403 when site limit is exceeded', async () => {
            mockSubscriptionService.canAddSite.mockResolvedValue(false);

            const mockContext = {
                subscription: {
                    planType: SubscriptionTier.FREE,
                    status: SubscriptionStatus.ACTIVE,
                    startedAt: new Date(),
                    expiresAt: null
                },
                limits: {
                    sitesUsed: 2,
                    sitesMax: 2,
                    canAddSites: false,
                    isInGracePeriod: false
                },
                features: {
                    maxSites: 2,
                    hasHistory: false,
                    hasSnapshots: false,
                    hasLogging: false,
                    hasAdvancedWorkflows: false,
                    hasApiAccess: false,
                    hasPrioritySupport: false
                }
            };

            mockSubscriptionService.getSubscriptionContext.mockResolvedValue(mockContext);

            await subscriptionMiddleware.checkSiteLimit(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Site limit exceeded',
                subscription: {
                    tier: SubscriptionTier.FREE,
                    sitesUsed: 2,
                    sitesMax: 2,
                    upgradeRequired: true
                }
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('should return 401 when user is not authenticated', async () => {
            mockRequest.userId = undefined;

            await subscriptionMiddleware.checkSiteLimit(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Authentication required'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('requireFeature', () => {
        it('should call next() when user has feature access', async () => {
            mockSubscriptionService.hasFeatureAccess.mockResolvedValue(true);

            const middleware = subscriptionMiddleware.requireFeature('access_history');

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockSubscriptionService.hasFeatureAccess).toHaveBeenCalledWith('user-1', 'access_history');
            expect(nextFunction).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should return 403 when user lacks feature access', async () => {
            mockSubscriptionService.hasFeatureAccess.mockResolvedValue(false);

            const mockContext = {
                subscription: {
                    planType: SubscriptionTier.FREE,
                    status: SubscriptionStatus.ACTIVE,
                    startedAt: new Date(),
                    expiresAt: null
                }
            };

            mockSubscriptionService.getSubscriptionContext.mockResolvedValue(mockContext);

            const middleware = subscriptionMiddleware.requireFeature('access_history');

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Feature not available',
                feature: 'access_history',
                currentTier: SubscriptionTier.FREE,
                upgradeRequired: true,
                message: 'This feature is not available in your current plan'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('requireAction', () => {
        it('should call next() when action is permitted', async () => {
            mockSubscriptionService.validateAction.mockResolvedValue({
                isValid: true,
                canPerformAction: true,
                message: 'Action permitted'
            });

            const middleware = subscriptionMiddleware.requireAction('add_site');

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockSubscriptionService.validateAction).toHaveBeenCalledWith('user-1', 'add_site');
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should return 402 when upgrade is required', async () => {
            mockSubscriptionService.validateAction.mockResolvedValue({
                isValid: true,
                canPerformAction: false,
                message: 'Site limit exceeded',
                upgradeRequired: true,
                limitExceeded: 'Site limit reached (2/2)'
            });

            const middleware = subscriptionMiddleware.requireAction('add_site');

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).toHaveBeenCalledWith(402);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Site limit exceeded',
                subscription: {
                    upgradeRequired: true,
                    limitExceeded: 'Site limit reached (2/2)'
                }
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    describe('addSubscriptionHeaders', () => {
        it('should add subscription headers when user is authenticated', async () => {
            const mockContext = {
                subscription: {
                    planType: SubscriptionTier.ADVANCED,
                    status: SubscriptionStatus.ACTIVE,
                    startedAt: new Date(),
                    expiresAt: null
                },
                limits: {
                    sitesUsed: 3,
                    sitesMax: 5,
                    canAddSites: true,
                    isInGracePeriod: false,
                    daysUntilExpiry: 15
                },
                features: {
                    maxSites: 5,
                    hasHistory: true,
                    hasSnapshots: true,
                    hasLogging: true,
                    hasAdvancedWorkflows: true,
                    hasApiAccess: true,
                    hasPrioritySupport: false
                }
            };

            mockSubscriptionService.getSubscriptionContext.mockResolvedValue(mockContext);

            await subscriptionMiddleware.addSubscriptionHeaders(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Subscription-Tier', SubscriptionTier.ADVANCED);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Sites-Used', '3');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Sites-Max', '5');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Days-Until-Expiry', '15');
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should set grace period header when in grace period', async () => {
            const mockContext = {
                subscription: {
                    planType: SubscriptionTier.ADVANCED,
                    status: SubscriptionStatus.GRACE_PERIOD,
                    startedAt: new Date(),
                    expiresAt: new Date()
                },
                limits: {
                    sitesUsed: 3,
                    sitesMax: 5,
                    canAddSites: true,
                    isInGracePeriod: true,
                    daysUntilExpiry: 3
                },
                features: {
                    maxSites: 5,
                    hasHistory: true,
                    hasSnapshots: true,
                    hasLogging: true,
                    hasAdvancedWorkflows: true,
                    hasApiAccess: true,
                    hasPrioritySupport: false
                }
            };

            mockSubscriptionService.getSubscriptionContext.mockResolvedValue(mockContext);

            await subscriptionMiddleware.addSubscriptionHeaders(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Grace-Period', 'true');
            expect(nextFunction).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockSubscriptionService.getSubscriptionContext.mockRejectedValue(new Error('Service error'));

            await subscriptionMiddleware.addSubscriptionHeaders(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            // Should not throw, should call next() anyway
            expect(nextFunction).toHaveBeenCalled();
        });
    });
});