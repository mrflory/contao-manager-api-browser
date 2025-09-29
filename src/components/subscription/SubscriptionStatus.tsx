import {
    Box,
    VStack,
    HStack,
    Text,
    Button
} from '@chakra-ui/react';
import { Card } from '../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { SubscriptionBadge } from './SubscriptionBadge';
import { useSubscription } from '../../hooks/useSubscription';

export function SubscriptionStatus() {
    const {
        subscription,
        limits,
        features,
        loading,
        error,
        refreshSubscription
    } = useSubscription();

    if (loading) {
        return (
            <Card.Root>
                <Card.Body p={4}>
                    <Text>Loading subscription status...</Text>
                </Card.Body>
            </Card.Root>
        );
    }

    if (error) {
        return (
            <Card.Root>
                <Card.Body p={4}>
                    <Alert status="error">
                        <Box>
                            <AlertTitle>Error loading subscription</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Box>
                        <Button
                            ml="auto"
                            size="sm"
                            onClick={refreshSubscription}
                        >
                            Retry
                        </Button>
                    </Alert>
                </Card.Body>
            </Card.Root>
        );
    }

    const siteUsagePercent = limits.sitesMax > 0 ? (limits.sitesUsed / limits.sitesMax) * 100 : 0;
    const isNearLimit = siteUsagePercent >= 80;
    const isAtLimit = !limits.canAddSites;

    return (
        <Card.Root>
            <Card.Body p={4}>
                <VStack align="stretch" gap={4}>
                {/* Subscription Tier */}
                <HStack justify="space-between">
                    <Text fontWeight="semibold">Subscription</Text>
                    <SubscriptionBadge tier={subscription.tier} status={subscription.status} />
                </HStack>

                {/* Site Usage */}
                <Box>
                    <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" color="gray.600">
                            Sites Used
                        </Text>
                        <Text fontSize="sm" fontWeight="medium">
                            {limits.sitesUsed} / {limits.sitesMax}
                        </Text>
                    </HStack>
                    <Box w="full" bg="gray.200" borderRadius="md" h="2">
                        <Box
                            bg={isAtLimit ? 'red.500' : isNearLimit ? 'orange.500' : 'blue.500'}
                            h="full"
                            borderRadius="md"
                            width={`${Math.min(siteUsagePercent, 100)}%`}
                            transition="width 0.3s"
                        />
                    </Box>
                    {isAtLimit && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                            Site limit reached. Upgrade to add more sites.
                        </Text>
                    )}
                    {isNearLimit && !isAtLimit && (
                        <Text fontSize="xs" color="orange.500" mt={1}>
                            Approaching site limit.
                        </Text>
                    )}
                </Box>

                {/* Grace Period Warning */}
                {limits.isInGracePeriod && (
                    <Alert status="warning" size="sm">
                        <Box>
                            <AlertTitle>Grace Period</AlertTitle>
                            <AlertDescription>
                                {limits.daysUntilExpiry !== undefined && limits.daysUntilExpiry > 0
                                    ? `${limits.daysUntilExpiry} days remaining`
                                    : 'Subscription expired'
                                }
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {/* Expiration Warning */}
                {subscription.expiresAt && !limits.isInGracePeriod && limits.daysUntilExpiry !== undefined && limits.daysUntilExpiry <= 7 && (
                    <Alert status="warning" size="sm">
                        <Box>
                            <AlertTitle>Subscription Expiring</AlertTitle>
                            <AlertDescription>
                                {limits.daysUntilExpiry > 0
                                    ? `Expires in ${limits.daysUntilExpiry} day${limits.daysUntilExpiry !== 1 ? 's' : ''}`
                                    : 'Subscription has expired'
                                }
                            </AlertDescription>
                        </Box>
                    </Alert>
                )}

                {/* Features Summary */}
                <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        Available Features
                    </Text>
                    <VStack align="stretch" gap={1}>
                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.600">History & Logging</Text>
                            <Text fontSize="xs" color={features.hasHistory ? 'green.500' : 'gray.400'}>
                                {features.hasHistory ? '✓' : '✗'}
                            </Text>
                        </HStack>
                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.600">Snapshots</Text>
                            <Text fontSize="xs" color={features.hasSnapshots ? 'green.500' : 'gray.400'}>
                                {features.hasSnapshots ? '✓' : '✗'}
                            </Text>
                        </HStack>
                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.600">Advanced Workflows</Text>
                            <Text fontSize="xs" color={features.hasAdvancedWorkflows ? 'green.500' : 'gray.400'}>
                                {features.hasAdvancedWorkflows ? '✓' : '✗'}
                            </Text>
                        </HStack>
                        <HStack justify="space-between">
                            <Text fontSize="xs" color="gray.600">API Access</Text>
                            <Text fontSize="xs" color={features.hasApiAccess ? 'green.500' : 'gray.400'}>
                                {features.hasApiAccess ? '✓' : '✗'}
                            </Text>
                        </HStack>
                        {features.hasPrioritySupport && (
                            <HStack justify="space-between">
                                <Text fontSize="xs" color="gray.600">Priority Support</Text>
                                <Text fontSize="xs" color="green.500">✓</Text>
                            </HStack>
                        )}
                    </VStack>
                </Box>

                {/* Upgrade Button */}
                {(subscription.tier === 'free' || limits.isInGracePeriod) && (
                    <Button
                        colorScheme="blue"
                        size="sm"
                        onClick={() => {
                            // This would trigger upgrade flow
                            console.log('Upgrade clicked');
                        }}
                    >
                        {subscription.tier === 'free' ? 'Upgrade Plan' : 'Renew Subscription'}
                    </Button>
                )}
                </VStack>
            </Card.Body>
        </Card.Root>
    );
}