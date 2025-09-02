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

interface FileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: 'composer.json' | 'composer.lock') => void;
  loading?: boolean;
}

const fileOptions = createListCollection({
  items: [
    { label: 'composer.json', value: 'composer.json' },
    { label: 'composer.lock', value: 'composer.lock' }
  ]
});

export const FileSelectionModal: React.FC<FileSelectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [selectedFile, setSelectedFile] = useState<'composer.json' | 'composer.lock' | ''>('');

  const handleSubmit = () => {
    if (selectedFile && (selectedFile === 'composer.json' || selectedFile === 'composer.lock')) {
      onSubmit(selectedFile);
      setSelectedFile('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedFile('');
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={({ open }) => !open && handleClose()}>
      <DialogBackdrop />
      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <DialogTitle>Get File Content</DialogTitle>
        </DialogHeader>
        
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Text color="fg.muted">
              Select which file content you want to retrieve:
            </Text>
            
            <SelectRoot
              value={selectedFile ? [selectedFile] : []}
              onValueChange={(details) => setSelectedFile(details.value[0] as 'composer.json' | 'composer.lock')}
              collection={fileOptions}
            >
              <SelectTrigger>
                <SelectValueText placeholder="Select a file..." />
              </SelectTrigger>
              <SelectContent portalled={false}>
                {fileOptions.items.map((item) => (
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
            disabled={!selectedFile || loading}
            loading={loading}
          >
            Get File Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};