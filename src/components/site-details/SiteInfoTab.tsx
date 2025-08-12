import React from 'react';
import {
  VStack,
  Box,
  Heading,
  Text,
  Code,
  Separator,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { Site } from '../../types';
import { formatDateTime } from '../../utils/dateUtils';

export interface SiteInfoTabProps {
  site: Site;
}

export const SiteInfoTab: React.FC<SiteInfoTabProps> = ({ site }) => {
  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="lg" mb={4}>Site Information</Heading>
        
        <VStack gap={4} align="start">
          <VStack gap={2} align="start" width="100%">
            <Text fontSize="sm">
              <strong>Last Used:</strong> {formatDateTime(site.lastUsed)}
            </Text>
            <Text fontSize="sm">
              <strong>Token:</strong> <Code>{site.token.substring(0, 8)}...</Code>
            </Text>
          </VStack>
          
          {site.versionInfo && (
            <>
              <Separator />
              <VStack gap={2} align="start" width="100%">
                <Heading size="sm">Version Information</Heading>
                <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2} width="100%">
                  <GridItem>
                    <Text fontSize="sm">
                      <strong>Contao Manager:</strong> {site.versionInfo.contaoManagerVersion || 'N/A'}
                    </Text>
                  </GridItem>
                  <GridItem>
                    <Text fontSize="sm">
                      <strong>PHP:</strong> {site.versionInfo.phpVersion || 'N/A'}
                    </Text>
                  </GridItem>
                  <GridItem>
                    <Text fontSize="sm">
                      <strong>Contao:</strong> {site.versionInfo.contaoVersion || 'N/A'}
                    </Text>
                  </GridItem>
                </Grid>
                {site.versionInfo.lastUpdated && (
                  <Text fontSize="xs" color="gray.500">
                    <strong>Last Updated:</strong> {formatDateTime(site.versionInfo.lastUpdated)}
                  </Text>
                )}
              </VStack>
            </>
          )}
          
          {!site.versionInfo && (
            <>
              <Separator />
              <VStack gap={2} align="start" width="100%">
                <Heading size="sm">Version Information</Heading>
                <Text fontSize="sm" color="gray.500">
                  No version information available. Click "Update Version Info" to fetch current versions.
                </Text>
              </VStack>
            </>
          )}
        </VStack>
      </Box>
    </VStack>
  );
};