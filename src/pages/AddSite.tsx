import React, { useState, useEffect } from 'react';
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
import { AuthService } from '../services/authService';
import { encodeUrlParam } from '../utils/urlUtils';

const AddSite: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  
  // Detect reauthentication BEFORE useAuth hook processes the callback
  const [isReauthFlow] = useState(() => {
    return AuthService.isReauthCallback();
  });

  // Extract site URL from hash during component initialization (before hash is cleared)
  const [reauthSiteUrl] = useState(() => {
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const endpoint = hashParams.get('endpoint');
      if (endpoint) {
        let siteUrl = decodeURIComponent(endpoint);
        // Remove trailing slash to match stored URL format
        siteUrl = siteUrl.replace(/\/$/, '');
        return siteUrl;
      }
    }
    return null;
  });
  
  const { state, actions } = useAuth({
    redirectAfterAuth: isReauthFlow ? undefined : '/', // Don't auto-redirect for reauthentication
    onAuthSuccess: () => {
      // For reauthentication, redirect back to the site details page
      if (isReauthFlow) {        
        if (reauthSiteUrl) {
          navigate(`/site/${encodeUrlParam(reauthSiteUrl)}`);
        } else {
          navigate('/');
        }
      }
    },
  });

  // Handle reauthentication callback if detected
  useEffect(() => {
    if (isReauthFlow) {
      actions.handleReauthCallback();
    }
  }, [isReauthFlow, actions]);

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
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
        <Heading size="xl">{isReauthFlow ? 'Reauthenticating Site' : 'Add New Site'}</Heading>
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
                value={url}
                onChange={setUrl}
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