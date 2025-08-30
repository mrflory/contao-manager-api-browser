import React, { useState, useMemo } from 'react';
import {
  VStack,
  HStack,
  Button,
  Heading,
  Box,
  Table,
  createListCollection,
  Input,
  Badge,
} from '@chakra-ui/react';
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  SelectItemText,
} from '../ui/select';
import { LuPlay, LuSearch } from 'react-icons/lu';
import { useLoadingStates } from '../../hooks/useApiCall';
import { useModalState } from '../../hooks/useModalState';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { ExpertApiService, TaskApiService } from '../../services/apiCallService';
import { ApiResultModal, JsonDisplayModal } from '../modals/ApiResultModal';
import { TaskSelectionModal } from '../modals/TaskSelectionModal';
import { MigrationConfigModal } from '../modals/MigrationConfigModal';
import { TaskStatusModal } from '../modals/TaskStatusModal';
import { formatDatabaseBackups, formatSortedPackages, formatUpdateStatus, formatTokenInfo, formatLogFiles } from '../../utils/formatters';

export const ExpertTab: React.FC = () => {
  const { modalState, openModal, closeModal } = useModalState();
  const { isLoading, setLoading } = useLoadingStates();
  const toast = useToastNotifications();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [taskStatusModalOpen, setTaskStatusModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<'composer.json' | 'composer.lock'>('composer.json');
  const [jsonModalState, setJsonModalState] = useState<{
    isOpen: boolean;
    title: string;
    data: any;
  }>({ isOpen: false, title: '', data: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const closeJsonModal = () => {
    setJsonModalState({ isOpen: false, title: '', data: null });
  };

  const fileOptions = createListCollection({
    items: [
      { label: 'composer.json', value: 'composer.json' },
      { label: 'composer.lock', value: 'composer.lock' }
    ]
  });

  const categoryOptions = createListCollection({
    items: [
      { label: 'All Categories', value: 'all' },
      { label: 'Session', value: 'Session' },
      { label: 'Files', value: 'Files' },
      { label: 'Server Configuration', value: 'Server Configuration' },
      { label: 'Users', value: 'Users' },
      { label: 'Configuration', value: 'Configuration' },
      { label: 'Contao API', value: 'Contao API' },
      { label: 'Tasks', value: 'Tasks' },
      { label: 'Packages', value: 'Packages' },
      { label: 'Logs', value: 'Logs' }
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
      // Show success toast for successful API calls
      toast.showApiSuccess('API call completed successfully', title);
    } catch (error) {
      console.error(`Error in ${title}:`, error);
      // Show error toast notification
      toast.showApiError(error as Error, title);
    } finally {
      setLoading(buttonId, false);
    }
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
      
      // Show success toast
      toast.showApiSuccess('File content retrieved successfully', `Get ${selectedFile}`);
    } catch (error) {
      console.error(`Error getting ${selectedFile}:`, error);
      // Show error toast notification
      toast.showApiError(error as Error, `Get ${selectedFile}`);
    } finally {
      setLoading('get-files', false);
    }
  };

  // Define all APIs from swagger.yaml
  const apiEndpoints = useMemo(() => [
    // Session APIs
    { category: 'Session', name: 'Create Session (Login)', description: 'Create a new session with credentials or token', technical: 'POST /api/session', handler: null },
    { category: 'Session', name: 'Get Session Status', description: 'Returns information about the current session', technical: 'GET /api/session', handler: () => handleApiCallWithModal('session-status', ExpertApiService.getSessionStatus, 'Session Status') },
    { category: 'Session', name: 'Delete Session (Logout)', description: 'Delete the current session', technical: 'DELETE /api/session', handler: null },
    
    // Files APIs
    { category: 'Files', name: 'Get File Content', description: 'Gets the content of composer.json or composer.lock', technical: 'GET /api/files/{file}', handler: null },
    { category: 'Files', name: 'Write File Content', description: 'Writes content to composer.json or composer.lock', technical: 'PUT /api/files/{file}', handler: null },
    
    // Server Configuration APIs
    { category: 'Server Configuration', name: 'Manager Self-Update', description: 'Gets update status of the Contao Manager', technical: 'GET /api/server/self-update', handler: () => handleApiCallWithModal('update-status', ExpertApiService.getUpdateStatus, 'Update Status', formatUpdateStatus) },
    { category: 'Server Configuration', name: 'Server Config', description: 'Gets server configuration', technical: 'GET /api/server/config', handler: () => handleApiCallWithModal('server-config', ExpertApiService.getServerConfig, 'Server Configuration') },
    { category: 'Server Configuration', name: 'Set Server Config', description: 'Sets server configuration', technical: 'PUT /api/server/config', handler: null },
    { category: 'Server Configuration', name: 'PHP Web Config', description: 'Gets PHP web server configuration', technical: 'GET /api/server/php-web', handler: () => handleApiCallWithModal('php-web-config', ExpertApiService.getPhpWebConfig, 'PHP Web Server Configuration') },
    { category: 'Server Configuration', name: 'PHP CLI Config', description: 'Gets PHP command line configuration', technical: 'GET /api/server/php-cli', handler: null },
    { category: 'Server Configuration', name: 'PHP Info', description: 'Gets PHP Information', technical: 'GET /api/server/phpinfo', handler: () => handleApiCallWithModal('php-info', ExpertApiService.getPhpInfo, 'PHP Information') },
    { category: 'Server Configuration', name: 'Opcode Cache Info', description: 'Gets PHP opcode cache Information', technical: 'GET /api/server/opcode', handler: null },
    { category: 'Server Configuration', name: 'Reset Opcode Cache', description: 'Resets the opcode cache', technical: 'DELETE /api/server/opcode', handler: null },
    { category: 'Server Configuration', name: 'Composer Config', description: 'Gets Composer configuration', technical: 'GET /api/server/composer', handler: () => handleApiCallWithModal('composer-config', ExpertApiService.getComposerConfig, 'Composer Configuration') },
    { category: 'Server Configuration', name: 'Contao Config', description: 'Gets Contao configuration', technical: 'GET /api/server/contao', handler: () => handleApiCallWithModal('contao-config', ExpertApiService.getContaoConfig, 'Contao Configuration') },
    { category: 'Server Configuration', name: 'Create Contao Structure', description: 'Create the Contao directory structure', technical: 'POST /api/server/contao', handler: null },
    { category: 'Server Configuration', name: 'Database Status', description: 'Gets the current database status', technical: 'GET /api/server/database', handler: () => handleApiCallWithModal('database-status', ExpertApiService.getDatabaseStatus, 'Database Status') },
    { category: 'Server Configuration', name: 'Configure Database', description: 'Configures the database URL', technical: 'POST /api/server/database', handler: null },
    { category: 'Server Configuration', name: 'Admin User Status', description: 'Gets if there is an admin user', technical: 'GET /api/server/admin-user', handler: null },
    { category: 'Server Configuration', name: 'Create Admin User', description: 'Create an admin user', technical: 'POST /api/server/admin-user', handler: null },
    
    // Users APIs
    { category: 'Users', name: 'Create Invitation', description: 'Create invitation token for a new user', technical: 'POST /api/invitations', handler: null },
    { category: 'Users', name: 'User List', description: 'Get list of all users', technical: 'GET /api/users', handler: () => handleApiCallWithModal('users-list', ExpertApiService.getUsersList, 'User List') },
    { category: 'Users', name: 'Create User', description: 'Create a new user', technical: 'POST /api/users', handler: null },
    { category: 'Users', name: 'Get User', description: 'Get specific user data', technical: 'GET /api/users/{username}', handler: null },
    { category: 'Users', name: 'Replace User', description: 'Replace user data', technical: 'PUT /api/users/{username}', handler: null },
    { category: 'Users', name: 'Delete User', description: 'Delete a user', technical: 'DELETE /api/users/{username}', handler: null },
    { category: 'Users', name: 'Change Password', description: 'Change the current user password', technical: 'PUT /api/users/{username}/password', handler: null },
    { category: 'Users', name: 'Get TOTP Config', description: 'Get TOTP configuration', technical: 'GET /api/users/{username}/totp', handler: null },
    { category: 'Users', name: 'Configure TOTP', description: 'Configure TOTP authentication', technical: 'PUT /api/users/{username}/totp', handler: null },
    { category: 'Users', name: 'Remove TOTP', description: 'Remove TOTP configuration for a user', technical: 'DELETE /api/users/{username}/totp', handler: null },
    { category: 'Users', name: 'Token List', description: 'Get list of tokens for a user', technical: 'GET /api/users/{username}/tokens', handler: async () => {
      setLoading('token-list', true);
      try {
        const tokenInfo = await ExpertApiService.getTokenInfo();
        if (tokenInfo.success && tokenInfo.tokenInfo.username) {
          await handleApiCallWithModal('token-list-inner', () => ExpertApiService.getTokensList(tokenInfo.tokenInfo.username || ''), 'Token List');
        } else {
          console.error('Could not get username from token info');
        }
      } catch (error) {
        console.error('Error getting token info:', error);
      } finally {
        setLoading('token-list', false);
      }
    } },
    { category: 'Users', name: 'Create Token', description: 'Create a new token', technical: 'POST /api/users/{username}/tokens', handler: null },
    { category: 'Users', name: 'Get Token Info', description: 'Get information about current token', technical: 'GET /api/users/{username}/tokens/{id}', handler: () => handleApiCallWithModal('token-info', ExpertApiService.getTokenInfo, 'Token Information', formatTokenInfo) },
    { category: 'Users', name: 'Delete Token', description: 'Delete a token', technical: 'DELETE /api/users/{username}/tokens/{id}', handler: null },
    
    // Configuration APIs
    { category: 'Configuration', name: 'Manager Config', description: 'Get manager config', technical: 'GET /api/config/manager', handler: null },
    { category: 'Configuration', name: 'Set Manager Config', description: 'Replace manager config', technical: 'PUT /api/config/manager', handler: null },
    { category: 'Configuration', name: 'Update Manager Config', description: 'Append manager config', technical: 'PATCH /api/config/manager', handler: null },
    { category: 'Configuration', name: 'Composer Auth Config', description: 'Get Composer auth config', technical: 'GET /api/config/auth', handler: null },
    { category: 'Configuration', name: 'Set Composer Auth', description: 'Replace Composer auth config', technical: 'PUT /api/config/auth', handler: null },
    { category: 'Configuration', name: 'Update Composer Auth', description: 'Append Composer auth config', technical: 'PATCH /api/config/auth', handler: null },
    { category: 'Configuration', name: 'GitHub OAuth Token', description: 'Set GitHub OAuth token', technical: 'PUT /api/config/auth/github-oauth', handler: null },
    { category: 'Configuration', name: 'Composer Config', description: 'Get Composer config', technical: 'GET /api/config/composer', handler: null },
    { category: 'Configuration', name: 'Set Composer Config', description: 'Replace Composer config', technical: 'PUT /api/config/composer', handler: null },
    { category: 'Configuration', name: 'Update Composer Config', description: 'Append Composer config', technical: 'PATCH /api/config/composer', handler: null },
    
    // Contao API
    { category: 'Contao API', name: 'Get Access Key', description: 'Gets the hashed access key', technical: 'GET /api/contao/access-key', handler: null },
    { category: 'Contao API', name: 'Set Access Key', description: 'Sets the hashed access key', technical: 'PUT /api/contao/access-key', handler: null },
    { category: 'Contao API', name: 'Remove Access Key', description: 'Removes the access key', technical: 'DELETE /api/contao/access-key', handler: null },
    { category: 'Contao API', name: 'Database Migration Status', description: 'Gets the current migration task status', technical: 'GET /api/contao/database-migration', handler: () => handleApiCallWithModal('migration-status', TaskApiService.getDatabaseMigrationStatus, 'Migration Task Status') },
    { category: 'Contao API', name: 'Start Migration Task', description: 'Starts a database migration task', technical: 'PUT /api/contao/database-migration', handler: () => setMigrationModalOpen(true) },
    { category: 'Contao API', name: 'Delete Migration Task', description: 'Delete the current migration task', technical: 'DELETE /api/contao/database-migration', handler: () => handleApiCallWithModal('delete-migration', TaskApiService.deleteDatabaseMigrationTask, 'Delete Migration Task') },
    { category: 'Contao API', name: 'Database Backups', description: 'Gets a list of database backups', technical: 'GET /api/contao/backup', handler: () => handleApiCallWithModal('db-backups', ExpertApiService.getDatabaseBackups, 'Database Backups', formatDatabaseBackups) },
    { category: 'Contao API', name: 'Install Tool Lock Status', description: 'Get install tool lock status', technical: 'GET /api/contao/install-tool/lock', handler: null },
    { category: 'Contao API', name: 'Lock Install Tool', description: 'Lock the install tool', technical: 'PUT /api/contao/install-tool/lock', handler: null },
    { category: 'Contao API', name: 'Unlock Install Tool', description: 'Unlock the install tool', technical: 'DELETE /api/contao/install-tool/lock', handler: null },
    { category: 'Contao API', name: 'JWT Cookie Content', description: 'Get JWT cookie content', technical: 'GET /api/contao/jwt-cookie', handler: null },
    { category: 'Contao API', name: 'Set JWT Cookie', description: 'Set JWT cookie', technical: 'PUT /api/contao/jwt-cookie', handler: null },
    { category: 'Contao API', name: 'Delete JWT Cookie', description: 'Delete JWT Cookie', technical: 'DELETE /api/contao/jwt-cookie', handler: null },
    { category: 'Contao API', name: 'Maintenance Mode Status', description: 'Get maintenance mode status', technical: 'GET /api/contao/maintenance-mode', handler: () => handleApiCallWithModal('maintenance-mode', TaskApiService.getMaintenanceModeStatus, 'Maintenance Mode Status') },
    { category: 'Contao API', name: 'Enable Maintenance Mode', description: 'Enable the maintenance mode', technical: 'PUT /api/contao/maintenance-mode', handler: () => handleApiCallWithModal('enable-maintenance', TaskApiService.enableMaintenanceMode, 'Enable Maintenance Mode') },
    { category: 'Contao API', name: 'Disable Maintenance Mode', description: 'Disable the maintenance mode', technical: 'DELETE /api/contao/maintenance-mode', handler: () => handleApiCallWithModal('disable-maintenance', TaskApiService.disableMaintenanceMode, 'Disable Maintenance Mode') },
    
    // Tasks APIs
    { category: 'Tasks', name: 'Get Task Data', description: 'Gets task data', technical: 'GET /api/task', handler: () => handleApiCallWithModal('get-task-data', TaskApiService.getTaskData, 'Task Data') },
    { category: 'Tasks', name: 'Set Task Data', description: 'Sets task data', technical: 'PUT /api/task', handler: () => setTaskModalOpen(true) },
    { category: 'Tasks', name: 'Patch Task Status', description: 'Starts or stops the active task', technical: 'PATCH /api/task', handler: () => setTaskStatusModalOpen(true) },
    { category: 'Tasks', name: 'Delete Task Data', description: 'Deletes task data', technical: 'DELETE /api/task', handler: () => handleApiCallWithModal('delete-task', TaskApiService.deleteTaskData, 'Delete Task Data') },
    
    // Packages APIs
    { category: 'Packages', name: 'Root Package Details', description: 'Gets details of the root Composer package', technical: 'GET /api/packages/root', handler: () => handleApiCallWithModal('root-package', ExpertApiService.getRootPackageDetails, 'Root Package Details') },
    { category: 'Packages', name: 'Installed Packages', description: 'Gets list of installed Composer packages', technical: 'GET /api/packages/local/', handler: () => handleApiCallWithModal('installed-packages', ExpertApiService.getInstalledPackages, 'Installed Packages', formatSortedPackages) },
    { category: 'Packages', name: 'Package Details', description: 'Gets details of an installed Composer package', technical: 'GET /api/packages/local/{name}', handler: null },
    { category: 'Packages', name: 'Composer Cloud Data', description: 'Gets data for a Composer Cloud job', technical: 'GET /api/packages/cloud', handler: () => handleApiCallWithModal('cloud-data', ExpertApiService.getComposerCloudData, 'Composer Cloud Data') },
    { category: 'Packages', name: 'Install from Cloud', description: 'Writes composer.lock and runs composer install', technical: 'PUT /api/packages/cloud', handler: null },
    { category: 'Packages', name: 'Validate Constraint', description: 'Validates a Composer version constraint', technical: 'POST /api/constraint', handler: null },
    
    // Logs APIs
    { category: 'Logs', name: 'List Log Files', description: 'Gets a list of files in the /var/logs directory', technical: 'GET /api/logs', handler: () => handleApiCallWithModal('log-files', ExpertApiService.getLogFiles, 'Log Files', formatLogFiles) },
    { category: 'Logs', name: 'Get Log Content', description: 'Get the content of a log file', technical: 'GET /api/logs/{file}', handler: null },
    { category: 'Logs', name: 'Delete Log File', description: 'Deletes a log file', technical: 'DELETE /api/logs/{file}', handler: null }
  ], []);

  // Filter APIs based on search and category, only show implemented ones
  const filteredApis = useMemo(() => {
    return apiEndpoints.filter(api => {
      const isImplemented = api.handler !== null;
      const matchesCategory = selectedCategory === 'all' || api.category === selectedCategory;
      const matchesSearch = searchTerm === '' || 
        api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        api.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        api.technical.toLowerCase().includes(searchTerm.toLowerCase());
      
      return isImplemented && matchesCategory && matchesSearch;
    });
  }, [apiEndpoints, selectedCategory, searchTerm]);

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

  const handleTaskStatusSubmit = async (status: 'active' | 'aborting') => {
    try {
      await handleApiCallWithModal('patch-task-status', () => TaskApiService.patchTaskStatus(status), `Patch Task Status: ${status}`);
    } catch (error) {
      // Additional error handling if needed, but handleApiCallWithModal already shows toast
      console.error('Task status update failed:', error);
    }
  };

  return (
    <>
      <VStack gap={6} align="stretch">
        <Heading size="lg">Expert API Interface</Heading>
        
        {/* Search and Filter Controls */}
        <HStack gap={4} align="end">
          <Box flex="1" position="relative">
            <Input
              placeholder="Search APIs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              paddingLeft="2.5rem"
            />
            <Box
              position="absolute"
              left="3"
              top="50%"
              transform="translateY(-50%)"
              color="fg.muted"
              pointerEvents="none"
            >
              <LuSearch size={16} />
            </Box>
          </Box>
          <Box minWidth="200px">
            <SelectRoot
              value={[selectedCategory]}
              onValueChange={(details) => setSelectedCategory(details.value[0])}
              collection={categoryOptions}
            >
              <SelectTrigger>
                <SelectValueText placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.items.map((item) => (
                  <SelectItem key={item.value} item={item.value}>
                    <SelectItemText>{item.label}</SelectItemText>
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </Box>
        </HStack>
        
        {/* API Table */}
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Category</Table.ColumnHeader>
                <Table.ColumnHeader>API Name</Table.ColumnHeader>
                <Table.ColumnHeader>Description</Table.ColumnHeader>
                <Table.ColumnHeader>Technical Name</Table.ColumnHeader>
                <Table.ColumnHeader width="100px">Action</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredApis.map((api, index) => {
                const loadingKey = `api-${index}`;
                return (
                  <Table.Row key={index}>
                    <Table.Cell>
                      <Badge size="sm" colorPalette="gray">
                        {api.category}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell fontWeight="medium">
                      {api.name}
                    </Table.Cell>
                    <Table.Cell color="fg.muted" fontSize="sm">
                      {api.description}
                    </Table.Cell>
                    <Table.Cell>
                      <Box as="code" fontSize="xs" color="fg.subtle" fontFamily="mono">
                        {api.technical}
                      </Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        size="xs"
                        colorPalette="blue"
                        loading={isLoading(loadingKey)}
                        onClick={async () => {
                          setLoading(loadingKey, true);
                          try {
                            await api.handler?.();
                          } catch (error) {
                            console.error('API call error:', error);
                          } finally {
                            setLoading(loadingKey, false);
                          }
                        }}
                      >
                        <LuPlay size={12} />
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Box>
        
        {/* Special File Selector for composer files */}
        <Box>
          <Heading size="md" mb={4}>File Operations</Heading>
          <HStack gap={4} align="end">
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
              colorPalette="blue"
              onClick={handleGetFiles}
              loading={isLoading('get-files')}
              minWidth="150px"
            >
              <LuPlay size={12} style={{ marginRight: '8px' }} />
              Get File Content
            </Button>
          </HStack>
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

      <TaskStatusModal
        isOpen={taskStatusModalOpen}
        onClose={() => setTaskStatusModalOpen(false)}
        onSubmit={handleTaskStatusSubmit}
        loading={isLoading('patch-task-status')}
      />
    </>
  );
};