import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Box,
  Flex,
  Spinner,
  Center,
  VStack,
  HStack,
  Badge,
  useColorModeValue,
  TableContainer,
  Tooltip,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { Config, Site } from '../types';
import { api } from '../utils/api';

const SitesOverview: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

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
          leftIcon={<AddIcon />}
          colorScheme="green"
          onClick={handleAddSite}
        >
          Add New Site
        </Button>
      </Flex>

      {sites.length === 0 ? (
        <Box
          bg={cardBg}
          border="1px"
          borderColor={borderColor}
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
          border="1px"
          borderColor={borderColor}
          borderRadius="lg"
          overflow="hidden"
        >
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Site Name</Th>
                  <Th>URL</Th>
                  <Th>Version Info</Th>
                  <Th>Last Used</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sites.map((site) => (
                  <Tr
                    key={site.url}
                    onClick={() => handleSiteClick(site.url)}
                    cursor="pointer"
                    _hover={{
                      bg: hoverBg
                    }}
                  >
                    <Td>
                      <Text fontWeight="bold">{site.name}</Text>
                    </Td>
                    <Td>
                      <Tooltip label={site.url} placement="top">
                        <Text fontFamily="mono" fontSize="sm" color="gray.600" cursor="help">
                          {extractDomain(site.url)}
                        </Text>
                      </Tooltip>
                    </Td>
                    <Td>
                      {site.versionInfo ? (
                        <VStack spacing={1} align="start">
                          <HStack spacing={2} wrap="wrap">
                            {site.versionInfo.contaoManagerVersion && (
                              <Badge colorScheme="blue" fontSize="xs">
                                Manager: {site.versionInfo.contaoManagerVersion}
                              </Badge>
                            )}
                            {site.versionInfo.phpVersion && (
                              <Badge colorScheme="green" fontSize="xs">
                                PHP: {site.versionInfo.phpVersion}
                              </Badge>
                            )}
                            {site.versionInfo.contaoVersion && (
                              <Badge colorScheme="orange" fontSize="xs">
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
                    </Td>
                    <Td>
                      <Text color="gray.600">
                        {new Date(site.lastUsed).toLocaleDateString()} {new Date(site.lastUsed).toLocaleTimeString()}
                      </Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Container>
  );
};

export default SitesOverview;