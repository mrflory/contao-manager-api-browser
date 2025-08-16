import React from 'react';
import {
  VStack,
  Box,
  Heading,
  Separator,
} from '@chakra-ui/react';
import { DataListRoot, DataListItem } from '../ui/data-list';
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
        
        {site.versionInfo && (
          <>
            <Separator my={6} />
            <Box>
              <Heading size="sm" mb={4}>Version Information</Heading>
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
            </Box>
          </>
        )}
        
        {!site.versionInfo && (
          <>
            <Separator my={6} />
            <Box>
              <Heading size="sm" mb={4}>Version Information</Heading>
              <DataListRoot orientation="horizontal" size="md">
                <DataListItem 
                  label="Status" 
                  value="No version information available. Click 'Update Version Info' to fetch current versions."
                />
              </DataListRoot>
            </Box>
          </>
        )}
      </Box>
    </VStack>
  );
};