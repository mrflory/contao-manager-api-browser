import { Box, HStack, VStack, Text, Button } from '@chakra-ui/react';

interface UpgradePromptSimpleProps {
    reason: 'site_limit' | 'feature_access' | 'expired';
    currentTier: 'free' | 'advanced' | 'premium';
    feature?: string;
    sitesUsed?: number;
    sitesMax?: number;
    onUpgrade?: () => void;
    onDismiss?: () => void;
}

export function UpgradePromptSimple({
    reason,
    currentTier,
    feature,
    sitesUsed,
    sitesMax,
    onUpgrade,
    onDismiss
}: UpgradePromptSimpleProps) {
    const getTitle = () => {
        switch (reason) {
            case 'site_limit':
                return 'Site Limit Reached';
            case 'feature_access':
                return 'Feature Not Available';
            case 'expired':
                return 'Subscription Expired';
            default:
                return 'Upgrade Required';
        }
    };

    const getDescription = () => {
        switch (reason) {
            case 'site_limit':
                return `You have reached your limit of ${sitesMax} sites on the ${currentTier} plan. Upgrade to add more sites.`;
            case 'feature_access':
                return `${feature || 'This feature'} is not available on your current ${currentTier} plan.`;
            case 'expired':
                return `Your ${currentTier} subscription has expired. Renew to continue using advanced features.`;
            default:
                return 'Upgrade your plan to continue.';
        }
    };

    const getBgColor = () => {
        switch (reason) {
            case 'expired':
                return 'red.50';
            case 'site_limit':
                return 'orange.50';
            case 'feature_access':
                return 'blue.50';
            default:
                return 'yellow.50';
        }
    };

    const getBorderColor = () => {
        switch (reason) {
            case 'expired':
                return 'red.200';
            case 'site_limit':
                return 'orange.200';
            case 'feature_access':
                return 'blue.200';
            default:
                return 'yellow.200';
        }
    };

    return (
        <Box
            p={4}
            bg={getBgColor()}
            border="1px solid"
            borderColor={getBorderColor()}
            borderRadius="md"
        >
            <HStack justify="space-between" align="start">
                <VStack align="start" gap={2} flex={1}>
                    <Text fontWeight="semibold" fontSize="sm">
                        {getTitle()}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                        {getDescription()}
                    </Text>

                    {reason === 'site_limit' && sitesUsed && sitesMax && (
                        <Text fontSize="xs" color="gray.500">
                            Currently using {sitesUsed} of {sitesMax} sites
                        </Text>
                    )}
                </VStack>

                <VStack gap={2}>
                    {onUpgrade && (
                        <Button
                            colorScheme={reason === 'expired' ? 'red' : 'blue'}
                            size="sm"
                            onClick={onUpgrade}
                        >
                            {reason === 'expired' ? 'Renew' : 'Upgrade'}
                        </Button>
                    )}

                    {onDismiss && reason !== 'expired' && (
                        <Button variant="ghost" size="sm" onClick={onDismiss}>
                            Dismiss
                        </Button>
                    )}
                </VStack>
            </HStack>
        </Box>
    );
}