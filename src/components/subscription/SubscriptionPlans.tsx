import React from 'react';
import {
    Box,
    VStack,
    Text,
    Button,
    Card,
    Badge,
    List,
    SimpleGrid,
    Heading
} from '@chakra-ui/react';
import { LuCheck as Check, LuX as X } from 'react-icons/lu';
import { SubscriptionPlan } from '../../hooks/useSubscription';

interface SubscriptionPlansProps {
    plans: SubscriptionPlan[];
    currentTier?: 'free' | 'advanced' | 'premium';
    onSelectPlan?: (tier: 'free' | 'advanced' | 'premium') => void;
    loading?: boolean;
}

export function SubscriptionPlans({
    plans,
    currentTier,
    onSelectPlan,
    loading = false
}: SubscriptionPlansProps) {
    const sortedPlans = [...plans].sort((a, b) => a.price - b.price);

    const formatPrice = (plan: SubscriptionPlan) => {
        if (plan.price === 0) {
            return 'Free';
        }
        return `$${plan.price}/${plan.interval}`;
    };

    const getFeatureIcon = (hasFeature: boolean) => {
        return hasFeature ? Check : X;
    };

    const getFeatureColor = (hasFeature: boolean) => {
        return hasFeature ? 'green.500' : 'gray.300';
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
                        <Card.Root
                            key={plan.tier}
                            p={6}
                            position="relative"
                            border={isCurrentPlan(plan.tier) ? '2px solid' : '1px solid'}
                            borderColor={isCurrentPlan(plan.tier) ? 'blue.500' : 'gray.200'}
                            transform={plan.popular ? 'scale(1.05)' : 'scale(1)'}
                            shadow={plan.popular ? 'lg' : 'md'}
                        >
                            {plan.popular && (
                                <Badge
                                    colorPalette="blue"
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
                                    colorPalette="green"
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

                                <List.Root gap={2} variant="plain" align="center">
                                    <List.Item>
                                        <List.Indicator asChild color="green.500">
                                            <Check size={16} />
                                        </List.Indicator>
                                        <Text fontSize="sm">
                                            {plan.features.maxSites} site{plan.features.maxSites !== 1 ? 's' : ''}
                                        </Text>
                                    </List.Item>

                                    <List.Item>
                                        <List.Indicator asChild color={getFeatureColor(plan.features.hasHistory)}>
                                            {React.createElement(getFeatureIcon(plan.features.hasHistory), { size: 16 })}
                                        </List.Indicator>
                                        <Text
                                            fontSize="sm"
                                            color={plan.features.hasHistory ? 'gray.800' : 'gray.400'}
                                        >
                                            History & Logging
                                        </Text>
                                    </List.Item>

                                    <List.Item>
                                        <List.Indicator asChild color={getFeatureColor(plan.features.hasSnapshots)}>
                                            {React.createElement(getFeatureIcon(plan.features.hasSnapshots), { size: 16 })}
                                        </List.Indicator>
                                        <Text
                                            fontSize="sm"
                                            color={plan.features.hasSnapshots ? 'gray.800' : 'gray.400'}
                                        >
                                            File Snapshots
                                        </Text>
                                    </List.Item>

                                    <List.Item>
                                        <List.Indicator asChild color={getFeatureColor(plan.features.hasAdvancedWorkflows)}>
                                            {React.createElement(getFeatureIcon(plan.features.hasAdvancedWorkflows), { size: 16 })}
                                        </List.Indicator>
                                        <Text
                                            fontSize="sm"
                                            color={plan.features.hasAdvancedWorkflows ? 'gray.800' : 'gray.400'}
                                        >
                                            Advanced Workflows
                                        </Text>
                                    </List.Item>

                                    <List.Item>
                                        <List.Indicator asChild color={getFeatureColor(plan.features.hasApiAccess)}>
                                            {React.createElement(getFeatureIcon(plan.features.hasApiAccess), { size: 16 })}
                                        </List.Indicator>
                                        <Text
                                            fontSize="sm"
                                            color={plan.features.hasApiAccess ? 'gray.800' : 'gray.400'}
                                        >
                                            API Access
                                        </Text>
                                    </List.Item>

                                    {plan.features.hasPrioritySupport && (
                                        <List.Item>
                                            <List.Indicator asChild color="green.500">
                                                <Check size={16} />
                                            </List.Indicator>
                                            <Text fontSize="sm">
                                                Priority Support
                                            </Text>
                                        </List.Item>
                                    )}
                                </List.Root>

                                <Button
                                    colorPalette={isCurrentPlan(plan.tier) ? 'gray' : 'blue'}
                                    size="lg"
                                    disabled={isButtonDisabled(plan)}
                                    loading={loading}
                                    onClick={() => onSelectPlan?.(plan.tier)}
                                    mt={4}
                                >
                                    {getButtonText(plan)}
                                </Button>
                            </VStack>
                        </Card.Root>
                    ))}
                </SimpleGrid>
            </VStack>
        </Box>
    );
}