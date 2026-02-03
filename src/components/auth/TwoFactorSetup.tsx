import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  Text,
  Stack,
  Card,
  Field,
  Code,
  Badge,
  Grid,
  HStack,
} from '@chakra-ui/react';
import { FiShield, FiCopy, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import QRCode from 'qrcode';
import { useAuth } from '../../contexts/AuthContext';

type SetupStep = 'start' | 'qr' | 'verify' | 'backup' | 'done';

interface TwoFactorSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  onComplete,
  onCancel,
}) => {
  const { enableTwoFactor, verifyTwoFactor } = useAuth();

  const [step, setStep] = useState<SetupStep>('start');
  const [password, setPassword] = useState('');
  const [totpURI, setTotpURI] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleEnable = async () => {
    if (!password) {
      setError('Please enter your password to continue');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await enableTwoFactor(password);
      setTotpURI(result.totpURI);
      setBackupCodes(result.backupCodes);

      // Generate QR code from TOTP URI
      const qr = await QRCode.toDataURL(result.totpURI, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'L',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(qr);

      setStep('qr');
    } catch (err: any) {
      setError(err.message || 'Failed to enable two-factor authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await verifyTwoFactor(verificationCode);
      if (success) {
        setStep('backup');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch (err) {
      console.error('Failed to copy backup codes:', err);
    }
  };

  const handleComplete = () => {
    setStep('done');
    if (onComplete) {
      onComplete();
    }
  };

  const renderStartStep = () => (
    <Stack gap={4} align="center">
      <Box
        p={4}
        borderRadius="full"
        bg="blue.subtle"
        color="blue.fg"
      >
        <FiShield size={32} />
      </Box>

      <Text textAlign="center">
        Two-factor authentication adds an extra layer of security to your account.
        You'll need to enter a code from your authenticator app each time you sign in.
      </Text>

      <Text fontSize="sm" color="fg.muted" textAlign="center">
        You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
      </Text>

      <Field.Root invalid={!!error} maxW="300px" w="full">
        <Field.Label>Confirm your password</Field.Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="Enter your password"
        />
        {error && <Field.ErrorText>{error}</Field.ErrorText>}
        <Field.HelperText>
          For security, please enter your password to enable 2FA
        </Field.HelperText>
      </Field.Root>

      <Stack direction="row" gap={3} mt={4}>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          colorPalette="blue"
          onClick={handleEnable}
          loading={isLoading}
          disabled={!password}
        >
          {isLoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
        </Button>
      </Stack>
    </Stack>
  );

  const renderQRStep = () => (
    <Stack gap={4} align="center">
      <Text fontWeight="medium">
        Step 1: Scan the QR code with your authenticator app
      </Text>

      {qrCodeDataUrl && (
        <Box
          p={4}
          bg="white"
          borderRadius="md"
          borderWidth="1px"
          borderColor="border"
        >
          <img
            src={qrCodeDataUrl}
            alt="Two-factor authentication QR code"
            style={{ width: '250px', height: '250px' }}
          />
        </Box>
      )}

      <Text fontSize="sm" color="fg.muted" textAlign="center">
        Can't scan the code? Enter this secret key manually:
      </Text>

      <Code p={3} borderRadius="md" fontSize="md" fontWeight="bold" style={{ wordBreak: 'break-all', letterSpacing: '0.1em' }}>
        {totpURI.split('secret=')[1]?.split('&')[0] || 'Secret not available'}
      </Code>

      <Text fontSize="xs" color="fg.muted" textAlign="center">
        Account: {totpURI.split(':')[1]?.split('?')[0] || 'your account'}
      </Text>

      <Text fontWeight="medium" mt={4}>
        Step 2: Enter the 6-digit code from your app
      </Text>

      <Field.Root invalid={!!error} maxW="200px">
        <Input
          type="text"
          value={verificationCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setVerificationCode(value);
            setError('');
          }}
          placeholder="000000"
          textAlign="center"
          fontSize="xl"
          letterSpacing="0.5em"
          maxLength={6}
        />
        {error && <Field.ErrorText>{error}</Field.ErrorText>}
      </Field.Root>

      <Stack direction="row" gap={3} mt={4}>
        <Button variant="outline" onClick={() => setStep('start')}>
          Back
        </Button>
        <Button
          colorPalette="blue"
          onClick={handleVerify}
          loading={isLoading}
          disabled={verificationCode.length !== 6}
        >
          {isLoading ? 'Verifying...' : 'Verify and Continue'}
        </Button>
      </Stack>
    </Stack>
  );

  const renderBackupStep = () => (
    <Stack gap={4} align="center">
      <Box
        p={4}
        borderRadius="full"
        bg="yellow.subtle"
        color="yellow.fg"
      >
        <FiAlertTriangle size={32} />
      </Box>

      <Text fontWeight="medium">
        Save Your Backup Codes
      </Text>

      <Text fontSize="sm" color="fg.muted" textAlign="center">
        If you lose access to your authenticator app, you can use these backup codes
        to sign in. Each code can only be used once.
      </Text>

      <Box
        p={4}
        bg="bg.muted"
        borderRadius="md"
        borderWidth="1px"
        borderColor="border"
        w="full"
        maxW="300px"
      >
        <Grid templateColumns="repeat(2, 1fr)" gap={2}>
          {backupCodes.map((code, index) => (
            <Code key={index} p={1} textAlign="center" fontSize="sm">
              {code}
            </Code>
          ))}
        </Grid>
      </Box>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyBackupCodes}
      >
        <HStack gap={2}>
          {copiedCodes ? <FiCheck /> : <FiCopy />}
          <Text>{copiedCodes ? 'Copied!' : 'Copy Backup Codes'}</Text>
        </HStack>
      </Button>

      <Text fontSize="xs" color="fg.muted" textAlign="center">
        Store these codes in a safe place. You won't be able to see them again.
      </Text>

      <Button colorPalette="blue" onClick={handleComplete} mt={4}>
        I've Saved My Backup Codes
      </Button>
    </Stack>
  );

  const renderDoneStep = () => (
    <Stack gap={4} align="center">
      <Box
        p={4}
        borderRadius="full"
        bg="green.subtle"
        color="green.fg"
      >
        <FiCheck size={32} />
      </Box>

      <Text fontWeight="medium">
        Two-Factor Authentication Enabled
      </Text>

      <Text fontSize="sm" color="fg.muted" textAlign="center">
        Your account is now protected with two-factor authentication.
        You'll need to enter a code from your authenticator app each time you sign in.
      </Text>

      <Badge colorPalette="green" size="lg">
        <HStack gap={1}>
          <FiShield />
          <Text>2FA Active</Text>
        </HStack>
      </Badge>
    </Stack>
  );

  return (
    <Card.Root maxW="md" mx="auto">
      <Card.Header>
        <Text fontSize="xl" fontWeight="bold" textAlign="center">
          Two-Factor Authentication Setup
        </Text>
      </Card.Header>

      <Card.Body>
        {step === 'start' && renderStartStep()}
        {step === 'qr' && renderQRStep()}
        {step === 'backup' && renderBackupStep()}
        {step === 'done' && renderDoneStep()}
      </Card.Body>
    </Card.Root>
  );
};

export default TwoFactorSetup;
