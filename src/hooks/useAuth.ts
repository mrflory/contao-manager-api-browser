import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { SiteApiService } from '../services/apiCallService';
import { useToastNotifications, TOAST_MESSAGES } from './useToastNotifications';
import { OAuthScope } from '../types/authTypes';

export interface UseAuthOptions {
  onAuthSuccess?: (token: string) => void;
  onAuthError?: (error: string) => void;
  redirectAfterAuth?: string;
}

export interface AuthState {
  loading: boolean;
  isAuthenticating: boolean;
  showTokenForm: boolean;
  token: string;
  extractedToken: string;
  scope: OAuthScope;
}

export interface AuthActions {
  setToken: (token: string) => void;
  setScope: (scope: OAuthScope) => void;
  initiateOAuth: (managerUrl: string) => Promise<void>;
  saveToken: (managerUrl?: string) => Promise<void>;
  initiateReauth: (managerUrl: string) => Promise<void>;
  saveReauthToken: (token: string) => Promise<void>;
  handleOAuthCallback: () => void;
  handleReauthCallback: () => Promise<void>;
  resetAuthState: () => void;
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const navigate = useNavigate();
  const toast = useToastNotifications();

  const [state, setState] = useState<AuthState>({
    loading: false,
    isAuthenticating: false,
    showTokenForm: false,
    token: '',
    extractedToken: '',
    scope: 'admin'
  });

  // Check for OAuth callback on mount
  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const setToken = useCallback((token: string) => {
    setState(prev => ({ ...prev, token }));
  }, []);

  const setScope = useCallback((scope: OAuthScope) => {
    setState(prev => ({ ...prev, scope }));
  }, []);

  const resetAuthState = useCallback(() => {
    setState({
      loading: false,
      isAuthenticating: false,
      showTokenForm: false,
      token: '',
      extractedToken: '',
      scope: 'admin'
    });
  }, []);

  const initiateOAuth = useCallback(async (managerUrl: string) => {
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const redirectUri = AuthService.buildOAuthRedirectUri();
      
      toast.showInfo(TOAST_MESSAGES.REDIRECTING_AUTH);

      AuthService.initiateOAuth(managerUrl, state.scope, redirectUri);
    } catch (error) {
      setState(prev => ({ ...prev, isAuthenticating: false }));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.showApiError(errorMessage, 'Authentication');
      options.onAuthError?.(errorMessage);
    }
  }, [state.scope, toast, options]);

  const initiateReauth = useCallback(async (managerUrl: string) => {
    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      toast.showInfo(TOAST_MESSAGES.REDIRECTING_AUTH);
      AuthService.initiateReauth(managerUrl, state.scope);
    } catch (error) {
      setState(prev => ({ ...prev, isAuthenticating: false }));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.showApiError(errorMessage, 'Reauthentication');
      options.onAuthError?.(errorMessage);
    }
  }, [state.scope, toast, options]);

  const handleOAuthCallback = useCallback(() => {
    if (AuthService.isOAuthCallback()) {
      const result = AuthService.extractTokenFromHash();
      
      if (result.success && result.token) {
        setState(prev => ({ 
          ...prev, 
          extractedToken: result.token!, 
          token: result.token!,
          showTokenForm: true 
        }));
        
        toast.showSuccess(TOAST_MESSAGES.TOKEN_RECEIVED);
        AuthService.clearOAuthHash();
      } else {
        toast.showApiError(result.error || 'Failed to extract token', 'Authentication');
        options.onAuthError?.(result.error || 'Failed to extract token');
      }
    }
  }, [toast, options]);

  const handleReauthCallback = useCallback(async () => {
    if (AuthService.isReauthCallback()) {
      const result = AuthService.extractTokenFromHash();
      
      if (result.success && result.token) {
        await saveReauthToken(result.token);
        AuthService.clearOAuthHash();
      } else {
        toast.showApiError(result.error || 'Failed to extract token', 'Reauthentication');
        options.onAuthError?.(result.error || 'Failed to extract token');
      }
    }
  }, [toast, options]);

  const saveToken = useCallback(async (managerUrl?: string) => {
    if (!state.token.trim()) {
      toast.showError({
        title: 'Error',
        description: 'Please enter a valid token',
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const urlToUse = managerUrl || AuthService.getStoredManagerUrl();
      if (!urlToUse) {
        throw new Error('Manager URL not found. Please start over.');
      }

      const result = await SiteApiService.saveToken(state.token, urlToUse);
      
      if (result.success) {
        toast.showSuccess(TOAST_MESSAGES.SITE_ADDED);
        AuthService.cleanupOAuthData();
        
        options.onAuthSuccess?.(state.token);
        
        if (options.redirectAfterAuth && options.redirectAfterAuth !== undefined) {
          setTimeout(() => {
            navigate(options.redirectAfterAuth!);
          }, 1500);
        }
      } else {
        throw new Error(result.error || 'Failed to save token');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.showApiError(errorMessage, 'Save Token');
      options.onAuthError?.(errorMessage);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.token, toast, navigate, options]);

  const saveReauthToken = useCallback(async (token: string) => {
    const siteUrl = AuthService.getStoredReauthSiteUrl();
    if (!siteUrl) {
      toast.showError({
        title: 'Error',
        description: 'Site URL not found. Please try reauthenticating again.',
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const result = await SiteApiService.saveToken(token, siteUrl);
      
      if (result.success) {
        // Ensure the reauthenticated site is set as active
        await SiteApiService.setActiveSite(siteUrl);
        
        toast.showSuccess(TOAST_MESSAGES.REAUTHENTICATION_SUCCESS);
        
        options.onAuthSuccess?.(token);
        
        // Clean up OAuth data AFTER the success callback has used it
        AuthService.cleanupOAuthData();
      } else {
        throw new Error(result.error || 'Failed to save new token');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.showApiError(errorMessage, 'Save Reauth Token');
      options.onAuthError?.(errorMessage);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [toast, options]);

  return {
    state,
    actions: {
      setToken,
      setScope,
      initiateOAuth,
      saveToken,
      initiateReauth,
      saveReauthToken,
      handleOAuthCallback,
      handleReauthCallback,
      resetAuthState,
    }
  };
};