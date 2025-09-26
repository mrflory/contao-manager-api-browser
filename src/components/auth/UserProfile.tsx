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
        return user.email;
    };

    if (variant === 'dropdown') {
        return (
            <Menu.Root>
                <Menu.Trigger asChild>
                    <Button
                        variant="ghost"
                        p={2}
                        _hover={{ bg: "bg.muted" }}
                        _active={{ bg: "bg.emphasized" }}
                    >
                        <Stack direction="row" align="center" gap={3}>
                            <Avatar.Root size="sm">
                                <Avatar.Fallback name={getDisplayName()} />
                            </Avatar.Root>
                            <Box display={{ base: 'none', md: 'block' }}>
                                <Text fontSize="sm" fontWeight="medium" color="fg">
                                    {getDisplayName()}
                                </Text>
                            </Box>
                        </Stack>
                    </Button>
                </Menu.Trigger>

                <Portal>
                    <Menu.Positioner>
                        <Menu.Content>
                            <Box px={3} py={2}>
                                <Text fontWeight="medium" color="fg">{getDisplayName()}</Text>
                                {user.emailVerified === null && (
                                    <Badge colorPalette="yellow" size="sm" mt={1}>
                                        Email not verified
                                    </Badge>
                                )}
                            </Box>

                            <Separator />

                            <Menu.Item
                                value="profile"
                                onSelect={() => navigate('/profile')}
                                cursor="pointer"
                                _hover={{ bg: "bg.muted" }}
                            >
                                Account Settings
                            </Menu.Item>

                            <Menu.Item
                                value="billing"
                                onSelect={() => navigate('/billing')}
                                cursor="pointer"
                                _hover={{ bg: "bg.muted" }}
                            >
                                Billing & Subscription
                            </Menu.Item>

                            <Separator />

                            <Menu.Item
                                value="logout"
                                onSelect={handleLogout}
                                color="red.fg"
                                cursor="pointer"
                                _hover={{ bg: "red.subtle", color: "red.fg" }}
                            >
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
                            <Text fontSize="lg" fontWeight="bold" color="fg">
                                {getDisplayName()}
                            </Text>
                            <Text color="fg.muted">{user.email}</Text>
                            <Stack direction="row" gap={2} mt={2}>
                                {user.emailVerified !== null ? (
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
                                <Text fontSize="sm" fontWeight="medium" color="fg.muted">
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