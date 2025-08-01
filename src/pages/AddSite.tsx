import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  Button,
  Box,
  Flex,
  Input,
  VStack,
} from '@chakra-ui/react';
import { LuArrowLeft } from 'react-icons/lu';
import { ScopeSelector } from '../components/forms/ScopeSelector';
import { UrlInput } from '../components/forms/UrlInput';
import { Field } from '../components/ui/field';
import { useAuth } from '../hooks/useAuth';
import { OAuthScope } from '../types/authTypes';

const AddSite: React.FC = () => {
  const navigate = useNavigate();
  
  const { state, actions } = useAuth({
    redirectAfterAuth: '/',
  });

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    
    if (!url) return;
    
    await actions.initiateOAuth(url);
  };

  const handleTokenSave = async () => {
    await actions.saveToken();
  };

  const handleScopeChange = (scope: OAuthScope) => {
    actions.setScope(scope);
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setToken(e.target.value);
  };

  return (
    <Container maxW="2xl">
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size="xl">Add New Site</Heading>
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
        >
          <LuArrowLeft size={16} /> Back to Sites
        </Button>
      </Flex>

      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={8}
      >
        {!state.showTokenForm ? (
          <form onSubmit={handleAuthSubmit}>
            <VStack gap={6}>
              <UrlInput
                label="Contao Manager URL"
                value=""
                onChange={() => {}} // Handled by form
                placeholder="https://example.com/contao-manager.phar.php"
                required
                validateOnChange
              />
              
              <Field required label="Required Permissions">
                <ScopeSelector 
                  value={state.scope}
                  onChange={handleScopeChange}
                />
              </Field>
              
              <Button
                type="submit"
                colorPalette="blue"
                size="lg"
                loading={state.isAuthenticating}
                loadingText="Redirecting..."
                width="full"
              >
                Generate API Token
              </Button>
            </VStack>
          </form>
        ) : (
          <VStack gap={6}>
            <Field required label="API Token (paste from redirect URL)">
              <Input
                value={state.token}
                onChange={handleTokenChange}
                placeholder="Enter your API token here"
                fontFamily="mono"
              />
            </Field>
            
            <Button
              colorPalette="green"
              size="lg"
              onClick={handleTokenSave}
              loading={state.loading}
              loadingText="Saving..."
              width="full"
            >
              Save Token
            </Button>
          </VStack>
        )}
      </Box>
    </Container>
  );
};

export default AddSite;