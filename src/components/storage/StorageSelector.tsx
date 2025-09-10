import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Stack,
  Card,
  Spinner
} from '@chakra-ui/react';
import { Radio, RadioGroup } from '../ui/radio';
import { Button } from '../ui/button';
import { 
  StorageType, 
  StorageBackend, 
  StorageMigrationOptions 
} from '../../types/storage';
import { useStorageType } from '../../hooks/useStorageType';

export interface StorageSelectorProps {
  onStorageChange?: (newType: StorageType) => void;
  showMigrationOptions?: boolean;
  allowEmptySelection?: boolean;
  disabledTypes?: StorageType[];
}

/**
 * Storage type selector component with visual backend information
 * Displays available storage backends with their capabilities and status
 */
export const StorageSelector: React.FC<StorageSelectorProps> = ({
  onStorageChange,
  showMigrationOptions = true,
  allowEmptySelection = false,
  disabledTypes = []
}) => {
  const {
    currentStorageType,
    availableBackends,
    isLoading,
    switchStorageType,
    isMigrating,
    migrationProgress
  } = useStorageType();

  const [selectedType, setSelectedType] = useState<StorageType>(currentStorageType);
  const [showConfirmMigration, setShowConfirmMigration] = useState(false);

  /**
   * Handle storage type selection
   */
  const handleStorageSelect = (type: StorageType) => {
    setSelectedType(type);
  };

  /**
   * Apply storage type change with optional migration
   */
  const handleApplyChange = async (migrateData: boolean = true) => {
    if (selectedType === currentStorageType) return;

    const success = await switchStorageType(selectedType, migrateData);
    
    if (success) {
      setShowConfirmMigration(false);
      onStorageChange?.(selectedType);
    }
  };

  /**
   * Get privacy level color
   */
  const getPrivacyLevelColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'green';
      case 'medium': return 'yellow';
      case 'low': return 'red';
      default: return 'gray';
    }
  };

  /**
   * Get availability badge color
   */
  const getAvailabilityColor = (isAvailable: boolean) => {
    return isAvailable ? 'green' : 'red';
  };

  /**
   * Render storage backend card
   */
  const renderBackendCard = (backend: StorageBackend) => {
    const isSelected = selectedType === backend.type;
    const isDisabled = disabledTypes.includes(backend.type) || !backend.isAvailable;
    const isCurrent = currentStorageType === backend.type;

    return (
      <Card.Root
        key={backend.type}
        variant={isSelected ? 'elevated' : 'outline'}
        borderColor={isSelected ? 'blue.500' : undefined}
        borderWidth={isSelected ? '2px' : '1px'}
        opacity={isDisabled ? 0.6 : 1}
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        _hover={!isDisabled ? { borderColor: 'blue.300' } : undefined}
      >
        <Card.Body p={4}>
          <HStack justify="space-between" align="start" mb={3}>
            <HStack>
              <Text fontSize="xl" mr={2}>{backend.icon}</Text>
              <Box>
                <Text fontWeight="semibold" fontSize="md">
                  {backend.name}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {backend.description}
                </Text>
              </Box>
            </HStack>
            <VStack align="end" gap={1}>
              <Badge
                colorPalette={getAvailabilityColor(backend.isAvailable)}
                variant="subtle"
                size="sm"
              >
                {backend.isAvailable ? 'Available' : 'Unavailable'}
              </Badge>
              {isCurrent && (
                <Badge colorPalette="blue" variant="solid" size="sm">
                  Current
                </Badge>
              )}
            </VStack>
          </HStack>

          <HStack gap={4} mb={3} wrap="wrap">
            <HStack>
              <Text fontSize="sm" color="fg.muted">Privacy:</Text>
              <Badge
                colorPalette={getPrivacyLevelColor(backend.privacyLevel)}
                variant="subtle"
                size="sm"
              >
                {backend.privacyLevel}
              </Badge>
            </HStack>
            
            <HStack>
              <Text fontSize="sm" color="fg.muted">Network:</Text>
              <Text fontSize="sm">
                {backend.networkRequired ? 'Required' : 'Not required'}
              </Text>
            </HStack>
          </HStack>

          <HStack gap={2} mb={2} wrap="wrap">
            {backend.capabilities.canExport && (
              <Badge variant="outline" size="sm">Export</Badge>
            )}
            {backend.capabilities.canImport && (
              <Badge variant="outline" size="sm">Import</Badge>
            )}
            {backend.capabilities.canMigrate && (
              <Badge variant="outline" size="sm">Migration</Badge>
            )}
            {backend.capabilities.supportsBackup && (
              <Badge variant="outline" size="sm">Backup</Badge>
            )}
            {backend.capabilities.isClientSide && (
              <Badge variant="outline" size="sm">Client-side</Badge>
            )}
          </HStack>

          {backend.capabilities.maxStorageSize && (
            <Text fontSize="xs" color="fg.muted">
              Max size: {Math.round(backend.capabilities.maxStorageSize / 1024 / 1024)}MB
            </Text>
          )}
        </Card.Body>
      </Card.Root>
    );
  };

  if (isLoading) {
    return (
      <VStack p={6}>
        <Spinner size="lg" />
        <Text>Loading storage options...</Text>
      </VStack>
    );
  }

  const hasSelectionChanged = selectedType !== currentStorageType;

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={2}>
          Select Storage Type
        </Text>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          Choose where your site configurations and data should be stored.
        </Text>
      </Box>

      <RadioGroup
        value={selectedType}
        onValueChange={(details) => handleStorageSelect(details.value as StorageType)}
        disabled={isMigrating}
      >
        <VStack align="stretch" gap={3}>
          {availableBackends.map((backend) => (
            <Box key={backend.type} position="relative">
              <Radio
                value={backend.type}
                disabled={disabledTypes.includes(backend.type) || !backend.isAvailable}
                position="absolute"
                top={4}
                left={4}
                zIndex={1}
              />
              <Box
                ml={10}
                onClick={() => 
                  !disabledTypes.includes(backend.type) && 
                  backend.isAvailable && 
                  !isMigrating &&
                  handleStorageSelect(backend.type)
                }
              >
                {renderBackendCard(backend)}
              </Box>
            </Box>
          ))}
        </VStack>
      </RadioGroup>

      {hasSelectionChanged && showMigrationOptions && (
        <Card.Root variant="subtle" borderColor="blue.200">
          <Card.Body>
            <VStack align="stretch" gap={3}>
              <Text fontWeight="medium" fontSize="sm">
                Storage Migration Options
              </Text>
              
              {isMigrating ? (
                <VStack gap={2}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm">Migration in progress...</Text>
                    <Text fontSize="sm">{Math.round(migrationProgress)}%</Text>
                  </HStack>
                  <Box w="full" bg="gray.200" rounded="full" h={2}>
                    <Box
                      bg="blue.500"
                      h="full"
                      rounded="full"
                      transition="width 0.2s"
                      w={`${migrationProgress}%`}
                    />
                  </Box>
                </VStack>
              ) : (
                <Stack direction={{ base: 'column', md: 'row' }} gap={2}>
                  <Button
                    variant="solid"
                    colorPalette="blue"
                    size="sm"
                    flex={1}
                    onClick={() => handleApplyChange(true)}
                  >
                    Switch & Migrate Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    flex={1}
                    onClick={() => handleApplyChange(false)}
                  >
                    Switch Without Data
                  </Button>
                </Stack>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      {currentStorageType && (
        <Box p={3} bg="blue.50" rounded="md" borderLeft="4px solid" borderLeftColor="blue.500">
          <HStack>
            <Icon color="blue.500">ℹ️</Icon>
            <Text fontSize="sm">
              <strong>Current storage:</strong>{' '}
              {availableBackends.find(b => b.type === currentStorageType)?.name || currentStorageType}
              {currentStorageType === StorageType.BROWSER && (
                <Text as="span" color="green.600" ml={2}>
                  (All data stays in your browser for complete privacy)
                </Text>
              )}
            </Text>
          </HStack>
        </Box>
      )}
    </VStack>
  );
};