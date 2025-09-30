import React from 'react';
import { Box, Button, VStack, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Popover } from '../ui/popover';
import { SubscriptionBadge } from './SubscriptionBadge';
import { useSubscription } from '../../hooks/useSubscription';

interface SubscriptionPopoverProps {
  children?: React.ReactNode;
}

export function SubscriptionPopover({ children }: SubscriptionPopoverProps) {
  const { subscription, limits, loading, error } = useSubscription();
  const navigate = useNavigate();

  // Use the subscription badge as the default trigger if no children provided
  const trigger = children || (
    <SubscriptionBadge
      tier={subscription.tier}
      status={subscription.status}
      variant="solid"
      size="sm"
      cursor="pointer"
    />
  );

  if (loading) {
    return trigger;
  }

  if (error) {
    return trigger;
  }

  const siteUsagePercent = limits.sitesMax > 0 ? (limits.sitesUsed / limits.sitesMax) * 100 : 0;

  return (
    <Popover.Root lazyMount unmountOnExit positioning={{ placement: 'bottom-end' }}>
      <Popover.Trigger asChild>
        {trigger}
      </Popover.Trigger>

      <Popover.Content maxW="xs" borderRadius="md" boxShadow="lg">
        <Popover.Arrow />
        <Popover.Header>
          <Text fontWeight="semibold" fontSize="sm">
            Subscription Details
          </Text>
        </Popover.Header>

        <Popover.Body>
          <VStack align="stretch" gap={3}>
            {/* Current Plan */}
            <Box>
              <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.400" }} mb={1}>
                Current Plan
              </Text>
              <SubscriptionBadge tier={subscription.tier} status={subscription.status} />
            </Box>

            {/* Site Usage */}
            <Box>
              <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.400" }} mb={2}>
                Sites Used
              </Text>
              <Box mb={2}>
                <Text fontSize="sm" fontWeight="medium">
                  {limits.sitesUsed} / {limits.sitesMax}
                </Text>
              </Box>
              <Box w="full" bg="gray.200" _dark={{ bg: "gray.600" }} borderRadius="md" h="2">
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
                  Site limit reached
                </Text>
              )}
            </Box>

            {/* Grace Period Warning */}
            {limits.isInGracePeriod && (
              <Box
                p={2}
                bg="orange.50"
                borderRadius="md"
                border="1px solid"
                borderColor="orange.200"
                _dark={{ bg: "orange.900/20", borderColor: "orange.600" }}
              >
                <Text fontWeight="semibold" fontSize="xs" color="orange.700" _dark={{ color: "orange.300" }}>
                  Grace Period
                </Text>
                <Text fontSize="xs" color="orange.600" _dark={{ color: "orange.400" }}>
                  {limits.daysUntilExpiry !== undefined && limits.daysUntilExpiry > 0
                    ? `${limits.daysUntilExpiry} days remaining`
                    : 'Subscription expired'
                  }
                </Text>
              </Box>
            )}
          </VStack>
        </Popover.Body>

        <Popover.Footer>
          <VStack gap={2} w="full">
            <Button
              colorPalette="blue"
              size="sm"
              w="full"
              onClick={() => {
                navigate('/billing');
              }}
            >
              {subscription.tier === 'free' ? 'Upgrade Plan' : 'Manage Billing'}
            </Button>
          </VStack>
        </Popover.Footer>
      </Popover.Content>
    </Popover.Root>
  );
}