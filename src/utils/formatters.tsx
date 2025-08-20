import {
  VStack,
  Box,
  Text,
  Badge,
  Heading,
  Code,
  Table,
  Alert,
  Link,
} from '@chakra-ui/react';
import {
  AccordionRoot,
  AccordionItem,
  AccordionItemTrigger,
  AccordionItemContent,
} from '../components/ui/accordion';
import { CodeBlock } from '../components/ui/code-block';
import { UpdateStatus, TokenInfo } from '../types';

export const formatUpdateStatus = (data: UpdateStatus) => {
  return (
    <VStack gap={4} align="stretch">
      {data.composer && (
        <Box p={4} borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Composer Status</Heading>
          {data.composer.current_version && data.composer.latest_version ? (
            <VStack gap={2} align="start">
              <Text><strong>Current Version:</strong> {data.composer.current_version}</Text>
              <Text><strong>Latest Version:</strong> {data.composer.latest_version}</Text>
              {data.composer.current_version !== data.composer.latest_version ? (
                <Badge colorPalette="orange">Update Available!</Badge>
              ) : (
                <Badge colorPalette="green">Up to Date</Badge>
              )}
            </VStack>
          ) : null}
          <AccordionRoot collapsible mt={4}>
            <AccordionItem value="response-details">
              <AccordionItemTrigger>
                <Box flex="1" textAlign="left">
                  Show full response
                </Box>
              </AccordionItemTrigger>
              <AccordionItemContent pb={4}>
                <CodeBlock language="json" showLineNumbers>
                  {JSON.stringify(data.composer, null, 2)}
                </CodeBlock>
              </AccordionItemContent>
            </AccordionItem>
          </AccordionRoot>
        </Box>
      )}
      
      {data.selfUpdate && (
        <Box p={4} borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Self-Update Status</Heading>
          {data.selfUpdate.current_version && data.selfUpdate.latest_version ? (
            <VStack gap={2} align="start">
              <Text><strong>Current Version:</strong> {data.selfUpdate.current_version}</Text>
              <Text><strong>Latest Version:</strong> {data.selfUpdate.latest_version}</Text>
              {data.selfUpdate.current_version !== data.selfUpdate.latest_version ? (
                <Badge colorPalette="orange">Update Available!</Badge>
              ) : (
                <Badge colorPalette="green">Up to Date</Badge>
              )}
            </VStack>
          ) : null}
          <AccordionRoot collapsible mt={4}>
            <AccordionItem value="error-details">
              <AccordionItemTrigger>
                <Box flex="1" textAlign="left">
                  Show full response
                </Box>
              </AccordionItemTrigger>
              <AccordionItemContent pb={4}>
                <CodeBlock language="json" showLineNumbers>
                  {JSON.stringify(data.selfUpdate, null, 2)}
                </CodeBlock>
              </AccordionItemContent>
            </AccordionItem>
          </AccordionRoot>
        </Box>
      )}

      {data.errors && Object.keys(data.errors).length > 0 && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Errors!</Alert.Title>
            <Alert.Description>
              {data.errors.composer && (
                <Text><strong>Composer:</strong> {data.errors.composer}</Text>
              )}
              {data.errors.selfUpdate && (
                <Text><strong>Self-Update:</strong> {data.errors.selfUpdate}</Text>
              )}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}
    </VStack>
  );
};

export const formatTokenInfo = (data: { success: boolean; tokenInfo: TokenInfo; error?: string }) => {
  if (!data.success) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Error!</Alert.Title>
          <Alert.Description>
            {data.error || 'Failed to get token info'}
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );
  }

  const tokenInfo = data.tokenInfo;
  const scopeOrder = ['read', 'update', 'install', 'admin'];
  const currentLevel = scopeOrder.indexOf(tokenInfo.scope);

  return (
    <VStack gap={4} align="stretch">
      <Box p={4} borderWidth="1px" borderRadius="md">
        <Heading size="md" mb={3}>🔑 Token Information</Heading>
        <VStack gap={2} align="start">
          {tokenInfo.scope && (
            <Text><strong>Current Scope:</strong> <Badge colorPalette="blue">{tokenInfo.scope}</Badge></Text>
          )}
          {tokenInfo.username && (
            <Text><strong>Username:</strong> {tokenInfo.username}</Text>
          )}
          {tokenInfo.totp_enabled !== undefined && (
            <Text><strong>TOTP Enabled:</strong> {tokenInfo.totp_enabled ? 'Yes' : 'No'}</Text>
          )}
        </VStack>
        <AccordionRoot collapsible mt={4}>
          <AccordionItem value="migration-response">
            <AccordionItemTrigger>
              <Box flex="1" textAlign="left">
                Show full token info
              </Box>
            </AccordionItemTrigger>
            <AccordionItemContent pb={4}>
              <CodeBlock language="json" showLineNumbers>
                {JSON.stringify(tokenInfo, null, 2)}
              </CodeBlock>
            </AccordionItemContent>
          </AccordionItem>
        </AccordionRoot>
      </Box>

      <Box p={4} borderWidth="1px" borderRadius="md">
        <Heading size="sm" mb={3}>Required Scopes</Heading>
        <VStack gap={2} align="start">
          <Text><strong>Read operations:</strong> "read" or higher</Text>
          <Text><strong>Update operations:</strong> "update" or higher</Text>
          <Text><strong>Install operations:</strong> "install" or higher</Text>
          <Text><strong>Admin operations:</strong> "admin"</Text>
        </VStack>
      </Box>

      {currentLevel >= 0 && (
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Analysis: Your "{tokenInfo.scope}" scope allows:</Alert.Title>
            <VStack gap={1} align="start" mt={2}>
              <Text>{currentLevel >= 0 ? '✅' : '❌'} Read operations</Text>
              <Text>{currentLevel >= 1 ? '✅' : '❌'} Update operations</Text>
              <Text>{currentLevel >= 2 ? '✅' : '❌'} Install operations</Text>
              <Text>{currentLevel >= 3 ? '✅' : '❌'} Admin operations</Text>
            </VStack>
          </Alert.Content>
        </Alert.Root>
      )}
    </VStack>
  );
};

export const formatDatabaseBackups = (data: any[]) => {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>No backups found</Alert.Title>
          <Alert.Description>
            No database backups are available on this server.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );
  }

  return (
    <VStack gap={4} align="stretch">
      <Text fontSize="md" color="gray.600">
        Found {data.length} database backup{data.length !== 1 ? 's' : ''}:
      </Text>
      <Box overflowX="auto">
        <Table.Root variant="outline" size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Backup Name</Table.ColumnHeader>
              <Table.ColumnHeader>Created At</Table.ColumnHeader>
              <Table.ColumnHeader>Size</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {data.map((backup, index) => (
              <Table.Row key={index}>
                <Table.Cell>
                  <Code fontSize="sm">{backup.name}</Code>
                </Table.Cell>
                <Table.Cell>{new Date(backup.createdAt).toLocaleString()}</Table.Cell>
                <Table.Cell>{(backup.size / 1024 / 1024).toFixed(2)} MB</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      <Box mt={4}>
        <AccordionRoot collapsible>
          <AccordionItem value="raw-response-1">
            <AccordionItemTrigger>
              <Box flex="1" textAlign="left">
                Show raw backup data
              </Box>
            </AccordionItemTrigger>
            <AccordionItemContent pb={4}>
              <CodeBlock language="json" showLineNumbers>
                {JSON.stringify(data, null, 2)}
              </CodeBlock>
            </AccordionItemContent>
          </AccordionItem>
        </AccordionRoot>
      </Box>
    </VStack>
  );
};

const sortPackageEntries = (packages: [string, any][], priorityPrefix = 'contao') => {
  return packages.sort(([nameA], [nameB]) => {
    const aHasPriority = nameA.startsWith(priorityPrefix);
    const bHasPriority = nameB.startsWith(priorityPrefix);
    
    if (aHasPriority && !bHasPriority) return -1;
    if (!aHasPriority && bHasPriority) return 1;
    
    return nameA.localeCompare(nameB);
  });
};

const getTypeColorPalette = (type: string) => {
  if (type?.startsWith('contao')) {
    return 'orange';
  }
  if (type?.startsWith('symfony')) {
    return 'blue';
  }
  switch (type) {
    case 'metapackage':
      return 'purple';
    case 'library':
      return 'green';
    default:
      return 'gray';
  }
};

export const formatSortedPackages = (data: any, options?: { priorityPrefix?: string; sectionTitle?: string }) => {
  if (!data || typeof data !== 'object') {
    return (
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>No packages found</Alert.Title>
          <Alert.Description>
            No packages data available.
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    );
  }

  const packages = sortPackageEntries(Object.entries(data), options?.priorityPrefix);
  const sectionTitle = options?.sectionTitle || 'packages';
  
  return (
    <VStack gap={4} align="stretch">
      <Text fontSize="md" color="gray.600">
        Found {packages.length} {sectionTitle}{packages.length !== 1 ? 's' : ''}:
      </Text>
      <Box maxH="400px" overflowY="auto">
        <Table.Root variant="outline" size="sm">
          <Table.Header position="sticky" top={0}>
            <Table.Row>
              <Table.ColumnHeader>Package Name</Table.ColumnHeader>
              <Table.ColumnHeader>Version</Table.ColumnHeader>
              <Table.ColumnHeader>Type</Table.ColumnHeader>
              <Table.ColumnHeader>Description</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {packages.map(([name, pkg]: [string, any]) => (
              <Table.Row key={name}>
                <Table.Cell>
                  <Link 
                    href={`https://packagist.org/packages/${name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    fontSize="sm" 
                    fontFamily="mono"
                    color="blue.500"
                    _hover={{ color: "blue.600", textDecoration: "underline" }}
                  >
                    {name}
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <Badge colorPalette="blue" fontSize="xs">{pkg.version || 'N/A'}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={getTypeColorPalette(pkg.type)} fontSize="xs">{pkg.type || 'library'}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="xs" lineClamp={2}>
                    {pkg.description || 'No description available'}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </VStack>
  );
};