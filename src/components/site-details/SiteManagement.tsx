import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Button,
  Heading,
  Box,
  Text,
} from '@chakra-ui/react';
import { LuSettings as Settings, LuRefreshCw as RefreshCw, LuTrash2 as Trash2 } from 'react-icons/lu';
import { Site } from '../../types';
import { ScopeSelector } from '../forms/ScopeSelector';
import { Field } from '../ui/field';
import { ConfirmationDialog } from '../modals/ConfirmationDialog';
import { useToastNotifications, TOAST_MESSAGES } from '../../hooks/useToastNotifications';
import { useAuth } from '../../hooks/useAuth';
import { useApiCall } from '../../hooks/useApiCall';
import { SiteApiService } from '../../services/apiCallService';
import { OAuthScope } from '../../types/authTypes';

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
  const [reauthScope, setReauthScope] = useState<OAuthScope>('admin');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const toast = useToastNotifications();

  const { actions: authActions } = useAuth({
    onAuthSuccess: () => {
      setShowReauthForm(false);
      onSiteUpdated();
    },
  });

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
        toast.showSuccess(TOAST_MESSAGES.SITE_REMOVED(site.name));
        onSiteRemoved();
      },
    }
  );

  const handleReauthenticate = () => {
    setShowReauthForm(true);
  };

  const handleReauthSubmit = async () => {
    authActions.setScope(reauthScope);
    await authActions.initiateReauth(site.url);
  };

  const handleRemoveSite = async () => {
    setRemoveDialogOpen(false);
    await removeSite.execute();
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
              onClick={() => setRemoveDialogOpen(true)}
            >
              <Trash2 size={16} /> Remove Site
            </Button>
          </HStack>
        ) : (
          <Box p={4} borderWidth="1px" borderRadius="md" width="100%">
            <VStack gap={4} align="stretch">
              <Text fontSize="md" fontWeight="semibold">
                Reauthenticate with {site.name}
              </Text>
              <Text fontSize="sm" color="gray.600">
                Select new permissions and generate a new API token. This will replace your current token.
              </Text>
              <Field required label="Required Permissions">
                <ScopeSelector 
                  value={reauthScope}
                  onChange={setReauthScope}
                  size="sm"
                  maxWidth="300px"
                />
              </Field>
              <HStack gap={3}>
                <Button
                  colorPalette="orange"
                  onClick={handleReauthSubmit}
                  loading={updateVersionInfo.state.loading}
                  loadingText="Redirecting..."
                >
                  Generate New Token
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowReauthForm(false)}
                >
                  Cancel
                </Button>
              </HStack>
            </VStack>
          </Box>
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
        isLoading={removeSite.state.loading}
      />
    </>
  );
};