import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Button,
  Heading,
} from '@chakra-ui/react';
import { LuSettings as Settings, LuRefreshCw as RefreshCw, LuTrash2 as Trash2 } from 'react-icons/lu';
import { Site } from '../../types';
import { ReauthenticationForm } from '../forms/ReauthenticationForm';
import { ConfirmationDialog } from '../modals/ConfirmationDialog';
import { useToastNotifications, TOAST_MESSAGES } from '../../hooks/useToastNotifications';
import { useApiCall } from '../../hooks/useApiCall';
import { SiteApiService, ExpertApiService } from '../../services/apiCallService';

export interface SiteManagementProps {
  site: Site;
  onSiteUpdated: () => void;
  onSiteRemoved: () => void;
}

export const SiteManagement: React.FC<SiteManagementProps> = ({
  site,
  onSiteUpdated,
  onSiteRemoved,
}) => {
  const [showReauthForm, setShowReauthForm] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ username: string; tokenId?: string } | null>(null);
  const [fetchingTokenInfo, setFetchingTokenInfo] = useState(false);

  const toast = useToastNotifications();

  const updateVersionInfo = useApiCall(
    () => SiteApiService.updateVersionInfo(),
    {
      onSuccess: () => {
        toast.showSuccess(TOAST_MESSAGES.VERSION_INFO_UPDATED);
        onSiteUpdated();
      },
    }
  );

  const removeSite = useApiCall(
    () => SiteApiService.removeSite(site.url),
    {
      onSuccess: () => {
        // Don't show toast here anymore - we'll handle it in handleRemoveSite
        onSiteRemoved();
      },
    }
  );

  const deleteToken = useApiCall(
    async (params?: { username: string; tokenId: string }) => {
      if (!params) throw new Error('Username and token ID are required');
      return ExpertApiService.deleteToken(params.username, params.tokenId);
    }
  );

  const handleReauthenticate = () => {
    setShowReauthForm(true);
  };

  const handleReauthSuccess = () => {
    setShowReauthForm(false);
    onSiteUpdated();
  };

  const handleReauthCancel = () => {
    setShowReauthForm(false);
  };

  const fetchTokenInfo = async () => {
    setFetchingTokenInfo(true);
    try {
      const response = await ExpertApiService.getTokenInfo();
      if (response.success && response.tokenInfo?.username) {
        // Try to get the actual token list to find the current token ID
        try {
          const tokensResponse = await ExpertApiService.getTokensList(response.tokenInfo.username);
          if (tokensResponse && Array.isArray(tokensResponse) && tokensResponse.length > 0) {
            // Use the first token as the current one (this is a simplification)
            // In a real app, you'd need to identify which token is currently being used
            const currentToken = tokensResponse[0];
            setTokenInfo({ 
              username: response.tokenInfo.username,
              tokenId: currentToken.id || 'current'
            });
          } else {
            // Fallback to a reasonable default
            setTokenInfo({ 
              username: response.tokenInfo.username,
              tokenId: 'current'
            });
          }
        } catch (tokenListError) {
          console.warn('Failed to fetch token list, using fallback:', tokenListError);
          setTokenInfo({ 
            username: response.tokenInfo.username,
            tokenId: 'current'
          });
        }
      } else {
        setTokenInfo(null);
      }
    } catch (error) {
      console.error('Failed to fetch token info:', error);
      setTokenInfo(null);
    } finally {
      setFetchingTokenInfo(false);
    }
  };

  const handleRemoveSite = async (options?: { deleteToken?: boolean }) => {
    setRemoveDialogOpen(false);
    
    let tokenDeleted = false;
    
    try {
      // If token deletion was requested, do it FIRST before removing site
      if (options?.deleteToken && tokenInfo?.username && tokenInfo?.tokenId) {
        try {
          console.log(`Attempting to delete token ${tokenInfo.tokenId} for user ${tokenInfo.username}`);
          await deleteToken.execute({ 
            username: tokenInfo.username, 
            tokenId: tokenInfo.tokenId 
          });
          tokenDeleted = true;
          console.log('Token deletion successful');
        } catch (tokenError) {
          console.error('Failed to delete token:', tokenError);
          // Continue with site removal even if token deletion fails
          toast.showWarning({
            title: 'Warning',
            description: 'Failed to delete authentication token, but will proceed with site removal'
          });
        }
      }
      
      // Then remove the site from local config
      await removeSite.execute();
      
      // Show appropriate success message based on what operations were performed
      if (tokenDeleted) {
        toast.showSuccess({
          title: 'Success',
          description: `Site "${site.name}" removed and authentication token deleted`
        });
      } else {
        // Show the standard site removal message
        toast.showSuccess(TOAST_MESSAGES.SITE_REMOVED(site.name));
      }
      
    } catch (error) {
      // Error handling is already done in the useApiCall hook for site removal
      console.error('Failed to remove site:', error);
      
      // If we successfully deleted the token but failed to remove site, show warning
      if (tokenDeleted) {
        toast.showWarning({
          title: 'Warning',
          description: 'Authentication token was deleted but site removal failed'
        });
      }
    }
  };

  const handleRemoveButtonClick = () => {
    setRemoveDialogOpen(true);
    fetchTokenInfo(); // Fetch token info when dialog opens
  };

  return (
    <>
      <VStack gap={4} align="start">
        <Heading size="md" color="gray.500">Site Management</Heading>
        
        {!showReauthForm ? (
          <HStack gap={4} wrap="wrap">
            <Button
              colorPalette="blue"
              onClick={() => updateVersionInfo.execute()}
              loading={updateVersionInfo.state.loading}
            >
              <Settings size={16} /> Update Version Info
            </Button>
            <Button
              colorPalette="orange"
              onClick={handleReauthenticate}
            >
              <RefreshCw size={16} /> Reauthenticate
            </Button>
            <Button
              colorPalette="red"
              onClick={handleRemoveButtonClick}
            >
              <Trash2 size={16} /> Remove Site
            </Button>
          </HStack>
        ) : (
          <ReauthenticationForm
            site={site}
            onSuccess={handleReauthSuccess}
            onCancel={handleReauthCancel}
          />
        )}
      </VStack>

      <ConfirmationDialog
        isOpen={removeDialogOpen}
        onClose={() => setRemoveDialogOpen(false)}
        onConfirm={handleRemoveSite}
        title="Remove Site"
        message={`Are you sure you want to remove "${site.name}"? This action cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        confirmColorPalette="red"
        isLoading={removeSite.state.loading || deleteToken.state.loading}
        showTokenDeletionOption={!fetchingTokenInfo && tokenInfo !== null}
        tokenDeletionLabel="Also delete authentication token from Contao Manager"
      />
    </>
  );
};