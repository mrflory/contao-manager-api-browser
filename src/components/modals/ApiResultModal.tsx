import React from 'react';
import { Code } from '@chakra-ui/react';
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
import { Button } from '@chakra-ui/react';

export interface ApiResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  maxHeight?: string;
}

export const ApiResultModal: React.FC<ApiResultModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  maxHeight = '70vh',
}) => {
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody maxH={maxHeight} overflowY="auto">
          {children}
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export interface JsonDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const JsonDisplayModal: React.FC<JsonDisplayModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
  size = 'lg',
}) => {
  return (
    <ApiResultModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
    >
      <Code 
        display="block" 
        whiteSpace="pre" 
        p={3} 
        borderRadius="md"
        maxH="500px"
        overflowY="auto"
      >
        {JSON.stringify(data, null, 2)}
      </Code>
    </ApiResultModal>
  );
};