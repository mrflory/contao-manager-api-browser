import React, { useState, useEffect } from 'react';
import {
  VStack,
  Box,
  Text,
  Badge,
  Table,
  Alert,
  Link,
  Tabs,
  Button,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { LuDownload as Download, LuCopy as Copy } from 'react-icons/lu';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogCloseTrigger,
} from './dialog';
import { useApiCall } from '../../hooks/useApiCall';
import { HistoryApiService } from '../../services/apiCallService';
import { LoadingState } from '../display/LoadingState';
import { 
  parseComposerFile, 
  sortComposerPackages, 
  getPackageTypeColorPalette,
  type ComposerPackage,
  type ParsedComposerData
} from '../../utils/composerParser';
import { useToastNotifications } from '../../hooks/useToastNotifications';

interface ComposerFilesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotId: string;
  title?: string;
}

export const ComposerFilesDialog: React.FC<ComposerFilesDialogProps> = ({
  isOpen,
  onClose,
  snapshotId,
  title = 'Composer Files'
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'lock'>('json');
  const [composerJsonData, setComposerJsonData] = useState<ParsedComposerData | null>(null);
  const [composerLockData, setComposerLockData] = useState<ParsedComposerData | null>(null);
  const [rawJsonContent, setRawJsonContent] = useState<string>('');
  const [rawLockContent, setRawLockContent] = useState<string>('');
  
  const toast = useToastNotifications();

  const loadComposerJson = useApiCall(
    () => HistoryApiService.getSnapshotFileContent(snapshotId, 'composer.json'),
    {
      onSuccess: (data: unknown) => {
        const content = data as string;
        setRawJsonContent(content);
        try {
          const parsed = parseComposerFile('composer.json', content);
          setComposerJsonData(parsed);
        } catch (error) {
          console.error('Failed to parse composer.json:', error);
          toast.showError({ title: 'Failed to parse composer.json file' });
        }
      },
      showErrorToast: false // Handle errors manually
    }
  );

  const loadComposerLock = useApiCall(
    () => HistoryApiService.getSnapshotFileContent(snapshotId, 'composer.lock'),
    {
      onSuccess: (data: unknown) => {
        const content = data as string;
        setRawLockContent(content);
        try {
          const parsed = parseComposerFile('composer.lock', content);
          setComposerLockData(parsed);
        } catch (error) {
          console.error('Failed to parse composer.lock:', error);
          toast.showError({ title: 'Failed to parse composer.lock file' });
        }
      },
      showErrorToast: false // Handle errors manually
    }
  );

  useEffect(() => {
    if (isOpen && snapshotId) {
      loadComposerJson.execute();
      loadComposerLock.execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, snapshotId]);

  const handleDownload = async (filename: 'composer.json' | 'composer.lock') => {
    try {
      const blob = await HistoryApiService.downloadSnapshot(snapshotId, filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.showSuccess({ title: `Downloaded ${filename}` });
    } catch (error) {
      console.error(`Failed to download ${filename}:`, error);
      toast.showError({ title: `Failed to download ${filename}` });
    }
  };

  const handleCopyToClipboard = (content: string, filename: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.showSuccess({ title: `Copied ${filename} to clipboard` });
    }).catch(() => {
      toast.showError({ title: `Failed to copy ${filename} to clipboard` });
    });
  };

  const renderPackageTable = (packages: ComposerPackage[], title: string) => {
    if (packages.length === 0) {
      return (
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>No {title.toLowerCase()} found</Alert.Title>
            <Alert.Description>
              No {title.toLowerCase()} packages are defined in this file.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      );
    }

    const sortedPackages = sortComposerPackages(packages);

    return (
      <VStack gap={4} align="stretch">
        <Text fontSize="md" color="gray.600">
          Found {packages.length} {title.toLowerCase()} package{packages.length !== 1 ? 's' : ''}:
        </Text>
        <Box maxH="400px" overflowY="auto">
          <Table.Root variant="outline" size="sm">
            <Table.Header position="sticky" top={0}>
              <Table.Row>
                <Table.ColumnHeader>Package Name</Table.ColumnHeader>
                <Table.ColumnHeader>Version</Table.ColumnHeader>
                <Table.ColumnHeader>Type</Table.ColumnHeader>
                <Table.ColumnHeader>Description</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortedPackages.map((pkg) => (
                <Table.Row key={pkg.name}>
                  <Table.Cell>
                    <Link 
                      href={`https://packagist.org/packages/${pkg.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      fontSize="sm" 
                      fontFamily="mono"
                      color="blue.500"
                      _hover={{ color: "blue.600", textDecoration: "underline" }}
                    >
                      {pkg.name}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette="blue" fontSize="xs">{pkg.version}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge 
                      colorPalette={getPackageTypeColorPalette(pkg.type)} 
                      fontSize="xs"
                    >
                      {pkg.type || 'library'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="xs" lineClamp={2}>
                      {pkg.description || 'No description available'}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </VStack>
    );
  };

  const renderTabContent = (fileType: 'json' | 'lock') => {
    const isJson = fileType === 'json';
    const loadState = isJson ? loadComposerJson.state : loadComposerLock.state;
    const data = isJson ? composerJsonData : composerLockData;
    const rawContent = isJson ? rawJsonContent : rawLockContent;
    const filename = isJson ? 'composer.json' : 'composer.lock';

    if (loadState.loading) {
      return <LoadingState message={`Loading ${filename}...`} />;
    }

    if (loadState.error) {
      return (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Failed to load {filename}</Alert.Title>
            <Alert.Description>
              {loadState.error}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      );
    }

    if (!data) {
      return (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>No data available</Alert.Title>
            <Alert.Description>
              {filename} could not be parsed or contains no package information.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      );
    }

    return (
      <VStack gap={6} align="stretch">
        {/* Action buttons */}
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="semibold">{filename}</Text>
          <HStack gap={2}>
            <IconButton
              variant="outline"
              size="sm"
              onClick={() => handleCopyToClipboard(rawContent, filename)}
              title={`Copy ${filename} to clipboard`}
            >
              <Copy size={16} />
            </IconButton>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(filename)}
            >
              <Download size={16} />
              Download
            </Button>
          </HStack>
        </HStack>

        {/* Production packages */}
        {data.packages.length > 0 && (
          <Box>
            <Text fontSize="md" fontWeight="medium" mb={3}>Production Packages</Text>
            {renderPackageTable(data.packages, 'Production')}
          </Box>
        )}

        {/* Development packages */}
        {data.devPackages.length > 0 && (
          <Box>
            <Text fontSize="md" fontWeight="medium" mb={3}>Development Packages</Text>
            {renderPackageTable(data.devPackages, 'Development')}
          </Box>
        )}

        {/* Summary */}
        <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.600">
              <strong>Total:</strong> {data.totalCount} packages
            </Text>
            <HStack gap={4}>
              <Text fontSize="sm" color="gray.600">
                <strong>Production:</strong> {data.packages.length}
              </Text>
              <Text fontSize="sm" color="gray.600">
                <strong>Development:</strong> {data.devPackages.length}
              </Text>
            </HStack>
          </HStack>
        </Box>
      </VStack>
    );
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={({ open }) => !open && onClose()}>
      <DialogContent maxW="6xl" maxH="80vh">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody overflowY="auto" maxH="calc(80vh - 120px)">
          <Tabs.Root 
            colorPalette="blue" 
            variant="line" 
            value={activeTab} 
            onValueChange={({ value }) => setActiveTab(value as 'json' | 'lock')}
          >
            <Tabs.List>
              <Tabs.Trigger value="json">composer.json</Tabs.Trigger>
              <Tabs.Trigger value="lock">composer.lock</Tabs.Trigger>
            </Tabs.List>

            <Box mt={6}>
              <Tabs.Content value="json">
                {renderTabContent('json')}
              </Tabs.Content>

              <Tabs.Content value="lock">
                {renderTabContent('lock')}
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};