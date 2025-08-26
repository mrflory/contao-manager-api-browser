import React from 'react';
import {
  VStack,
  Button,
  Text,
  Heading,
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

interface TaskOption {
  name: string;
  title: string;
  description: string;
  data: any;
}

interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskSelected: (taskData: any) => void;
}

const availableTasks: TaskOption[] = [
  {
    name: 'composer/update',
    title: 'Composer Update',
    description: 'Updates the installed Composer packages',
    data: { name: 'composer/update', config: { dry_run: false } }
  },
  {
    name: 'composer/install',
    title: 'Composer Install',
    description: 'Installs Composer packages from composer.lock',
    data: { name: 'composer/install', config: { dry_run: false } }
  },
  {
    name: 'contao/cache-clear',
    title: 'Clear Contao Cache',
    description: 'Clears the Contao application cache',
    data: { name: 'contao/cache-clear', environment: 'prod' }
  },
  {
    name: 'contao/cache-warmup',
    title: 'Warmup Contao Cache',
    description: 'Rebuilds and warms up the Contao cache for better performance',
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

export const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({
  isOpen,
  onClose,
  onTaskSelected,
}) => {
  const handleTaskSelection = (taskData: any) => {
    onClose();
    onTaskSelected(taskData);
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl">
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Task to Execute</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="stretch">
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
                _hover={{
                  borderColor: "blue.300",
                  transform: "translateY(-1px)",
                  boxShadow: "md"
                }}
                _active={{
                  transform: "translateY(0)",
                  boxShadow: "sm"
                }}
                onClick={() => handleTaskSelection(task.data)}
              >
                <VStack align="start" gap={1} width="100%">
                  <Heading size="sm" color="blue.500">{task.title}</Heading>
                  <Text fontSize="sm" color="gray.600" fontWeight="normal">
                    {task.description}
                  </Text>
                </VStack>
              </Button>
            ))}
          </VStack>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};