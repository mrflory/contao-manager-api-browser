import React, { useEffect, useMemo } from 'react';
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
} from '@chakra-ui/react';
import { LuPlus as Plus, LuChevronRight as ChevronRight, LuChevronDown as ChevronDown, LuRefreshCw as RefreshCw } from 'react-icons/lu';
import { ColumnDef } from '@tanstack/react-table';
import { Tooltip } from "../components/ui/tooltip";
import { EnhancedTable } from '../components/ui/enhanced-table';
import { Config, Site } from '../types';
import { useApiCall } from '../hooks/useApiCall';
import { SiteApiService } from '../services/apiCallService';
import { LoadingState } from '../components/display/LoadingState';
import { EmptyState } from '../components/display/EmptyState';
import { VersionBadges } from '../components/display/VersionBadges';
import { extractDomain, encodeUrlParam } from '../utils/urlUtils';

const SitesOverview: React.FC = () => {
  const navigate = useNavigate();

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

  useEffect(() => {
    configApi.execute();
  }, []);

  const handleSiteClick = async (url: string) => {
    await setActiveSiteApi.execute(url);
    navigate(`/site/${encodeUrlParam(url)}`);
  };

  const handleAddSite = () => {
    navigate('/add-site');
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
                        <Menu.Item value="update-version">
                          <RefreshCw size={16} />
                          Update Version Info
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
        >
          <Plus size={16} /> Add New Site
        </Button>
      </Flex>

      {sites.length === 0 ? (
        <EmptyState
          title="No sites configured yet"
          description="Click 'Add New Site' to get started"
          actionLabel="Add New Site"
          onAction={handleAddSite}
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