import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Button,
  Heading,
  Box,
  Grid,
  GridItem,
  createListCollection,
} from '@chakra-ui/react';
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  SelectItemText,
} from '../ui/select';
import { LuSettings as Settings } from 'react-icons/lu';
import { useLoadingStates } from '../../hooks/useApiCall';
import { useModalState } from '../../hooks/useModalState';
import { ExpertApiService, TaskApiService } from '../../services/apiCallService';
import { ApiResultModal, JsonDisplayModal } from '../modals/ApiResultModal';
import { TaskSelectionModal } from '../modals/TaskSelectionModal';
import { MigrationConfigModal } from '../modals/MigrationConfigModal';
import { formatDatabaseBackups, formatSortedPackages, formatUpdateStatus, formatTokenInfo } from '../../utils/formatters';

export const ExpertTab: React.FC = () => {
  const { modalState, openModal, closeModal } = useModalState();
  const { isLoading, setLoading } = useLoadingStates();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<'composer.json' | 'composer.lock'>('composer.json');
  const [jsonModalState, setJsonModalState] = useState<{
    isOpen: boolean;
    title: string;
    data: any;
  }>({ isOpen: false, title: '', data: null });

  const closeJsonModal = () => {
    setJsonModalState({ isOpen: false, title: '', data: null });
  };

  const fileOptions = createListCollection({
    items: [
      { label: 'composer.json', value: 'composer.json' },
      { label: 'composer.lock', value: 'composer.lock' }
    ]
  });

  // Generic API call handler with modal display
  const handleApiCallWithModal = async (
    buttonId: string,
    apiCall: () => Promise<any>,
    title: string,
    formatter?: (data: any) => React.ReactNode
  ) => {
    setLoading(buttonId, true);
    
    try {
      const result = await apiCall();
      if (formatter) {
        // Use custom formatter with ApiResultModal
        const content = formatter(result);
        openModal(title, content);
      } else {
        // Use JsonDisplayModal for raw JSON data
        setJsonModalState({
          isOpen: true,
          title,
          data: result
        });
      }
    } catch (error) {
      console.error(`Error in ${title}:`, error);
    } finally {
      setLoading(buttonId, false);
    }
  };

  const handleTaskSelected = async (taskData: any) => {
    await handleApiCallWithModal('set-task', () => TaskApiService.setTaskData(taskData), 'Set Task Data');
  };

  const handleMigrationSubmit = async (formData: { hash: string; type: string; withDeletes: boolean }) => {
    const payload: any = {};
    if (formData.hash) payload.hash = formData.hash;
    if (formData.type) payload.type = formData.type;
    if (formData.withDeletes) payload.withDeletes = formData.withDeletes;
    
    await handleApiCallWithModal('start-migration', () => TaskApiService.startDatabaseMigration(payload), 'Start Database Migration');
  };

  const handleGetFiles = async () => {
    setLoading('get-files', true);
    
    try {
      const result = await ExpertApiService.getFiles(selectedFile);
      // For file content, we'll parse it as JSON if it's a JSON file
      let data;
      try {
        data = JSON.parse(result);
      } catch {
        // If it's not valid JSON, treat as raw text
        data = { content: result };
      }
      
      setJsonModalState({
        isOpen: true,
        title: `${selectedFile} Content`,
        data
      });
    } catch (error) {
      console.error(`Error getting ${selectedFile}:`, error);
    } finally {
      setLoading('get-files', false);
    }
  };

  return (
    <>
      <VStack gap={8} align="stretch">
        <Heading size="lg" mb={4}>Expert Functions</Heading>
        
        {/* Server Configuration */}
        <Box>
          <HStack gap={2} mb={4}>
            <Settings size={20} />
            <Heading size="md" color="blue.500">Server Configuration</Heading>
          </HStack>
          <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
            <GridItem>
              <Button
                colorPalette="blue"
                onClick={() => handleApiCallWithModal(
                  'update-status',
                  ExpertApiService.getUpdateStatus,
                  'Update Status',
                  formatUpdateStatus
                )}
                loading={isLoading('update-status')}
                width="full"
              >
                Get Update Status
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="blue"
                onClick={() => handleApiCallWithModal(
                  'php-web-config',
                  ExpertApiService.getPhpWebConfig,
                  'PHP Web Server Configuration'
                )}
                loading={isLoading('php-web-config')}
                width="full"
              >
                PHP Web Config
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="blue"
                onClick={() => handleApiCallWithModal(
                  'contao-config',
                  ExpertApiService.getContaoConfig,
                  'Contao Configuration'
                )}
                loading={isLoading('contao-config')}
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
                onClick={() => handleApiCallWithModal(
                  'users-list',
                  ExpertApiService.getUsersList,
                  'User List'
                )}
                loading={isLoading('users-list')}
                width="full"
              >
                User List
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="green"
                onClick={() => handleApiCallWithModal(
                  'token-info',
                  ExpertApiService.getTokenInfo,
                  'Token Information',
                  formatTokenInfo
                )}
                loading={isLoading('token-info')}
                width="full"
              >
                Get Token Info
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="green"
                onClick={async () => {
                  setLoading('token-list', true);
                  try {
                    const tokenInfo = await ExpertApiService.getTokenInfo();
                    if (tokenInfo.success && tokenInfo.tokenInfo.username) {
                      await handleApiCallWithModal(
                        'token-list-inner',
                        () => ExpertApiService.getTokensList(tokenInfo.tokenInfo.username || ''),
                        'Token List'
                      );
                    } else {
                      console.error('Could not get username from token info');
                    }
                  } catch (error) {
                    console.error('Error getting token info:', error);
                  } finally {
                    setLoading('token-list', false);
                  }
                }}
                loading={isLoading('token-list')}
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
                onClick={() => handleApiCallWithModal(
                  'maintenance-mode',
                  TaskApiService.getMaintenanceModeStatus,
                  'Maintenance Mode Status'
                )}
                loading={isLoading('maintenance-mode')}
                width="full"
              >
                Maintenance Status
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="green"
                onClick={() => handleApiCallWithModal(
                  'enable-maintenance',
                  TaskApiService.enableMaintenanceMode,
                  'Enable Maintenance Mode'
                )}
                loading={isLoading('enable-maintenance')}
                width="full"
              >
                Enable Maintenance
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="red"
                onClick={() => handleApiCallWithModal(
                  'disable-maintenance',
                  TaskApiService.disableMaintenanceMode,
                  'Disable Maintenance Mode'
                )}
                loading={isLoading('disable-maintenance')}
                width="full"
              >
                Disable Maintenance
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="orange"
                onClick={() => handleApiCallWithModal(
                  'migration-status',
                  TaskApiService.getDatabaseMigrationStatus,
                  'Migration Task Status'
                )}
                loading={isLoading('migration-status')}
                width="full"
              >
                Migration Status
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="orange"
                onClick={() => setMigrationModalOpen(true)}
                loading={isLoading('start-migration')}
                width="full"
              >
                Start Migration Task
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="red"
                onClick={() => handleApiCallWithModal(
                  'delete-migration',
                  TaskApiService.deleteDatabaseMigrationTask,
                  'Delete Migration Task'
                )}
                loading={isLoading('delete-migration')}
                width="full"
              >
                Delete Migration Task
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="orange"
                onClick={() => handleApiCallWithModal(
                  'db-backups',
                  ExpertApiService.getDatabaseBackups,
                  'Database Backups',
                  formatDatabaseBackups
                )}
                loading={isLoading('db-backups')}
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
                onClick={() => handleApiCallWithModal(
                  'get-task-data',
                  TaskApiService.getTaskData,
                  'Task Data'
                )}
                loading={isLoading('get-task-data')}
                width="full"
              >
                Get Task Data
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="cyan"
                onClick={() => setTaskModalOpen(true)}
                loading={isLoading('set-task')}
                width="full"
              >
                Set Task Data
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="yellow"
                onClick={() => handleApiCallWithModal(
                  'patch-task',
                  () => TaskApiService.patchTaskStatus('aborting'),
                  'Patch Task (Abort)'
                )}
                loading={isLoading('patch-task')}
                width="full"
              >
                Patch Task (Abort)
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="red"
                onClick={() => handleApiCallWithModal(
                  'delete-task',
                  TaskApiService.deleteTaskData,
                  'Delete Task Data'
                )}
                loading={isLoading('delete-task')}
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
                onClick={() => handleApiCallWithModal(
                  'root-package',
                  ExpertApiService.getRootPackageDetails,
                  'Root Package Details'
                )}
                loading={isLoading('root-package')}
                width="full"
              >
                Root Package Details
              </Button>
            </GridItem>
            <GridItem>
              <Button
                colorPalette="purple"
                onClick={() => handleApiCallWithModal(
                  'installed-packages',
                  ExpertApiService.getInstalledPackages,
                  'Installed Packages',
                  formatSortedPackages
                )}
                loading={isLoading('installed-packages')}
                width="full"
              >
                Installed Packages
              </Button>
            </GridItem>
          </Grid>
        </Box>

        {/* Files Section */}
        <Box>
          <Heading size="md" color="teal.500" mb={4}>📄 Files</Heading>
          <VStack gap={4} align="stretch">
            <HStack gap={4}>
              <Box flex="1">
                <SelectRoot
                  value={[selectedFile]}
                  onValueChange={(details) => setSelectedFile(details.value[0] as 'composer.json' | 'composer.lock')}
                  collection={fileOptions}
                >
                  <SelectTrigger>
                    <SelectValueText placeholder="Select a file..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem item="composer.json">
                      <SelectItemText>composer.json</SelectItemText>
                    </SelectItem>
                    <SelectItem item="composer.lock">
                      <SelectItemText>composer.lock</SelectItemText>
                    </SelectItem>
                  </SelectContent>
                </SelectRoot>
              </Box>
              <Button
                colorPalette="teal"
                onClick={handleGetFiles}
                loading={isLoading('get-files')}
                minWidth="150px"
              >
                Get File Content
              </Button>
            </HStack>
          </VStack>
        </Box>
      </VStack>

      <ApiResultModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
      >
        {modalState.content}
      </ApiResultModal>

      <TaskSelectionModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onTaskSelected={handleTaskSelected}
      />

      <MigrationConfigModal
        isOpen={migrationModalOpen}
        onClose={() => setMigrationModalOpen(false)}
        onSubmit={handleMigrationSubmit}
        loading={isLoading('start-migration')}
      />

      <JsonDisplayModal
        isOpen={jsonModalState.isOpen}
        onClose={closeJsonModal}
        title={jsonModalState.title}
        data={jsonModalState.data}
      />
    </>
  );
};