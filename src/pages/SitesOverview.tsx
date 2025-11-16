import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  Button,
  Text,
  Flex,
  VStack,
  Menu,
  ButtonGroup,
  IconButton,
  Portal,
  Spinner,
} from '@chakra-ui/react';
import { LuPlus as Plus, LuChevronRight as ChevronRight, LuChevronDown as ChevronDown, LuRefreshCw as RefreshCw, LuExternalLink as ExternalLink, LuSettings as Tool } from 'react-icons/lu';
import { ColumnDef } from '@tanstack/react-table';
import { Tooltip } from "../components/ui/tooltip";
import { EnhancedTable } from '../components/ui/enhanced-table';
import { Config, Site } from '../types';
import { useApiCall } from '../hooks/useApiCall';
import { useAuth } from '../contexts/AuthContext';
import { SiteApiService } from '../services/apiCallService';
import { LoadingState } from '../components/display/LoadingState';
import { EmptyState } from '../components/display/EmptyState';
import { VersionBadges } from '../components/display/VersionBadges';
import { extractDomain, encodeUrlParam } from '../utils/urlUtils';
import { useSubscription } from '../hooks/useSubscription';
import { useToastNotifications, TOAST_MESSAGES } from '../hooks/useToastNotifications';
import { useOpenContaoManager } from '../hooks/useOpenContaoManager';
import { getContaoAdminUrl, openInNewTab } from '../utils/contaoUtils';

const SitesOverview: React.FC = () => {
  const navigate = useNavigate();
  const { isTokenReady, isLoading: authLoading } = useAuth();
  const { limits } = useSubscription();
  const toast = useToastNotifications();
  const [updatingVersionForSite, setUpdatingVersionForSite] = useState<string | null>(null);
  const { openManager, isLoading: isOpeningManager } = useOpenContaoManager();

  const configApi = useApiCall(
    () => SiteApiService.getConfig(),
    {
      showErrorToast: true,
    }
  );

  const setActiveSiteApi = useApiCall(
    (url?: string) => {
      if (!url) throw new Error('URL is required for setActiveSite');
      return SiteApiService.setActiveSite(url);
    },
    {
      showErrorToast: true,
    }
  );

  const updateVersionInfoApi = useApiCall(
    () => SiteApiService.updateVersionInfo(),
    {
      showErrorToast: false, // We'll handle toasts manually for more control
    }
  );

  useEffect(() => {
    // Only execute API call when auth is complete and token is ready
    if (!authLoading && isTokenReady) {
      configApi.execute();
    }
  }, [authLoading, isTokenReady]);

  const handleSiteClick = async (url: string) => {
    await setActiveSiteApi.execute(url);
    navigate(`/site/${encodeUrlParam(url)}`);
  };

  const handleAddSite = () => {
    navigate('/add-site');
  };

  const handleUpdateVersionInfo = async (siteUrl: string) => {
    try {
      setUpdatingVersionForSite(siteUrl);

      // First, set the active site
      await setActiveSiteApi.execute(siteUrl);

      // Then update version info
      await updateVersionInfoApi.execute();

      // Show success toast
      toast.showSuccess(TOAST_MESSAGES.VERSION_INFO_UPDATED);

      // Refresh the config to get updated version info
      await configApi.execute();
    } catch (error) {
      // Show error toast
      toast.showApiError(error instanceof Error ? error : new Error('Failed to update version info'), 'Update Version Info');
    } finally {
      setUpdatingVersionForSite(null);
    }
  };

  const handleOpenManager = (siteUrl: string, site: Site) => {
    openManager({
      siteUrl,
      username: site.user?.username
    });
  };

  const handleOpenAdmin = (siteUrl: string) => {
    const adminUrl = getContaoAdminUrl(siteUrl);
    openInNewTab(adminUrl);
  };

  const columns = useMemo<ColumnDef<Site>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Site',
        cell: ({ row }) => {
          const site = row.original;
          return (
            <VStack gap={1} align="start">
              <Text fontWeight="bold">{site.name}</Text>
              <Tooltip content={site.url}>
                <Text fontFamily="mono" fontSize="sm" color="gray.600" cursor="help">
                  {extractDomain(site.url)}
                </Text>
              </Tooltip>
            </VStack>
          );
        },
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        filterFn: (row, _columnId, value) => {
          const site = row.original;
          const searchValue = value.toLowerCase();
          return (
            site.name.toLowerCase().includes(searchValue) ||
            extractDomain(site.url).toLowerCase().includes(searchValue) ||
            site.url.toLowerCase().includes(searchValue)
          );
        },
      },
      {
        accessorKey: 'versionInfo',
        header: 'Version & Status',
        cell: ({ row }) => {
          const site = row.original;
          return site.versionInfo ? (
            <VersionBadges
              versionInfo={site.versionInfo}
              layout="horizontal"
              showLastUpdated={true}
              size="xs"
            />
          ) : (
            <Text fontSize="sm" color="gray.400">
              No version info
            </Text>
          );
        },
        sortingFn: (a, b) => {
          const aTime = a.original.versionInfo?.lastUpdated || a.original.lastUsed;
          const bTime = b.original.versionInfo?.lastUpdated || b.original.lastUsed;
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        },
        filterFn: (row, _columnId, value) => {
          const site = row.original;
          const searchValue = value.toLowerCase();
          if (!site.versionInfo) return false;
          return (
            (site.versionInfo.contaoVersion?.toLowerCase().includes(searchValue) || false) ||
            (site.versionInfo.phpVersion?.toLowerCase().includes(searchValue) || false) ||
            (site.versionInfo.contaoManagerVersion?.toLowerCase().includes(searchValue) || false)
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const site = row.original;
          return (
            <Flex justify="end">
              <ButtonGroup size="sm" variant="outline" attached>
                <Button
                  variant="outline"
                  onClick={() => handleSiteClick(site.url)}
                >
                  <ChevronRight size={16} />
                  View
                </Button>
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <IconButton variant="outline">
                      <ChevronDown size={16} />
                    </IconButton>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content>
                        <Menu.Item
                          value="update-version"
                          onClick={() => handleUpdateVersionInfo(site.url)}
                          disabled={updatingVersionForSite === site.url}
                        >
                          {updatingVersionForSite === site.url ? (
                            <Spinner size="sm" />
                          ) : (
                            <RefreshCw size={16} />
                          )}
                          {updatingVersionForSite === site.url ? 'Updating...' : 'Update Version Info'}
                        </Menu.Item>
                        <Menu.Item
                          value="open-manager"
                          onClick={() => handleOpenManager(site.url, site)}
                          disabled={isOpeningManager}
                        >
                          {isOpeningManager ? (
                            <Spinner size="sm" />
                          ) : (
                            <ExternalLink size={16} />
                          )}
                          Open Contao Manager
                        </Menu.Item>
                        <Menu.Item
                          value="open-admin"
                          onClick={() => handleOpenAdmin(site.url)}
                        >
                          <Tool size={16} />
                          Open Contao Admin
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              </ButtonGroup>
            </Flex>
          );
        },
        enableSorting: false,
      },
    ],
    [handleSiteClick]
  );

  if (configApi.state.loading) {
    return (
      <Container maxW="6xl">
        <LoadingState message="Loading sites..." height="200px" />
      </Container>
    );
  }

  const config = configApi.state.data as Config | undefined;
  const sites = config?.sites ? Object.values(config.sites) : [];

  return (
    <Container maxW="6xl">
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size="xl">Your Sites</Heading>
        <Button
          colorPalette="green"
          onClick={handleAddSite}
          disabled={!limits.canAddSites}
        >
          <Plus size={16} /> Add New Site
        </Button>
      </Flex>

      {sites.length === 0 ? (
        <EmptyState
          title="No sites configured yet"
          description={limits.canAddSites ? "Click 'Add New Site' to get started" : "Site limit reached. Upgrade your plan to add sites."}
          actionLabel={limits.canAddSites ? "Add New Site" : "Upgrade Plan"}
          onAction={limits.canAddSites ? handleAddSite : () => navigate('/billing')}
          icon="🌐"
        />
      ) : (
        <EnhancedTable
          data={sites}
          columns={columns}
          globalFilterPlaceholder="Search sites by name, domain, or version..."
          enableGlobalFilter={true}
          enableSorting={true}
          enableColumnFilters={false}
          defaultSorting={[{ id: 'name', desc: false }]}
        />
      )}
    </Container>
  );
};

export default SitesOverview;