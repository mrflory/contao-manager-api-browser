import React from 'react';
import { VStack, HStack, Badge, Text, Box, Icon } from '@chakra-ui/react';
import { LuCheck as Check, LuRefreshCw as RefreshCw } from 'react-icons/lu';
import { VersionInfo } from '../../types';
import { formatDate } from '../../utils/dateUtils';

export interface VersionInfoDisplayProps {
  /** Version information data from the API response */
  versionInfo: VersionInfo;
  /** Size variant for the display */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the last updated timestamp */
  showLastUpdated?: boolean;
}

/**
 * Display component for version information results in workflow timeline
 */
export const VersionInfoDisplay: React.FC<VersionInfoDisplayProps> = ({
  versionInfo,
  size = 'md',
  showLastUpdated = true,
}) => {
  const sizeConfig = {
    sm: {
      textSize: 'xs',
      badgeSize: 'xs',
      iconSize: 12,
      gap: 2,
      padding: 3
    },
    md: {
      textSize: 'sm',
      badgeSize: 'sm', 
      iconSize: 14,
      gap: 3,
      padding: 4
    },
    lg: {
      textSize: 'md',
      badgeSize: 'md',
      iconSize: 16,
      gap: 4,
      padding: 5
    }
  };

  const config = sizeConfig[size];

  // Count how many version components were successfully retrieved
  const versionCount = [
    versionInfo.contaoManagerVersion,
    versionInfo.phpVersion,
    versionInfo.contaoVersion
  ].filter(Boolean).length;

  const hasAnyVersion = versionCount > 0;

  return (
    <Box 
      p={config.padding} 
      bg={hasAnyVersion ? "green.50" : "orange.50"} 
      borderRadius="md" 
      borderLeft="4px solid" 
      borderColor={hasAnyVersion ? "green.500" : "orange.500"}
    >
      <VStack align="start" gap={config.gap}>
        {/* Header with status */}
        <HStack gap={2} align="center">
          <Icon 
            color={hasAnyVersion ? "green.500" : "orange.500"}
          >
            {hasAnyVersion ? <Check size={config.iconSize} /> : <RefreshCw size={config.iconSize} />}
          </Icon>
          <Text 
            fontSize={config.textSize} 
            fontWeight="semibold"
            color={hasAnyVersion ? "green.700" : "orange.700"}
          >
            {hasAnyVersion 
              ? `Version Information Updated (${versionCount}/3 components)` 
              : 'Version Information Update Attempted'
            }
          </Text>
        </HStack>

        {/* Version badges */}
        {hasAnyVersion && (
          <HStack gap={config.gap} align="center" wrap="wrap">
            {versionInfo.contaoManagerVersion && (
              <VStack gap={1} align="start">
                <Text fontSize="xs" color="gray.600" fontWeight="medium">
                  Contao Manager
                </Text>
                <Badge 
                  colorPalette="blue" 
                  fontSize={config.badgeSize}
                  variant="solid"
                >
                  {versionInfo.contaoManagerVersion}
                </Badge>
              </VStack>
            )}

            {versionInfo.phpVersion && (
              <VStack gap={1} align="start">
                <Text fontSize="xs" color="gray.600" fontWeight="medium">
                  PHP Version
                </Text>
                <Badge 
                  colorPalette="green" 
                  fontSize={config.badgeSize}
                  variant="solid"
                >
                  {versionInfo.phpVersion}
                </Badge>
              </VStack>
            )}

            {versionInfo.contaoVersion && (
              <VStack gap={1} align="start">
                <Text fontSize="xs" color="gray.600" fontWeight="medium">
                  Contao Core
                </Text>
                <Badge 
                  colorPalette="orange" 
                  fontSize={config.badgeSize}
                  variant="solid"
                >
                  {versionInfo.contaoVersion}
                </Badge>
              </VStack>
            )}
          </HStack>
        )}

        {/* Missing version info warning */}
        {!versionInfo.contaoManagerVersion && (
          <Text fontSize="xs" color="orange.600">
            • Contao Manager version could not be retrieved
          </Text>
        )}
        {!versionInfo.phpVersion && (
          <Text fontSize="xs" color="orange.600">
            • PHP version information could not be retrieved
          </Text>
        )}
        {!versionInfo.contaoVersion && (
          <Text fontSize="xs" color="orange.600">
            • Contao core version could not be retrieved
          </Text>
        )}

        {/* Last updated timestamp */}
        {showLastUpdated && versionInfo.lastUpdated && (
          <Text fontSize="xs" color="gray.500">
            Updated: {formatDate(versionInfo.lastUpdated)}
          </Text>
        )}

        {/* Status message */}
        <Text fontSize="xs" color="gray.600">
          {hasAnyVersion 
            ? `Successfully retrieved version information for ${versionCount} out of 3 components.`
            : 'Version information could not be retrieved. This may be due to insufficient permissions or server configuration.'
          }
        </Text>
      </VStack>
    </Box>
  );
};