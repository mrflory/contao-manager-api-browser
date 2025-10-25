import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Input,
    Text,
    Stack,
    Card,
    Field,
    Link as ChakraLink,
} from '@chakra-ui/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HttpClient } from '../../services/httpClient';
import { useAuth } from '../../contexts/AuthContext';

export const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { csrfToken } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            setError('Invalid or missing reset token. Please request a new password reset link.');
        }
    }, [token, email]);

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!password.trim()) {
            errors.password = 'Password is required';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }

        if (!confirmPassword.trim()) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !token || !email) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const httpClient = HttpClient.getInstance();
            const response = await httpClient.makeApiCall('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: decodeURIComponent(email),
                    token,
                    newPassword: password,
                }),
            }, csrfToken || undefined);

            if (response.success) {
                setIsSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setError(response.error || 'Failed to reset password. Please try again.');
            }
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.message || 'An error occurred while resetting your password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string) => {
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
        if (error) {
            setError(null);
        }
    };

    if (isSuccess) {
        return (
            <Box maxWidth="md" mx="auto" p={6} mt={8}>
                <Card.Root>
                    <Card.Header>
                        <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                            Password Reset Successful
                        </Text>
                    </Card.Header>

                    <Card.Body>
                        <Stack gap={4}>
                            <Box
                                p={4}
                                borderRadius="md"
                                bg="green.subtle"
                                borderWidth="1px"
                                borderColor="green.emphasized"
                            >
                                <Text color="green.fg" fontSize="sm" fontWeight="medium">
                                    Your password has been reset successfully!
                                </Text>
                                <Text color="green.fg" fontSize="sm" mt={2}>
                                    You will be redirected to the login page in a few seconds...
                                </Text>
                            </Box>

                            <Link to="/login">
                                <Button
                                    colorScheme="blue"
                                    size="lg"
                                    width="full"
                                >
                                    Go to Sign In
                                </Button>
                            </Link>
                        </Stack>
                    </Card.Body>
                </Card.Root>
            </Box>
        );
    }

    return (
        <Box maxWidth="md" mx="auto" p={6} mt={8}>
            <Card.Root>
                <Card.Header>
                    <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                        Set New Password
                    </Text>
                    <Text color="fg.muted" textAlign="center" mt={2}>
                        Enter your new password below
                    </Text>
                </Card.Header>

                <Card.Body>
                    <form onSubmit={handleSubmit}>
                        <Stack gap={4}>
                            {error && (
                                <Box
                                    p={3}
                                    borderRadius="md"
                                    bg="red.subtle"
                                    borderWidth="1px"
                                    borderColor="red.emphasized"
                                >
                                    <Text color="red.fg" fontSize="sm">
                                        {error}
                                    </Text>
                                </Box>
                            )}

                            <Field.Root invalid={!!validationErrors.password}>
                                <Field.Label>New Password</Field.Label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        handleInputChange('password');
                                    }}
                                    placeholder="Enter new password (min 8 characters)"
                                    disabled={isLoading || !token || !email}
                                />
                                {validationErrors.password && (
                                    <Field.ErrorText>{validationErrors.password}</Field.ErrorText>
                                )}
                            </Field.Root>

                            <Field.Root invalid={!!validationErrors.confirmPassword}>
                                <Field.Label>Confirm Password</Field.Label>
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        handleInputChange('confirmPassword');
                                    }}
                                    placeholder="Confirm new password"
                                    disabled={isLoading || !token || !email}
                                />
                                {validationErrors.confirmPassword && (
                                    <Field.ErrorText>{validationErrors.confirmPassword}</Field.ErrorText>
                                )}
                            </Field.Root>

                            <Button
                                type="submit"
                                colorScheme="blue"
                                size="lg"
                                width="full"
                                loading={isLoading}
                                loadingText="Resetting password..."
                                disabled={!token || !email}
                            >
                                Reset Password
                            </Button>
                        </Stack>
                    </form>
                </Card.Body>

                <Card.Footer>
                    <Stack gap={3} width="full">
                        <Text textAlign="center" fontSize="sm" color="fg.muted">
                            <ChakraLink asChild color="blue.solid">
                                <Link to="/login">Back to sign in</Link>
                            </ChakraLink>
                        </Text>
                    </Stack>
                </Card.Footer>
            </Card.Root>
        </Box>
    );
};

export default ResetPasswordPage;
