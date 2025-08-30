import React, { useState } from 'react';
import {
  VStack,
  Button,
  Text,
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

interface TaskStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (status: 'active' | 'aborting') => void;
  loading?: boolean;
}

const statusOptions = createListCollection({
  items: [
    { label: 'Active - Start/Resume Task', value: 'active' },
    { label: 'Aborting - Stop Task', value: 'aborting' }
  ]
});

export const TaskStatusModal: React.FC<TaskStatusModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'aborting' | ''>('');

  const handleSubmit = () => {
    if (selectedStatus && (selectedStatus === 'active' || selectedStatus === 'aborting')) {
      onSubmit(selectedStatus);
      setSelectedStatus('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedStatus('');
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={({ open }) => !open && handleClose()}>
      <DialogBackdrop />
      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <DialogTitle>Patch Task Status</DialogTitle>
        </DialogHeader>
        
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Text color="fg.muted">
              Select the status to set for the current task:
            </Text>
            
            <SelectRoot
              value={selectedStatus ? [selectedStatus] : []}
              onValueChange={(details) => setSelectedStatus(details.value[0] as 'active' | 'aborting')}
              collection={statusOptions}
            >
              <SelectTrigger>
                <SelectValueText placeholder="Select task status..." />
              </SelectTrigger>
              <SelectContent portalled={false}>
                {statusOptions.items.map((item) => (
                  <SelectItem key={item.value} item={item.value}>
                    <SelectItemText>{item.label}</SelectItemText>
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </VStack>
        </DialogBody>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            colorPalette="blue"
            onClick={handleSubmit}
            disabled={!selectedStatus || loading}
            loading={loading}
          >
            Update Task Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};