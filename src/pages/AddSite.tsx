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
import { AuthMethodSelector } from '../components/forms/AuthMethodSelector';
import { CookieAuthForm } from '../components/forms/CookieAuthForm';
import { Field } from '../components/ui/field';
import { useAuth } from '../hooks/useAuth';
import { useToastNotifications } from '../hooks/useToastNotifications';
import { OAuthScope, AuthenticationMethod, CookieAuthCredentials } from '../types/authTypes';
import { AuthService } from '../services/authService';
import { encodeUrlParam } from '../utils/urlUtils';

const AddSite: React.FC = () => {
  const navigate = useNavigate();
  const { showApiError, showApiSuccess } = useToastNotifications();
  const [url, setUrl] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthenticationMethod>('token');
  const [cookieAuthLoading, setCookieAuthLoading] = useState(false);
  const [cookieScope, setCookieScope] = useState<OAuthScope>('admin');
  
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

  const handleCookieAuth = async (credentials: CookieAuthCredentials) => {
    setCookieAuthLoading(true);

    try {
      if (!url) {
        showApiError('Please enter a Contao Manager URL first', 'Cookie Authentication');
        return;
      }

      const result = await AuthService.authenticateCookie(url, credentials);
      
      if (result.success) {
        // Authentication successful, now save site configuration
        const response = await fetch('/api/save-site-cookie', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            managerUrl: url,
            user: result.user,
            authMethod: 'cookie',
            scope: cookieScope
          })
        });

        const data = await response.json();

        if (data.success) {
          showApiSuccess(
            isReauthFlow ? 'Site reauthenticated successfully!' : 'Site added successfully!',
            'Cookie Authentication'
          );
          
          // Redirect to the site details or home page
          if (isReauthFlow && reauthSiteUrl) {
            navigate(`/site/${encodeUrlParam(reauthSiteUrl)}`);
          } else {
            navigate('/');
          }
        } else {
          showApiError(data.error || 'Failed to save site configuration', 'Cookie Authentication');
        }
      } else {
        showApiError(result.error || 'Authentication failed', 'Cookie Authentication');
      }
    } catch (error) {
      showApiError(
        error instanceof Error ? error.message : 'Network error during authentication',
        'Cookie Authentication'
      );
    } finally {
      setCookieAuthLoading(false);
    }
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
          <VStack gap={6} width="full">
            <UrlInput
              label="Contao Manager URL"
              value={url}
              onChange={setUrl}
              placeholder="https://example.com/contao-manager.phar.php"
              required
              validateOnChange
              width="full"
            />
            
            <AuthMethodSelector
              value={authMethod}
              onChange={setAuthMethod}
              width="full"
            />

            {authMethod === 'token' ? (
              <form onSubmit={handleAuthSubmit} style={{ width: '100%' }}>
                <VStack gap={4} width="full">
                  <Field required label="Required Permissions" width="full">
                    <ScopeSelector 
                      value={state.scope}
                      onChange={handleScopeChange}
                      width="full"
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
              <VStack gap={4} width="full">
                <Field required label="Required Permissions" width="full">
                  <ScopeSelector 
                    value={cookieScope}
                    onChange={setCookieScope}
                    width="full"
                  />
                </Field>
                
                <CookieAuthForm
                  onSubmit={handleCookieAuth}
                  loading={cookieAuthLoading}
                />
              </VStack>
            )}
          </VStack>
        ) : (
          <VStack gap={6} width="full">
            <Field required label="API Token (paste from redirect URL)" width="full">
              <Input
                value={state.token}
                onChange={handleTokenChange}
                placeholder="Enter your API token here"
                fontFamily="mono"
                width="full"
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