import React, { useState } from 'react';
import { createListCollection } from '@chakra-ui/react';
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
import { SelectTrigger, SelectItem, SelectRoot, SelectValueText, SelectContent, SelectItemText } from '../ui/select';
import { Field } from '../ui/field';
import { Checkbox } from '../ui/checkbox';

interface MigrationFormData {
  hash: string;
  type: string;
  withDeletes: boolean;
}

interface MigrationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: MigrationFormData) => void;
  loading?: boolean;
}

const migrationTypes = [
  { label: "All migrations and schema updates", value: "" },
  { label: "Migrations only", value: "migrations-only" },
  { label: "Schema updates only", value: "schema-only" }
];

export const MigrationConfigModal: React.FC<MigrationConfigModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [formData, setFormData] = useState<MigrationFormData>({
    hash: '',
    type: '',
    withDeletes: false
  });


  const collection = createListCollection({
    items: migrationTypes
  });

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  const handleClose = () => {
    // Reset form data when closing
    setFormData({
      hash: '',
      type: '',
      withDeletes: false
    });
    onClose();
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && handleClose()} size="lg">
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Database Migration</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Text fontSize="md" color="gray.600" mb={2}>
              Configure database migration parameters:
            </Text>
            
            <Field label="Migration Hash (optional)">
              <Input
                value={formData.hash}
                onChange={(e) => setFormData(prev => ({ ...prev, hash: e.target.value }))}
                placeholder="Leave empty for dry-run to get pending migrations"
              />
            </Field>
            
            <Field label="Migration Type">
              <SelectRoot 
                value={[formData.type]}
                onValueChange={(details) => setFormData(prev => ({ ...prev, type: details.value[0] }))}
                collection={collection}
                positioning={{ strategy: "fixed" }}
              >
                <SelectTrigger>
                  <SelectValueText placeholder="Select migration type" />
                </SelectTrigger>
                <SelectContent portalled={false}>
                  {migrationTypes.map((type) => (
                    <SelectItem key={type.value} item={type}>
                      <SelectItemText>{type.label}</SelectItemText>
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Field>

            <Field>
              <Checkbox 
                checked={formData.withDeletes}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, withDeletes: !!checked.checked }))}
              >
                Execute migrations including DROP queries
              </Checkbox>
            </Field>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorPalette="orange"
            onClick={handleSubmit}
            loading={loading}
          >
            Start Migration
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};