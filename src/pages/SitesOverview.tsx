import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  Button,
  Text,
  Flex,
  Table,
  Box,
} from '@chakra-ui/react';
import { LuPlus as Plus } from 'react-icons/lu';
import { Tooltip } from "../components/ui/tooltip";
import { Config } from '../types';
import { useApiCall } from '../hooks/useApiCall';
import { SiteApiService } from '../services/apiCallService';
import { LoadingState } from '../components/display/LoadingState';
import { EmptyState } from '../components/display/EmptyState';
import { VersionBadges } from '../components/display/VersionBadges';
import { extractDomain, encodeUrlParam } from '../utils/urlUtils';
import { formatDateTime } from '../utils/dateUtils';

const SitesOverview: React.FC = () => {
  const navigate = useNavigate();

  const configApi = useApiCall(
    () => SiteApiService.getConfig(),
    {
      showErrorToast: true,
    }
  );

  const setActiveSiteApi = useApiCall(
    (url: string) => SiteApiService.setActiveSite(url),
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
        <Box
          borderWidth="1px"
          borderRadius="lg"
          overflow="hidden"
        >
          <Box overflowX="auto">
            <Table.Root interactive>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Site Name</Table.ColumnHeader>
                  <Table.ColumnHeader>URL</Table.ColumnHeader>
                  <Table.ColumnHeader>Version Info</Table.ColumnHeader>
                  <Table.ColumnHeader>Last Used</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sites.map((site) => (
                  <Table.Row
                    key={site.url}
                    onClick={() => handleSiteClick(site.url)}
                    cursor="pointer"
                  >
                    <Table.Cell>
                      <Text fontWeight="bold">{site.name}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Tooltip content={site.url}>
                        <Text fontFamily="mono" fontSize="sm" color="gray.600" cursor="help">
                          {extractDomain(site.url)}
                        </Text>
                      </Tooltip>
                    </Table.Cell>
                    <Table.Cell>
                      {site.versionInfo ? (
                        <VersionBadges 
                          versionInfo={site.versionInfo}
                          layout="vertical"
                          showLastUpdated={true}
                          size="xs"
                        />
                      ) : (
                        <Text fontSize="sm" color="gray.400">
                          No version info
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text color="gray.600">
                        {formatDateTime(site.lastUsed)}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default SitesOverview;