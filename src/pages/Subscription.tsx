import React from 'react';
import {
    Box,
    Container,
    VStack,
    Heading,
    Text,
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
                        Subscription & Billing
                    </Heading>
                    <Text fontSize="lg" color="gray.600" _dark={{ color: "gray.300" }}>
                        Manage your subscription and billing preferences
                    </Text>
                </Box>

                {/* Current Subscription Status */}
                <Box>
                    <Heading size="lg" mb={6}>
                        Current Subscription
                    </Heading>
                    <SubscriptionStatus />
                </Box>

                {/* Available Plans */}
                <Box>
                    <Heading size="lg" mb={6}>
                        Available Plans
                    </Heading>
                    <SubscriptionPlans
                        plans={plans}
                        currentTier={subscription.tier}
                        onSelectPlan={handleSelectPlan}
                        loading={loading}
                    />
                </Box>

                {/* Additional Information */}
                <Card.Root p={6} bg="gray.50" _dark={{ bg: "gray.800" }}>
                    <VStack align="stretch" gap={4}>
                        <Heading size="md" color="gray.900" _dark={{ color: "gray.100" }}>
                            Need Help?
                        </Heading>
                        <Text fontSize="sm" color="gray.700" _dark={{ color: "gray.300" }}>
                            If you have questions about billing, features, or need assistance with your subscription,
                            please contact our support team. Premium subscribers receive priority support.
                        </Text>
                        <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }}>
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