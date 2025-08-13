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
import { SiteApiService } from '../../services/apiCallService';

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
        toast.showSuccess(TOAST_MESSAGES.SITE_REMOVED(site.name));
        onSiteRemoved();
      },
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
        isLoading={removeSite.state.loading}
      />
    </>
  );
};