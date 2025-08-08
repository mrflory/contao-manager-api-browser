import React, { useState } from 'react';
import { VStack, HStack, Input, Button } from '@chakra-ui/react';
import { Field } from '../ui/field';
import { CookieAuthCredentials } from '../../types/authTypes';

interface CookieAuthFormProps {
  onSubmit: (credentials: CookieAuthCredentials) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}

export const CookieAuthForm: React.FC<CookieAuthFormProps> = ({
  onSubmit,
  loading = false,
  submitLabel = "Login with Cookies",
  onCancel
}) => {
  const [credentials, setCredentials] = useState<CookieAuthCredentials>({
    username: '',
    password: '',
    totp: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create clean credentials object (omit empty TOTP)
    const cleanCredentials: CookieAuthCredentials = {
      username: credentials.username,
      password: credentials.password
    };

    if (credentials.totp && credentials.totp.trim()) {
      cleanCredentials.totp = credentials.totp.trim();
    }

    await onSubmit(cleanCredentials);
  };

  const handleInputChange = (field: keyof CookieAuthCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const isFormValid = credentials.username.trim() && credentials.password.trim();

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <VStack gap={4} width="full">
        <Field required label="Username" width="full">
          <Input
            type="text"
            value={credentials.username}
            onChange={handleInputChange('username')}
            placeholder="Enter your username"
            disabled={loading}
            width="full"
          />
        </Field>

        <Field required label="Password" width="full">
          <Input
            type="password"
            value={credentials.password}
            onChange={handleInputChange('password')}
            placeholder="Enter your password"
            disabled={loading}
            width="full"
          />
        </Field>

        <Field label="TOTP Code (if enabled)" width="full">
          <Input
            type="text"
            value={credentials.totp}
            onChange={handleInputChange('totp')}
            placeholder="Enter 6-digit TOTP code (optional)"
            maxLength={6}
            disabled={loading}
            width="full"
          />
        </Field>


        {onCancel ? (
          <HStack gap={3} width="full">
            <Button
              type="submit"
              colorPalette="blue"
              size="lg"
              flex="1"
              loading={loading}
              loadingText="Authenticating..."
              disabled={!isFormValid || loading}
            >
              {submitLabel}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </HStack>
        ) : (
          <Button
            type="submit"
            colorPalette="blue"
            size="lg"
            width="full"
            loading={loading}
            loadingText="Authenticating..."
            disabled={!isFormValid || loading}
          >
            {submitLabel}
          </Button>
        )}
      </VStack>
    </form>
  );
};