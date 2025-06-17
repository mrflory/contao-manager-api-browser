import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  Button,
  Text,
  Box,
  Flex,
  Spinner,
  Center,
  VStack,
  HStack,
  Badge,
  Table,
} from '@chakra-ui/react';
import { LuPlus as Plus } from 'react-icons/lu';
import { useColorModeValue } from '../components/ui/color-mode';
import { Tooltip } from "../components/ui/tooltip";
import { Config } from '../types';
import { api } from '../utils/api';

const SitesOverview: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cardBg = useColorModeValue('white', 'gray.800');
  // const borderColor = useColorModeValue('gray.200', 'gray.600');
  // const hoverBg = useColorModeValue('gray.50', 'gray.700');

  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      // Fallback if URL parsing fails
      const match = url.match(/(?:https?:\/\/)?([^\/]+)/);
      return match ? match[1] : url;
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const configData = await api.getConfig();
      setConfig(configData);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSiteClick = async (url: string) => {
    try {
      await api.setActiveSite(url);
      navigate(`/site/${encodeURIComponent(url)}`);
    } catch (error) {
      console.error('Error selecting site:', error);
    }
  };

  const handleAddSite = () => {
    navigate('/add-site');
  };

  if (loading) {
    return (
      <Center h="200px">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

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
        <Box
          borderWidth="1px"
          borderRadius="lg"
          p={12}
        >
          <VStack spacing={4}>
            <Text fontSize="lg" color="gray.500">
              No sites configured yet
            </Text>
            <Text color="gray.500">
              Click "Add New Site" to get started
            </Text>
          </VStack>
        </Box>
      ) : (
        <Box
          bg={cardBg}
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
                        <VStack spacing={1} align="start">
                          <HStack spacing={2} wrap="wrap">
                            {site.versionInfo.contaoManagerVersion && (
                              <Badge colorPalette="blue" fontSize="xs">
                                Manager: {site.versionInfo.contaoManagerVersion}
                              </Badge>
                            )}
                            {site.versionInfo.phpVersion && (
                              <Badge colorPalette="green" fontSize="xs">
                                PHP: {site.versionInfo.phpVersion}
                              </Badge>
                            )}
                            {site.versionInfo.contaoVersion && (
                              <Badge colorPalette="orange" fontSize="xs">
                                Contao: {site.versionInfo.contaoVersion}
                              </Badge>
                            )}
                          </HStack>
                          {site.versionInfo.lastUpdated && (
                            <Text fontSize="xs" color="gray.500">
                              Updated: {new Date(site.versionInfo.lastUpdated).toLocaleDateString()}
                            </Text>
                          )}
                        </VStack>
                      ) : (
                        <Text fontSize="sm" color="gray.400">
                          No version info
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text color="gray.600">
                        {new Date(site.lastUsed).toLocaleDateString()} {new Date(site.lastUsed).toLocaleTimeString()}
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