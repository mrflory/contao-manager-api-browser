import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Spinner, Text, Stack } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    requireEmailVerification?: boolean;
    fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireEmailVerification = false,
    fallback,
}) => {
    const { isAuthenticated, user, isLoading } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (isLoading) {
        return fallback || (
            <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                minHeight="60vh"
            >
                <Stack align="center" gap={4}>
                    <Spinner size="xl" color="blue.500" />
                    <Text color="gray.600">Checking authentication...</Text>
                </Stack>
            </Box>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                state={{ from: location.pathname + location.search }}
                replace
            />
        );
    }

    // Check email verification if required
    if (requireEmailVerification && user && !user.emailVerified) {
        return (
            <Navigate
                to="/verify-email"
                state={{ from: location.pathname + location.search }}
                replace
            />
        );
    }

    // Render children if all checks pass
    return <>{children}</>;
};

interface PublicRouteProps {
    children: ReactNode;
    redirectTo?: string;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({
    children,
    redirectTo = '/',
}) => {
    const { isAuthenticated, isLoading } = useAuth();

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                minHeight="60vh"
            >
                <Stack align="center" gap={4}>
                    <Spinner size="xl" color="blue.500" />
                    <Text color="gray.600">Loading...</Text>
                </Stack>
            </Box>
        );
    }

    // Redirect to dashboard if already authenticated
    if (isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    // Render children if not authenticated
    return <>{children}</>;
};