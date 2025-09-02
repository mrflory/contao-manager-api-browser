import React, { useState, useEffect } from 'react';
import {
  VStack,
  Button,
  Text,
  Input,
  createListCollection,
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
import { Field } from '../ui/field';

interface TokenCreationForm {
  username: string;
  clientId: string;
  scope: string;
  grantType: string;
}

interface TokenCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: TokenCreationForm) => void;
  loading?: boolean;
  initialValues?: Partial<TokenCreationForm>;
}

const scopeOptions = createListCollection({
  items: [
    { label: 'Admin - Full access to all operations', value: 'admin' },
    { label: 'Install - Package installation and management', value: 'install' },
    { label: 'Update - Package updates and migrations', value: 'update' },
    { label: 'Read - Read-only access to information', value: 'read' },
  ]
});

const grantTypeOptions = createListCollection({
  items: [
    { label: 'Regular Token - Standard persistent token', value: '' },
    { label: 'One-time Token - Expires quickly for temporary use', value: 'one-time' },
  ]
});

export const TokenCreationModal: React.FC<TokenCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  initialValues,
}) => {
  const [formData, setFormData] = useState<TokenCreationForm>({
    username: initialValues?.username || '',
    clientId: initialValues?.clientId || 'contao-manager-api',
    scope: initialValues?.scope || 'admin',
    grantType: initialValues?.grantType || 'one-time'
  });

  // Update form data when initialValues change or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: initialValues?.username || '',
        clientId: initialValues?.clientId || 'contao-manager-api',
        scope: initialValues?.scope || 'admin',
        grantType: initialValues?.grantType || 'one-time'
      });
    }
  }, [isOpen, initialValues]);

  const handleSubmit = () => {
    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    // Reset form data when closing
    setFormData({
      username: initialValues?.username || '',
      clientId: initialValues?.clientId || 'contao-manager-api',
      scope: initialValues?.scope || 'admin',
      grantType: initialValues?.grantType || 'one-time'
    });
    onClose();
  };

  const isFormValid = formData.username.trim() && formData.clientId.trim() && formData.scope.trim();

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && handleClose()} size="md">
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Token</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Text fontSize="md" color="gray.600" mb={2}>
              Create a new API token for accessing Contao Manager functionality:
            </Text>
            
            <Field label="Username" required helperText="The username to create the token for">
              <Input
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                autoComplete="username"
              />
            </Field>
            
            <Field label="Client ID" required helperText="Identifier for the application using this token">
              <Input
                value={formData.clientId}
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="Client identifier"
              />
            </Field>
            
            <Field label="Scope" required helperText="Permission level for the token">
              <SelectRoot
                value={[formData.scope]}
                onValueChange={(details) => setFormData(prev => ({ ...prev, scope: details.value[0] }))}
                collection={scopeOptions}
              >
                <SelectTrigger>
                  <SelectValueText placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent portalled={false}>
                  {scopeOptions.items.map((option) => (
                    <SelectItem key={option.value} item={option.value}>
                      <SelectItemText>{option.label}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Field>
            
            <Field label="Grant Type" helperText="Token behavior and expiration">
              <SelectRoot
                value={[formData.grantType]}
                onValueChange={(details) => setFormData(prev => ({ ...prev, grantType: details.value[0] }))}
                collection={grantTypeOptions}
              >
                <SelectTrigger>
                  <SelectValueText placeholder="Select grant type" />
                </SelectTrigger>
                <SelectContent portalled={false}>
                  {grantTypeOptions.items.map((option) => (
                    <SelectItem key={option.value} item={option.value}>
                      <SelectItemText>{option.label}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Field>

            <Text fontSize="sm" color="gray.500">
              After creation, the token will be displayed once. Make sure to copy and store it securely.
            </Text>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorPalette="blue"
            onClick={handleSubmit}
            loading={loading}
            disabled={!isFormValid || loading}
          >
            Create Token
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};