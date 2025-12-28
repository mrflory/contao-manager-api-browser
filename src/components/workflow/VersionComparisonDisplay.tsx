import React from 'react';
import { VStack, HStack, Badge, Text, Box, Icon } from '@chakra-ui/react';
import { LuArrowRight as ArrowRight, LuCheck as Check } from 'react-icons/lu';
import { VersionInfoResult } from '../../types/api';

export interface VersionComparisonDisplayProps {
  /** Version information before the update */
  before: VersionInfoResult;
  /** Version information after the update */
  after: VersionInfoResult;
  /** Size variant for the display */
  size?: 'sm' | 'md' | 'lg';
}

interface VersionChangeProps {
  label: string;
  before?: string | null;
  after?: string | null;
  colorPalette: string;
  size: 'xs' | 'sm' | 'md';
}

const VersionChange: React.FC<VersionChangeProps> = ({
  label,
  before,
  after,
  colorPalette,
  size
}) => {
  const hasChanged = before !== after;
  const hasValue = before || after;

  if (!hasValue) {
    return null;
  }

  return (
    <VStack gap={1} align="start">
      <Text fontSize="xs" color="gray.600" fontWeight="medium">
        {label}
      </Text>
      <HStack gap={2} align="center">
        {before && (
          <Badge
            colorPalette={hasChanged ? "gray" : colorPalette}
            fontSize={size}
            variant={hasChanged ? "outline" : "solid"}
          >
            {before}
          </Badge>
        )}
        {hasChanged && before && after && (
          <Icon color="gray.500">
            <ArrowRight size={14} />
          </Icon>
        )}
        {hasChanged && after && (
          <Badge
            colorPalette={colorPalette}
            fontSize={size}
            variant="solid"
          >
            {after}
          </Badge>
        )}
      </HStack>
    </VStack>
  );
};

/**
 * Display component for comparing version information before and after an update
 */
export const VersionComparisonDisplay: React.FC<VersionComparisonDisplayProps> = ({
  before,
  after,
  size = 'md',
}) => {
  const sizeConfig = {
    sm: {
      textSize: 'xs' as const,
      badgeSize: 'xs' as const,
      iconSize: 12,
      gap: 2,
      padding: 3
    },
    md: {
      textSize: 'sm' as const,
      badgeSize: 'sm' as const,
      iconSize: 14,
      gap: 3,
      padding: 4
    },
    lg: {
      textSize: 'md' as const,
      badgeSize: 'md' as const,
      iconSize: 16,
      gap: 4,
      padding: 5
    }
  };

  const config = sizeConfig[size];

  // Detect changes
  const hasContaoChange = before.contaoVersion !== after.contaoVersion;
  const hasManagerChange = before.contaoManagerVersion !== after.contaoManagerVersion;
  const hasPhpChange = before.phpVersion !== after.phpVersion;
  const hasAnyChange = hasContaoChange || hasManagerChange || hasPhpChange;

  return (
    <Box
      p={config.padding}
      bg={hasAnyChange ? "blue.50" : "gray.50"}
      borderRadius="md"
      borderLeft="4px solid"
      borderColor={hasAnyChange ? "blue.500" : "gray.400"}
    >
      <VStack align="start" gap={config.gap}>
        {/* Header with status */}
        <HStack gap={2} align="center">
          <Icon color={hasAnyChange ? "blue.500" : "gray.500"}>
            <Check size={config.iconSize} />
          </Icon>
          <Text
            fontSize={config.textSize}
            fontWeight="semibold"
            color={hasAnyChange ? "blue.700" : "gray.700"}
          >
            {hasAnyChange
              ? 'Version Changes Detected'
              : 'No Version Changes'}
          </Text>
        </HStack>

        {/* Version comparisons */}
        <HStack gap={config.gap} align="start" wrap="wrap">
          <VersionChange
            label="Contao Manager"
            before={before.contaoManagerVersion}
            after={after.contaoManagerVersion}
            colorPalette="blue"
            size={config.badgeSize}
          />

          <VersionChange
            label="PHP Version"
            before={before.phpVersion}
            after={after.phpVersion}
            colorPalette="green"
            size={config.badgeSize}
          />

          <VersionChange
            label="Contao Core"
            before={before.contaoVersion}
            after={after.contaoVersion}
            colorPalette="orange"
            size={config.badgeSize}
          />
        </HStack>

        {/* Summary text */}
        <Text fontSize="xs" color="gray.600">
          {hasAnyChange
            ? 'The versions above show changes that occurred during the update workflow.'
            : 'All version components remained unchanged during this workflow.'}
        </Text>
      </VStack>
    </Box>
  );
};
