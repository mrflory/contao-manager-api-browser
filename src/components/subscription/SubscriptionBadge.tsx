import { Badge, BadgeProps } from '@chakra-ui/react';

interface SubscriptionBadgeProps extends Omit<BadgeProps, 'children'> {
    tier: 'free' | 'advanced' | 'premium';
    status?: 'active' | 'canceled' | 'expired' | 'grace_period';
}

export function SubscriptionBadge({ tier, status = 'active', ...props }: SubscriptionBadgeProps) {
    const getTierColors = (tier: string, status: string) => {
        if (status === 'expired') {
            return { colorScheme: 'red' };
        }
        if (status === 'grace_period') {
            return { colorScheme: 'orange' };
        }
        if (status === 'canceled') {
            return { colorScheme: 'gray' };
        }

        switch (tier) {
            case 'free':
                return { colorScheme: 'blue' };
            case 'advanced':
                return { colorScheme: 'green' };
            case 'premium':
                return { colorScheme: 'purple' };
            default:
                return { colorScheme: 'gray' };
        }
    };

    const getTierLabel = (tier: string) => {
        switch (tier) {
            case 'free':
                return 'Free';
            case 'advanced':
                return 'Advanced';
            case 'premium':
                return 'Premium';
            default:
                return tier;
        }
    };

    const getStatusSuffix = (status: string) => {
        switch (status) {
            case 'expired':
                return ' (Expired)';
            case 'grace_period':
                return ' (Grace)';
            case 'canceled':
                return ' (Canceled)';
            default:
                return '';
        }
    };

    const colors = getTierColors(tier, status);
    const label = getTierLabel(tier) + getStatusSuffix(status);

    return (
        <Badge
            variant="solid"
            {...colors}
            textTransform="capitalize"
            fontSize="xs"
            {...props}
        >
            {label}
        </Badge>
    );
}