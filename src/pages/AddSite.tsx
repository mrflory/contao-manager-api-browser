import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  Button,
  Box,
  Flex,
  Field,
  Input,
  Select,
  VStack,
  createToaster,
} from '@chakra-ui/react';
import { ArrowLeft } from 'lucide-react';
import { useColorModeValue } from '../hooks/useColorModeValue';
import { api } from '../utils/api';

const AddSite: React.FC = () => {
  const navigate = useNavigate();
  const toaster = createToaster({
    placement: 'top',
  });
  const [url, setUrl] = useState('');
  const [scope, setScope] = useState('admin');
  const [token, setToken] = useState('');
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      const hashParams = hash.substring(1);
      const params = new URLSearchParams(hashParams);
      const extractedToken = params.get('access_token');
      
      if (extractedToken) {
        setToken(extractedToken);
        setShowTokenForm(true);
        toaster.create({
          title: 'Token Received',
          description: 'Token received! Please save it to continue.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [toaster]);

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!url) {
      toaster.create({
        title: 'Error',
        description: 'Please enter a valid URL',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    
    try {
      const managerUrlClean = url.replace(/\/$/, '');
      const clientId = 'Contao Manager API Browser';
      const redirectUri = window.location.origin + window.location.pathname + '#token';
      
      const oauthUrl = `${managerUrlClean}/#oauth?` + new URLSearchParams({
        response_type: 'token',
        scope: scope,
        client_id: clientId,
        redirect_uri: redirectUri
      }).toString();
      
      toaster.create({
        title: 'Redirecting',
        description: 'Redirecting to Contao Manager for authentication...',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      localStorage.setItem('managerUrl', managerUrlClean);
      
      setTimeout(() => {
        window.location.href = oauthUrl;
      }, 1000);
      
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  const handleTokenSave = async () => {
    if (!token.trim()) {
      toaster.create({
        title: 'Error',
        description: 'Please enter a valid token',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    
    try {
      const managerUrlStored = localStorage.getItem('managerUrl');
      if (!managerUrlStored) {
        throw new Error('Manager URL not found. Please start over.');
      }

      const response = await api.saveToken(token, managerUrlStored);
      
      if (response.success) {
        toaster.create({
          title: 'Success',
          description: 'Site added successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        throw new Error(response.error || 'Failed to save token');
      }
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="2xl">
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size="xl">Add New Site</Heading>
        <Button
          leftIcon={<ArrowLeft size={16} />}
          variant="ghost"
          onClick={() => navigate('/')}
        >
          Back to Sites
        </Button>
      </Flex>

      <Box
        bg={cardBg}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        p={8}
      >
        {!showTokenForm ? (
          <form onSubmit={handleAuthSubmit}>
            <VStack spacing={6}>
              <Field.Root required>
                <Field.Label>Contao Manager URL</Field.Label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/contao-manager.phar.php"
                />
              </Field.Root>
              
              <Field.Root required>
                <Field.Label>Required Permissions</Field.Label>
                <Select.Root value={[scope]} onValueChange={(details) => setScope(details.value[0])}>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Select permissions" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item item="read">
                      <Select.ItemText>Read Only</Select.ItemText>
                    </Select.Item>
                    <Select.Item item="update">
                      <Select.ItemText>Read + Update</Select.ItemText>
                    </Select.Item>
                    <Select.Item item="install">
                      <Select.ItemText>Read + Update + Install</Select.ItemText>
                    </Select.Item>
                    <Select.Item item="admin">
                      <Select.ItemText>Full Admin Access</Select.ItemText>
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
              </Field.Root>
              
              <Button
                type="submit"
                colorPalette="blue"
                size="lg"
                loading={loading}
                loadingText="Redirecting..."
                width="full"
              >
                Generate API Token
              </Button>
            </VStack>
          </form>
        ) : (
          <VStack spacing={6}>
            <Field.Root required>
              <Field.Label>API Token (paste from redirect URL)</Field.Label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your API token here"
                fontFamily="mono"
              />
            </Field.Root>
            
            <Button
              colorPalette="green"
              size="lg"
              onClick={handleTokenSave}
              loading={loading}
              loadingText="Saving..."
              width="full"
            >
              Save Token
            </Button>
          </VStack>
        )}
      </Box>
    </Container>
  );
};

export default AddSite;