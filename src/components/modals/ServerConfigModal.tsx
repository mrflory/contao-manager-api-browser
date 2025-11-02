import React, { useState, useEffect } from 'react';
import {
  VStack,
  Button,
  Text,
  Input,
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
import { Field } from '../ui/field';
import { Switch } from '../ui/switch';

interface ServerConfig {
  php_cli?: string;
  cloud?: boolean;
}

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: ServerConfig) => void;
  loading?: boolean;
  initialValues?: ServerConfig;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
  initialValues,
}) => {
  const [config, setConfig] = useState<ServerConfig>({
    php_cli: '',
    cloud: false,
  });

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues) {
      setConfig({
        php_cli: initialValues.php_cli || '',
        cloud: initialValues.cloud || false,
      });
    }
  }, [initialValues]);

  const handleSubmit = () => {
    // Only include fields that have values
    const submitData: ServerConfig = {};

    if (config.php_cli?.trim()) {
      submitData.php_cli = config.php_cli.trim();
    }

    // Always include cloud setting
    submitData.cloud = config.cloud;

    onSubmit(submitData);
    onClose();
  };

  const handleClose = () => {
    // Reset form data when closing
    setConfig({
      php_cli: '',
      cloud: false,
    });
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && handleClose()} size="md">
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Server Configuration</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Text fontSize="md" color="gray.600" mb={2}>
              Configure server settings for the Contao Manager:
            </Text>

            <Field label="PHP CLI Path" helperText="Path to the PHP command line executable">
              <Input
                value={config.php_cli || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, php_cli: e.target.value }))}
                placeholder="e.g., /usr/bin/php or php"
              />
            </Field>

            <Field label="Composer Resolver Cloud">
              <Switch
                checked={config.cloud || false}
                onCheckedChange={(details: { checked: boolean }) => setConfig(prev => ({ ...prev, cloud: details.checked }))}
              >
                <Text fontSize="sm">Enable Composer Resolver Cloud for package updates</Text>
              </Switch>
            </Field>

            <Text fontSize="sm" color="gray.500">
              Leave PHP CLI path empty to use the detected default value. The Composer Resolver Cloud
              helps resolve package dependencies faster during updates.
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
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};
