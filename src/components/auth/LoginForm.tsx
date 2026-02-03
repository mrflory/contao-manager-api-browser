import React, { useState } from 'react';
import {
    Box,
    Button,
    Input,
    Text,
    Stack,
    Card,
    Field,
    Checkbox,
    Link as ChakraLink,
    Separator,
} from '@chakra-ui/react';
import { FiKey } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface LoginFormProps {
    onSuccess?: () => void;
    redirectTo?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, redirectTo = '/' }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const { login, signInWithPasskey, error, clearError } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

    // Check if coming from successful registration
    const searchParams = new URLSearchParams(location.search);
    const showRegistrationSuccess = searchParams.get('registered') === 'true';

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!password.trim()) {
            errors.password = 'Password is required';
        } else if (password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        clearError();

        try {
            await login(email.trim(), password, rememberMe);

            if (onSuccess) {
                onSuccess();
            } else {
                navigate(redirectTo);
            }
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string) => {
        // Clear validation error when user starts typing
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }

        // Clear auth error
        if (error) {
            clearError();
        }
    };

    return (
        <Card.Root maxWidth="md" mx="auto" p={6}>
            <Card.Header>
                <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                    Sign In
                </Text>
                <Text color="fg.muted" textAlign="center" mt={2}>
                    Welcome back to Contao Update & Backup Service
                </Text>
            </Card.Header>

            {showRegistrationSuccess && (
                <Box
                    mx={6}
                    mt={4}
                    mb={6}
                    p={4}
                    borderRadius="md"
                    bg="green.subtle"
                    borderWidth="1px"
                    borderColor="green.emphasized"
                >
                    <Text color="green.fg" fontSize="sm" fontWeight="medium">
                        Registration successful! You can now sign in with your credentials.
                    </Text>
                    <Text color="green.fg" fontSize="xs" mt={2} opacity={0.8}>
                        Your account has been automatically verified since email verification is currently disabled.
                    </Text>
                </Box>
            )}

            <Card.Body>
                <form onSubmit={handleSubmit}>
                    <Stack gap={4}>
                        <Field.Root invalid={!!validationErrors.email}>
                            <Field.Label>Email Address</Field.Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    handleInputChange('email');
                                }}
                                placeholder="Enter your email"
                                disabled={isLoading}
                            />
                            {validationErrors.email && (
                                <Field.ErrorText>{validationErrors.email}</Field.ErrorText>
                            )}
                        </Field.Root>

                        <Field.Root invalid={!!validationErrors.password}>
                            <Field.Label>Password</Field.Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    handleInputChange('password');
                                }}
                                placeholder="Enter your password"
                                disabled={isLoading}
                            />
                            {validationErrors.password && (
                                <Field.ErrorText>{validationErrors.password}</Field.ErrorText>
                            )}
                        </Field.Root>

                        <Box>
                            <Checkbox.Root
                                checked={rememberMe}
                                onCheckedChange={(e) => setRememberMe(!!e.checked)}
                                disabled={isLoading}
                            >
                                <Checkbox.HiddenInput />
                                <Checkbox.Control>
                                    <Checkbox.Indicator />
                                </Checkbox.Control>
                                <Checkbox.Label>Remember me for 30 days</Checkbox.Label>
                            </Checkbox.Root>
                        </Box>

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
                            loadingText="Signing in..."
                        >
                            Sign In
                        </Button>

                        <Box position="relative" py={2}>
                            <Separator />
                            <Text
                                position="absolute"
                                top="50%"
                                left="50%"
                                transform="translate(-50%, -50%)"
                                bg="bg"
                                px={2}
                                fontSize="sm"
                                color="fg.muted"
                            >
                                or
                            </Text>
                        </Box>

                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            width="full"
                            loading={isPasskeyLoading}
                            loadingText="Authenticating..."
                            disabled={isLoading}
                            onClick={async () => {
                                setIsPasskeyLoading(true);
                                clearError();
                                try {
                                    await signInWithPasskey();
                                    if (onSuccess) {
                                        onSuccess();
                                    } else {
                                        navigate(redirectTo);
                                    }
                                } catch (err) {
                                    console.error('Passkey sign-in failed:', err);
                                } finally {
                                    setIsPasskeyLoading(false);
                                }
                            }}
                        >
                            <FiKey style={{ marginRight: '8px' }} />
                            Sign in with Passkey
                        </Button>
                    </Stack>
                </form>
            </Card.Body>

            <Card.Footer>
                <Stack gap={3} width="full">
                    <Text textAlign="center" fontSize="sm" color="fg.muted">
                        <ChakraLink asChild color="blue.solid">
                            <Link to="/forgot-password">Forgot your password?</Link>
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
    );
};