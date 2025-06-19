import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createListCollection } from '@chakra-ui/react';
import {
  Container,
  Heading,
  Button,
  Box,
  Flex,
  Input,
  VStack,
  createToaster,
} from '@chakra-ui/react';
import { LuArrowLeft } from 'react-icons/lu';
import { SelectTrigger, SelectItem, SelectRoot, SelectValueText, SelectContent, SelectItemText } from '../components/ui/select';
import { Field } from '../components/ui/field'
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
          type: 'success',
          duration: 5000,
          closable: true,
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
        type: 'error',
        duration: 3000,
        closable: true,
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
        type: 'info',
        duration: 3000,
        closable: true,
      });
      
      localStorage.setItem('managerUrl', managerUrlClean);
      
      setTimeout(() => {
        window.location.href = oauthUrl;
      }, 1000);
      
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        duration: 5000,
        closable: true,
      });
      setLoading(false);
    }
  };

  const handleTokenSave = async () => {
    if (!token.trim()) {
      toaster.create({
        title: 'Error',
        description: 'Please enter a valid token',
        type: 'error',
        duration: 3000,
        closable: true,
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
          type: 'success',
          duration: 3000,
          closable: true,
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
        type: 'error',
        duration: 5000,
        closable: true,
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
          variant="ghost"
          onClick={() => navigate('/')}
        >
          <LuArrowLeft size={16} /> Back to Sites
        </Button>
      </Flex>

      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={8}
      >
        {!showTokenForm ? (
          <form onSubmit={handleAuthSubmit}>
            <VStack gap={6}>
              <Field required label="Contao Manager URL">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/contao-manager.phar.php"
                />
              </Field>
              
              <Field required label="Required Permissions">
                <SelectRoot 
                  value={[scope]} 
                  onValueChange={(details) => setScope(details.value[0])}
                  collection={createListCollection({
                    items: [
                      { label: "Read Only", value: "read" },
                      { label: "Read + Update", value: "update" },
                      { label: "Read + Update + Install", value: "install" },
                      { label: "Full Admin Access", value: "admin" }
                    ]
                  })}
                >
                  <SelectTrigger>
                    <SelectValueText placeholder="Select permissions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem item="read">
                      <SelectItemText>Read Only</SelectItemText>
                    </SelectItem>
                    <SelectItem item="update">
                      <SelectItemText>Read + Update</SelectItemText>
                    </SelectItem>
                    <SelectItem item="install">
                      <SelectItemText>Read + Update + Install</SelectItemText>
                    </SelectItem>
                    <SelectItem item="admin">
                      <SelectItemText>Full Admin Access</SelectItemText>
                    </SelectItem>
                  </SelectContent>
                </SelectRoot>
              </Field>
              
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
          <VStack gap={6}>
            <Field required label="API Token (paste from redirect URL)">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your API token here"
                fontFamily="mono"
              />
            </Field>
            
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