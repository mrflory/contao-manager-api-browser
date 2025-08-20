import React, { useState } from 'react';
import { VStack, HStack, Text, Badge, Button, Box, Collapsible, Grid, GridItem } from '@chakra-ui/react';
import { LuChevronDown as ChevronDown, LuChevronRight as ChevronRight, LuDatabase as Database, LuTrash2 as Trash } from 'react-icons/lu';
import { useColorModeValue } from '../ui/color-mode';
import { CodeBlock } from '../ui/code-block';

export interface MigrationOperationsProps {
  data: any;
  summary?: any; // Enhanced summary from createMigrationSummary
}

export const MigrationOperations: React.FC<MigrationOperationsProps> = ({ data, summary }) => {
  // Use step ID for state isolation - each step gets its own expansion state
  const stepKey = summary?.stepId || 'default';
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const cardBg = useColorModeValue('white', 'gray.800');
  const summaryBg = useColorModeValue('blue.50', 'blue.900');
  const warningBg = useColorModeValue('orange.50', 'orange.900');
  const operationBg = useColorModeValue('gray.50', 'gray.700');

  if (!data || !data.operations) return null;

  const toggleCategory = (category: string) => {
    const categoryKey = `${stepKey}-${category}`;
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('DROP') || category.includes('DELETE')) {
      return <Trash size={16} />;
    }
    return <Database size={16} />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CREATE_TABLE':
      case 'CREATE_INDEX':
        return 'green';
      case 'DROP_TABLE':
      case 'DROP_INDEX':
        return 'red';
      case 'ALTER_TABLE':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      'CREATE_TABLE': 'Create Tables',
      'DROP_TABLE': 'Drop Tables',
      'CREATE_INDEX': 'Create Indexes',
      'DROP_INDEX': 'Drop Indexes',
      'ALTER_TABLE': 'Alter Tables',
      'OTHER': 'Other Operations'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const renderOperationDetails = (operation: any, category: string) => {
    switch (category) {
      case 'CREATE_TABLE':
        return (
          <VStack align="stretch" gap={2}>
            <Text fontSize="sm" fontWeight="semibold">Create table: {operation.tableName}</Text>
            {operation.details && (
              <Text fontSize="xs" color="gray.600">{operation.details}</Text>
            )}
            <CodeBlock language="sql" showLineNumbers maxHeight="200px">
              {operation.name}
            </CodeBlock>
          </VStack>
        );
      
      case 'DROP_TABLE':
        return (
          <VStack align="stretch" gap={2}>
            <HStack>
              <Text fontSize="sm" fontWeight="semibold" color="red.600">
                Drop table: {operation.tableName}
              </Text>
              <Badge colorPalette="red" size="sm">Requires Delete Permission</Badge>
            </HStack>
            {operation.details && (
              <Text fontSize="xs" color="gray.600">{operation.details}</Text>
            )}
            <CodeBlock language="sql" showLineNumbers maxHeight="200px">
              {operation.name}
            </CodeBlock>
          </VStack>
        );
      
      case 'CREATE_INDEX':
        return (
          <VStack align="stretch" gap={2}>
            <Text fontSize="sm" fontWeight="semibold">
              Create index: {operation.indexName} on {operation.tableName}
            </Text>
            <Text fontSize="xs" color="gray.600">Columns: {operation.columns}</Text>
            <CodeBlock language="sql" showLineNumbers maxHeight="200px">
              {operation.name}
            </CodeBlock>
          </VStack>
        );
      
      case 'DROP_INDEX':
        return (
          <VStack align="stretch" gap={2}>
            <HStack>
              <Text fontSize="sm" fontWeight="semibold" color="red.600">
                Drop index: {operation.indexName} from {operation.tableName}
              </Text>
              <Badge colorPalette="red" size="sm">Requires Delete Permission</Badge>
            </HStack>
            <CodeBlock language="sql" showLineNumbers maxHeight="200px">
              {operation.name}
            </CodeBlock>
          </VStack>
        );
      
      case 'ALTER_TABLE':
        return (
          <VStack align="stretch" gap={2}>
            <Text fontSize="sm" fontWeight="semibold">Alter table: {operation.tableName}</Text>
            {operation.requiresDeletes && (
              <Badge colorPalette="orange" size="sm">Contains DROP operations</Badge>
            )}
            
            {operation.subOperations && operation.subOperations.length > 0 && (
              <VStack align="stretch" gap={1} pl={4}>
                {operation.subOperations.map((subOp: any, index: number) => (
                  <HStack key={index} fontSize="xs">
                    <Badge 
                      colorPalette={subOp.type === 'DROP' ? 'red' : subOp.type === 'ADD' ? 'green' : 'blue'} 
                      size="xs"
                    >
                      {subOp.type}
                    </Badge>
                    <Text>
                      {subOp.type === 'ADD' && `Add field: ${subOp.fieldName}`}
                      {subOp.type === 'CHANGE' && `Change field: ${subOp.oldField} → ${subOp.newField}`}
                      {subOp.type === 'DROP' && `Drop field: ${subOp.fieldName}`}
                      {subOp.type === 'OTHER' && subOp.statement}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            )}
            
            <CodeBlock language="sql" showLineNumbers maxHeight="200px">
              {operation.name}
            </CodeBlock>
          </VStack>
        );
      
      default:
        return (
          <VStack align="stretch" gap={2}>
            <Text fontSize="sm" fontWeight="semibold">{operation.summary || operation.name}</Text>
            {operation.details && (
              <Text fontSize="xs" color="gray.600">{operation.details}</Text>
            )}
            <CodeBlock language="sql" showLineNumbers maxHeight="200px">
              {operation.name}
            </CodeBlock>
          </VStack>
        );
    }
  };

  // Use enhanced summary if available, otherwise fall back to basic display
  if (summary && summary.operationBreakdown) {
    return (
      <VStack align="stretch" gap={4}>
        {/* Summary Overview */}
        <Box p={4} bg={summaryBg} borderRadius="md" borderWidth="1px">
          <VStack align="stretch" gap={3}>
            <HStack justify="space-between">
              <Badge colorPalette="blue" size="sm">{summary.migrationType}</Badge>
            </HStack>
            
            <Grid templateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={3}>
              <GridItem>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                    {summary.totalOperations}
                  </Text>
                  <Text fontSize="sm" color="gray.600">Total Operations</Text>
                </VStack>
              </GridItem>
              
              {summary.operationBreakdown.map(({ category, count }: { category: string; count: number }) => (
                <GridItem key={category}>
                  <VStack>
                    <Text fontSize="xl" fontWeight="bold" color={`${getCategoryColor(category)}.600`}>
                      {count}
                    </Text>
                    <Text fontSize="xs" color="gray.600" textAlign="center">
                      {getCategoryLabel(category)}
                    </Text>
                  </VStack>
                </GridItem>
              ))}
            </Grid>
            
            {summary.hasDeletes && (
              <Box p={3} bg={warningBg} borderRadius="md" borderWidth="1px" borderColor="orange.200">
                <HStack>
                  <Trash size={16} color="orange" />
                  <Text fontSize="sm" fontWeight="semibold" color="orange.700">
                    Some operations require "Execute with DELETE" permission
                  </Text>
                </HStack>
              </Box>
            )}
          </VStack>
        </Box>

        {/* Collapsible Categories */}
        <VStack align="stretch" gap={3}>
          {summary.operationBreakdown.map(({ category, count, operations }: { category: string; count: number; operations: any[] }) => (
            <Box key={category} borderWidth="1px" borderRadius="md" overflow="hidden">
              <Button
                variant="ghost"
                width="100%"
                justifyContent="flex-start"
                onClick={() => toggleCategory(category)}
                p={4}
                bg={cardBg}
                borderRadius="none"
              >
                <HStack width="100%" justify="space-between">
                  <HStack>
                    {expandedCategories[`${stepKey}-${category}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {getCategoryIcon(category)}
                    <Text fontWeight="semibold">{getCategoryLabel(category)}</Text>
                    <Badge colorPalette={getCategoryColor(category)} size="sm">
                      {count} operation{count !== 1 ? 's' : ''}
                    </Badge>
                  </HStack>
                </HStack>
              </Button>
              
              <Collapsible.Root open={expandedCategories[`${stepKey}-${category}`]}>
                <Collapsible.Content>
                  <VStack align="stretch" gap={3} p={4} bg={cardBg}>
                    {operations.map((operation, index) => (
                      <Box key={index} p={3} borderWidth="1px" borderRadius="md" bg={operationBg}>
                        {renderOperationDetails(operation, category)}
                      </Box>
                    ))}
                  </VStack>
                </Collapsible.Content>
              </Collapsible.Root>
            </Box>
          ))}
        </VStack>
      </VStack>
    );
  }

  // Fallback to basic display
  return (
    <VStack align="stretch" gap={2}>
      <Text fontSize="sm">{data.operations.length} operations pending</Text>
    </VStack>
  );
};