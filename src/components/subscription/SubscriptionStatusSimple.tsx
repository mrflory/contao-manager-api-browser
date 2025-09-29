import { Box, Text, HStack, VStack, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionBadge } from './SubscriptionBadge';
import { useSubscription } from '../../hooks/useSubscription';

export function SubscriptionStatusSimple() {
    const { subscription, limits, loading, error } = useSubscription();
    const navigate = useNavigate();

    if (loading) {
        return (
            <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                <Text>Loading subscription...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={4} border="1px solid" borderColor="red.200" borderRadius="md" bg="red.50">
                <Text color="red.700">Error: {error}</Text>
            </Box>
        );
    }

    const siteUsagePercent = limits.sitesMax > 0 ? (limits.sitesUsed / limits.sitesMax) * 100 : 0;

    return (
        <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
            <VStack align="stretch" gap={3}>
                <HStack justify="space-between">
                    <Text fontWeight="semibold">Subscription</Text>
                    <SubscriptionBadge tier={subscription.tier} status={subscription.status} />
                </HStack>

                <Box>
                    <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm">Sites Used</Text>
                        <Text fontSize="sm" fontWeight="medium">
                            {limits.sitesUsed} / {limits.sitesMax}
                        </Text>
                    </HStack>
                    <Box w="full" bg="gray.200" borderRadius="md" h="2">
                        <Box
                            bg={!limits.canAddSites ? 'red.500' : 'blue.500'}
                            h="full"
                            borderRadius="md"
                            width={`${Math.min(siteUsagePercent, 100)}%`}
                            transition="width 0.3s"
                        />
                    </Box>
                    {!limits.canAddSites && (
                        <Text fontSize="xs" color="red.500" mt={1}>
                            Site limit reached. Upgrade to add more sites.
                        </Text>
                    )}
                </Box>

                {limits.isInGracePeriod && (
                    <Box p={3} bg="orange.50" borderRadius="md" border="1px solid" borderColor="orange.200">
                        <Text fontWeight="semibold" fontSize="sm" color="orange.700">Grace Period</Text>
                        <Text fontSize="xs" color="orange.600">
                            {limits.daysUntilExpiry !== undefined && limits.daysUntilExpiry > 0
                                ? `${limits.daysUntilExpiry} days remaining`
                                : 'Subscription expired'
                            }
                        </Text>
                    </Box>
                )}

                {subscription.tier === 'free' && (
                    <Button
                        colorPalette="blue"
                        size="sm"
                        onClick={() => navigate('/billing')}
                    >
                        Upgrade Plan
                    </Button>
                )}
            </VStack>
        </Box>
    );
}