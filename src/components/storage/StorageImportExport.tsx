import React, { useState, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Stack,
  Alert,
  Textarea
} from '@chakra-ui/react';
import { Button } from '../ui/button';
import { useStorageType } from '../../hooks/useStorageType';
import { useToastNotifications } from '../../hooks/useToastNotifications';

export interface StorageImportExportProps {
  onOperationComplete?: () => void;
}

/**
 * Import/Export component for storage backup functionality
 * Handles configuration backup and restore operations
 */
export const StorageImportExport: React.FC<StorageImportExportProps> = ({
  onOperationComplete
}) => {
  const {
    exportConfig,
    importConfig,
    currentStorageType,
    storageInfo,
    getStorageCapabilities
  } = useStorageType();

  const toast = useToastNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState('');
  const [showManualImport, setShowManualImport] = useState(false);
  const [exportedData, setExportedData] = useState<string | null>(null);

  const capabilities = getStorageCapabilities(currentStorageType);

  /**
   * Handle configuration export
   */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportConfig();
      if (data) {
        setExportedData(data);
        
        // Also trigger file download
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contao-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.showSuccess('Configuration exported successfully');
        onOperationComplete?.();
      }
    } catch (error) {
      toast.showError('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle file selection for import
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
        setShowManualImport(true);
      };
      reader.readAsText(file);
    }
  };

  /**
   * Handle configuration import
   */
  const handleImport = async () => {
    if (!importData.trim()) {
      toast.showError('Please provide configuration data to import');
      return;
    }

    setIsImporting(true);
    try {
      const success = await importConfig(importData);
      if (success) {
        setImportData('');
        setShowManualImport(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onOperationComplete?.();
      }
    } catch (error) {
      toast.showError('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Clear import data
   */
  const handleClearImport = () => {
    setImportData('');
    setShowManualImport(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Format storage size for display
   */
  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <VStack align="stretch" gap={4}>
      {/* Export Section */}
      {capabilities.canExport && (
        <Box>
          <Text fontWeight="medium" mb={3}>
            Export Configuration
          </Text>
          <VStack align="stretch" gap={3}>
            <Alert.Root status="info" size="sm">
              <Alert.Indicator />
              <Alert.Description>
                Export your current configuration as a backup file. This includes all site
                configurations, settings, and tokens (encrypted where applicable).
              </Alert.Description>
            </Alert.Root>

            <HStack justify="space-between">
              <VStack align="start" gap={1}>
                <Text fontSize="sm" color="fg.muted">
                  Current storage: {formatStorageSize(storageInfo.usedSpace)}
                </Text>
                {storageInfo.totalSpace && (
                  <Text fontSize="xs" color="fg.muted">
                    {storageInfo.usagePercentage.toFixed(1)}% of total space used
                  </Text>
                )}
              </VStack>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                loading={isExporting}
              >
                Export Configuration
              </Button>
            </HStack>

            {exportedData && (
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Exported Configuration Preview:
                </Text>
                <Textarea
                  value={exportedData.substring(0, 500) + (exportedData.length > 500 ? '...' : '')}
                  readOnly
                  rows={8}
                  fontSize="xs"
                  fontFamily="mono"
                  bg="gray.50"
                  resize="vertical"
                />
                <Text fontSize="xs" color="fg.muted" mt={1}>
                  Total size: {exportedData.length} characters
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      )}

      {/* Import Section */}
      {capabilities.canImport && (
        <Box>
          <Text fontWeight="medium" mb={3}>
            Import Configuration
          </Text>
          <VStack align="stretch" gap={3}>
            <Alert.Root status="warning" size="sm">
              <Alert.Indicator />
              <Alert.Description>
                Importing will replace your current configuration. Make sure to export
                your current settings first if you want to keep them.
              </Alert.Description>
            </Alert.Root>

            <Stack direction={{ base: 'column', md: 'row' }} gap={3}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                flex={1}
              >
                Choose Backup File
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualImport(true)}
                flex={1}
              >
                Manual Import
              </Button>
            </Stack>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {showManualImport && (
              <VStack align="stretch" gap={3}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Paste Configuration Data:
                  </Text>
                  <Textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste your exported configuration JSON here..."
                    rows={10}
                    fontSize="sm"
                    fontFamily="mono"
                  />
                </Box>

                <Stack direction="row" gap={3}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearImport}
                    flex={1}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="solid"
                    colorPalette="blue"
                    size="sm"
                    onClick={handleImport}
                    loading={isImporting}
                    disabled={!importData.trim()}
                    flex={1}
                  >
                    Import Configuration
                  </Button>
                </Stack>
              </VStack>
            )}
          </VStack>
        </Box>
      )}

      {/* Backup Recommendations */}
      <Box bg="blue.50" p={4} rounded="md" borderLeft="4px solid" borderLeftColor="blue.500">
        <VStack align="start" gap={2}>
          <Text fontWeight="medium" fontSize="sm" color="blue.700">
            Backup Recommendations
          </Text>
          <VStack align="start" gap={1} fontSize="sm" color="blue.600">
            <Text>• Export your configuration regularly, especially before major changes</Text>
            <Text>• Store backup files securely - they contain sensitive authentication tokens</Text>
            <Text>• Test imports in a separate environment when possible</Text>
            {currentStorageType === 'browser' && (
              <Text>• Browser storage can be cleared by browser settings - keep external backups</Text>
            )}
          </VStack>
        </VStack>
      </Box>

      {!capabilities.canExport && !capabilities.canImport && (
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Description>
            Import/Export functionality is not available for the current storage type.
          </Alert.Description>
        </Alert.Root>
      )}
    </VStack>
  );
};