import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Heading,
    SimpleGrid,
    Badge
} from '@chakra-ui/react';
import { SubscriptionPlan } from '../../hooks/useSubscription';

interface SubscriptionPlansSimpleProps {
    plans: SubscriptionPlan[];
    currentTier?: 'free' | 'advanced' | 'premium';
    onSelectPlan?: (tier: 'free' | 'advanced' | 'premium') => void;
    loading?: boolean;
}

export function SubscriptionPlansSimple({
    plans,
    currentTier,
    onSelectPlan,
    loading = false
}: SubscriptionPlansSimpleProps) {
    const sortedPlans = [...plans].sort((a, b) => a.price - b.price);

    const formatPrice = (plan: SubscriptionPlan) => {
        if (plan.price === 0) {
            return 'Free';
        }
        return `$${plan.price}/${plan.interval}`;
    };

    const isCurrentPlan = (planTier: string) => {
        return currentTier === planTier;
    };

    const getButtonText = (plan: SubscriptionPlan) => {
        if (isCurrentPlan(plan.tier)) {
            return 'Current Plan';
        }
        if (plan.tier === 'free') {
            return 'Downgrade';
        }
        return 'Select Plan';
    };

    const isButtonDisabled = (plan: SubscriptionPlan) => {
        return isCurrentPlan(plan.tier) || loading;
    };

    return (
        <Box>
            <VStack gap={6} align="stretch">
                <Box textAlign="center">
                    <Heading size="lg" mb={2}>
                        Choose Your Plan
                    </Heading>
                    <Text color="gray.600">
                        Select the plan that best fits your needs
                    </Text>
                </Box>

                <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
                    {sortedPlans.map((plan) => (
                        <Box
                            key={plan.tier}
                            p={6}
                            borderWidth={isCurrentPlan(plan.tier) ? '2px' : '1px'}
                            borderColor={isCurrentPlan(plan.tier) ? 'blue.500' : 'gray.200'}
                            borderRadius="lg"
                            position="relative"
                            bg="white"
                            _hover={{ shadow: 'md' }}
                        >
                            {plan.popular && (
                                <Badge
                                    colorScheme="blue"
                                    position="absolute"
                                    top="-10px"
                                    left="50%"
                                    transform="translateX(-50%)"
                                    px={3}
                                    py={1}
                                    borderRadius="full"
                                >
                                    Most Popular
                                </Badge>
                            )}

                            {isCurrentPlan(plan.tier) && (
                                <Badge
                                    colorScheme="green"
                                    position="absolute"
                                    top="-10px"
                                    right="10px"
                                    px={3}
                                    py={1}
                                    borderRadius="full"
                                >
                                    Current
                                </Badge>
                            )}

                            <VStack align="stretch" gap={4}>
                                <Box textAlign="center">
                                    <Heading size="md" color="blue.600">
                                        {plan.name}
                                    </Heading>
                                    <Text
                                        fontSize="3xl"
                                        fontWeight="bold"
                                        color="gray.800"
                                        mt={2}
                                    >
                                        {formatPrice(plan)}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                        {plan.description}
                                    </Text>
                                </Box>

                                <VStack align="stretch" gap={2}>
                                    <HStack>
                                        <Text color="green.500">✓</Text>
                                        <Text fontSize="sm">
                                            {plan.features.maxSites} site{plan.features.maxSites !== 1 ? 's' : ''}
                                        </Text>
                                    </HStack>

                                    <HStack>
                                        <Text color={plan.features.hasHistory ? 'green.500' : 'gray.300'}>
                                            {plan.features.hasHistory ? '✓' : '✗'}
                                        </Text>
                                        <Text
                                            fontSize="sm"
                                            color={plan.features.hasHistory ? 'gray.800' : 'gray.400'}
                                        >
                                            History & Logging
                                        </Text>
                                    </HStack>

                                    <HStack>
                                        <Text color={plan.features.hasSnapshots ? 'green.500' : 'gray.300'}>
                                            {plan.features.hasSnapshots ? '✓' : '✗'}
                                        </Text>
                                        <Text
                                            fontSize="sm"
                                            color={plan.features.hasSnapshots ? 'gray.800' : 'gray.400'}
                                        >
                                            File Snapshots
                                        </Text>
                                    </HStack>

                                    <HStack>
                                        <Text color={plan.features.hasAdvancedWorkflows ? 'green.500' : 'gray.300'}>
                                            {plan.features.hasAdvancedWorkflows ? '✓' : '✗'}
                                        </Text>
                                        <Text
                                            fontSize="sm"
                                            color={plan.features.hasAdvancedWorkflows ? 'gray.800' : 'gray.400'}
                                        >
                                            Advanced Workflows
                                        </Text>
                                    </HStack>

                                    <HStack>
                                        <Text color={plan.features.hasApiAccess ? 'green.500' : 'gray.300'}>
                                            {plan.features.hasApiAccess ? '✓' : '✗'}
                                        </Text>
                                        <Text
                                            fontSize="sm"
                                            color={plan.features.hasApiAccess ? 'gray.800' : 'gray.400'}
                                        >
                                            API Access
                                        </Text>
                                    </HStack>

                                    {plan.features.hasPrioritySupport && (
                                        <HStack>
                                            <Text color="green.500">✓</Text>
                                            <Text fontSize="sm">
                                                Priority Support
                                            </Text>
                                        </HStack>
                                    )}
                                </VStack>

                                <Button
                                    colorScheme={isCurrentPlan(plan.tier) ? 'gray' : 'blue'}
                                    size="lg"
                                    disabled={isButtonDisabled(plan)}
                                    loading={loading}
                                    onClick={() => onSelectPlan?.(plan.tier)}
                                    mt={4}
                                >
                                    {getButtonText(plan)}
                                </Button>
                            </VStack>
                        </Box>
                    ))}
                </SimpleGrid>
            </VStack>
        </Box>
    );
}