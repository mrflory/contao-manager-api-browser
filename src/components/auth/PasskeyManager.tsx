import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Input,
  Text,
  Stack,
  Card,
  Field,
  Badge,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import { FiKey, FiTrash2, FiPlus, FiSmartphone, FiMonitor } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

interface Passkey {
  id: string;
  name?: string;
  createdAt: Date | null;
}

interface PasskeyManagerProps {
  onPasskeyAdded?: () => void;
}

export const PasskeyManager: React.FC<PasskeyManagerProps> = ({
  onPasskeyAdded,
}) => {
  const { registerPasskey, listPasskeys, deletePasskey, error, clearError } = useAuth();

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    loadPasskeys();
  }, []);

  const loadPasskeys = async () => {
    try {
      const keys = await listPasskeys();
      setPasskeys(keys);
    } catch (err) {
      console.error('Failed to load passkeys:', err);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setLocalError(null);
    clearError();

    try {
      await registerPasskey(newPasskeyName || undefined);
      setNewPasskeyName('');
      setShowAddForm(false);
      await loadPasskeys();

      if (onPasskeyAdded) {
        onPasskeyAdded();
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to register passkey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    setLocalError(null);
    clearError();

    try {
      await deletePasskey(id);
      await loadPasskeys();
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete passkey');
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDeviceIcon = (name?: string) => {
    if (!name) return FiKey;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('phone') || lowerName.includes('mobile') || lowerName.includes('iphone') || lowerName.includes('android')) {
      return FiSmartphone;
    }
    if (lowerName.includes('laptop') || lowerName.includes('desktop') || lowerName.includes('macbook') || lowerName.includes('pc')) {
      return FiMonitor;
    }
    return FiKey;
  };

  return (
    <Card.Root>
      <Card.Header>
        <Stack direction="row" justify="space-between" align="center">
          <Box>
            <Text fontSize="lg" fontWeight="bold">
              Passkeys
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Passkeys are a secure, passwordless way to sign in to your account.
            </Text>
          </Box>
          <Badge colorPalette={passkeys.length > 0 ? 'green' : 'gray'}>
            {passkeys.length} {passkeys.length === 1 ? 'passkey' : 'passkeys'}
          </Badge>
        </Stack>
      </Card.Header>

      <Card.Body>
        <Stack gap={4}>
          {/* Error display */}
          {(localError || error) && (
            <Box
              p={3}
              borderRadius="md"
              bg="red.subtle"
              borderWidth="1px"
              borderColor="red.emphasized"
            >
              <Text color="red.fg" fontSize="sm">
                {localError || error}
              </Text>
            </Box>
          )}

          {/* Existing passkeys */}
          {passkeys.length > 0 ? (
            <Stack gap={3}>
              {passkeys.map((passkey) => {
                const DeviceIcon = getDeviceIcon(passkey.name);
                return (
                  <Box
                    key={passkey.id}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="border"
                  >
                    <Stack direction="row" justify="space-between" align="center">
                      <Stack direction="row" align="center" gap={3}>
                        <Box
                          p={2}
                          borderRadius="md"
                          bg="bg.muted"
                        >
                          <DeviceIcon size={20} />
                        </Box>
                        <Box>
                          <Text fontWeight="medium">
                            {passkey.name || 'Unnamed Passkey'}
                          </Text>
                          <Text fontSize="sm" color="fg.muted">
                            Added {formatDate(passkey.createdAt)}
                          </Text>
                        </Box>
                      </Stack>
                      <IconButton
                        aria-label="Delete passkey"
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        loading={isDeleting === passkey.id}
                        onClick={() => handleDelete(passkey.id)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Box
              p={6}
              textAlign="center"
              borderWidth="1px"
              borderRadius="md"
              borderStyle="dashed"
              borderColor="border"
            >
              <FiKey size={32} style={{ margin: '0 auto', opacity: 0.5 }} />
              <Text mt={2} color="fg.muted">
                No passkeys registered yet
              </Text>
              <Text fontSize="sm" color="fg.muted" mt={1}>
                Add a passkey to enable passwordless sign-in
              </Text>
            </Box>
          )}

          {/* Add passkey form */}
          {showAddForm ? (
            <Box
              p={4}
              borderWidth="1px"
              borderRadius="md"
              borderColor="blue.emphasized"
              bg="blue.subtle"
            >
              <Stack gap={3}>
                <Text fontWeight="medium">Add a New Passkey</Text>
                <Field.Root>
                  <Field.Label>Passkey Name (optional)</Field.Label>
                  <Input
                    placeholder="e.g., MacBook Pro, iPhone 15"
                    value={newPasskeyName}
                    onChange={(e) => setNewPasskeyName(e.target.value)}
                    disabled={isLoading}
                  />
                  <Field.HelperText>
                    A name helps you identify this passkey later
                  </Field.HelperText>
                </Field.Root>

                <Text fontSize="sm" color="fg.muted">
                  Your browser will prompt you to create a passkey using your device's
                  built-in authentication (fingerprint, face recognition, or PIN).
                </Text>

                <Stack direction="row" gap={2} justify="flex-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewPasskeyName('');
                      setLocalError(null);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    colorPalette="blue"
                    onClick={handleRegister}
                    loading={isLoading}
                  >
                    {isLoading ? 'Registering...' : 'Create Passkey'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ) : (
            <Button
              variant="outline"
              width="full"
              onClick={() => setShowAddForm(true)}
            >
              <HStack gap={2}>
                <FiPlus />
                <Text>Add Passkey</Text>
              </HStack>
            </Button>
          )}
        </Stack>
      </Card.Body>

      <Card.Footer>
        <Text fontSize="xs" color="fg.muted">
          Passkeys use your device's biometric authentication (fingerprint, face recognition)
          or a PIN to securely sign you in without a password.
        </Text>
      </Card.Footer>
    </Card.Root>
  );
};

export default PasskeyManager;
