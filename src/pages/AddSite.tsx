import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Heading,
  Button,
  Box,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  Alert,
  useToast,
} from '@chakra-ui/react';
import { ArrowLeft } from 'lucide-react';
import { useColorModeValue } from '../hooks/useColorModeValue';
import { api } from '../utils/api';

const AddSite: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
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
        toast({
          title: 'Token Received',
          description: 'Token received! Please save it to continue.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [toast]);

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!url) {
      toast({
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
      
      toast({
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
      toast({
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
      toast({
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
        toast({
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
      toast({
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
              <FormControl isRequired>
                <FormLabel>Contao Manager URL</FormLabel>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/contao-manager.phar.php"
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Required Permissions</FormLabel>
                <Select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  <option value="read">Read Only</option>
                  <option value="update">Read + Update</option>
                  <option value="install">Read + Update + Install</option>
                  <option value="admin">Full Admin Access</option>
                </Select>
              </FormControl>
              
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
            <FormControl isRequired>
              <FormLabel>API Token (paste from redirect URL)</FormLabel>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your API token here"
                fontFamily="mono"
              />
            </FormControl>
            
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