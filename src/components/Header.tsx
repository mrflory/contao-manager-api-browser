import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Button,
  Stack
} from '@chakra-ui/react';
import { ColorModeButton, useColorModeValue } from './ui/color-mode'
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from './auth/UserProfile';
import { SubscriptionBadge } from './subscription';
import { useSubscription } from '../hooks/useSubscription';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { subscription } = useSubscription();
  const bg = useColorModeValue('brand.500', 'brand.700');
  const color = 'white';

  return (
    <Box bg={bg} color={color} px={6} py={4} boxShadow="md">
      <Flex align="center" justify="space-between">
        <Heading
          size="lg"
          fontWeight="bold"
          cursor="pointer"
          onClick={() => navigate('/')}
          _hover={{ textDecoration: 'underline' }}
        >
          Contao Manager API Browser
        </Heading>

        <Stack direction="row" align="center" gap={4}>
          <ColorModeButton />

          {!isLoading && (
            <>
              {isAuthenticated ? (
                <Stack direction="row" align="center" gap={3}>
                  <SubscriptionBadge
                    tier={subscription.tier}
                    status={subscription.status}
                    variant="solid"
                    size="sm"
                  />
                  <UserProfile variant="dropdown" />
                </Stack>
              ) : (
                <Stack direction="row" gap={2}>
                  <Button
                    asChild
                    variant="ghost"
                    color="white"
                    _hover={{ bg: 'whiteAlpha.200' }}
                    size="sm"
                  >
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button
                    asChild
                    variant="solid"
                    bg="white"
                    color="brand.500"
                    _hover={{ bg: 'whiteAlpha.900' }}
                    size="sm"
                  >
                    <Link to="/register">Sign Up</Link>
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Flex>
    </Box>
  );
};

export default Header;