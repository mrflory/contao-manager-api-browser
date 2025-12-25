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
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

interface RegisterFormProps {
    onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});


    const { register, error, clearError } = useAuth();
    const navigate = useNavigate();

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        // Email validation
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            errors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
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
            await register(
                formData.email.trim(),
                formData.password
            );

            // Redirect to login page with success message
            navigate('/login?registered=true');

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Registration failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

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
                    Create Account
                </Text>
                <Text color="fg.muted" textAlign="center" mt={2}>
                    Join Contao Update & Backup Service
                </Text>
            </Card.Header>

            <Card.Body>
                <form onSubmit={handleSubmit}>
                    <Stack gap={4}>

                        <Field.Root invalid={!!validationErrors.email}>
                            <Field.Label>Email Address *</Field.Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="Enter your email"
                                disabled={isLoading}
                            />
                            {validationErrors.email && (
                                <Field.ErrorText>{validationErrors.email}</Field.ErrorText>
                            )}
                        </Field.Root>

                        <Field.Root invalid={!!validationErrors.password}>
                            <Field.Label>Password *</Field.Label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                placeholder="Create a password"
                                disabled={isLoading}
                            />
                            <Field.HelperText>Must be at least 8 characters with uppercase, lowercase, and number</Field.HelperText>
                            {validationErrors.password && (
                                <Field.ErrorText>{validationErrors.password}</Field.ErrorText>
                            )}
                        </Field.Root>

                        <Field.Root invalid={!!validationErrors.confirmPassword}>
                            <Field.Label>Confirm Password *</Field.Label>
                            <Input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                placeholder="Confirm your password"
                                disabled={isLoading}
                            />
                            {validationErrors.confirmPassword && (
                                <Field.ErrorText>{validationErrors.confirmPassword}</Field.ErrorText>
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
                            loadingText="Creating account..."
                        >
                            Create Account
                        </Button>
                    </Stack>
                </form>
            </Card.Body>

            <Card.Footer>
                <Box textAlign="center" width="full">
                    <Text fontSize="sm" color="fg.muted">
                        Already have an account?{' '}
                        <ChakraLink asChild color="blue.solid" fontWeight="medium">
                            <Link to="/login">Sign in</Link>
                        </ChakraLink>
                    </Text>
                </Box>
            </Card.Footer>
        </Card.Root>
    );
};