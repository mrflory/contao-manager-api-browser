import React from 'react';
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
    statusCode?: number;
    title?: string;
    message?: string;
    showHomeButton?: boolean;
}

/**
 * Simple error page component for displaying user-friendly error messages
 * Handles rate limit errors, 404s, and other API errors
 */
export const ErrorPage: React.FC<ErrorPageProps> = ({
    statusCode = 500,
    title,
    message,
    showHomeButton = true
}) => {
    const navigate = useNavigate();

    // Determine default title and message based on status code
    const getDefaultContent = () => {
        switch (statusCode) {
            case 429:
                return {
                    title: 'Too Many Requests',
                    message: 'You have made too many requests. Please wait a few minutes and try again.'
                };
            case 404:
                return {
                    title: 'Page Not Found',
                    message: 'The page you are looking for does not exist.'
                };
            case 403:
                return {
                    title: 'Access Denied',
                    message: 'You do not have permission to access this resource.'
                };
            case 401:
                return {
                    title: 'Authentication Required',
                    message: 'Please log in to access this resource.'
                };
            case 500:
            default:
                return {
                    title: 'Something Went Wrong',
                    message: 'An unexpected error occurred. Please try again later.'
                };
        }
    };

    const defaultContent = getDefaultContent();
    const displayTitle = title || defaultContent.title;
    const displayMessage = message || defaultContent.message;

    const handleGoHome = () => {
        navigate('/');
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    return (
        <Container maxW="container.md" py={20}>
            <VStack gap={6} textAlign="center">
                <Box>
                    <Text fontSize="6xl" fontWeight="bold" color="red.500">
                        {statusCode}
                    </Text>
                </Box>

                <Heading size="xl">{displayTitle}</Heading>

                <Text fontSize="lg" color="gray.600" maxW="md">
                    {displayMessage}
                </Text>

                <VStack gap={3} pt={4}>
                    {showHomeButton && (
                        <Button
                            colorScheme="blue"
                            size="lg"
                            onClick={handleGoHome}
                            width="200px"
                        >
                            Go to Home
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handleGoBack}
                        width="200px"
                    >
                        Go Back
                    </Button>
                </VStack>
            </VStack>
        </Container>
    );
};

export default ErrorPage;
