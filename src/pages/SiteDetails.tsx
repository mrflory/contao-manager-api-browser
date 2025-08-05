import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Button,
  Box,
  Flex,
  VStack,
  Center,
  Tabs,
  Alert,
  Editable,
  IconButton,
  Link,
} from '@chakra-ui/react';
import { LuArrowLeft as ArrowLeft, LuPencil as Edit, LuCheck as Check, LuX as X } from 'react-icons/lu';
import { Config } from '../types';
import { useApiCall } from '../hooks/useApiCall';
import { useAuth } from '../hooks/useAuth';
import { SiteApiService } from '../services/apiCallService';
import { LoadingState } from '../components/display/LoadingState';
import { SiteInfoTab } from '../components/site-details/SiteInfoTab';
import { SiteManagement } from '../components/site-details/SiteManagement';
import { ExpertTab } from '../components/site-details/ExpertTab';
import { LogsTab } from '../components/site-details/LogsTab';
import { UpdateWorkflow } from '../components/UpdateWorkflow';
import { decodeUrlParam } from '../utils/urlUtils';
import { useToastNotifications, TOAST_MESSAGES } from '../hooks/useToastNotifications';

const SiteDetails: React.FC = () => {
  const { siteUrl } = useParams<{ siteUrl: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config | null>(null);
  
  const toast = useToastNotifications();

  const { actions: authActions } = useAuth({
    onAuthSuccess: () => {
      loadConfig.execute();
    },
  });

  const loadConfig = useApiCall(
    () => SiteApiService.getConfig(),
    {
      onSuccess: (data: any) => {
        setConfig(data);
      },
      showErrorToast: true,
    }
  );

  const updateSiteName = useApiCall(
    (params?: { siteUrl: string; newName: string }) => {
      if (!params) throw new Error('Parameters required for updateSiteName');
      return SiteApiService.updateSiteName(params.siteUrl, params.newName);
    },
    {
      onSuccess: () => {
        toast.showSuccess(TOAST_MESSAGES.SITE_NAME_UPDATED);
        loadConfig.execute();
      },
    }
  );

  useEffect(() => {
    loadConfig.execute();
  }, []);

  // Handle OAuth callback for reauthentication
  useEffect(() => {
    authActions.handleReauthCallback();
  }, [config]);

  const decodedSiteUrl = decodeUrlParam(siteUrl || '');
  const site = config?.sites?.[decodedSiteUrl];

  const handleUpdateSiteName = async (newName: string) => {
    if (!site || newName === site.name) return;
    await updateSiteName.execute({ siteUrl: site.url, newName });
  };

  const handleSiteRemoved = () => {
    navigate('/');
  };

  const handleSiteUpdated = () => {
    loadConfig.execute();
  };

  if (loadConfig.state.loading) {
    return (
      <Container maxW="4xl">
        <LoadingState message="Loading site details..." />
      </Container>
    );
  }

  if (!site) {
    return (
      <Container maxW="4xl">
        <Center h="400px">
          <VStack gap={6}>
            <Alert.Root status="error" borderRadius="lg" p={6} maxW="md">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title fontSize="xl" mb={2}>
                  Site Not Found
                </Alert.Title>
                <Alert.Description fontSize="md">
                  The requested site could not be found. It may have been removed or the URL is incorrect.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
            <Button 
              colorPalette="blue"
              size="lg"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={16} /> Back to Sites
            </Button>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="4xl">
      <Flex justify="space-between" align="center" mb={8}>
        <VStack align="start" gap={2}>
          <Editable.Root
            defaultValue={site.name}
            onValueCommit={(details) => handleUpdateSiteName(details.value)}
            fontSize="3xl"
            fontWeight="bold"
          >
            <Flex align="center" gap={2}>
              <Editable.Preview />
              <Editable.Input />
              <Editable.Control>
                <Editable.EditTrigger asChild>
                  <IconButton variant="ghost" size="sm">
                    <Edit />
                  </IconButton>
                </Editable.EditTrigger>
                <Editable.CancelTrigger asChild>
                  <IconButton variant="outline" size="sm">
                    <X />
                  </IconButton>
                </Editable.CancelTrigger>
                <Editable.SubmitTrigger asChild>
                  <IconButton variant="outline" size="sm">
                    <Check />
                  </IconButton>
                </Editable.SubmitTrigger>
              </Editable.Control>
            </Flex>
          </Editable.Root>
          <Link 
            href={site.url} 
            target="_blank" 
            rel="noopener noreferrer"
            fontSize="sm"
            fontFamily="mono"
            color="gray.600"
          >
            {site.url}
          </Link>
        </VStack>
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} /> Back to Sites
        </Button>
      </Flex>

      <Box borderWidth="1px" borderRadius="lg" p={8}>
        <Tabs.Root colorPalette="blue" variant="line" defaultValue="site-info">
          <Tabs.List>
            <Tabs.Trigger value="site-info">Site Info</Tabs.Trigger>
            <Tabs.Trigger value="update">Update</Tabs.Trigger>
            <Tabs.Trigger value="expert">Expert</Tabs.Trigger>
            <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
          </Tabs.List>

          {/* Tab 1: Site Info */}
          <Tabs.Content value="site-info">
            <VStack gap={6} align="stretch">
              <SiteInfoTab site={site} />
              
              <Box borderWidth="1px" borderRadius="md" p={6}>
                <SiteManagement 
                  site={site}
                  onSiteUpdated={handleSiteUpdated}
                  onSiteRemoved={handleSiteRemoved}
                />
              </Box>
            </VStack>
          </Tabs.Content>

          {/* Tab 2: Update */}
          <Tabs.Content value="update">
            <VStack gap={6} align="stretch">
              <UpdateWorkflow />
            </VStack>
          </Tabs.Content>

          {/* Tab 3: Expert */}
          <Tabs.Content value="expert">
            <ExpertTab />
          </Tabs.Content>

          {/* Tab 4: Logs */}
          <Tabs.Content value="logs">
            <LogsTab site={site} />
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Container>
  );
};

export default SiteDetails;