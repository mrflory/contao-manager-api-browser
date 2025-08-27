import React from 'react';
import { HStack, VStack, Badge, Text, Box, Icon } from '@chakra-ui/react';
import { LuCheck as Check, LuArrowRight as ArrowRight, LuTriangle as Triangle } from 'react-icons/lu';

export interface ManagerVersionComparisonProps {
  currentVersion: string;
  latestVersion: string;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ManagerVersionComparison: React.FC<ManagerVersionComparisonProps> = ({
  currentVersion,
  latestVersion,
  showStatus = true,
  size = 'md'
}) => {
  const needsUpdate = currentVersion !== latestVersion;
  
  const sizeConfig = {
    sm: {
      textSize: 'xs',
      badgeSize: 'xs',
      iconSize: 12,
      gap: 2
    },
    md: {
      textSize: 'sm',
      badgeSize: 'sm', 
      iconSize: 16,
      gap: 3
    },
    lg: {
      textSize: 'md',
      badgeSize: 'md',
      iconSize: 20,
      gap: 4
    }
  };

  const config = sizeConfig[size];

  return (
    <Box 
      p={4} 
      bg={needsUpdate ? "orange.50" : "green.50"} 
      borderRadius="md" 
      borderLeft="4px solid" 
      borderColor={needsUpdate ? "orange.500" : "green.500"}
    >
      <VStack align="start" gap={config.gap}>
        {/* Header with status */}
        {showStatus && (
          <HStack gap={2} align="center">
            <Icon 
              color={needsUpdate ? "orange.500" : "green.500"}
            >
              {needsUpdate ? <Triangle size={config.iconSize} /> : <Check size={config.iconSize} />}
            </Icon>
            <Text 
              fontSize={config.textSize} 
              fontWeight="semibold"
              color={needsUpdate ? "orange.700" : "green.700"}
            >
              {needsUpdate ? 'Manager Update Available' : 'Manager Up to Date'}
            </Text>
          </HStack>
        )}

        {/* Version comparison */}
        <HStack gap={config.gap} align="center" wrap="wrap">
          <VStack gap={1} align="start">
            <Text fontSize="xs" color="gray.600" fontWeight="medium">
              Current Version
            </Text>
            <Badge 
              colorPalette="blue" 
              fontSize={config.badgeSize}
              variant="solid"
            >
              {currentVersion}
            </Badge>
          </VStack>

          {needsUpdate && (
            <>
              <Icon color="gray.400">
                <ArrowRight size={config.iconSize} />
              </Icon>
              <VStack gap={1} align="start">
                <Text fontSize="xs" color="gray.600" fontWeight="medium">
                  Latest Version
                </Text>
                <Badge 
                  colorPalette="green" 
                  fontSize={config.badgeSize}
                  variant="solid"
                >
                  {latestVersion}
                </Badge>
              </VStack>
            </>
          )}
        </HStack>

        {/* Status message */}
        <Text fontSize="xs" color="gray.600">
          {needsUpdate 
            ? 'A newer version of Contao Manager is available for installation.'
            : 'You are running the latest version of Contao Manager.'
          }
        </Text>
      </VStack>
    </Box>
  );
};