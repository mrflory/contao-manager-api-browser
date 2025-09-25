import React from 'react';
import {
    Box,
    Button,
    Text,
    Stack,
    Card,
    Badge,
    Avatar,
    Menu,
    Portal,
    Separator,
} from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserProfileProps {
    variant?: 'dropdown' | 'card';
    showFullProfile?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({
    variant = 'dropdown',
    showFullProfile = false,
}) => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (!isAuthenticated || !user) {
        return null;
    }

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const getDisplayName = (): string => {
        if (user.firstName && user.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        if (user.firstName) {
            return user.firstName;
        }
        return user.email;
    };

    if (variant === 'dropdown') {
        return (
            <Menu.Root>
                <Menu.Trigger asChild>
                    <Button variant="ghost" p={0}>
                        <Stack direction="row" align="center" gap={3}>
                            <Avatar.Root size="sm">
                                <Avatar.Fallback name={getDisplayName()} />
                            </Avatar.Root>
                            <Box display={{ base: 'none', md: 'block' }}>
                                <Text fontSize="sm" fontWeight="medium">
                                    {getDisplayName()}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                    {user.email}
                                </Text>
                            </Box>
                        </Stack>
                    </Button>
                </Menu.Trigger>

                <Portal>
                    <Menu.Positioner>
                        <Menu.Content>
                            <Box px={3} py={2}>
                                <Text fontWeight="medium">{getDisplayName()}</Text>
                                <Text fontSize="sm" color="gray.500">
                                    {user.email}
                                </Text>
                                {!user.emailVerified && (
                                    <Badge colorPalette="yellow" size="sm" mt={1}>
                                        Email not verified
                                    </Badge>
                                )}
                            </Box>

                            <Separator />

                            <Menu.Item value="profile" onSelect={() => navigate('/profile')}>
                                Account Settings
                            </Menu.Item>

                            <Menu.Item value="billing" onSelect={() => navigate('/billing')}>
                                Billing & Subscription
                            </Menu.Item>

                            <Separator />

                            <Menu.Item value="logout" onSelect={handleLogout} color="fg.error">
                                Sign Out
                            </Menu.Item>
                        </Menu.Content>
                    </Menu.Positioner>
                </Portal>
            </Menu.Root>
        );
    }

    if (variant === 'card' || showFullProfile) {
        return (
            <Card.Root>
                <Card.Header>
                    <Stack direction="row" align="center" gap={4}>
                        <Avatar.Root size="lg">
                            <Avatar.Fallback name={getDisplayName()} />
                        </Avatar.Root>
                        <Box>
                            <Text fontSize="lg" fontWeight="bold">
                                {getDisplayName()}
                            </Text>
                            <Text color="gray.600">{user.email}</Text>
                            <Stack direction="row" gap={2} mt={2}>
                                {user.emailVerified ? (
                                    <Badge colorPalette="green" size="sm">
                                        Verified
                                    </Badge>
                                ) : (
                                    <Badge colorPalette="yellow" size="sm">
                                        Email not verified
                                    </Badge>
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                </Card.Header>

                {showFullProfile && (
                    <Card.Body>
                        <Stack gap={4}>
                            <Box>
                                <Text fontSize="sm" fontWeight="medium" color="gray.700">
                                    Account Details
                                </Text>
                                <Stack gap={2} mt={2}>
                                    <Text fontSize="sm">
                                        <strong>Member since:</strong>{' '}
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </Text>
                                    <Text fontSize="sm">
                                        <strong>Account Status:</strong>{' '}
                                        <Badge colorPalette="green" size="sm">
                                            Active
                                        </Badge>
                                    </Text>
                                </Stack>
                            </Box>
                        </Stack>
                    </Card.Body>
                )}

                <Card.Footer>
                    <Stack direction="row" gap={2} width="full">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/profile')}
                            flex={1}
                        >
                            Edit Profile
                        </Button>
                        <Button
                            colorScheme="red"
                            variant="outline"
                            onClick={handleLogout}
                        >
                            Sign Out
                        </Button>
                    </Stack>
                </Card.Footer>
            </Card.Root>
        );
    }

    return null;
};