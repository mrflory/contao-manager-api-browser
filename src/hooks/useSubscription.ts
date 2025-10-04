import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export interface SubscriptionStatus {
    tier: 'free' | 'advanced' | 'premium';
    status: 'active' | 'canceled' | 'expired' | 'grace_period';
    startedAt: string;
    expiresAt?: string;
}

export interface SubscriptionLimits {
    sitesUsed: number;
    sitesMax: number;
    canAddSites: boolean;
    daysUntilExpiry?: number;
    isInGracePeriod: boolean;
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

export interface SubscriptionPlan {
    tier: 'free' | 'advanced' | 'premium';
    name: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: SubscriptionFeatures;
    description: string;
    popular?: boolean;
}

export interface SubscriptionContext {
    subscription: SubscriptionStatus;
    limits: SubscriptionLimits;
    features: SubscriptionFeatures;
    plans: SubscriptionPlan[];
    loading: boolean;
    error: string | null;
    refreshSubscription: () => Promise<void>;
    canPerformAction: (action: string) => Promise<boolean>;
    validateAction: (action: string) => Promise<{
        isValid: boolean;
        canPerformAction: boolean;
        message?: string;
        upgradeRequired?: boolean;
    }>;
}

export function useSubscription(): SubscriptionContext {
    const { isAuthenticated, isTokenReady, isLoading: authLoading } = useAuth();
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
    const [features, setFeatures] = useState<SubscriptionFeatures | null>(null);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isLoadingRef = useRef(false);

    const refreshSubscription = useCallback(async () => {
        // Don't fetch subscription data if auth is loading, not authenticated, token not ready, or already loading
        if (authLoading || !isAuthenticated || !isTokenReady || isLoadingRef.current) {
            setLoading(false);
            return;
        }

        try {
            isLoadingRef.current = true;
            setLoading(true);
            setError(null);

            // Fetch subscription status with error handling
            try {
                const statusResponse = await api.get('/subscription/status');
                if (statusResponse.data) {
                    setSubscription(statusResponse.data.subscription);
                    setLimits(statusResponse.data.limits);
                    setFeatures(statusResponse.data.features);
                } else {
                    throw new Error('Failed to load subscription status');
                }
            } catch (statusErr) {
                // If subscription endpoints don't exist, set default values
                if (statusErr instanceof Error && statusErr.message.includes('401')) {
                    console.warn('Subscription endpoints not available - using defaults');
                    setSubscription({ tier: 'free', status: 'active', startedAt: new Date().toISOString() });
                    setLimits({ sitesUsed: 0, sitesMax: 1, canAddSites: true, isInGracePeriod: false });
                    setFeatures({ maxSites: 1, hasLogging: true, hasHistory: false, hasSnapshots: false, hasAdvancedWorkflows: false, hasApiAccess: false, hasPrioritySupport: false });
                } else {
                    throw statusErr;
                }
            }

            // Fetch available plans with error handling
            try {
                const plansResponse = await api.get('/subscription/plans');
                if (plansResponse.data) {
                    setPlans(plansResponse.data.plans);
                }
            } catch (plansErr) {
                // Set default plans if endpoint doesn't exist
                console.warn('Plans endpoint not available - using defaults');
                setPlans([
                    {
                        tier: 'free',
                        name: 'Free',
                        price: 0,
                        currency: 'USD',
                        interval: 'month',
                        description: 'Basic site management',
                        features: { maxSites: 1, hasLogging: true, hasHistory: false, hasSnapshots: false, hasAdvancedWorkflows: false, hasApiAccess: false, hasPrioritySupport: false },
                        popular: false
                    }
                ]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription';
            setError(errorMessage);
            console.error('Error loading subscription:', err);
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
        }
    }, [authLoading, isAuthenticated, isTokenReady]);

    const canPerformAction = useCallback(async (action: string): Promise<boolean> => {
        if (!isAuthenticated) {
            return false;
        }

        try {
            const response = await api.post('/subscription/validate-action', { action });
            return response.data?.canPerformAction === true;
        } catch (err) {
            console.error('Error validating action:', err);
            return false;
        }
    }, [isAuthenticated]);

    const validateAction = useCallback(async (action: string) => {
        if (!isAuthenticated) {
            return {
                isValid: false,
                canPerformAction: false,
                message: 'Authentication required'
            };
        }

        try {
            const response = await api.post('/subscription/validate-action', { action });
            if (response.data) {
                return response.data;
            }
            return {
                isValid: false,
                canPerformAction: false,
                message: 'Validation failed'
            };
        } catch (err) {
            console.error('Error validating action:', err);
            return {
                isValid: false,
                canPerformAction: false,
                message: 'Validation error occurred'
            };
        }
    }, [isAuthenticated]);

    useEffect(() => {
        // Only run when auth is complete (not loading) and token is ready
        if (!authLoading && isTokenReady) {
            refreshSubscription();
        }
    }, [refreshSubscription, authLoading, isTokenReady]);

    return {
        subscription: subscription || {
            tier: 'free',
            status: 'active',
            startedAt: new Date().toISOString()
        },
        limits: limits || {
            sitesUsed: 0,
            sitesMax: 2,
            canAddSites: true,
            isInGracePeriod: false
        },
        features: features || {
            maxSites: 2,
            hasHistory: false,
            hasSnapshots: false,
            hasLogging: false,
            hasAdvancedWorkflows: false,
            hasApiAccess: false,
            hasPrioritySupport: false
        },
        plans,
        loading,
        error,
        refreshSubscription,
        canPerformAction,
        validateAction
    };
}