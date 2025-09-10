import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Separator,
  Stack,
  Card,
  Grid,
  GridItem,
  Icon,
  Alert,
  Progress
} from '@chakra-ui/react';
import { Button } from '../ui/button';
import { StorageType, StorageInfo } from '../../types/storage';
import { useStorageType } from '../../hooks/useStorageType';
import { useModalState } from '../../hooks/useModalState';
import { StorageSelector } from './StorageSelector';
import { StorageImportExport } from './StorageImportExport';

export interface StorageSettingsProps {
  onSettingsChange?: () => void;
}

/**
 * Storage settings and configuration component
 * Provides comprehensive storage management interface
 */
export const StorageSettings: React.FC<StorageSettingsProps> = ({
  onSettingsChange
}) => {
  const {
    currentStorageType,
    storageState,
    storageInfo,
    availableBackends,
    isLoading,
    error,
    refreshStorageInfo,
    clearConfig,
    getStorageCapabilities
  } = useStorageType();

  const selectorModal = useModalState();
  const clearModal = useModalState();
  const [isClearing, setIsClearing] = useState(false);

  /**
   * Handle storage configuration clear
   */
  const handleClearConfig = async () => {
    setIsClearing(true);
    try {
      const success = await clearConfig();
      if (success) {
        clearModal.close();
        onSettingsChange?.();
      }
    } finally {
      setIsClearing(false);
    }
  };

  /**
   * Format storage size
   */
  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  /**
   * Get storage status color
   */
  const getStorageStatusColor = () => {
    if (!storageState.isAvailable) return 'red';
    if (storageInfo.usagePercentage > 90) return 'red';
    if (storageInfo.usagePercentage > 75) return 'yellow';
    return 'green';
  };

  /**
   * Get privacy level info for current storage
   */
  const getCurrentStorageInfo = () => {
    return availableBackends.find(backend => backend.type === currentStorageType);
  };

  const currentBackend = getCurrentStorageInfo();
  const capabilities = getStorageCapabilities(currentStorageType);

  return (
    <VStack align="stretch" gap={6}>
      {/* Current Storage Status */}
      <Card.Root>
        <Card.Header>
          <Text fontSize="lg" fontWeight="semibold">
            Current Storage Configuration
          </Text>
        </Card.Header>
        <Card.Body>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
            <GridItem>
              <VStack align="start" gap={3}>
                <HStack>
                  <Text fontSize="xl">{currentBackend?.icon}</Text>
                  <Box>
                    <Text fontWeight="medium">{currentBackend?.name}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {currentBackend?.description}
                    </Text>
                  </Box>
                </HStack>

                <HStack gap={4}>
                  <HStack>
                    <Text fontSize="sm" color="fg.muted">Status:</Text>
                    <Badge
                      colorPalette={storageState.isAvailable ? 'green' : 'red'}
                      variant="subtle"
                    >
                      {storageState.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </HStack>
                  
                  {currentBackend && (
                    <HStack>
                      <Text fontSize="sm" color="fg.muted">Privacy:</Text>
                      <Badge
                        colorPalette={
                          currentBackend.privacyLevel === 'high' ? 'green' :
                          currentBackend.privacyLevel === 'medium' ? 'yellow' : 'red'
                        }
                        variant="subtle"
                      >
                        {currentBackend.privacyLevel}
                      </Badge>
                    </HStack>
                  )}
                </HStack>

                {error && (
                  <Alert.Root status="error" size="sm">
                    <Alert.Indicator />
                    <Alert.Title>Storage Error</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Root>
                )}
              </VStack>
            </GridItem>

            <GridItem>
              <VStack align="start" gap={3}>
                <Text fontWeight="medium" fontSize="sm">Storage Usage</Text>
                
                <Box w="full">
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm">
                      {formatStorageSize(storageInfo.usedSpace)} used
                    </Text>
                    {storageInfo.totalSpace && (
                      <Text fontSize="sm" color="fg.muted">
                        of {formatStorageSize(storageInfo.totalSpace)}
                      </Text>
                    )}
                  </HStack>
                  
                  <Progress.Root
                    value={storageInfo.usagePercentage}
                    colorPalette={getStorageStatusColor()}
                    size="sm"
                  >
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    {storageInfo.usagePercentage.toFixed(1)}% used
                  </Text>
                </Box>

                {storageInfo.availableSpace > 0 && (
                  <Text fontSize="sm" color="fg.muted">
                    {formatStorageSize(storageInfo.availableSpace)} available
                  </Text>
                )}
              </VStack>
            </GridItem>
          </Grid>

          <Separator my={4} />

          <HStack gap={4} wrap="wrap">
            {capabilities.canExport && <Badge variant="outline">Export</Badge>}
            {capabilities.canImport && <Badge variant="outline">Import</Badge>}
            {capabilities.canMigrate && <Badge variant="outline">Migration</Badge>}
            {capabilities.supportsBackup && <Badge variant="outline">Backup</Badge>}
            {capabilities.isClientSide && <Badge variant="outline">Client-side</Badge>}
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Storage Actions */}
      <Card.Root>
        <Card.Header>
          <Text fontSize="lg" fontWeight="semibold">
            Storage Management
          </Text>
        </Card.Header>
        <Card.Body>
          <Stack direction={{ base: 'column', md: 'row' }} gap={3}>
            <Button
              variant="outline"
              size="sm"
              onClick={selectorModal.open}
            >
              Change Storage Type
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStorageInfo}
              loading={isLoading}
            >
              Refresh Info
            </Button>
            
            <Button
              variant="outline"
              colorPalette="red"
              size="sm"
              onClick={clearModal.open}
            >
              Clear All Data
            </Button>
          </Stack>
        </Card.Body>
      </Card.Root>

      {/* Import/Export Section */}
      <Card.Root>
        <Card.Header>
          <Text fontSize="lg" fontWeight="semibold">
            Backup & Migration
          </Text>
        </Card.Header>
        <Card.Body>
          <StorageImportExport onOperationComplete={onSettingsChange} />
        </Card.Body>
      </Card.Root>

      {/* Privacy Information for Browser Storage */}
      {currentStorageType === StorageType.BROWSER && (
        <Card.Root variant="subtle" borderColor="green.200">
          <Card.Body>
            <HStack align="start" gap={3}>
              <Icon color="green.500" fontSize="xl">🛡️</Icon>
              <VStack align="start" gap={2}>
                <Text fontWeight="medium" color="green.700">
                  Maximum Privacy Mode
                </Text>
                <Text fontSize="sm" color="green.600">
                  All your site configurations are stored locally in your browser.
                  No data is sent to or stored on any server, ensuring complete privacy
                  and control over your information.
                </Text>
                <HStack gap={4} fontSize="sm" color="green.600">
                  <Text>✓ No server storage</Text>
                  <Text>✓ Complete data control</Text>
                  <Text>✓ Offline functionality</Text>
                </HStack>
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Storage Type Selector Modal */}
      {selectorModal.isOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={1000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
        >
          <Card.Root maxWidth="4xl" maxHeight="90vh" overflow="auto">
            <Card.Header>
              <HStack justify="space-between">
                <Text fontSize="lg" fontWeight="semibold">
                  Change Storage Type
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectorModal.close}
                >
                  ✕
                </Button>
              </HStack>
            </Card.Header>
            <Card.Body>
              <StorageSelector
                onStorageChange={() => {
                  selectorModal.close();
                  onSettingsChange?.();
                }}
                disabledTypes={[currentStorageType]}
              />
            </Card.Body>
          </Card.Root>
        </Box>
      )}

      {/* Clear Configuration Confirmation Modal */}
      {clearModal.isOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={1000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
        >
          <Card.Root maxWidth="md">
            <Card.Header>
              <Text fontSize="lg" fontWeight="semibold" color="red.600">
                Clear All Data
              </Text>
            </Card.Header>
            <Card.Body>
              <VStack align="stretch" gap={4}>
                <Alert.Root status="warning">
                  <Alert.Indicator />
                  <Alert.Title>Warning</Alert.Title>
                  <Alert.Description>
                    This will permanently delete all site configurations, tokens, and settings.
                    This action cannot be undone.
                  </Alert.Description>
                </Alert.Root>

                <Text fontSize="sm" color="fg.muted">
                  Before proceeding, consider exporting your configuration as a backup
                  using the import/export feature above.
                </Text>

                <Stack direction="row" gap={3}>
                  <Button
                    variant="outline"
                    flex={1}
                    onClick={clearModal.close}
                    disabled={isClearing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="solid"
                    colorPalette="red"
                    flex={1}
                    onClick={handleClearConfig}
                    loading={isClearing}
                  >
                    Clear All Data
                  </Button>
                </Stack>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Box>
      )}
    </VStack>
  );
};