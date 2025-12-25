import React, { useState } from 'react';
import {
  Dialog,
  Button,
  VStack,
  Text,
  Alert,
  Box,
  HStack,
  Badge
} from '@chakra-ui/react';
import { Checkbox } from '../ui/checkbox';
import { LuTriangle as AlertTriangle } from 'react-icons/lu';

export interface RestoreBackupInfo {
  snapshotId: string;
  snapshotFileCount: number;
  databaseBackup: string | null;
  timestamp: string;
}

export interface RestoreBackupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (restoreComposer: boolean, restoreDatabase: boolean) => void;
  backupInfo: RestoreBackupInfo;
  isRestoring: boolean;
}

export const RestoreBackupDialog: React.FC<RestoreBackupDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  backupInfo,
  isRestoring
}) => {
  const [restoreComposer, setRestoreComposer] = useState(true);
  const [restoreDatabase, setRestoreDatabase] = useState(!!backupInfo.databaseBackup);

  const handleConfirm = () => {
    onConfirm(restoreComposer, restoreDatabase);
  };

  const canRestore = restoreComposer || restoreDatabase;

  return (
    <Dialog.Root open={isOpen} onOpenChange={() => !isRestoring && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Restore Backup</Dialog.Title>
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={4} align="stretch">
              <Alert.Root status="warning" variant="subtle">
                <Alert.Indicator>
                  <AlertTriangle />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Title>Warning: This will overwrite current state</Alert.Title>
                  <Alert.Description>
                    Selected components will be restored to the state from {backupInfo.timestamp}.
                    Your current configuration will be replaced.
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>

              <Box>
                <Text fontWeight="bold" mb={2}>Select components to restore:</Text>
                <VStack gap={3} align="stretch">
                  <HStack justify="space-between" align="center">
                    <Checkbox
                      checked={restoreComposer}
                      onCheckedChange={(e) => setRestoreComposer(e.checked === true)}
                      disabled={isRestoring}
                    >
                      <Text>Composer Files</Text>
                    </Checkbox>
                    <Badge colorPalette="blue">{backupInfo.snapshotFileCount} files</Badge>
                  </HStack>

                  <HStack justify="space-between" align="center">
                    <Checkbox
                      checked={restoreDatabase}
                      onCheckedChange={(e) => setRestoreDatabase(e.checked === true)}
                      disabled={isRestoring || !backupInfo.databaseBackup}
                    >
                      <Text>Database Backup</Text>
                    </Checkbox>
                    <Badge colorPalette={backupInfo.databaseBackup ? "green" : "gray"}>
                      {backupInfo.databaseBackup || 'Not available'}
                    </Badge>
                  </HStack>
                </VStack>
              </Box>

              {(restoreComposer || restoreDatabase) && (
                <Alert.Root status="info" variant="subtle">
                  <Alert.Content>
                    <Alert.Description>
                      A safety backup will be created automatically before restoration begins.
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <Button variant="outline" disabled={isRestoring}>
                Cancel
              </Button>
            </Dialog.CloseTrigger>
            <Button
              colorPalette="red"
              onClick={handleConfirm}
              loading={isRestoring}
              disabled={isRestoring || !canRestore}
            >
              {isRestoring ? 'Restoring...' : 'Restore Selected'}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
