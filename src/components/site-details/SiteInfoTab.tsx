import React, { useEffect, useCallback, useMemo } from 'react';
import {
  VStack,
  SimpleGrid,
  Box,
  Heading,
  Button,
  HStack,
  Separator,
  Badge,
} from '@chakra-ui/react';
import { 
  LuExternalLink as ExternalLink, 
  LuSettings as Tool,
  LuPause as Pause,
  LuPlay as Play,
  LuShieldAlert as ShieldAlert
} from 'react-icons/lu';
import { DataListRoot, DataListItem } from '../ui/data-list';
import { Site, MaintenanceMode } from '../../types';
import { formatDateTime } from '../../utils/dateUtils';
import { SiteManagement } from './SiteManagement';
import { useApiCall } from '../../hooks/useApiCall';
import { TaskApiService } from '../../services/apiCallService';

export interface SiteInfoTabProps {
  site: Site;
  onSiteUpdated: () => void;
  onSiteRemoved: () => void;
}

export const SiteInfoTab: React.FC<SiteInfoTabProps> = ({ 
  site, 
  onSiteUpdated, 
  onSiteRemoved 
}) => {
  // Maintenance mode state management
  const getMaintenanceMode = useApiCall<MaintenanceMode>(TaskApiService.getMaintenanceModeStatus, {
    showErrorToast: false, // We'll handle errors in the UI
    errorMessage: 'Failed to get maintenance mode status'
  });

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

  // Load maintenance mode status on component mount
  useEffect(() => {
    getMaintenanceMode.execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.url]); // Only reload when site changes - intentionally excluding getMaintenanceMode to prevent infinite loops
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
    window.open(site.url, '_blank', 'noopener,noreferrer');
  }, [site.url]);

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
      {/* Top Section: Two-column grid for site and version information */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
        {/* Left column: Site Information */}
        <Box>
          <Heading size="md" mb={4}>Site Information</Heading>
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
          
          {/* Maintenance Mode Status Badge */}
          <Box mt={4}>
            <Badge
              colorPalette={
                hasMaintenanceError 
                  ? "red" 
                  : isMaintenanceEnabled 
                    ? "red" 
                    : "green"
              }
              variant="subtle"
              size="md"
              display="flex"
              alignItems="center"
              gap={1}
            >
              {hasMaintenanceError ? (
                <>
                  <ShieldAlert size={14} />
                  Error fetching status
                </>
              ) : isMaintenanceEnabled ? (
                <>
                  <ShieldAlert size={14} />
                  Maintenance Active
                </>
              ) : (
                <>
                  <Play size={14} />
                  Site Online
                </>
              )}
            </Badge>
          </Box>
        </Box>

        {/* Right column: Version Information */}
        <Box>
          <Heading size="md" mb={4}>Version Information</Heading>
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
                value="No version information available. Click 'Update Version Info' to fetch current versions."
              />
            </DataListRoot>
          )}
        </Box>
      </SimpleGrid>

      <Separator />

      {/* Middle Section: Navigation buttons */}
      <Box>
        <Heading size="md" mb={4}>Quick Actions</Heading>
        <HStack gap={4} wrap="wrap">
          <Button
            colorPalette="blue"
            onClick={handleOpenManager}
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
          <Button
            colorPalette={isMaintenanceEnabled ? "red" : "orange"}
            onClick={handleToggleMaintenance}
            size="md"
            loading={isMaintenanceLoading}
            disabled={isMaintenanceButtonDisabled}
          >
            {isMaintenanceEnabled ? <Play size={16} /> : <Pause size={16} />}
            {isMaintenanceEnabled ? 'Disable' : 'Enable'} Maintenance Mode
          </Button>
        </HStack>
      </Box>

      <Separator />

      {/* Bottom Section: Site Management */}
      <SiteManagement 
        site={site}
        onSiteUpdated={onSiteUpdated}
        onSiteRemoved={onSiteRemoved}
      />
    </VStack>
  );
};