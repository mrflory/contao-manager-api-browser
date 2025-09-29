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
    Stack,
    Badge,
    Separator
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useToastNotifications } from '../hooks/useToastNotifications';

const ProfilePage: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const { showSuccess, showError } = useToastNotifications();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

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
        return user?.email || 'User';
    };

    return (
        <Container maxW="container.md" py={8}>
            <VStack gap={8} align="stretch">
                {/* Page Header */}
                <Box textAlign="center">
                    <Heading size="xl" mb={4}>
                        Account Profile
                    </Heading>
                    <Text fontSize="lg" color="gray.600">
                        Manage your account settings and preferences
                    </Text>
                </Box>

                {/* Profile Card */}
                <Card.Root>
                    <Card.Header>
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
                                    {user?.emailVerified !== null ? (
                                        <Badge colorPalette="blue" size="sm">
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge colorPalette="yellow" size="sm">
                                            Unverified
                                        </Badge>
                                    )}
                                </HStack>
                            </Box>
                            {!isEditing && (
                                <Button
                                    colorPalette="blue"
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
                            <Box>
                                <Heading size="md" mb={4}>
                                    Account Information
                                </Heading>
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
                            </Box>

                            {isEditing && (
                                <>
                                    <Separator />
                                    {/* Password Change */}
                                    <Box>
                                        <Heading size="md" mb={4}>
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

            </VStack>
        </Container>
    );
};

export default ProfilePage;