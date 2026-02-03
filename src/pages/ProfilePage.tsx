import React, { useState } from 'react';
import {
    Box,
    Container,
    VStack,
    HStack,
    Heading,
    Text,
    Button,
    Card,
    Input,
    Field,
    Avatar,
    Badge,
    Separator,
    Tabs
} from '@chakra-ui/react';
import { FiUser, FiShield } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useToastNotifications } from '../hooks/useToastNotifications';
import { PasskeyManager } from '../components/auth/PasskeyManager';
import { TwoFactorSetup } from '../components/auth/TwoFactorSetup';

const ProfilePage: React.FC = () => {
    const { user, disableTwoFactor, verifyTwoFactor } = useAuth();
    const { showSuccess, showError } = useToastNotifications();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [showDisable2FA, setShowDisable2FA] = useState(false);
    const [disable2FAPassword, setDisable2FAPassword] = useState('');
    const [disable2FACode, setDisable2FACode] = useState('');
    const [disable2FALoading, setDisable2FALoading] = useState(false);
    const [disable2FAError, setDisable2FAError] = useState('');

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveProfile = async () => {
        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            showError({
                title: 'Password Mismatch',
                description: 'New password and confirmation do not match.'
            });
            return;
        }

        try {
            setLoading(true);

            // In a real app, this would call the backend API
            // For development, we'll just simulate the update
            console.log('Updating profile:', {
                email: formData.email,
                passwordChanged: !!formData.newPassword
            });

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            showSuccess({
                title: 'Profile Updated',
                description: 'Your profile has been successfully updated.'
            });

            setIsEditing(false);
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));
        } catch (error) {
            showError({
                title: 'Update Failed',
                description: 'Failed to update profile. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            email: user?.email || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setIsEditing(false);
    };

    const getDisplayName = (): string => {
        return user?.name || user?.email || 'User';
    };

    const handle2FAComplete = () => {
        setShow2FASetup(false);
        showSuccess({
            title: 'Two-Factor Authentication Enabled',
            description: 'Your account is now protected with 2FA.'
        });
    };

    const handleDisable2FA = async () => {
        if (!disable2FAPassword) {
            setDisable2FAError('Please enter your password');
            return;
        }

        if (!disable2FACode || disable2FACode.length !== 6) {
            setDisable2FAError('Please enter your 6-digit verification code');
            return;
        }

        setDisable2FALoading(true);
        setDisable2FAError('');

        try {
            // First verify the TOTP code
            const isValid = await verifyTwoFactor(disable2FACode);
            if (!isValid) {
                setDisable2FAError('Invalid verification code. Please try again.');
                setDisable2FALoading(false);
                return;
            }

            // Then disable 2FA with password
            await disableTwoFactor(disable2FAPassword);
            setShowDisable2FA(false);
            setDisable2FAPassword('');
            setDisable2FACode('');
            showSuccess({
                title: 'Two-Factor Authentication Disabled',
                description: 'You can now set up 2FA again with a new authenticator.'
            });
            // Force a page reload to update user state
            window.location.reload();
        } catch (err: any) {
            setDisable2FAError(err.message || 'Failed to disable 2FA');
        } finally {
            setDisable2FALoading(false);
        }
    };

    return (
        <Container maxW="container.lg" py={8}>
            <VStack gap={8} align="stretch">
                {/* Page Header */}
                <Box textAlign="center">
                    <Heading size="xl" mb={4}>
                        Account Settings
                    </Heading>
                    <Text fontSize="lg" color="gray.600">
                        Manage your account settings, security, and preferences
                    </Text>
                </Box>

                {/* Profile Summary Card */}
                <Card.Root>
                    <Card.Body>
                        <HStack gap={4}>
                            <Avatar.Root size="lg">
                                <Avatar.Fallback name={getDisplayName()} />
                            </Avatar.Root>
                            <Box flex={1}>
                                <Text fontSize="lg" fontWeight="bold">
                                    {getDisplayName()}
                                </Text>
                                <Text color="gray.600" fontSize="sm">
                                    {user?.email}
                                </Text>
                                <HStack gap={2} mt={2}>
                                    <Badge colorPalette="green" size="sm">
                                        Active
                                    </Badge>
                                    {user?.emailVerified ? (
                                        <Badge colorPalette="blue" size="sm">
                                            Email Verified
                                        </Badge>
                                    ) : (
                                        <Badge colorPalette="yellow" size="sm">
                                            Email Unverified
                                        </Badge>
                                    )}
                                    {user?.twoFactorEnabled && (
                                        <Badge colorPalette="green" size="sm">
                                            2FA Enabled
                                        </Badge>
                                    )}
                                </HStack>
                            </Box>
                        </HStack>
                    </Card.Body>
                </Card.Root>

                {/* Tabs for Profile and Security */}
                <Tabs.Root defaultValue="profile" variant="enclosed">
                    <Tabs.List>
                        <Tabs.Trigger value="profile">
                            <HStack gap={2}>
                                <FiUser />
                                <Text>Profile</Text>
                            </HStack>
                        </Tabs.Trigger>
                        <Tabs.Trigger value="security">
                            <HStack gap={2}>
                                <FiShield />
                                <Text>Security</Text>
                            </HStack>
                        </Tabs.Trigger>
                    </Tabs.List>

                    {/* Profile Tab */}
                    <Tabs.Content value="profile">
                        <Card.Root mt={4}>
                            <Card.Header>
                                <HStack justify="space-between" align="center">
                                    <Heading size="md">Profile Information</Heading>
                                    {!isEditing && (
                                        <Button
                                            colorPalette="blue"
                                            size="sm"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            Edit Profile
                                        </Button>
                                    )}
                                </HStack>
                            </Card.Header>

                            <Card.Body>
                                <VStack gap={6} align="stretch">
                                    {/* Account Information */}
                                    <VStack gap={4} align="stretch">
                                        <Field.Root>
                                            <Field.Label>Email Address</Field.Label>
                                            <Input
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                placeholder="Enter your email"
                                                type="email"
                                                disabled={!isEditing}
                                            />
                                        </Field.Root>
                                    </VStack>

                                    {isEditing && (
                                        <>
                                            <Separator />
                                            {/* Password Change */}
                                            <Box>
                                                <Heading size="sm" mb={4}>
                                                    Change Password
                                                </Heading>
                                                <Text fontSize="sm" color="gray.600" mb={4}>
                                                    Leave blank if you don't want to change your password
                                                </Text>
                                                <VStack gap={4} align="stretch">
                                                    <Field.Root>
                                                        <Field.Label>Current Password</Field.Label>
                                                        <Input
                                                            value={formData.currentPassword}
                                                            onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                                                            placeholder="Enter current password"
                                                            type="password"
                                                        />
                                                    </Field.Root>

                                                    <Field.Root>
                                                        <Field.Label>New Password</Field.Label>
                                                        <Input
                                                            value={formData.newPassword}
                                                            onChange={(e) => handleInputChange('newPassword', e.target.value)}
                                                            placeholder="Enter new password"
                                                            type="password"
                                                        />
                                                    </Field.Root>

                                                    <Field.Root>
                                                        <Field.Label>Confirm New Password</Field.Label>
                                                        <Input
                                                            value={formData.confirmPassword}
                                                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                                            placeholder="Confirm new password"
                                                            type="password"
                                                        />
                                                    </Field.Root>
                                                </VStack>
                                            </Box>
                                        </>
                                    )}
                                </VStack>
                            </Card.Body>

                            {isEditing && (
                                <Card.Footer>
                                    <HStack gap={3} justify="end" width="full">
                                        <Button
                                            variant="outline"
                                            onClick={handleCancel}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            colorPalette="blue"
                                            onClick={handleSaveProfile}
                                            loading={loading}
                                        >
                                            Save Changes
                                        </Button>
                                    </HStack>
                                </Card.Footer>
                            )}
                        </Card.Root>
                    </Tabs.Content>

                    {/* Security Tab */}
                    <Tabs.Content value="security">
                        <VStack gap={6} align="stretch" mt={4}>
                            {/* Two-Factor Authentication Section */}
                            <Card.Root>
                                <Card.Header>
                                    <HStack justify="space-between" align="center">
                                        <Box>
                                            <Heading size="md">Two-Factor Authentication</Heading>
                                            <Text fontSize="sm" color="gray.600" mt={1}>
                                                Add an extra layer of security to your account
                                            </Text>
                                        </Box>
                                        {user?.twoFactorEnabled ? (
                                            <Badge colorPalette="green" size="lg">Enabled</Badge>
                                        ) : (
                                            <Badge colorPalette="gray" size="lg">Disabled</Badge>
                                        )}
                                    </HStack>
                                </Card.Header>

                                <Card.Body>
                                    {show2FASetup ? (
                                        <TwoFactorSetup
                                            onComplete={handle2FAComplete}
                                            onCancel={() => setShow2FASetup(false)}
                                        />
                                    ) : user?.twoFactorEnabled ? (
                                        <VStack gap={4} align="stretch">
                                            <Box
                                                p={4}
                                                borderRadius="md"
                                                bg="green.subtle"
                                                borderWidth="1px"
                                                borderColor="green.emphasized"
                                            >
                                                <HStack>
                                                    <FiShield size={20} />
                                                    <Text>
                                                        Two-factor authentication is enabled on your account.
                                                    </Text>
                                                </HStack>
                                            </Box>
                                            <Text fontSize="sm" color="gray.600">
                                                You'll be asked for a verification code from your authenticator app
                                                when you sign in.
                                            </Text>

                                            {showDisable2FA ? (
                                                <Box
                                                    p={4}
                                                    borderRadius="md"
                                                    borderWidth="1px"
                                                    borderColor="red.emphasized"
                                                    bg="red.subtle"
                                                >
                                                    <VStack gap={3} align="stretch">
                                                        <Text fontWeight="medium">Disable Two-Factor Authentication</Text>
                                                        <Text fontSize="sm">
                                                            Enter your password and a verification code from your authenticator app.
                                                        </Text>
                                                        <Field.Root>
                                                            <Field.Label>Password</Field.Label>
                                                            <Input
                                                                type="password"
                                                                placeholder="Enter your password"
                                                                value={disable2FAPassword}
                                                                onChange={(e) => {
                                                                    setDisable2FAPassword(e.target.value);
                                                                    setDisable2FAError('');
                                                                }}
                                                            />
                                                        </Field.Root>
                                                        <Field.Root invalid={!!disable2FAError}>
                                                            <Field.Label>Verification Code</Field.Label>
                                                            <Input
                                                                type="text"
                                                                inputMode="numeric"
                                                                placeholder="000000"
                                                                maxLength={6}
                                                                value={disable2FACode}
                                                                onChange={(e) => {
                                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                                    setDisable2FACode(value);
                                                                    setDisable2FAError('');
                                                                }}
                                                            />
                                                            {disable2FAError && (
                                                                <Field.ErrorText>{disable2FAError}</Field.ErrorText>
                                                            )}
                                                        </Field.Root>
                                                        <HStack gap={2} justify="flex-end">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setShowDisable2FA(false);
                                                                    setDisable2FAPassword('');
                                                                    setDisable2FACode('');
                                                                    setDisable2FAError('');
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                colorPalette="red"
                                                                size="sm"
                                                                onClick={handleDisable2FA}
                                                                loading={disable2FALoading}
                                                                disabled={!disable2FAPassword || disable2FACode.length !== 6}
                                                            >
                                                                Disable 2FA
                                                            </Button>
                                                        </HStack>
                                                    </VStack>
                                                </Box>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    colorPalette="red"
                                                    size="sm"
                                                    onClick={() => setShowDisable2FA(true)}
                                                >
                                                    Disable Two-Factor Authentication
                                                </Button>
                                            )}
                                        </VStack>
                                    ) : (
                                        <VStack gap={4} align="stretch">
                                            <Text>
                                                Two-factor authentication adds an extra layer of security to your account.
                                                In addition to your password, you'll need to enter a code from your
                                                authenticator app when signing in.
                                            </Text>
                                            <Button
                                                colorPalette="blue"
                                                onClick={() => setShow2FASetup(true)}
                                            >
                                                Enable Two-Factor Authentication
                                            </Button>
                                        </VStack>
                                    )}
                                </Card.Body>
                            </Card.Root>

                            {/* Passkey Section */}
                            <PasskeyManager
                                onPasskeyAdded={() => {
                                    showSuccess({
                                        title: 'Passkey Added',
                                        description: 'You can now sign in with this passkey.'
                                    });
                                }}
                            />
                        </VStack>
                    </Tabs.Content>
                </Tabs.Root>
            </VStack>
        </Container>
    );
};

export default ProfilePage;
