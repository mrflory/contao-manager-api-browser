import React, { useEffect, useCallback, useMemo } from 'react';
import {
  VStack,
  SimpleGrid,
  Box,
  Heading,
  Button,
  HStack,
  Flex,
  Separator,
  IconButton,
} from '@chakra-ui/react';
import { 
  LuExternalLink as ExternalLink, 
  LuSettings as Tool,
  LuPause as Pause,
  LuPlay as Play,
  LuRefreshCw as RefreshIcon,
  LuArrowRight as ArrowRight
} from 'react-icons/lu';
import { DataListRoot, DataListItem } from '../ui/data-list';
import { Site, MaintenanceMode } from '../../types';
import { formatDateTime } from '../../utils/dateUtils';
import { SiteManagement } from './SiteManagement';
import { useApiCall } from '../../hooks/useApiCall';
import { TaskApiService, SiteApiService, ExpertApiService } from '../../services/apiCallService';
import { useToastNotifications, TOAST_MESSAGES } from '../../hooks/useToastNotifications';

export interface SiteInfoTabProps {
  site: Site;
  onSiteUpdated: () => void;
  onSiteRemoved: () => void;
  maintenanceMode?: ReturnType<typeof useApiCall<MaintenanceMode>>; // useApiCall hook result for maintenance mode
  onNavigateToUpdate?: () => void;
}

export const SiteInfoTab: React.FC<SiteInfoTabProps> = ({ 
  site, 
  onSiteUpdated, 
  onSiteRemoved,
  maintenanceMode,
  onNavigateToUpdate
}) => {
  const toast = useToastNotifications();

  // Always create the hook, but conditionally use it
  const localMaintenanceMode = useApiCall<MaintenanceMode>(TaskApiService.getMaintenanceModeStatus, {
    showErrorToast: false, // We'll handle errors in the UI
    errorMessage: 'Failed to get maintenance mode status'
  });
  
  // Use passed maintenance mode state or local one as fallback
  const getMaintenanceMode = maintenanceMode || localMaintenanceMode;

  const enableMaintenance = useApiCall<MaintenanceMode>(TaskApiService.enableMaintenanceMode, {
    showSuccessToast: true,
    successMessage: 'Maintenance mode enabled successfully',
    showErrorToast: true,
    errorMessage: 'Failed to enable maintenance mode',
    onSuccess: () => {
      // Only refresh status if current status call is not in error state
      if (!getMaintenanceMode.state.error) {
        getMaintenanceMode.execute();
      }
    }
  });

  const disableMaintenance = useApiCall<MaintenanceMode>(TaskApiService.disableMaintenanceMode, {
    showSuccessToast: true,
    successMessage: 'Maintenance mode disabled successfully',
    showErrorToast: true,
    errorMessage: 'Failed to disable maintenance mode',
    onSuccess: () => {
      // Only refresh status if current status call is not in error state
      if (!getMaintenanceMode.state.error) {
        getMaintenanceMode.execute();
      }
    }
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

  const generateOneTimeToken = useApiCall(
    () => ExpertApiService.generateUserToken(
      site.user?.username || 'admin', 
      'contao-manager-api', 
      'admin', 
      'one-time'
    ),
    {
      onSuccess: (data: unknown) => {
        const tokenData = data as { url?: string; token?: string };
        if (tokenData?.url) {
          // Automatically open the one-time login URL in a new tab
          window.open(tokenData.url, '_blank', 'noopener,noreferrer');
          toast.showApiSuccess('Auto-login URL generated and opened', 'Open Contao Manager');
        } else {
          toast.showApiError('Token generated but no URL received', 'Open Contao Manager');
        }
      },
      showErrorToast: true,
      errorMessage: 'Failed to generate auto-login token'
    }
  );

  // Only load maintenance mode status if not passed from parent
  useEffect(() => {
    if (!maintenanceMode) {
      getMaintenanceMode.execute();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.url, maintenanceMode]); // Only reload when site changes and if no parent state
  // Generate admin URL by replacing contao-manager.phar.php with contao
  const adminUrl = useMemo(() => {
    if (site.url.includes('contao-manager.phar.php')) {
      return site.url.replace('contao-manager.phar.php', 'contao');
    }
    // If URL doesn't contain the manager script, append /contao
    const baseUrl = site.url.endsWith('/') ? site.url.slice(0, -1) : site.url;
    return `${baseUrl}/contao`;
  }, [site.url]);

  const handleOpenManager = useCallback(() => {
    generateOneTimeToken.execute();
  }, [generateOneTimeToken]);

  const handleOpenAdmin = useCallback(() => {
    window.open(adminUrl, '_blank', 'noopener,noreferrer');
  }, [adminUrl]);

  const handleToggleMaintenance = useCallback(() => {
    const currentlyEnabled = getMaintenanceMode.state.data?.enabled;
    
    if (currentlyEnabled) {
      disableMaintenance.execute();
    } else {
      enableMaintenance.execute();
    }
  }, [getMaintenanceMode.state.data?.enabled, disableMaintenance, enableMaintenance]);

  // Helper to determine if any maintenance operation is loading
  const isMaintenanceLoading = useMemo(() => 
    getMaintenanceMode.state.loading || 
    enableMaintenance.state.loading || 
    disableMaintenance.state.loading,
    [getMaintenanceMode.state.loading, enableMaintenance.state.loading, disableMaintenance.state.loading]
  );

  // Helper to get maintenance mode status
  const isMaintenanceEnabled = useMemo(() => 
    getMaintenanceMode.state.data?.enabled || false,
    [getMaintenanceMode.state.data?.enabled]
  );
  
  const hasMaintenanceData = useMemo(() => 
    !!getMaintenanceMode.state.data,
    [getMaintenanceMode.state.data]
  );

  const hasMaintenanceError = useMemo(() => 
    !!getMaintenanceMode.state.error,
    [getMaintenanceMode.state.error]
  );

  const isMaintenanceButtonDisabled = useMemo(() => 
    !hasMaintenanceData || hasMaintenanceError || isMaintenanceLoading,
    [hasMaintenanceData, hasMaintenanceError, isMaintenanceLoading]
  );

  return (
    <VStack gap={8} align="stretch">
      {/* Information Section: Two-column grid */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
        {/* Left column: Site Information with Maintenance Toggle */}
        <Box>
          <Box h={10} mb={4} display="flex" alignItems="center">
            <Heading size="lg">Site Information</Heading>
          </Box>
          <VStack align="stretch" gap={4}>
            <DataListRoot orientation="horizontal" size="md">
              <DataListItem 
                label="Last Used" 
                value={formatDateTime(site.lastUsed)}
              />
              <DataListItem 
                label="Authentication" 
                value={site.authMethod === 'cookie' ? 'Cookie-based' : 'API Token'}
              />
              {site.authMethod !== 'cookie' && (
                <DataListItem 
                  label="Token" 
                  value={site.token?.substring(0, 8) + '...' || 'N/A'}
                />
              )}
              {site.scope && (
                <DataListItem 
                  label="Permission Scope" 
                  value={site.scope}
                />
              )}
            </DataListRoot>
            
            {/* Maintenance Mode Toggle Button */}
            <Box pt={2}>
              <Button
                colorPalette={isMaintenanceEnabled ? "red" : "orange"}
                onClick={handleToggleMaintenance}
                size="sm"
                loading={isMaintenanceLoading}
                disabled={isMaintenanceButtonDisabled}
                w="full"
              >
                {isMaintenanceEnabled ? <Play size={14} /> : <Pause size={14} />}
                {isMaintenanceEnabled ? 'Disable' : 'Enable'} Maintenance Mode
              </Button>
            </Box>
          </VStack>
        </Box>

        {/* Right column: Version Information with Update Button */}
        <Box>
          <Flex justify="space-between" align="center" h={10} mb={4}>
            <Heading size="lg">Version Information</Heading>
            <IconButton
              aria-label="Update version information"
              colorPalette="blue"
              variant="ghost"
              size="xs"
              onClick={() => updateVersionInfo.execute()}
              loading={updateVersionInfo.state.loading}
            >
              <RefreshIcon size={12} />
            </IconButton>
          </Flex>
          <VStack align="stretch" gap={4}>
            {site.versionInfo ? (
              <DataListRoot orientation="horizontal" size="md">
                <DataListItem 
                  label="Contao Manager" 
                  value={site.versionInfo.contaoManagerVersion || 'N/A'}
                />
                <DataListItem 
                  label="PHP" 
                  value={site.versionInfo.phpVersion || 'N/A'}
                />
                <DataListItem 
                  label="Contao" 
                  value={site.versionInfo.contaoVersion || 'N/A'}
                />
                {site.versionInfo.lastUpdated && (
                  <DataListItem 
                    label="Last Updated" 
                    value={formatDateTime(site.versionInfo.lastUpdated)}
                  />
                )}
              </DataListRoot>
            ) : (
              <DataListRoot orientation="horizontal" size="md">
                <DataListItem 
                  label="Status" 
                  value="No version information available. Click the refresh button to fetch current versions."
                />
              </DataListRoot>
            )}
            
            {/* Go to Update Button */}
            <Box pt={2}>
              <Button
                colorPalette="blue"
                variant="outline"
                size="sm"
                onClick={onNavigateToUpdate}
                disabled={!onNavigateToUpdate}
                w="full"
              >
                <ArrowRight size={14} />
                Go to Update Workflow
              </Button>
            </Box>
          </VStack>
        </Box>
      </SimpleGrid>

      <Separator />

      {/* Actions Section - All buttons in single line */}
      <Box>
        <Heading size="md" mb={4}>Actions</Heading>
        <HStack gap={4} wrap="wrap">
          <Button
            colorPalette="blue"
            onClick={handleOpenManager}
            loading={generateOneTimeToken.state.loading}
            size="md"
          >
            <ExternalLink size={16} />
            Open Contao Manager
          </Button>
          <Button
            colorPalette="green"
            onClick={handleOpenAdmin}
            size="md"
          >
            <Tool size={16} />
            Open Contao Admin
          </Button>
          <SiteManagement 
            site={site}
            onSiteUpdated={onSiteUpdated}
            onSiteRemoved={onSiteRemoved}
            hideVersionUpdate={true}
            inline={true}
          />
        </HStack>
      </Box>
    </VStack>
  );
};