import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Button,
  Text,
  Box,
} from '@chakra-ui/react';
import { Site } from '../../types';
import { ScopeSelector } from './ScopeSelector';
import { AuthMethodSelector } from './AuthMethodSelector';
import { CookieAuthForm } from './CookieAuthForm';
import { Field } from '../ui/field';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { useAuth } from '../../hooks/useAuth';
import { AuthApiService } from '../../services/apiCallService';
import { OAuthScope, AuthenticationMethod, CookieAuthCredentials } from '../../types/authTypes';

export interface ReauthenticationFormProps {
  site: Site;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ReauthenticationForm: React.FC<ReauthenticationFormProps> = ({
  site,
  onSuccess,
  onCancel,
}) => {
  const [authMethod, setAuthMethod] = useState<AuthenticationMethod>(site.authMethod || 'token');
  const [scope, setScope] = useState<OAuthScope>(site.scope || 'admin');
  const [cookieAuthLoading, setCookieAuthLoading] = useState(false);
  
  const { showApiError, showApiSuccess } = useToastNotifications();

  const { actions: authActions } = useAuth({
    onAuthSuccess: () => {
      onSuccess();
    },
  });

  const handleTokenReauth = async () => {
    authActions.setScope(scope);
    await authActions.initiateReauth(site.url);
  };

  const handleCookieReauth = async (credentials: CookieAuthCredentials) => {
    setCookieAuthLoading(true);

    try {
      const result = await AuthApiService.cookieAuth({ managerUrl: site.url, credentials });
      
      if (result.success) {
        // Update site configuration with new cookie authentication
        const configResult = await AuthApiService.saveSiteCookie({
          managerUrl: site.url,
          user: result.user,
          authMethod: 'cookie',
          scope: scope,
          isReauth: true // Flag to indicate this is a reauthentication
        });

        if (configResult.success) {
          showApiSuccess('Site reauthenticated successfully!', 'Cookie Authentication');
          onSuccess();
        } else {
          showApiError(configResult.error || 'Failed to save site configuration', 'Cookie Authentication');
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
    <Box p={4} borderWidth="1px" borderRadius="md" width="100%">
      <VStack gap={4} align="stretch">
        <Text fontSize="md" fontWeight="semibold">
          Reauthenticate with {site.name}
        </Text>
        <Text fontSize="sm" color="gray.600">
          Update your authentication method or renew your session. You can switch between API tokens and cookie-based authentication.
        </Text>
        
        <AuthMethodSelector
          value={authMethod}
          onChange={setAuthMethod}
        />
        
        <Field required label="Required Permissions">
          <ScopeSelector 
            value={scope}
            onChange={setScope}
            width="full"
          />
        </Field>

        {authMethod === 'token' ? (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="gray.600">
              This will redirect you to {site.name} to generate a new API token, which will replace your current authentication.
            </Text>
            <HStack gap={3} width="full">
              <Button
                colorPalette="blue"
                size="lg"
                flex="1"
                onClick={handleTokenReauth}
                loadingText="Redirecting..."
              >
                Generate New Token
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </HStack>
          </VStack>
        ) : (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Enter your username and password to create a new session. This will replace your current authentication.
            </Text>
            <CookieAuthForm
              onSubmit={handleCookieReauth}
              loading={cookieAuthLoading}
              submitLabel="Reauthenticate"
              onCancel={onCancel}
            />
          </VStack>
        )}
      </VStack>
    </Box>
  );
};