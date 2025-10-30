import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

// Types
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

export interface SubscriptionState {
    subscription: SubscriptionStatus;
    limits: SubscriptionLimits;
    features: SubscriptionFeatures;
    plans: SubscriptionPlan[];
    loading: boolean;
    error: string | null;
}

export interface SubscriptionContextType extends SubscriptionState {
    refreshSubscription: () => Promise<void>;
    canPerformAction: (action: string) => Promise<boolean>;
    validateAction: (action: string) => Promise<{
        isValid: boolean;
        canPerformAction: boolean;
        message?: string;
        upgradeRequired?: boolean;
    }>;
}

// Action types
type SubscriptionAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | {
        type: 'SET_SUBSCRIPTION_DATA';
        payload: {
            subscription: SubscriptionStatus;
            limits: SubscriptionLimits;
            features: SubscriptionFeatures;
            plans: SubscriptionPlan[];
        }
    }
    | { type: 'CLEAR_ERROR' };

// Default values
const defaultSubscription: SubscriptionStatus = {
    tier: 'free',
    status: 'active',
    startedAt: new Date().toISOString()
};

const defaultLimits: SubscriptionLimits = {
    sitesUsed: 0,
    sitesMax: 2,
    canAddSites: true,
    isInGracePeriod: false
};

const defaultFeatures: SubscriptionFeatures = {
    maxSites: 2,
    hasHistory: false,
    hasSnapshots: false,
    hasLogging: false,
    hasAdvancedWorkflows: false,
    hasApiAccess: false,
    hasPrioritySupport: false
};

const defaultPlans: SubscriptionPlan[] = [
    {
        tier: 'free',
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'month',
        description: 'Basic site management',
        features: defaultFeatures,
        popular: false
    }
];

// Initial state
const initialState: SubscriptionState = {
    subscription: defaultSubscription,
    limits: defaultLimits,
    features: defaultFeatures,
    plans: defaultPlans,
    loading: true,
    error: null,
};

// Reducer
const subscriptionReducer = (state: SubscriptionState, action: SubscriptionAction): SubscriptionState => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        case 'SET_SUBSCRIPTION_DATA':
            return {
                ...state,
                subscription: action.payload.subscription,
                limits: action.payload.limits,
                features: action.payload.features,
                plans: action.payload.plans,
                loading: false,
                error: null,
            };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        default:
            return state;
    }
};

// Create context
const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Provider component
export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(subscriptionReducer, initialState);
    const { isAuthenticated, isTokenReady, isLoading: authLoading } = useAuth();

    // Track ongoing refresh promise to prevent multiple concurrent refresh attempts
    const refreshPromiseRef = useRef<Promise<void> | null>(null);
    const isInitializedRef = useRef(false);

    const refreshSubscription = useCallback(async () => {
        // Don't fetch subscription data if auth is loading, not authenticated, or token not ready
        if (authLoading || !isAuthenticated || !isTokenReady) {
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        // Use existing refresh promise if one is in progress (deduplication)
        if (refreshPromiseRef.current) {
            return refreshPromiseRef.current;
        }

        const refreshPromise = (async () => {
            try {
                dispatch({ type: 'SET_LOADING', payload: true });
                dispatch({ type: 'CLEAR_ERROR' });

                let subscription = defaultSubscription;
                let limits = defaultLimits;
                let features = defaultFeatures;
                let plans = defaultPlans;

                // Fetch subscription status with error handling
                try {
                    const statusResponse = await api.get('/subscription/status');
                    if (statusResponse.data) {
                        subscription = statusResponse.data.subscription;
                        limits = statusResponse.data.limits;
                        features = statusResponse.data.features;
                    }
                } catch (statusErr) {
                    // If subscription endpoints don't exist, use default values
                    if (statusErr instanceof Error && statusErr.message.includes('401')) {
                        console.warn('[SUBSCRIPTION] Subscription endpoints not available - using defaults');
                    } else {
                        throw statusErr;
                    }
                }

                // Fetch available plans with error handling
                try {
                    const plansResponse = await api.get('/subscription/plans');
                    if (plansResponse.data) {
                        plans = plansResponse.data.plans;
                    }
                } catch (plansErr) {
                    // Use default plans if endpoint doesn't exist
                    console.warn('[SUBSCRIPTION] Plans endpoint not available - using defaults');
                }

                dispatch({
                    type: 'SET_SUBSCRIPTION_DATA',
                    payload: { subscription, limits, features, plans }
                });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription';
                dispatch({ type: 'SET_ERROR', payload: errorMessage });
                console.error('[SUBSCRIPTION] Error loading subscription:', err);
            } finally {
                refreshPromiseRef.current = null;
            }
        })();

        refreshPromiseRef.current = refreshPromise;
        return refreshPromise;
    }, [authLoading, isAuthenticated, isTokenReady]);

    const canPerformAction = useCallback(async (action: string): Promise<boolean> => {
        if (!isAuthenticated) {
            return false;
        }

        try {
            const response = await api.post('/subscription/validate-action', { action });
            return response.data?.canPerformAction === true;
        } catch (err) {
            console.error('[SUBSCRIPTION] Error validating action:', err);
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
            console.error('[SUBSCRIPTION] Error validating action:', err);
            return {
                isValid: false,
                canPerformAction: false,
                message: 'Validation error occurred'
            };
        }
    }, [isAuthenticated]);

    // Initialize subscription data when auth is ready - only run once
    useEffect(() => {
        const initializeSubscription = async () => {
            if (isInitializedRef.current) return;

            // Only initialize when auth is complete and token is ready
            if (!authLoading && isTokenReady && isAuthenticated) {
                isInitializedRef.current = true;
                console.log('[SUBSCRIPTION] Initializing subscription data...');
                await refreshSubscription();
            } else if (!authLoading && !isAuthenticated) {
                // User is not authenticated - set loading to false
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        initializeSubscription();
    }, [authLoading, isTokenReady, isAuthenticated, refreshSubscription]);

    const contextValue: SubscriptionContextType = {
        ...state,
        refreshSubscription,
        canPerformAction,
        validateAction,
    };

    return (
        <SubscriptionContext.Provider value={contextValue}>
            {children}
        </SubscriptionContext.Provider>
    );
};

// Hook to use subscription context
export const useSubscriptionContext = (): SubscriptionContextType => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
    }
    return context;
};
