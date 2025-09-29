import { PrismaClient } from '../generated/prisma';
import {
    SubscriptionTier,
    SubscriptionStatus,
    SubscriptionFeatures,
    SubscriptionLimits,
    UserSubscription,
    SubscriptionContext,
    SubscriptionAction,
    SubscriptionValidationResult,
    SubscriptionError,
    SUBSCRIPTION_TIERS,
    FEATURE_ACTIONS
} from '../types/subscriptionTypes';

export class SubscriptionService {
    private prisma: PrismaClient;
    private readonly GRACE_PERIOD_DAYS = 7;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Get user's current active subscription with features and limits
     */
    async getSubscriptionContext(userId: string): Promise<SubscriptionContext | null> {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription) {
                return null;
            }

            const sitesUsed = await this.getSiteCount(userId);
            const limits = this.calculateLimits(subscription, sitesUsed);

            return {
                subscription,
                limits,
                features: subscription.features
            };
        } catch (error) {
            console.error('Error getting subscription context:', error);
            return null;
        }
    }

    /**
     * Get user's current subscription
     */
    async getUserSubscription(userId: string): Promise<UserSubscription | null> {
        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: {
                    userId,
                    status: {
                        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD]
                    }
                },
                orderBy: {
                    startedAt: 'desc'
                }
            });

            if (!subscription) {
                // Create free tier subscription if none exists
                return await this.createFreeSubscription(userId);
            }

            // Convert Prisma result to UserSubscription
            return this.mapSubscriptionFromDb(subscription);
        } catch (error) {
            console.error('Error getting user subscription:', error);
            return null;
        }
    }

    /**
     * Create a free tier subscription for new users
     */
    async createFreeSubscription(userId: string): Promise<UserSubscription> {
        try {
            const freeTier = SUBSCRIPTION_TIERS[SubscriptionTier.FREE];

            const subscription = await this.prisma.subscription.create({
                data: {
                    userId,
                    planType: SubscriptionTier.FREE,
                    status: SubscriptionStatus.ACTIVE,
                    features: freeTier.features as any,
                    startedAt: new Date()
                }
            });

            return this.mapSubscriptionFromDb(subscription);
        } catch (error) {
            console.error('Error creating free subscription:', error);
            throw new Error('Failed to create free subscription');
        }
    }

    /**
     * Validate if user can perform a specific action
     */
    async validateAction(userId: string, action: SubscriptionAction): Promise<SubscriptionValidationResult> {
        try {
            const context = await this.getSubscriptionContext(userId);
            if (!context) {
                return {
                    isValid: false,
                    canPerformAction: false,
                    message: 'No subscription found',
                    upgradeRequired: true
                };
            }

            return this.validateActionWithContext(context, action);
        } catch (error) {
            console.error('Error validating action:', error);
            return {
                isValid: false,
                canPerformAction: false,
                message: 'Validation error occurred'
            };
        }
    }

    /**
     * Validate action with existing subscription context
     */
    validateActionWithContext(context: SubscriptionContext, action: SubscriptionAction): SubscriptionValidationResult {
        const { subscription, limits, features } = context;

        // Check if subscription is valid and active
        if (!this.isSubscriptionActive(subscription)) {
            return {
                isValid: false,
                canPerformAction: false,
                message: 'Subscription is expired or inactive',
                upgradeRequired: true,
                gracePeriodDays: this.getGracePeriodDays(subscription)
            };
        }

        // Special handling for site addition
        if (action === 'add_site') {
            if (!limits.canAddSites) {
                return {
                    isValid: true,
                    canPerformAction: false,
                    limitExceeded: `Site limit reached (${limits.sitesUsed}/${limits.sitesMax})`,
                    upgradeRequired: true,
                    message: `You have reached your site limit of ${limits.sitesMax}. Upgrade to add more sites.`
                };
            }
            return {
                isValid: true,
                canPerformAction: true,
                message: `You can add ${limits.sitesMax - limits.sitesUsed} more sites`
            };
        }

        // Check feature access
        const featureKey = FEATURE_ACTIONS[action];
        if (featureKey && featureKey !== 'maxSites') {
            const hasFeature = features[featureKey] as boolean;
            if (!hasFeature) {
                return {
                    isValid: true,
                    canPerformAction: false,
                    message: `This feature is not available in your ${subscription.planType} plan`,
                    upgradeRequired: true
                };
            }
        }

        return {
            isValid: true,
            canPerformAction: true,
            message: 'Action permitted'
        };
    }

    /**
     * Check if user can add a new site
     */
    async canAddSite(userId: string): Promise<boolean> {
        const result = await this.validateAction(userId, 'add_site');
        return result.canPerformAction;
    }

    /**
     * Check if user has access to a specific feature
     */
    async hasFeatureAccess(userId: string, action: SubscriptionAction): Promise<boolean> {
        if (action === 'add_site') {
            return this.canAddSite(userId);
        }

        const result = await this.validateAction(userId, action);
        return result.canPerformAction;
    }

    /**
     * Get subscription limits for a user
     */
    async getSubscriptionLimits(userId: string): Promise<SubscriptionLimits | null> {
        try {
            const subscription = await this.getUserSubscription(userId);
            if (!subscription) {
                return null;
            }

            const sitesUsed = await this.getSiteCount(userId);
            return this.calculateLimits(subscription, sitesUsed);
        } catch (error) {
            console.error('Error getting subscription limits:', error);
            return null;
        }
    }

    /**
     * Update subscription tier
     */
    async updateSubscriptionTier(
        userId: string,
        newTier: SubscriptionTier,
        stripeSubscriptionId?: string
    ): Promise<UserSubscription | null> {
        try {
            const tierConfig = SUBSCRIPTION_TIERS[newTier];
            const expiresAt = newTier === SubscriptionTier.FREE ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            // Deactivate old subscriptions
            await this.prisma.subscription.updateMany({
                where: {
                    userId,
                    status: SubscriptionStatus.ACTIVE
                },
                data: {
                    status: SubscriptionStatus.CANCELED
                }
            });

            // Create new subscription
            const subscription = await this.prisma.subscription.create({
                data: {
                    userId,
                    planType: newTier,
                    status: SubscriptionStatus.ACTIVE,
                    features: tierConfig.features as any,
                    startedAt: new Date(),
                    expiresAt,
                    stripeSubscriptionId
                }
            });

            return this.mapSubscriptionFromDb(subscription);
        } catch (error) {
            console.error('Error updating subscription tier:', error);
            return null;
        }
    }

    /**
     * Handle subscription expiration with grace period
     */
    async handleExpiredSubscription(userId: string): Promise<void> {
        try {
            const activeSubscription = await this.prisma.subscription.findFirst({
                where: {
                    userId,
                    status: SubscriptionStatus.ACTIVE,
                    expiresAt: {
                        lte: new Date()
                    }
                }
            });

            if (activeSubscription) {
                // Move to grace period
                await this.prisma.subscription.update({
                    where: { id: activeSubscription.id },
                    data: {
                        status: SubscriptionStatus.GRACE_PERIOD
                    }
                });
            }

            // Check if grace period has expired
            const gracePeriodCutoff = new Date();
            gracePeriodCutoff.setDate(gracePeriodCutoff.getDate() - this.GRACE_PERIOD_DAYS);

            await this.prisma.subscription.updateMany({
                where: {
                    userId,
                    status: SubscriptionStatus.GRACE_PERIOD,
                    expiresAt: {
                        lte: gracePeriodCutoff
                    }
                },
                data: {
                    status: SubscriptionStatus.EXPIRED
                }
            });

            // Create free subscription if all subscriptions expired
            const activeOrGrace = await this.prisma.subscription.findFirst({
                where: {
                    userId,
                    status: {
                        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD]
                    }
                }
            });

            if (!activeOrGrace) {
                await this.createFreeSubscription(userId);
            }
        } catch (error) {
            console.error('Error handling expired subscription:', error);
        }
    }

    /**
     * Create subscription error for API responses
     */
    createSubscriptionError(
        code: SubscriptionError['code'],
        message: string,
        upgradeUrl?: string
    ): SubscriptionError {
        return {
            code,
            message,
            upgradeUrl
        };
    }

    // Private helper methods

    private async getSiteCount(userId: string): Promise<number> {
        return this.prisma.site.count({
            where: {
                userId,
                isActive: true
            }
        });
    }

    private calculateLimits(subscription: UserSubscription, sitesUsed: number): SubscriptionLimits {
        const maxSites = subscription.features.maxSites;
        const canAddSites = sitesUsed < maxSites;

        let daysUntilExpiry: number | undefined;
        let isInGracePeriod = false;

        if (subscription.expiresAt) {
            const now = new Date();
            const daysLeft = Math.ceil((subscription.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            daysUntilExpiry = Math.max(0, daysLeft);
        }

        if (subscription.status === SubscriptionStatus.GRACE_PERIOD) {
            isInGracePeriod = true;
            daysUntilExpiry = this.getGracePeriodDays(subscription);
        }

        return {
            sitesUsed,
            sitesMax: maxSites,
            canAddSites,
            daysUntilExpiry,
            isInGracePeriod
        };
    }

    private isSubscriptionActive(subscription: UserSubscription): boolean {
        if (subscription.status === SubscriptionStatus.EXPIRED ||
            subscription.status === SubscriptionStatus.CANCELED) {
            return false;
        }

        if (subscription.expiresAt && subscription.expiresAt < new Date()) {
            return subscription.status === SubscriptionStatus.GRACE_PERIOD;
        }

        return true;
    }

    private getGracePeriodDays(subscription: UserSubscription): number {
        if (subscription.status !== SubscriptionStatus.GRACE_PERIOD || !subscription.expiresAt) {
            return 0;
        }

        const gracePeriodEnd = new Date(subscription.expiresAt);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);

        const now = new Date();
        const daysLeft = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return Math.max(0, daysLeft);
    }

    private mapSubscriptionFromDb(subscription: any): UserSubscription {
        return {
            id: subscription.id,
            userId: subscription.userId,
            planType: subscription.planType as SubscriptionTier,
            status: subscription.status as SubscriptionStatus,
            features: subscription.features as SubscriptionFeatures,
            startedAt: subscription.startedAt,
            expiresAt: subscription.expiresAt,
            stripeSubscriptionId: subscription.stripeSubscriptionId
        };
    }
}