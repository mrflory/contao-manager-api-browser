import { useCallback } from 'react';
import { useApiCall } from './useApiCall';
import { useToastNotifications } from './useToastNotifications';
import { ExpertApiService } from '../services/apiCallService';
import { openInNewTab } from '../utils/contaoUtils';

interface OpenContaoManagerOptions {
  siteUrl: string;
  username?: string;
}

/**
 * Hook for opening Contao Manager with a one-time login token
 * This hook encapsulates the logic for generating a one-time token and opening the manager
 */
export function useOpenContaoManager() {
  const toast = useToastNotifications();

  const generateOneTimeToken = useApiCall(
    (params?: OpenContaoManagerOptions) => {
      if (!params) throw new Error('Parameters required for generateOneTimeToken');
      return ExpertApiService.generateUserToken(
        params.siteUrl,
        params.username || 'admin',
        'contao-manager-api',
        'admin',
        'one-time'
      );
    },
    {
      onSuccess: (data: unknown) => {
        const tokenData = data as { url?: string; token?: string };
        if (tokenData?.url) {
          // Automatically open the one-time login URL in a new tab
          openInNewTab(tokenData.url);
          toast.showApiSuccess('Auto-login URL generated and opened', 'Open Contao Manager');
        } else if (tokenData?.token) {
          // Note: We can't construct the fallback URL here since we don't have the siteUrl
          // This should be handled by the caller if needed
          toast.showApiError('Token generated but no URL received', 'Open Contao Manager');
        } else {
          toast.showApiError('Token generated but no URL or token received', 'Open Contao Manager');
        }
      },
      showErrorToast: true,
      errorMessage: 'Failed to generate auto-login token'
    }
  );

  const openManager = useCallback((options: OpenContaoManagerOptions) => {
    generateOneTimeToken.execute(options);
  }, [generateOneTimeToken]);

  return {
    openManager,
    isLoading: generateOneTimeToken.state.loading,
    error: generateOneTimeToken.state.error,
  };
}
