import React from 'react';
import { Button } from '@chakra-ui/react';
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
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColorPalette?: 'red' | 'orange' | 'blue' | 'green';
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
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
}) => {
  const handleConfirm = () => {
    onConfirm();
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
          {typeof message === 'string' ? (
            <p>{message}</p>
          ) : (
            message
          )}
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