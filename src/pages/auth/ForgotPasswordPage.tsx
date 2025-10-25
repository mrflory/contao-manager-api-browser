import React, { useState } from 'react';
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
import { Link } from 'react-router-dom';
import { HttpClient } from '../../services/httpClient';
import { useAuth } from '../../contexts/AuthContext';

export const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string>('');
    const { csrfToken } = useAuth();

    const validateEmail = (): boolean => {
        if (!email.trim()) {
            setValidationError('Email is required');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setValidationError('Please enter a valid email address');
            return false;
        }
        setValidationError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail()) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const httpClient = HttpClient.getInstance();
            const response = await httpClient.makeApiCall('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            }, csrfToken || undefined);

            if (response.success) {
                setIsSubmitted(true);
            } else {
                // Even on error, we show success message to prevent email enumeration
                setIsSubmitted(true);
            }
        } catch (err: any) {
            console.error('Forgot password error:', err);
            // Show success message even on error to prevent email enumeration
            setIsSubmitted(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <Box maxWidth="md" mx="auto" p={6} mt={8}>
                <Card.Root>
                    <Card.Header>
                        <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                            Check Your Email
                        </Text>
                    </Card.Header>

                    <Card.Body>
                        <Stack gap={4}>
                            <Box
                                p={4}
                                borderRadius="md"
                                bg="blue.subtle"
                                borderWidth="1px"
                                borderColor="blue.emphasized"
                            >
                                <Text color="blue.fg" fontSize="sm">
                                    If an account with the email address <strong>{email}</strong> exists, we've sent you a password reset link.
                                </Text>
                                <Text color="blue.fg" fontSize="sm" mt={2}>
                                    Please check your email inbox and spam folder.
                                </Text>
                            </Box>

                            <Text fontSize="sm" color="fg.muted" textAlign="center">
                                Note: For security reasons, we don't reveal whether an email address is registered.
                            </Text>
                        </Stack>
                    </Card.Body>

                    <Card.Footer>
                        <Stack gap={3} width="full">
                            <Text textAlign="center" fontSize="sm" color="fg.muted">
                                <ChakraLink asChild color="blue.solid">
                                    <Link to="/login">Return to sign in</Link>
                                </ChakraLink>
                            </Text>
                        </Stack>
                    </Card.Footer>
                </Card.Root>
            </Box>
        );
    }

    return (
        <Box maxWidth="md" mx="auto" p={6} mt={8}>
            <Card.Root>
                <Card.Header>
                    <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                        Reset Your Password
                    </Text>
                    <Text color="fg.muted" textAlign="center" mt={2}>
                        Enter your email address and we'll send you a password reset link
                    </Text>
                </Card.Header>

                <Card.Body>
                    <form onSubmit={handleSubmit}>
                        <Stack gap={4}>
                            <Field.Root invalid={!!validationError}>
                                <Field.Label>Email Address</Field.Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (validationError) setValidationError('');
                                        if (error) setError(null);
                                    }}
                                    placeholder="Enter your email"
                                    disabled={isLoading}
                                />
                                {validationError && (
                                    <Field.ErrorText>{validationError}</Field.ErrorText>
                                )}
                            </Field.Root>

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

                            <Button
                                type="submit"
                                colorScheme="blue"
                                size="lg"
                                width="full"
                                loading={isLoading}
                                loadingText="Sending reset link..."
                            >
                                Send Reset Link
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

                        <Box textAlign="center">
                            <Text fontSize="sm" color="fg.muted">
                                Don't have an account?{' '}
                                <ChakraLink asChild color="blue.solid" fontWeight="medium">
                                    <Link to="/register">Sign up</Link>
                                </ChakraLink>
                            </Text>
                        </Box>
                    </Stack>
                </Card.Footer>
            </Card.Root>
        </Box>
    );
};

export default ForgotPasswordPage;
