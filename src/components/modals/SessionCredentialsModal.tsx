import React, { useState } from 'react';
import {
  VStack,
  HStack,
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

interface SessionCredentials {
  username?: string;
  password?: string;
  totp?: string;
  token?: string;
}


type AuthMode = 'credentials' | 'token';

interface SessionCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (credentials: SessionCredentials) => void;
  loading?: boolean;
}

export const SessionCredentialsModal: React.FC<SessionCredentialsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('credentials');
  const [credentials, setCredentials] = useState<SessionCredentials>({
    username: '',
    password: '',
    totp: '',
    token: ''
  });

  const handleSubmit = () => {
    const submitData: SessionCredentials = {};
    
    if (authMode === 'credentials') {
      // Username/password authentication
      submitData.username = credentials.username;
      submitData.password = credentials.password;
      if (credentials.totp?.trim()) {
        submitData.totp = credentials.totp;
      }
    } else {
      // Token authentication
      submitData.token = credentials.token;
    }
    
    onSubmit(submitData);
    onClose();
  };

  const handleClose = () => {
    // Reset form data when closing
    setCredentials({
      username: '',
      password: '',
      totp: '',
      token: ''
    });
    setAuthMode('credentials');
    onClose();
  };


  const isFormValid = authMode === 'credentials' 
    ? (credentials.username?.trim() && credentials.password?.trim())
    : credentials.token?.trim();

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && handleClose()} size="md">
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Session (Login)</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Text fontSize="md" color="gray.600" mb={2}>
              Create a new session using credentials or a one-time token:
            </Text>
            
            {/* Authentication Mode Selector */}
            <HStack gap={2} justify="center">
              <Button
                variant={authMode === 'credentials' ? 'solid' : 'outline'}
                colorPalette={authMode === 'credentials' ? 'blue' : 'gray'}
                onClick={() => setAuthMode('credentials')}
                size="sm"
              >
                Username/Password
              </Button>
              <Button
                variant={authMode === 'token' ? 'solid' : 'outline'}
                colorPalette={authMode === 'token' ? 'blue' : 'gray'}
                onClick={() => setAuthMode('token')}
                size="sm"
              >
                Login Token
              </Button>
            </HStack>
            
            {authMode === 'credentials' ? (
              <>
                <Field label="Username" required>
                  <Input
                    value={credentials.username || ''}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    autoComplete="username"
                  />
                </Field>
                
                <Field label="Password" required>
                  <Input
                    type="password"
                    value={credentials.password || ''}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </Field>
                
                <Field label="TOTP Code (optional)">
                  <Input
                    value={credentials.totp || ''}
                    onChange={(e) => setCredentials(prev => ({ ...prev, totp: e.target.value }))}
                    placeholder="Enter TOTP/2FA code if required"
                    autoComplete="one-time-code"
                    maxLength={6}
                  />
                </Field>

                <Text fontSize="sm" color="gray.500">
                  The TOTP field is optional. Only provide it if two-factor authentication is enabled.
                </Text>
              </>
            ) : (
              <>
                <Field label="Login Token" required>
                  <Input
                    value={credentials.token || ''}
                    onChange={(e) => setCredentials(prev => ({ ...prev, token: e.target.value }))}
                    placeholder="Enter login token"
                    type="password"
                  />
                </Field>

                <Text fontSize="sm" color="gray.500">
                  Use a login token for passwordless authentication. Create tokens in the Expert tab.
                </Text>
              </>
            )}
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
            disabled={!isFormValid}
          >
            Create Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};