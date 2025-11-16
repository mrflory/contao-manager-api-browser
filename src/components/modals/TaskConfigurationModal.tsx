import React, { useState, useEffect } from 'react';
import {
  VStack,
  Button,
  Text,
  Textarea,
  Stack,
  Box,
} from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogCloseTrigger,
} from '../ui/dialog';
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  SelectItemText,
} from '../ui/select';
import { createListCollection } from '@chakra-ui/react';
import { Field } from '../ui/field';

interface TaskOption {
  name: string;
  title: string;
  description: string;
  exampleConfig: string;
}

interface TaskConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: any) => void;
  loading?: boolean;
}

const availableTasks: TaskOption[] = [
  {
    name: 'composer/update',
    title: 'Composer Update',
    description: 'Updates the installed Composer packages',
    exampleConfig: JSON.stringify({
      dry_run: false,
      uploads: false,
      require: {},
      remove: [],
      update: []
    }, null, 2)
  },
  {
    name: 'composer/install',
    title: 'Composer Install',
    description: 'Installs Composer packages from composer.lock',
    exampleConfig: JSON.stringify({
      dry_run: false,
      'remove-vendor': false
    }, null, 2)
  },
  {
    name: 'contao/rebuild-cache',
    title: 'Rebuild Contao Cache',
    description: 'Clears the Contao/Symfony cache and optionally rebuilds it',
    exampleConfig: JSON.stringify({
      environment: 'prod',
      warmup: true
    }, null, 2)
  },
  {
    name: 'contao/backup-create',
    title: 'Create Database Backup',
    description: 'Creates a full backup of the current database',
    exampleConfig: ''
  },
  {
    name: 'contao/backup-restore',
    title: 'Restore Database Backup',
    description: 'Restore a database backup from file',
    exampleConfig: JSON.stringify({
      file: 'backup_filename.sql',
      backup: false
    }, null, 2)
  },
  {
    name: 'composer/clear-cache',
    title: 'Clear Composer Cache',
    description: 'Clears the Composer cache',
    exampleConfig: ''
  },
  {
    name: 'composer/dump-autoload',
    title: 'Dump Autoload',
    description: 'Dumps the Composer autoloader',
    exampleConfig: ''
  },
  {
    name: 'manager/self-update',
    title: 'Manager Self-Update',
    description: 'Updates the Contao Manager to the latest version',
    exampleConfig: ''
  },
  {
    name: 'contao/install',
    title: 'Install Contao',
    description: 'Install Contao project (via upload, package, or managed edition)',
    exampleConfig: JSON.stringify({
      package: 'contao/contao-demo',
      version: '5.2',
      'no-update': false
    }, null, 2)
  }
];

export const TaskConfigurationModal: React.FC<TaskConfigurationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [configValue, setConfigValue] = useState<string>('');
  const [configError, setConfigError] = useState<string>('');

  const taskOptions = createListCollection({
    items: availableTasks.map(task => ({
      label: task.title,
      value: task.name
    }))
  });

  // Update config example when task changes
  useEffect(() => {
    if (selectedTask) {
      const task = availableTasks.find(t => t.name === selectedTask);
      if (task) {
        setConfigValue(task.exampleConfig);
        setConfigError('');
      }
    }
  }, [selectedTask]);

  const handleSubmit = () => {
    if (!selectedTask) {
      setConfigError('Please select a task');
      return;
    }

    // Parse config if provided
    let parsedConfig: any = undefined;
    if (configValue.trim()) {
      try {
        parsedConfig = JSON.parse(configValue);
      } catch (error) {
        setConfigError('Invalid JSON format in config');
        return;
      }
    }

    // Build task data
    const taskData: any = { name: selectedTask };

    // Add config field based on task type
    if (parsedConfig !== undefined) {
      // For tasks that use top-level properties (not nested in config)
      if (selectedTask === 'contao/rebuild-cache') {
        taskData.environment = parsedConfig.environment || 'prod';
        taskData.warmup = parsedConfig.warmup !== undefined ? parsedConfig.warmup : true;
      } else if (selectedTask === 'contao/backup-restore') {
        if (parsedConfig.file) taskData.file = parsedConfig.file;
        if (parsedConfig.backup !== undefined) taskData.backup = parsedConfig.backup;
      } else {
        // For tasks that use nested config object
        taskData.config = parsedConfig;
      }
    }

    onSubmit(taskData);
    handleClose();
  };

  const handleClose = () => {
    setSelectedTask('');
    setConfigValue('');
    setConfigError('');
    onClose();
  };

  const selectedTaskInfo = availableTasks.find(t => t.name === selectedTask);

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && handleClose()} size="xl">
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Task</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Field label="Task Type" required>
              <SelectRoot
                value={selectedTask ? [selectedTask] : []}
                onValueChange={(details) => setSelectedTask(details.value[0])}
                collection={taskOptions}
              >
                <SelectTrigger>
                  <SelectValueText placeholder="Select a task..." />
                </SelectTrigger>
                <SelectContent>
                  {taskOptions.items.map((item) => (
                    <SelectItem key={item.value} item={item.value}>
                      <SelectItemText>{item.label}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Field>

            {selectedTaskInfo && (
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={2}>
                  {selectedTaskInfo.description}
                </Text>
              </Box>
            )}

            <Field
              label="Configuration (JSON)"
              helperText={selectedTaskInfo?.exampleConfig
                ? "Example configuration is pre-filled. Modify as needed or leave empty for defaults."
                : "This task does not require additional configuration."}
              invalid={!!configError}
              errorText={configError}
            >
              <Textarea
                value={configValue}
                onChange={(e) => {
                  setConfigValue(e.target.value);
                  setConfigError('');
                }}
                placeholder={selectedTask
                  ? (selectedTaskInfo?.exampleConfig || "No configuration required")
                  : "Select a task first..."}
                rows={12}
                fontFamily="mono"
                fontSize="sm"
                disabled={!selectedTask}
              />
            </Field>

            {selectedTask && (
              <Box bg="blue.50" borderRadius="md" p={3} fontSize="sm">
                <Text fontWeight="medium" mb={1}>Task Endpoint:</Text>
                <Text fontFamily="mono" color="blue.700">PUT /api/task</Text>
              </Box>
            )}
          </VStack>
        </DialogBody>
        <DialogFooter>
          <Stack direction="row" gap={2}>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorPalette="blue"
              onClick={handleSubmit}
              loading={loading}
              disabled={!selectedTask}
            >
              Set Task
            </Button>
          </Stack>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};
