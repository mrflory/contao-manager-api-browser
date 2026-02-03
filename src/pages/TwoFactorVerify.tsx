import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Input,
  Text,
  Stack,
  Card,
  Field,
  Checkbox,
  Container,
  HStack,
} from '@chakra-ui/react';
import { FiShield } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { twoFactor } from '../lib/auth-client';

export const TwoFactorVerify: React.FC = () => {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus on input when component mounts
    inputRef.current?.focus();
  }, []);

  const handleVerify = async (e?: React.FormEvent, codeOverride?: string) => {
    e?.preventDefault();

    const codeToVerify = codeOverride || code;

    if (codeToVerify.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await twoFactor.verifyTotp({
        code: codeToVerify,
        trustDevice,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Invalid verification code');
      }

      // Successfully verified, redirect to dashboard
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setCode(''); // Clear the code on error
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');

    // Auto-submit when 6 digits are entered - pass value directly
    if (value.length === 6) {
      handleVerify(undefined, value);
    }
  };

  return (
    <Container maxW="md" py={12}>
      <Card.Root>
        <Card.Header>
          <Stack align="center" gap={4}>
            <Box
              p={4}
              borderRadius="full"
              bg="blue.subtle"
              color="blue.fg"
            >
              <FiShield size={32} />
            </Box>
            <Box textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">
                Two-Factor Authentication
              </Text>
              <Text color="fg.muted" mt={2}>
                Enter the 6-digit code from your authenticator app
              </Text>
            </Box>
          </Stack>
        </Card.Header>

        <Card.Body>
          <form onSubmit={handleVerify}>
            <Stack gap={4}>
              <Field.Root invalid={!!error}>
                <Field.Label textAlign="center">Verification Code</Field.Label>
                <Input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="000000"
                  textAlign="center"
                  fontSize="2xl"
                  letterSpacing="0.5em"
                  maxLength={6}
                  disabled={isLoading}
                />
                {error && <Field.ErrorText textAlign="center">{error}</Field.ErrorText>}
              </Field.Root>

              <Box>
                <Checkbox.Root
                  checked={trustDevice}
                  onCheckedChange={(e) => setTrustDevice(!!e.checked)}
                  disabled={isLoading}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>Trust this device for 30 days</Checkbox.Label>
                </Checkbox.Root>
              </Box>

              <Button
                type="submit"
                colorPalette="blue"
                size="lg"
                width="full"
                loading={isLoading}
                disabled={code.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>
            </Stack>
          </form>
        </Card.Body>

        <Card.Footer>
          <Stack gap={3} width="full">
            <Text textAlign="center" fontSize="sm" color="fg.muted">
              Open your authenticator app (like Google Authenticator, Authy, or 1Password)
              and enter the 6-digit code shown for your account.
            </Text>
            <HStack justify="center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Back to Sign In
              </Button>
            </HStack>
          </Stack>
        </Card.Footer>
      </Card.Root>
    </Container>
  );
};

export default TwoFactorVerify;
