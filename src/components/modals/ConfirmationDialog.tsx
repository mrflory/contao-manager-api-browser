import React, { useState } from 'react';
import { Button, VStack } from '@chakra-ui/react';
import { Checkbox } from '../ui/checkbox';
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

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (additionalOptions?: { deleteToken?: boolean }) => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColorPalette?: 'red' | 'orange' | 'blue' | 'green';
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  // Optional token deletion checkbox
  showTokenDeletionOption?: boolean;
  tokenDeletionLabel?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColorPalette = 'red',
  isLoading = false,
  size = 'sm',
  showTokenDeletionOption = false,
  tokenDeletionLabel = 'Also delete authentication token',
}) => {
  const [deleteToken, setDeleteToken] = useState(false);

  const handleConfirm = () => {
    onConfirm(showTokenDeletionOption ? { deleteToken } : undefined);
  };

  return (
    <DialogRoot 
      open={isOpen} 
      onOpenChange={(details) => !details.open && onClose()} 
      size={size}
    >
      <DialogBackdrop />
      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <DialogTitle fontSize="lg" fontWeight="bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="start">
            {typeof message === 'string' ? (
              <p>{message}</p>
            ) : (
              message
            )}
            
            {showTokenDeletionOption && (
              <Checkbox
                checked={deleteToken}
                onCheckedChange={(checked) => setDeleteToken(Boolean(checked.checked))}
                disabled={isLoading}
              >
                {tokenDeletionLabel}
              </Checkbox>
            )}
          </VStack>
        </DialogBody>
        <DialogFooter>
          <Button 
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button 
            colorPalette={confirmColorPalette}
            onClick={handleConfirm}
            loading={isLoading}
            ml={3}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};