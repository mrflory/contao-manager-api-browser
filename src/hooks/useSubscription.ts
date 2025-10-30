/**
 * useSubscription Hook
 *
 * This hook provides a simple interface to access subscription data from the SubscriptionContext.
 * It now consumes centralized subscription state instead of fetching data independently,
 * which eliminates duplicate API calls across components.
 *
 * The hook maintains backward compatibility with the previous API while leveraging
 * the new context-based architecture.
 */

import { useSubscriptionContext } from '../contexts/SubscriptionContext';

// Re-export types from SubscriptionContext for backward compatibility
export type {
    SubscriptionStatus,
    SubscriptionLimits,
    SubscriptionFeatures,
    SubscriptionPlan,
    SubscriptionContextType as SubscriptionContext
} from '../contexts/SubscriptionContext';

/**
 * Access subscription data from the centralized SubscriptionContext.
 *
 * This hook replaces the previous data-fetching implementation with a context consumer,
 * eliminating duplicate API calls when used across multiple components.
 *
 * @returns Subscription state and methods from SubscriptionContext
 */
export function useSubscription() {
    return useSubscriptionContext();
}