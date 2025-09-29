import React from 'react';
import {
    Box,
    Container,
    VStack,
    Heading,
    Text,
    SimpleGrid,
    Card
} from '@chakra-ui/react';
import { SubscriptionStatus, SubscriptionPlans } from '../components/subscription';
import { useSubscription } from '../hooks/useSubscription';
import { useToastNotifications } from '../hooks/useToastNotifications';
import { LoadingState } from '../components/display/LoadingState';
import { EmptyState } from '../components/display/EmptyState';

const SubscriptionPage: React.FC = () => {
    const {
        subscription,
        plans,
        loading,
        error,
        refreshSubscription
    } = useSubscription();
    const { showInfo, showError } = useToastNotifications();

    const handleSelectPlan = async (tier: 'free' | 'advanced' | 'premium') => {
        try {
            // This would integrate with payment processing in Phase 5
            console.log('Selected plan:', tier);

            showInfo({
                title: 'Plan Selection',
                description: `You selected the ${tier} plan. Payment integration coming in Phase 5.`,
                duration: 5000,
                closable: true,
            });
        } catch (error) {
            showError({
                title: 'Error',
                description: 'Failed to select plan. Please try again.',
                duration: 5000,
                closable: true,
            });
        }
    };

    if (loading) {
        return (
            <Container maxW="container.xl" py={8}>
                <LoadingState message="Loading subscription information..." />
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxW="container.xl" py={8}>
                <EmptyState
                    title="Error Loading Subscription"
                    description={error}
                    actionLabel="Retry"
                    onAction={refreshSubscription}
                />
            </Container>
        );
    }

    return (
        <Container maxW="container.xl" py={8}>
            <VStack gap={8} align="stretch">
                {/* Page Header */}
                <Box textAlign="center">
                    <Heading size="xl" mb={4}>
                        Subscription Management
                    </Heading>
                    <Text fontSize="lg" color="gray.600">
                        Manage your subscription and billing preferences
                    </Text>
                </Box>

                {/* Current Status and Plans */}
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
                    {/* Current Subscription Status */}
                    <Box>
                        <Heading size="md" mb={4}>
                            Current Subscription
                        </Heading>
                        <SubscriptionStatus />
                    </Box>

                    {/* Quick Plan Comparison */}
                    <Box>
                        <Heading size="md" mb={4}>
                            Plan Comparison
                        </Heading>
                        <Card.Root p={4}>
                            <VStack align="stretch" gap={3}>
                                <Text fontSize="sm" fontWeight="semibold">
                                    Available Plans:
                                </Text>
                                {plans.map((plan) => (
                                    <Box key={plan.tier} p={3} bg="gray.50" borderRadius="md">
                                        <Text fontWeight="medium">
                                            {plan.name} - ${plan.price}/{plan.interval}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            {plan.features.maxSites} sites, {plan.features.hasHistory ? 'with' : 'without'} advanced features
                                        </Text>
                                    </Box>
                                ))}
                            </VStack>
                        </Card.Root>
                    </Box>
                </SimpleGrid>

                {/* Detailed Plans */}
                <Box>
                    <Heading size="md" mb={6} textAlign="center">
                        Choose Your Plan
                    </Heading>
                    <SubscriptionPlans
                        plans={plans}
                        currentTier={subscription.tier}
                        onSelectPlan={handleSelectPlan}
                        loading={loading}
                    />
                </Box>

                {/* Additional Information */}
                <Card.Root p={6}>
                    <VStack align="stretch" gap={4}>
                        <Heading size="sm">
                            Need Help?
                        </Heading>
                        <Text fontSize="sm" color="gray.600">
                            If you have questions about billing, features, or need assistance with your subscription,
                            please contact our support team. Premium subscribers receive priority support.
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                            All plans include secure token storage, site management, and basic Contao Manager integration.
                            Advanced features like history tracking, snapshots, and workflows are available with paid plans.
                        </Text>
                    </VStack>
                </Card.Root>
            </VStack>
        </Container>
    );
};

export default SubscriptionPage;