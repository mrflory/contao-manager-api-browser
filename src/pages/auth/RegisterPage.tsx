import React from 'react';
import { Container, Box } from '@chakra-ui/react';
import { RegisterForm } from '../../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
    return (
        <Container maxW="container.sm" py={8}>
            <Box minHeight="calc(100vh - 200px)" display="flex" alignItems="center">
                <RegisterForm />
            </Box>
        </Container>
    );
};

export default RegisterPage;