import React from 'react';
import { Container, Box } from '@chakra-ui/react';
import { LoginForm } from '../../components/auth/LoginForm';

const LoginPage: React.FC = () => {
    return (
        <Container maxW="container.sm" py={8}>
            <Box minHeight="calc(100vh - 200px)" display="flex" alignItems="center">
                <LoginForm />
            </Box>
        </Container>
    );
};

export default LoginPage;