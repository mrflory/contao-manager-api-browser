/**
 * Subscription Types and Interfaces for Phase 3.2
 * Freemium business model implementation
 */

export enum SubscriptionTier {
  FREE = 'free',
  ADVANCED = 'advanced',
  PREMIUM = 'premium'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  GRACE_PERIOD = 'grace_period'
}

export interface SubscriptionFeatures {
  maxSites: number;
  hasHistory: boolean;
  hasSnapshots: boolean;
  hasLogging: boolean;
  hasAdvancedWorkflows: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
}

export interface SubscriptionLimits {
  sitesUsed: number;
  sitesMax: number;
  canAddSites: boolean;
  daysUntilExpiry?: number;
  isInGracePeriod: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planType: SubscriptionTier;
  status: SubscriptionStatus;
  features: SubscriptionFeatures;
  startedAt: Date;
  expiresAt?: Date;
  stripeSubscriptionId?: string;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: SubscriptionFeatures;
  description: string;
  popular?: boolean;
}

export interface SubscriptionValidationResult {
  isValid: boolean;
  canPerformAction: boolean;
  limitExceeded?: string;
  gracePeriodDays?: number;
  upgradeRequired?: boolean;
  message?: string;
}

export interface SubscriptionContext {
  subscription: UserSubscription;
  limits: SubscriptionLimits;
  features: SubscriptionFeatures;
}

export type SubscriptionAction =
  | 'add_site'
  | 'access_history'
  | 'access_snapshots'
  | 'access_logging'
  | 'access_workflows'
  | 'api_access';

// Predefined subscription tier configurations
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionPlan> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: {
      maxSites: 2,
      hasHistory: false,
      hasSnapshots: false,
      hasLogging: false,
      hasAdvancedWorkflows: false,
      hasApiAccess: false,
      hasPrioritySupport: false
    },
    description: 'Perfect for trying out Contao Manager API Browser'
  },
  [SubscriptionTier.ADVANCED]: {
    tier: SubscriptionTier.ADVANCED,
    name: 'Advanced',
    price: 29,
    currency: 'USD',
    interval: 'month',
    features: {
      maxSites: 5,
      hasHistory: true,
      hasSnapshots: true,
      hasLogging: true,
      hasAdvancedWorkflows: true,
      hasApiAccess: true,
      hasPrioritySupport: false
    },
    description: 'Great for small teams and development agencies',
    popular: true
  },
  [SubscriptionTier.PREMIUM]: {
    tier: SubscriptionTier.PREMIUM,
    name: 'Premium',
    price: 99,
    currency: 'USD',
    interval: 'month',
    features: {
      maxSites: 20,
      hasHistory: true,
      hasSnapshots: true,
      hasLogging: true,
      hasAdvancedWorkflows: true,
      hasApiAccess: true,
      hasPrioritySupport: true
    },
    description: 'For large teams and enterprise workflows'
  }
};

// Feature flag mapping for easy validation
export const FEATURE_ACTIONS: Record<SubscriptionAction, keyof SubscriptionFeatures> = {
  add_site: 'maxSites', // Special handling - not boolean
  access_history: 'hasHistory',
  access_snapshots: 'hasSnapshots',
  access_logging: 'hasLogging',
  access_workflows: 'hasAdvancedWorkflows',
  api_access: 'hasApiAccess'
};

export interface SubscriptionError {
  code: 'LIMIT_EXCEEDED' | 'FEATURE_UNAVAILABLE' | 'SUBSCRIPTION_EXPIRED' | 'SUBSCRIPTION_INVALID';
  message: string;
  upgradeUrl?: string;
  retryAfter?: Date;
}