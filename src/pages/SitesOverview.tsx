import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  Button,
  Text,
  Flex,
  Table,
  VStack,
  Menu,
  ButtonGroup,
  IconButton,
  Portal,
} from '@chakra-ui/react';
import { LuPlus as Plus, LuChevronRight as ChevronRight, LuChevronDown as ChevronDown, LuRefreshCw as RefreshCw } from 'react-icons/lu';
import { Tooltip } from "../components/ui/tooltip";
import { Config } from '../types';
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
        <Table.ScrollArea borderWidth="1px" borderRadius="lg">
          <Table.Root interactive>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Site</Table.ColumnHeader>
                  <Table.ColumnHeader>Version & Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sites.map((site) => (
                  <Table.Row key={site.url}>
                    {/* Column 1: Site Information */}
                    <Table.Cell>
                      <VStack gap={1} align="start">
                        <Text fontWeight="bold">{site.name}</Text>
                        <Tooltip content={site.url}>
                          <Text fontFamily="mono" fontSize="sm" color="gray.600" cursor="help">
                            {extractDomain(site.url)}
                          </Text>
                        </Tooltip>
                      </VStack>
                    </Table.Cell>
                    
                    {/* Column 2: Version & Status */}
                    <Table.Cell>
                      {site.versionInfo ? (
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
                      )}
                    </Table.Cell>
                    
                    {/* Column 3: Actions */}
                    <Table.Cell>
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
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      )}
    </Container>
  );
};

export default SitesOverview;