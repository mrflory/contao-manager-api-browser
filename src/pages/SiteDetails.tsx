import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  Button,
  Box,
  Flex,
  Text,
  Badge,
  VStack,
  HStack,
  Spinner,
  Center,
  Grid,
  GridItem,
  Divider,
  Code,
  useColorModeValue,
  useToast,
  DialogRoot,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogCloseTrigger,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Input,
  FormControl,
  FormLabel,
  Checkbox,
  Select,
  Textarea,
  Table,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Editable,
  EditableInput,
  EditableTextarea,
  EditablePreview,
  useEditableControls,
  ButtonGroup,
  IconButton,
  Link,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  Trash2,
  Settings,
  Edit,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { Config, UpdateStatus, TokenInfo } from '../types';
import { api } from '../utils/api';
import { UpdateWorkflow } from '../components/UpdateWorkflow';

const SiteDetails: React.FC = () => {
  const { siteUrl } = useParams<{ siteUrl: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingButton, setLoadingButton] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [reauthScope, setReauthScope] = useState('admin');
  const [showReauthForm, setShowReauthForm] = useState(false);
  const [migrationFormData, setMigrationFormData] = useState({
    hash: '',
    type: '',
    withDeletes: false
  });
  const cancelRef = useRef<HTMLButtonElement>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    // Check for token from reauthentication OAuth redirect
    const hash = window.location.hash;
    if (hash.includes('access_token=') && hash.includes('reauth=true')) {
      const hashParams = hash.substring(1);
      const params = new URLSearchParams(hashParams);
      const extractedToken = params.get('access_token');
      
      if (extractedToken) {
        handleReauthTokenSave(extractedToken);
      }
      
      // Clear the hash
      window.location.hash = '';
    }
  }, [config]); // Run when config changes (site data is available)

  const loadConfig = async () => {
    try {
      const configData = await api.getConfig();
      setConfig(configData);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!site) return;
    setLogsLoading(true);
    try {
      const logsData = await api.getLogs(site.url);
      setLogs(logsData.logs);
      setLogsTotal(logsData.total);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast({
        title: 'Error',
        description: `Failed to load logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const handleReauthenticate = () => {
    setShowReauthForm(true);
  };

  const handleReauthSubmit = async () => {
    if (!site) return;
    
    setLoadingButton('reauthenticate');
    
    try {
      const clientId = 'Contao Manager API Browser';
      const currentPath = window.location.pathname;
      const redirectUri = `${window.location.origin}${currentPath}#reauth=true&token`;
      
      const oauthUrl = `${site.url}/#oauth?` + new URLSearchParams({
        response_type: 'token',
        scope: reauthScope,
        client_id: clientId,
        redirect_uri: redirectUri
      }).toString();
      
      toast({
        title: 'Redirecting',
        description: 'Redirecting to Contao Manager for reauthentication...',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      // Store site URL for reauthentication
      localStorage.setItem('reauthSiteUrl', site.url);
      
      setTimeout(() => {
        window.location.href = oauthUrl;
      }, 1000);
      
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setLoadingButton(null);
    }
  };

  const handleReauthTokenSave = async (token: string) => {
    const siteUrl = localStorage.getItem('reauthSiteUrl');
    if (!siteUrl) {
      toast({
        title: 'Error',
        description: 'Site URL not found. Please try reauthenticating again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setLoadingButton('saving-reauth-token');
    
    try {
      const response = await api.saveToken(token, siteUrl);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Site reauthenticated successfully! New token saved.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Reload config to get updated token info
        await loadConfig();
        setShowReauthForm(false);
        
        // Clear stored URL
        localStorage.removeItem('reauthSiteUrl');
      } else {
        throw new Error(response.error || 'Failed to save new token');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error saving new token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingButton(null);
    }
  };

  const decodedSiteUrl = decodeURIComponent(siteUrl || '');
  const site = config?.sites?.[decodedSiteUrl];

  const showModal = (title: string, content: React.ReactNode) => {
    setModalTitle(title);
    setModalContent(content);
    setIsOpen(true);
  };

  const onClose = () => setIsOpen(false);
  const onMigrationModalOpen = () => setIsMigrationModalOpen(true);
  const onMigrationModalClose = () => setIsMigrationModalOpen(false);
  const onRemoveDialogOpen = () => setIsRemoveDialogOpen(true);
  const onRemoveDialogClose = () => setIsRemoveDialogOpen(false);

  const handleUpdateStatus = async () => {
    setLoadingButton('update-status');
    try {
      const data = await api.getUpdateStatus();
      
      const formatUpdateInfo = (data: UpdateStatus) => {
        return (
          <VStack spacing={4} align="stretch">
            {data.composer && (
              <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
                <Heading size="md" mb={3}>Composer Status</Heading>
                {data.composer.current_version && data.composer.latest_version ? (
                  <VStack spacing={2} align="start">
                    <Text><strong>Current Version:</strong> {data.composer.current_version}</Text>
                    <Text><strong>Latest Version:</strong> {data.composer.latest_version}</Text>
                    {data.composer.current_version !== data.composer.latest_version ? (
                      <Badge colorPalette="orange">Update Available!</Badge>
                    ) : (
                      <Badge colorPalette="green">Up to Date</Badge>
                    )}
                  </VStack>
                ) : null}
                <Accordion allowToggle mt={4}>
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        Show full response
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <Code display="block" whiteSpace="pre" p={3} borderRadius="md">
                        {JSON.stringify(data.composer, null, 2)}
                      </Code>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </Box>
            )}
            
            {data.selfUpdate && (
              <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
                <Heading size="md" mb={3}>Self-Update Status</Heading>
                {data.selfUpdate.current_version && data.selfUpdate.latest_version ? (
                  <VStack spacing={2} align="start">
                    <Text><strong>Current Version:</strong> {data.selfUpdate.current_version}</Text>
                    <Text><strong>Latest Version:</strong> {data.selfUpdate.latest_version}</Text>
                    {data.selfUpdate.current_version !== data.selfUpdate.latest_version ? (
                      <Badge colorPalette="orange">Update Available!</Badge>
                    ) : (
                      <Badge colorPalette="green">Up to Date</Badge>
                    )}
                  </VStack>
                ) : null}
                <Accordion allowToggle mt={4}>
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        Show full response
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <Code display="block" whiteSpace="pre" p={3} borderRadius="md">
                        {JSON.stringify(data.selfUpdate, null, 2)}
                      </Code>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </Box>
            )}

            {data.errors && Object.keys(data.errors).length > 0 && (
              <Alert status="error">
                <AlertIcon />
                <Box>
                  <AlertTitle>Errors!</AlertTitle>
                  <AlertDescription>
                    {data.errors.composer && (
                      <Text><strong>Composer:</strong> {data.errors.composer}</Text>
                    )}
                    {data.errors.selfUpdate && (
                      <Text><strong>Self-Update:</strong> {data.errors.selfUpdate}</Text>
                    )}
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </VStack>
        );
      };

      showModal('Update Status', formatUpdateInfo(data));
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error getting update status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingButton(null);
    }
  };

  const handleApiCall = async (apiCall: () => Promise<any>, title: string, formatResponse?: (data: any) => React.ReactNode) => {
    setLoadingButton('api-call');
    try {
      const data = await apiCall();
      
      const content = formatResponse ? formatResponse(data) : (
        <Code display="block" whiteSpace="pre" p={3} borderRadius="md">
          {JSON.stringify(data, null, 2)}
        </Code>
      );

      showModal(title, content);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error calling ${title}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingButton(null);
    }
  };

  const handleApiCallWithButton = async (buttonId: string, apiCall: () => Promise<any>, title: string, formatResponse?: (data: any) => React.ReactNode) => {
    setLoadingButton(buttonId);
    try {
      const data = await apiCall();
      
      const content = formatResponse ? formatResponse(data) : (
        <Code display="block" whiteSpace="pre" p={3} borderRadius="md">
          {JSON.stringify(data, null, 2)}
        </Code>
      );

      showModal(title, content);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error calling ${title}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingButton(null);
    }
  };

  const handleStartDatabaseMigration = () => {
    // Reset form data when opening
    setMigrationFormData({
      hash: '',
      type: '',
      withDeletes: false
    });

    const migrationForm = (
      <VStack spacing={4} align="stretch">
        <Text fontSize="md" color="gray.600" mb={2}>
          Configure database migration parameters:
        </Text>
        <FormControl>
          <FormLabel>Migration Hash (optional)</FormLabel>
          <Input
            value={migrationFormData.hash}
            onChange={(e) => setMigrationFormData(prev => ({ ...prev, hash: e.target.value }))}
            placeholder="Leave empty for dry-run to get pending migrations"
          />
        </FormControl>
        
        <FormControl>
          <FormLabel>Migration Type</FormLabel>
          <Select 
            value={migrationFormData.type}
            onChange={(e) => setMigrationFormData(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="">All migrations and schema updates</option>
            <option value="migrations-only">Migrations only</option>
            <option value="schema-only">Schema updates only</option>
          </Select>
        </FormControl>

        <FormControl>
          <Checkbox 
            isChecked={migrationFormData.withDeletes}
            onChange={(e) => setMigrationFormData(prev => ({ ...prev, withDeletes: e.target.checked }))}
          >
            Execute migrations including DROP queries
          </Checkbox>
        </FormControl>

        <Button
          colorPalette="orange"
          onClick={async () => {
            const payload: any = {};
            if (migrationFormData.hash) payload.hash = migrationFormData.hash;
            if (migrationFormData.type) payload.type = migrationFormData.type;
            if (migrationFormData.withDeletes) payload.withDeletes = migrationFormData.withDeletes;
            
            onMigrationModalClose();
            await handleApiCallWithButton('start-migration', () => api.startDatabaseMigration(payload), 'Start Database Migration');
          }}
        >
          Start Migration
        </Button>
      </VStack>
    );

    setModalTitle('Start Database Migration');
    setModalContent(migrationForm);
    onMigrationModalOpen();
  };

  const handleTokenInfo = async () => {
    const formatTokenInfo = (data: { success: boolean; tokenInfo: TokenInfo; error?: string }) => {
      if (!data.success) {
        return (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Error!</AlertTitle>
            <AlertDescription>
              {data.error || 'Failed to get token info'}
            </AlertDescription>
          </Alert>
        );
      }

      const tokenInfo = data.tokenInfo;
      const scopeOrder = ['read', 'update', 'install', 'admin'];
      const currentLevel = scopeOrder.indexOf(tokenInfo.scope);

      return (
        <VStack spacing={4} align="stretch">
          <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
            <Heading size="md" mb={3}>🔑 Token Information</Heading>
            <VStack spacing={2} align="start">
              {tokenInfo.scope && (
                <Text><strong>Current Scope:</strong> <Badge colorPalette="blue">{tokenInfo.scope}</Badge></Text>
              )}
              {tokenInfo.username && (
                <Text><strong>Username:</strong> {tokenInfo.username}</Text>
              )}
              {tokenInfo.totp_enabled !== undefined && (
                <Text><strong>TOTP Enabled:</strong> {tokenInfo.totp_enabled ? 'Yes' : 'No'}</Text>
              )}
            </VStack>
            <Accordion allowToggle mt={4}>
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    Show full token info
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Code display="block" whiteSpace="pre" p={3} borderRadius="md">
                    {JSON.stringify(tokenInfo, null, 2)}
                  </Code>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>

          <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
            <Heading size="sm" mb={3}>Required Scopes</Heading>
            <VStack spacing={2} align="start">
              <Text><strong>Read operations:</strong> "read" or higher</Text>
              <Text><strong>Update operations:</strong> "update" or higher</Text>
              <Text><strong>Install operations:</strong> "install" or higher</Text>
              <Text><strong>Admin operations:</strong> "admin"</Text>
            </VStack>
          </Box>

          {currentLevel >= 0 && (
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>Analysis: Your "{tokenInfo.scope}" scope allows:</AlertTitle>
                <VStack spacing={1} align="start" mt={2}>
                  <Text>{currentLevel >= 0 ? '✅' : '❌'} Read operations</Text>
                  <Text>{currentLevel >= 1 ? '✅' : '❌'} Update operations</Text>
                  <Text>{currentLevel >= 2 ? '✅' : '❌'} Install operations</Text>
                  <Text>{currentLevel >= 3 ? '✅' : '❌'} Admin operations</Text>
                </VStack>
              </Box>
            </Alert>
          )}
        </VStack>
      );
    };

    await handleApiCallWithButton('token-info', api.getTokenInfo, 'Token Information', formatTokenInfo);
  };

  const handleUpdateVersionInfo = async () => {
    setLoadingButton('update-version-info');
    try {
      const data = await api.updateVersionInfo();
      
      if (data.success) {
        // Reload config to get updated version info
        await loadConfig();
        
        toast({
          title: 'Success',
          description: 'Version information updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        const formatVersionInfo = (versionInfo: any) => {
          return (
            <VStack spacing={4} align="stretch">
              <Text fontSize="md" color="gray.600" mb={2}>
                Version information updated successfully:
              </Text>
              <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
                <VStack spacing={2} align="start">
                  <Text><strong>Contao Manager:</strong> {versionInfo.contaoManagerVersion || 'N/A'}</Text>
                  <Text><strong>PHP:</strong> {versionInfo.phpVersion || 'N/A'}</Text>
                  <Text><strong>Contao:</strong> {versionInfo.contaoVersion || 'N/A'}</Text>
                  <Text><strong>Last Updated:</strong> {new Date(versionInfo.lastUpdated).toLocaleString()}</Text>
                </VStack>
              </Box>
              <Box mt={4}>
                <Accordion allowToggle>
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        Show raw version data
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <Code display="block" whiteSpace="pre" p={3} borderRadius="md">
                        {JSON.stringify(versionInfo, null, 2)}
                      </Code>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </Box>
            </VStack>
          );
        };

        showModal('Version Information Updated', formatVersionInfo(data.versionInfo));
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update version information',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Error updating version information: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingButton(null);
    }
  };

  const formatDatabaseBackups = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>No backups found</AlertTitle>
          <AlertDescription>
            No database backups are available on this server.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="md" color="gray.600">
          Found {data.length} database backup{data.length !== 1 ? 's' : ''}:
        </Text>
        <Box overflowX="auto">
          <Table.Root variant="simple" size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Backup Name</Table.ColumnHeader>
                <Table.ColumnHeader>Created At</Table.ColumnHeader>
                <Table.ColumnHeader>Size</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.map((backup, index) => (
                <Table.Row key={index}>
                  <Table.Cell>
                    <Code fontSize="sm">{backup.name}</Code>
                  </Table.Cell>
                  <Table.Cell>{new Date(backup.createdAt).toLocaleString()}</Table.Cell>
                  <Table.Cell>{(backup.size / 1024 / 1024).toFixed(2)} MB</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Box>
        <Box mt={4}>
          <Accordion allowToggle>
            <AccordionItem>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  Show raw backup data
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <Code display="block" whiteSpace="pre" p={3} borderRadius="md">
                  {JSON.stringify(data, null, 2)}
                </Code>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Box>
      </VStack>
    );
  };

  const formatInstalledPackages = (data: any) => {
    if (!data || typeof data !== 'object') {
      return (
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>No packages found</AlertTitle>
          <AlertDescription>
            No installed packages data available.
          </AlertDescription>
        </Alert>
      );
    }

    const packages = Object.entries(data);
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="md" color="gray.600">
          Found {packages.length} installed package{packages.length !== 1 ? 's' : ''}:
        </Text>
        <Box maxH="400px" overflowY="auto">
          <Table.Root variant="simple" size="sm">
            <Table.Header position="sticky" top={0} bg={cardBg}>
              <Table.Row>
                <Table.ColumnHeader>Package Name</Table.ColumnHeader>
                <Table.ColumnHeader>Version</Table.ColumnHeader>
                <Table.ColumnHeader>Type</Table.ColumnHeader>
                <Table.ColumnHeader>Description</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {packages.map(([name, pkg]: [string, any]) => (
                <Table.Row key={name}>
                  <Table.Cell>
                    <Code fontSize="sm">{name}</Code>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette="blue" fontSize="xs">{pkg.version || 'N/A'}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette="green" fontSize="xs">{pkg.type || 'library'}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="xs" noOfLines={2}>
                      {pkg.description || 'No description available'}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Box>
        <Box mt={4}>
          <Accordion allowToggle>
            <AccordionItem>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  Show raw package data
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>
                <Code display="block" whiteSpace="pre" p={3} borderRadius="md" maxH="300px" overflowY="auto">
                  {JSON.stringify(data, null, 2)}
                </Code>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Box>
      </VStack>
    );
  };

  const handleSetTaskData = () => {
    const availableTasks = [
      {
        name: 'composer/update',
        title: 'Composer Update',
        description: 'Updates the installed Composer packages',
        data: { name: 'composer/update', config: { dry_run: false } }
      },
      {
        name: 'composer/install',
        title: 'Composer Install',
        description: 'Installs Composer packages from lock file',
        data: { name: 'composer/install', config: { dry_run: false } }
      },
      {
        name: 'composer/clear-cache',
        title: 'Clear Composer Cache',
        description: 'Clears the Composer cache',
        data: { name: 'composer/clear-cache' }
      },
      {
        name: 'composer/dump-autoload',
        title: 'Dump Autoload',
        description: 'Dumps the Composer autoloader',
        data: { name: 'composer/dump-autoload' }
      },
      {
        name: 'contao/rebuild-cache',
        title: 'Rebuild Contao Cache',
        description: 'Clears and rebuilds the Contao/Symfony cache',
        data: { name: 'contao/rebuild-cache', environment: 'prod', warmup: true }
      },
      {
        name: 'contao/backup-create',
        title: 'Create Database Backup',
        description: 'Creates a full backup of the current database',
        data: { name: 'contao/backup-create' }
      },
      {
        name: 'manager/self-update',
        title: 'Manager Self-Update',
        description: 'Updates the Contao Manager to the latest version',
        data: { name: 'manager/self-update' }
      }
    ];

    const taskSelector = (
      <VStack spacing={4} align="stretch">
        <Text fontSize="md" color="gray.600" mb={2}>
          Select a task to execute on the Contao Manager:
        </Text>
        {availableTasks.map((task) => (
          <Button
            key={task.name}
            variant="outline"
            size="lg"
            height="auto"
            p={6}
            textAlign="left"
            justifyContent="flex-start"
            borderWidth="2px"
            borderColor={borderColor}
            _hover={{
              borderColor: "blue.300",
              bg: hoverBg,
              transform: "translateY(-1px)",
              boxShadow: "md"
            }}
            _active={{
              transform: "translateY(0)",
              boxShadow: "sm"
            }}
            onClick={() => handleTaskSelection(task.data)}
          >
            <VStack align="start" spacing={1} width="100%">
              <Heading size="sm" color="blue.500">{task.title}</Heading>
              <Text fontSize="sm" color="gray.600" fontWeight="normal">
                {task.description}
              </Text>
            </VStack>
          </Button>
        ))}
      </VStack>
    );

    showModal('Select Task to Execute', taskSelector);
  };

  const handleTaskSelection = async (taskData: any) => {
    setModalContent(null);
    onClose();
    await handleApiCallWithButton('set-task', () => api.setTaskData(taskData), 'Set Task Data');
  };

  const handleUpdateSiteName = async (newName: string) => {
    if (!site || newName === site.name) return;

    try {
      const response = await api.updateSiteName(site.url, newName);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Site name updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        await loadConfig();
      } else {
        throw new Error(response.error || 'Failed to update site name');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to update site name: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const EditableControls = () => {
    const {
      isEditing,
      getSubmitButtonProps,
      getCancelButtonProps,
      getEditButtonProps,
    } = useEditableControls();

    return isEditing ? (
      <ButtonGroup justifyContent="center" size="sm">
        <IconButton
          icon={<Check size={16} />}
          {...getSubmitButtonProps()}
          colorPalette="green"
          aria-label="Save"
        />
        <IconButton
          icon={<X size={16} />}
          {...getCancelButtonProps()}
          aria-label="Cancel"
        />
      </ButtonGroup>
    ) : (
      <Flex justifyContent="center">
        <IconButton
          size="sm"
          icon={<Edit size={16} />}
          {...getEditButtonProps()}
          aria-label="Edit site name"
          variant="ghost"
        />
      </Flex>
    );
  };

  const handleRemoveSite = async () => {
    if (!site) return;
    onRemoveDialogClose();

    try {
      await api.removeSite(site.url);
      toast({
        title: 'Success',
        description: `Site "${site.name}" has been removed`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to remove site: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (configLoading) {
    return (
      <Container maxW="4xl">
        <Center h="300px">
          <VStack>
            <Spinner size="xl" />
            <Text>Loading site details...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (!site) {
    return (
      <Container maxW="4xl">
        <Center h="400px">
          <VStack spacing={6}>
            <Alert status="error" borderRadius="lg" p={6} maxW="md">
              <AlertIcon boxSize="40px" mr={4} />
              <Box>
                <AlertTitle fontSize="xl" mb={2}>
                  Site Not Found
                </AlertTitle>
                <AlertDescription fontSize="md">
                  The requested site could not be found. It may have been removed or the URL is incorrect.
                </AlertDescription>
              </Box>
            </Alert>
            <Button 
              leftIcon={<ArrowLeft size={16} />}
              colorPalette="blue"
              size="lg"
              onClick={() => navigate('/')}
            >
              Back to Sites
            </Button>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="4xl">
      <Flex justify="space-between" align="center" mb={8}>
        <VStack align="start" spacing={2}>
          <Editable
            defaultValue={site.name}
            onSubmit={handleUpdateSiteName}
            fontSize="3xl"
            fontWeight="bold"
          >
            <Flex align="center" gap={2}>
              <EditablePreview />
              <EditableInput />
              <EditableControls />
            </Flex>
          </Editable>
          <Link 
            href={site.url} 
            target="_blank" 
            rel="noopener noreferrer"
            fontSize="sm"
            fontFamily="mono"
            color="gray.600"
          >
            {site.url}
          </Link>
        </VStack>
        <Button
          leftIcon={<ArrowLeft size={16} />}
          variant="ghost"
          onClick={() => navigate('/')}
        >
          Back to Sites
        </Button>
      </Flex>

      <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" p={8}>
        <Tabs colorPalette="blue" variant="line">
          <TabList>
            <Tab>Site Info</Tab>
            <Tab>Update</Tab>
            <Tab>Expert</Tab>
            <Tab>Logs</Tab>
          </TabList>

          <TabPanels>
            {/* Tab 1: Site Info */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="lg" mb={4}>Site Information</Heading>
                  
                  <VStack spacing={4} align="start">
                    <VStack spacing={2} align="start" width="100%">
                      <Text fontSize="sm"><strong>Last Used:</strong> {new Date(site.lastUsed).toLocaleString()}</Text>
                      <Text fontSize="sm"><strong>Token:</strong> <Code>{site.token.substring(0, 8)}...</Code></Text>
                    </VStack>
                    
                    {site.versionInfo && (
                      <>
                        <Divider />
                        <VStack spacing={2} align="start" width="100%">
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
                              <strong>Last Updated:</strong> {new Date(site.versionInfo.lastUpdated).toLocaleString()}
                            </Text>
                          )}
                        </VStack>
                      </>
                    )}
                    
                    {!site.versionInfo && (
                      <>
                        <Divider />
                        <VStack spacing={2} align="start" width="100%">
                          <Heading size="sm">Version Information</Heading>
                          <Text fontSize="sm" color="gray.500">
                            No version information available. Click "Update Version Info" to fetch current versions.
                          </Text>
                        </VStack>
                      </>
                    )}
                  </VStack>
                </Box>

                <Divider />
                
                <VStack spacing={4} align="start">
                  <Heading size="md" color="gray.500">Site Management</Heading>
                  {!showReauthForm ? (
                    <HStack spacing={4} wrap="wrap">
                      <Button
                        leftIcon={<Settings size={16} />}
                        colorPalette="blue"
                        onClick={handleUpdateVersionInfo}
                        loading={loadingButton === 'update-version-info'}
                      >
                        Update Version Info
                      </Button>
                      <Button
                        leftIcon={<RefreshCw size={16} />}
                        colorPalette="orange"
                        onClick={handleReauthenticate}
                      >
                        Reauthenticate
                      </Button>
                      <Button
                        leftIcon={<Table.Rowash2 size={16} />}
                        colorPalette="red"
                        onClick={onRemoveDialogOpen}
                      >
                        Remove Site
                      </Button>
                    </HStack>
                  ) : (
                    <Box p={4} border="1px" borderColor={borderColor} borderRadius="md" width="100%">
                      <VStack spacing={4} align="stretch">
                        <Text fontSize="md" fontWeight="semibold">
                          Reauthenticate with {site?.name}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Select new permissions and generate a new API token. This will replace your current token.
                        </Text>
                        <FormControl>
                          <FormLabel>Required Permissions</FormLabel>
                          <Select
                            value={reauthScope}
                            onChange={(e) => setReauthScope(e.target.value)}
                            maxW="300px"
                          >
                            <option value="read">Read Only</option>
                            <option value="update">Read + Update</option>
                            <option value="install">Read + Update + Install</option>
                            <option value="admin">Full Admin Access</option>
                          </Select>
                        </FormControl>
                        <HStack spacing={3}>
                          <Button
                            colorPalette="orange"
                            onClick={handleReauthSubmit}
                            loading={loadingButton === 'reauthenticate'}
                            loadingText="Redirecting..."
                          >
                            Generate New Token
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setShowReauthForm(false)}
                          >
                            Cancel
                          </Button>
                        </HStack>
                      </VStack>
                    </Box>
                  )}
                </VStack>
              </VStack>
            </TabPanel>

            {/* Tab 2: Update */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <UpdateWorkflow />
              </VStack>
            </TabPanel>

            {/* Tab 3: Expert */}
            <TabPanel>
              <VStack spacing={8} align="stretch">
                <Heading size="lg" mb={4}>Expert Functions</Heading>
                
                {/* Server Configuration */}
                <Box>
                  <HStack spacing={2} mb={4}>
                    <Settings size={20} />
                    <Heading size="md" color="blue.500">Server Configuration</Heading>
                  </HStack>
                  <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                    <GridItem>
                      <Button
                        colorPalette="blue"
                        onClick={handleUpdateStatus}
                        loading={loadingButton === 'update-status'}
                        width="full"
                      >
                        Get Update Status
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="blue"
                        onClick={() => handleApiCallWithButton('php-web-config', api.getPhpWebConfig, 'PHP Web Server Configuration')}
                        loading={loadingButton === 'php-web-config'}
                        width="full"
                      >
                        PHP Web Config
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="blue"
                        onClick={() => handleApiCallWithButton('contao-config', api.getContaoConfig, 'Contao Configuration')}
                        loading={loadingButton === 'contao-config'}
                        width="full"
                      >
                        Contao Config
                      </Button>
                    </GridItem>
                  </Grid>
                </Box>

                {/* Users Section */}
                <Box>
                  <Heading size="md" color="green.500" mb={4}>👥 Users</Heading>
                  <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                    <GridItem>
                      <Button
                        colorPalette="green"
                        onClick={() => handleApiCallWithButton('users-list', api.getUsersList, 'User List')}
                        loading={loadingButton === 'users-list'}
                        width="full"
                      >
                        User List
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="green"
                        onClick={handleTokenInfo}
                        loading={loadingButton === 'token-info'}
                        width="full"
                      >
                        Get Token Info
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="green"
                        onClick={async () => {
                          try {
                            setLoadingButton('token-list');
                            const tokenInfo = await api.getTokenInfo();
                            if (tokenInfo.success && tokenInfo.tokenInfo.username) {
                              await handleApiCallWithButton('token-list', () => api.getTokensList(tokenInfo.tokenInfo.username), 'Token List');
                            } else {
                              toast({
                                title: 'Error',
                                description: 'Could not get username from token info',
                                status: 'error',
                                duration: 3000,
                                isClosable: true,
                              });
                              setLoadingButton(null);
                            }
                          } catch (error) {
                            toast({
                              title: 'Error',
                              description: 'Failed to get token list',
                              status: 'error',
                              duration: 3000,
                              isClosable: true,
                            });
                            setLoadingButton(null);
                          }
                        }}
                        loading={loadingButton === 'token-list'}
                        width="full"
                      >
                        Token List
                      </Button>
                    </GridItem>
                  </Grid>
                </Box>

                {/* Contao API Section */}
                <Box>
                  <Heading size="md" color="orange.500" mb={4}>🚀 Contao API</Heading>
                  <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                    <GridItem>
                      <Button
                        colorPalette="orange"
                        onClick={() => handleApiCallWithButton('migration-status', api.getDatabaseMigrationStatus, 'Migration Task Status')}
                        loading={loadingButton === 'migration-status'}
                        width="full"
                      >
                        Migration Status
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="orange"
                        leftIcon={<Edit size={16} />}
                        onClick={handleStartDatabaseMigration}
                        loading={loadingButton === 'start-migration'}
                        width="full"
                      >
                        Start Migration
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="red"
                        leftIcon={<Table.Rowash2 size={16} />}
                        onClick={() => handleApiCallWithButton('delete-migration', api.deleteDatabaseMigrationTask, 'Delete Migration Task')}
                        loading={loadingButton === 'delete-migration'}
                        width="full"
                      >
                        Delete Migration Task
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="orange"
                        onClick={() => handleApiCallWithButton('maintenance-mode', api.getMaintenanceModeStatus, 'Maintenance Mode Status')}
                        loading={loadingButton === 'maintenance-mode'}
                        width="full"
                      >
                        Maintenance Status
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="green"
                        leftIcon={<Check size={16} />}
                        onClick={() => handleApiCallWithButton('enable-maintenance', api.enableMaintenanceMode, 'Enable Maintenance Mode')}
                        loading={loadingButton === 'enable-maintenance'}
                        width="full"
                      >
                        Enable Maintenance
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="red"
                        leftIcon={<X size={16} />}
                        onClick={() => handleApiCallWithButton('disable-maintenance', api.disableMaintenanceMode, 'Disable Maintenance Mode')}
                        loading={loadingButton === 'disable-maintenance'}
                        width="full"
                      >
                        Disable Maintenance
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="orange"
                        onClick={() => handleApiCallWithButton('db-backups', api.getDatabaseBackups, 'Database Backups', formatDatabaseBackups)}
                        loading={loadingButton === 'db-backups'}
                        width="full"
                      >
                        Database Backups
                      </Button>
                    </GridItem>
                  </Grid>
                </Box>

                {/* Tasks Section */}
                <Box>
                  <Heading size="md" color="cyan.500" mb={4}>📋 Tasks</Heading>
                  <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                    <GridItem>
                      <Button
                        colorPalette="cyan"
                        onClick={() => handleApiCallWithButton('get-task-data', api.getTaskData, 'Task Data')}
                        loading={loadingButton === 'get-task-data'}
                        width="full"
                      >
                        Get Task Data
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="cyan"
                        onClick={handleSetTaskData}
                        loading={loadingButton === 'set-task'}
                        width="full"
                      >
                        Set Task Data
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="red"
                        onClick={() => handleApiCallWithButton('delete-task', api.deleteTaskData, 'Delete Task Data')}
                        loading={loadingButton === 'delete-task'}
                        width="full"
                      >
                        Delete Task Data
                      </Button>
                    </GridItem>
                  </Grid>
                </Box>

                {/* Packages Section */}
                <Box>
                  <Heading size="md" color="purple.500" mb={4}>📦 Packages</Heading>
                  <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
                    <GridItem>
                      <Button
                        colorPalette="purple"
                        onClick={() => handleApiCallWithButton('root-package', api.getRootPackageDetails, 'Root Package Details')}
                        loading={loadingButton === 'root-package'}
                        width="full"
                      >
                        Root Package Details
                      </Button>
                    </GridItem>
                    <GridItem>
                      <Button
                        colorPalette="purple"
                        onClick={() => handleApiCallWithButton('installed-packages', api.getInstalledPackages, 'Installed Packages', formatInstalledPackages)}
                        loading={loadingButton === 'installed-packages'}
                        width="full"
                      >
                        Installed Packages
                      </Button>
                    </GridItem>
                  </Grid>
                </Box>
              </VStack>
            </TabPanel>

            {/* Tab 4: Logs */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Flex justify="space-between" align="center">
                  <Heading size="lg">API Call Logs</Heading>
                  <Button
                    colorPalette="blue"
                    onClick={loadLogs}
                    loading={logsLoading}
                    size="sm"
                  >
                    Refresh Logs
                  </Button>
                </Flex>
                
                {logsLoading ? (
                  <Center py={8}>
                    <Spinner size="lg" />
                  </Center>
                ) : logs.length === 0 ? (
                  <Alert status="info">
                    <AlertIcon />
                    <AlertTitle>No logs found</AlertTitle>
                    <AlertDescription>
                      No API call logs are available for this site yet. Make some API calls from the Expert tab to see logs here.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={4}>
                      Showing {logs.length} log entries for {site?.name}
                    </Text>
                    <Box maxH="600px" overflowY="auto">
                      <Table.Root variant="simple" size="sm">
                        <Table.Header position="sticky" top={0} bg={cardBg} zIndex={1}>
                          <Table.Row>
                            <Table.ColumnHeader>Timestamp</Table.ColumnHeader>
                            <Table.ColumnHeader>Method</Table.ColumnHeader>
                            <Table.ColumnHeader>Endpoint</Table.ColumnHeader>
                            <Table.ColumnHeader>Status</Table.ColumnHeader>
                            <Table.ColumnHeader>Error</Table.ColumnHeader>
                            <Table.ColumnHeader>Details</Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {logs.map((log, index) => (
                            <Table.Row key={index}>
                              <Table.Cell>
                                <Text fontSize="xs">
                                  {new Date(log.timestamp).toLocaleString()}
                                </Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Badge 
                                  colorPalette={
                                    log.method === 'GET' ? 'blue' : 
                                    log.method === 'POST' ? 'green' : 
                                    log.method === 'PUT' ? 'orange' : 
                                    log.method === 'DELETE' ? 'red' : 'gray'
                                  }
                                  size="sm"
                                >
                                  {log.method}
                                </Badge>
                              </Table.Cell>
                              <Table.Cell>
                                <Code fontSize="xs">{log.endpoint}</Code>
                              </Table.Cell>
                              <Table.Cell>
                                <Badge 
                                  colorPalette={
                                    log.statusCode >= 200 && log.statusCode < 300 ? 'green' :
                                    log.statusCode >= 300 && log.statusCode < 400 ? 'blue' :
                                    log.statusCode >= 400 && log.statusCode < 500 ? 'orange' :
                                    log.statusCode >= 500 ? 'red' : 'gray'
                                  }
                                  size="sm"
                                >
                                  {log.statusCode || 'N/A'}
                                </Badge>
                              </Table.Cell>
                              <Table.Cell>
                                {log.error ? (
                                  <Text fontSize="xs" color="red.500" noOfLines={1} maxW="150px">
                                    {log.error}
                                  </Text>
                                ) : (
                                  <Text fontSize="xs" color="gray.400">None</Text>
                                )}
                              </Table.Cell>
                              <Table.Cell>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    const logDetails = (
                                      <VStack spacing={4} align="stretch">
                                        <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
                                          <Heading size="sm" mb={3}>Request Details</Heading>
                                          <VStack spacing={2} align="start">
                                            <Text><strong>Method:</strong> {log.method}</Text>
                                            <Text><strong>Endpoint:</strong> {log.endpoint}</Text>
                                            <Text><strong>Timestamp:</strong> {new Date(log.timestamp).toLocaleString()}</Text>
                                            <Text><strong>Status Code:</strong> {log.statusCode || 'N/A'}</Text>
                                            {log.error && (
                                              <Text><strong>Error:</strong> <Text as="span" color="red.500">{log.error}</Text></Text>
                                            )}
                                          </VStack>
                                        </Box>
                                        
                                        {log.requestData && (
                                          <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
                                            <Heading size="sm" mb={3}>Request Data</Heading>
                                            <Code display="block" whiteSpace="pre" p={3} borderRadius="md" maxH="200px" overflowY="auto">
                                              {JSON.stringify(log.requestData, null, 2)}
                                            </Code>
                                          </Box>
                                        )}
                                        
                                        {log.responseData && (
                                          <Box p={4} border="1px" borderColor={borderColor} borderRadius="md">
                                            <Heading size="sm" mb={3}>Response Data</Heading>
                                            <Code display="block" whiteSpace="pre" p={3} borderRadius="md" maxH="300px" overflowY="auto">
                                              {JSON.stringify(log.responseData, null, 2)}
                                            </Code>
                                          </Box>
                                        )}
                                      </VStack>
                                    );
                                    showModal(`Log Details - ${log.method} ${log.endpoint}`, logDetails);
                                  }}
                                >
                                  View
                                </Button>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table>
                    </Box>
                  </Box>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <DialogRoot open={isOpen} onOpenChange={(details) => !details.open && onClose()} size="4xl">
        <DialogBackdrop />
        <DialogContent>
          <DialogHeader>{modalTitle}</DialogHeader>
          <DialogCloseTrigger />
          <DialogBody maxH="70vh" overflowY="auto">
            {modalContent}
          </DialogBody>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={isMigrationModalOpen} onOpenChange={(details) => !details.open && onMigrationModalClose()} size="lg">
        <DialogBackdrop />
        <DialogContent>
          <DialogHeader>{modalTitle}</DialogHeader>
          <DialogCloseTrigger />
          <DialogBody>
            {modalContent}
          </DialogBody>
          <DialogFooter>
            <Button onClick={onMigrationModalClose}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <AlertDialog
        isOpen={isRemoveDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={onRemoveDialogClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Remove Site
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to remove "{site?.name}"? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onRemoveDialogClose}>
                Cancel
              </Button>
              <Button colorPalette="red" onClick={handleRemoveSite} ml={3}>
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
};

export default SiteDetails;