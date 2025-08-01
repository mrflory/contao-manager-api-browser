import React from 'react';
import { HStack, VStack, Badge, Text } from '@chakra-ui/react';
import { VersionInfo } from '../../types';
import { formatDate } from '../../utils/dateUtils';

export interface VersionBadgesProps {
  versionInfo: VersionInfo;
  layout?: 'horizontal' | 'vertical';
  showLastUpdated?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export const VersionBadges: React.FC<VersionBadgesProps> = ({
  versionInfo,
  layout = 'horizontal',
  showLastUpdated = true,
  size = 'xs',
}) => {
  const Container = layout === 'horizontal' ? HStack : VStack;
  const containerProps = layout === 'horizontal' 
    ? { gap: 2, wrap: 'wrap' as const } 
    : { gap: 1, align: 'start' as const };

  if (!versionInfo) {
    return (
      <Text fontSize="sm" color="gray.400">
        No version info
      </Text>
    );
  }

  return (
    <VStack gap={1} align="start">
      <Container {...containerProps}>
        {versionInfo.contaoManagerVersion && (
          <Badge colorPalette="blue" fontSize={size}>
            Manager: {versionInfo.contaoManagerVersion}
          </Badge>
        )}
        {versionInfo.phpVersion && (
          <Badge colorPalette="green" fontSize={size}>
            PHP: {versionInfo.phpVersion}
          </Badge>
        )}
        {versionInfo.contaoVersion && (
          <Badge colorPalette="orange" fontSize={size}>
            Contao: {versionInfo.contaoVersion}
          </Badge>
        )}
      </Container>
      {showLastUpdated && versionInfo.lastUpdated && (
        <Text fontSize="xs" color="gray.500">
          Updated: {formatDate(versionInfo.lastUpdated)}
        </Text>
      )}
    </VStack>
  );
};

export interface SingleVersionBadgeProps {
  label: string;
  version: string;
  colorPalette?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
  size?: 'xs' | 'sm' | 'md';
}

export const SingleVersionBadge: React.FC<SingleVersionBadgeProps> = ({
  label,
  version,
  colorPalette = 'blue',
  size = 'xs',
}) => {
  return (
    <Badge colorPalette={colorPalette} fontSize={size}>
      {label}: {version}
    </Badge>
  );
};