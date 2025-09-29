import { SubscriptionService } from '../../services/subscriptionService';
import { SubscriptionTier, SubscriptionStatus } from '../../types/subscriptionTypes';
import { PrismaClient } from '../../generated/prisma';

// Mock Prisma
jest.mock('../../generated/prisma');

describe('SubscriptionService', () => {
    let subscriptionService: SubscriptionService;
    let mockPrisma: jest.Mocked<PrismaClient>;

    beforeEach(() => {
        mockPrisma = {
            subscription: {
                findFirst: jest.fn(),
                create: jest.fn(),
                updateMany: jest.fn(),
                update: jest.fn(),
                findUnique: jest.fn()
            },
            site: {
                count: jest.fn()
            }
        } as any;

        subscriptionService = new SubscriptionService(mockPrisma);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserSubscription', () => {
        it('should return existing subscription', async () => {
            const mockSubscription = {
                id: 'sub-1',
                userId: 'user-1',
                planType: SubscriptionTier.FREE,
                status: SubscriptionStatus.ACTIVE,
                features: {
                    maxSites: 2,
                    hasHistory: false,
                    hasSnapshots: false,
                    hasLogging: false,
                    hasAdvancedWorkflows: false,
                    hasApiAccess: false,
                    hasPrioritySupport: false
                },
                startedAt: new Date(),
                expiresAt: null,
                stripeSubscriptionId: null
            };

            mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);

            const result = await subscriptionService.getUserSubscription('user-1');

            expect(result).toBeDefined();
            expect(result?.planType).toBe(SubscriptionTier.FREE);
            expect(result?.features.maxSites).toBe(2);
        });

        it('should create free subscription if none exists', async () => {
            mockPrisma.subscription.findFirst.mockResolvedValue(null);

            const mockCreatedSubscription = {
                id: 'sub-1',
                userId: 'user-1',
                planType: SubscriptionTier.FREE,
                status: SubscriptionStatus.ACTIVE,
                features: {
                    maxSites: 2,
                    hasHistory: false,
                    hasSnapshots: false,
                    hasLogging: false,
                    hasAdvancedWorkflows: false,
                    hasApiAccess: false,
                    hasPrioritySupport: false
                },
                startedAt: new Date(),
                expiresAt: null,
                stripeSubscriptionId: null
            };

            mockPrisma.subscription.create.mockResolvedValue(mockCreatedSubscription);

            const result = await subscriptionService.getUserSubscription('user-1');

            expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 'user-1',
                    planType: SubscriptionTier.FREE,
                    status: SubscriptionStatus.ACTIVE
                })
            });

            expect(result).toBeDefined();
            expect(result?.planType).toBe(SubscriptionTier.FREE);
        });
    });

    describe('validateAction', () => {
        it('should allow adding sites when under limit', async () => {
            const mockSubscription = {
                id: 'sub-1',
                userId: 'user-1',
                planType: SubscriptionTier.FREE,
                status: SubscriptionStatus.ACTIVE,
                features: {
                    maxSites: 2,
                    hasHistory: false,
                    hasSnapshots: false,
                    hasLogging: false,
                    hasAdvancedWorkflows: false,
                    hasApiAccess: false,
                    hasPrioritySupport: false
                },
                startedAt: new Date(),
                expiresAt: null,
                stripeSubscriptionId: null
            };

            mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);
            mockPrisma.site.count.mockResolvedValue(1);

            const result = await subscriptionService.validateAction('user-1', 'add_site');

            expect(result.isValid).toBe(true);
            expect(result.canPerformAction).toBe(true);
        });

        it('should deny adding sites when at limit', async () => {
            const mockSubscription = {
                id: 'sub-1',
                userId: 'user-1',
                planType: SubscriptionTier.FREE,
                status: SubscriptionStatus.ACTIVE,
                features: {
                    maxSites: 2,
                    hasHistory: false,
                    hasSnapshots: false,
                    hasLogging: false,
                    hasAdvancedWorkflows: false,
                    hasApiAccess: false,
                    hasPrioritySupport: false
                },
                startedAt: new Date(),
                expiresAt: null,
                stripeSubscriptionId: null
            };

            mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);
            mockPrisma.site.count.mockResolvedValue(2);

            const result = await subscriptionService.validateAction('user-1', 'add_site');

            expect(result.isValid).toBe(true);
            expect(result.canPerformAction).toBe(false);
            expect(result.upgradeRequired).toBe(true);
        });

        it('should deny premium features on free tier', async () => {
            const mockSubscription = {
                id: 'sub-1',
                userId: 'user-1',
                planType: SubscriptionTier.FREE,
                status: SubscriptionStatus.ACTIVE,
                features: {
                    maxSites: 2,
                    hasHistory: false,
                    hasSnapshots: false,
                    hasLogging: false,
                    hasAdvancedWorkflows: false,
                    hasApiAccess: false,
                    hasPrioritySupport: false
                },
                startedAt: new Date(),
                expiresAt: null,
                stripeSubscriptionId: null
            };

            mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);
            mockPrisma.site.count.mockResolvedValue(1);

            const result = await subscriptionService.validateAction('user-1', 'access_history');

            expect(result.isValid).toBe(true);
            expect(result.canPerformAction).toBe(false);
            expect(result.upgradeRequired).toBe(true);
        });

        it('should allow premium features on advanced tier', async () => {
            const mockSubscription = {
                id: 'sub-1',
                userId: 'user-1',
                planType: SubscriptionTier.ADVANCED,
                status: SubscriptionStatus.ACTIVE,
                features: {
                    maxSites: 5,
                    hasHistory: true,
                    hasSnapshots: true,
                    hasLogging: true,
                    hasAdvancedWorkflows: true,
                    hasApiAccess: true,
                    hasPrioritySupport: false
                },
                startedAt: new Date(),
                expiresAt: null,
                stripeSubscriptionId: null
            };

            mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);
            mockPrisma.site.count.mockResolvedValue(3);

            const result = await subscriptionService.validateAction('user-1', 'access_history');

            expect(result.isValid).toBe(true);
            expect(result.canPerformAction).toBe(true);
        });
    });

    describe('updateSubscriptionTier', () => {
        it('should create new subscription and deactivate old ones', async () => {
            const mockUpdatedSubscription = {
                id: 'sub-2',
                userId: 'user-1',
                planType: SubscriptionTier.ADVANCED,
                status: SubscriptionStatus.ACTIVE,
                features: {
                    maxSites: 5,
                    hasHistory: true,
                    hasSnapshots: true,
                    hasLogging: true,
                    hasAdvancedWorkflows: true,
                    hasApiAccess: true,
                    hasPrioritySupport: false
                },
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                stripeSubscriptionId: 'stripe-123'
            };

            mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
            mockPrisma.subscription.create.mockResolvedValue(mockUpdatedSubscription);

            const result = await subscriptionService.updateSubscriptionTier(
                'user-1',
                SubscriptionTier.ADVANCED,
                'stripe-123'
            );

            expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    status: SubscriptionStatus.ACTIVE
                },
                data: {
                    status: SubscriptionStatus.CANCELED
                }
            });

            expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 'user-1',
                    planType: SubscriptionTier.ADVANCED,
                    status: SubscriptionStatus.ACTIVE,
                    stripeSubscriptionId: 'stripe-123'
                })
            });

            expect(result).toBeDefined();
            expect(result?.planType).toBe(SubscriptionTier.ADVANCED);
        });
    });

    describe('canAddSite', () => {
        it('should return true when under site limit', async () => {
            const mockSubscription = {
                id: 'sub-1',
                userId: 'user-1',
                planType: SubscriptionTier.FREE,
                status: SubscriptionStatus.ACTIVE,
                features: {
                    maxSites: 2,
                    hasHistory: false,
                    hasSnapshots: false,
                    hasLogging: false,
                    hasAdvancedWorkflows: false,
                    hasApiAccess: false,
                    hasPrioritySupport: false
                },
                startedAt: new Date(),
                expiresAt: null,
                stripeSubscriptionId: null
            };

            mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);
            mockPrisma.site.count.mockResolvedValue(1);

            const result = await subscriptionService.canAddSite('user-1');

            expect(result).toBe(true);
        });

        it('should return false when at site limit', async () => {
            const mockSubscription = {
                id: 'sub-1',
                userId: 'user-1',
                planType: SubscriptionTier.FREE,
                status: SubscriptionStatus.ACTIVE,
                features: {
                    maxSites: 2,
                    hasHistory: false,
                    hasSnapshots: false,
                    hasLogging: false,
                    hasAdvancedWorkflows: false,
                    hasApiAccess: false,
                    hasPrioritySupport: false
                },
                startedAt: new Date(),
                expiresAt: null,
                stripeSubscriptionId: null
            };

            mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);
            mockPrisma.site.count.mockResolvedValue(2);

            const result = await subscriptionService.canAddSite('user-1');

            expect(result).toBe(false);
        });
    });
});