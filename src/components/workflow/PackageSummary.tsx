import React, { useState } from 'react';
import { VStack, HStack, Text, Badge, Button, Box, Collapsible, Grid, GridItem } from '@chakra-ui/react';
import { LuChevronDown as ChevronDown, LuChevronRight as ChevronRight, LuPackage as Package, LuTrash2 as Trash, LuDownload as Download, LuRefreshCw as RefreshCw, LuLock as Lock } from 'react-icons/lu';
import { useColorModeValue } from '../ui/color-mode';
import { PackageSummary as PackageSummaryType, PackageOperation, getPackageOperationColor, getPackageOperationLabel } from '../../utils/packageParser';

export interface PackageSummaryProps {
  summary: PackageSummaryType;
}

export const PackageSummary: React.FC<PackageSummaryProps> = ({ summary }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const cardBg = useColorModeValue('white', 'gray.800');
  const summaryBg = useColorModeValue('blue.50', 'blue.900');

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'install':
        return <Download size={16} />;
      case 'update':
        return <RefreshCw size={16} />;
      case 'remove':
        return <Trash size={16} />;
      case 'downgrade':
        return <RefreshCw size={16} />;
      case 'lock':
        return <Lock size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  const renderPackageDetails = (operation: PackageOperation) => {
    return (
      <HStack justify="space-between" align="center" key={`${operation.name}-${operation.type}`}>
        <Text fontSize="sm" fontWeight="semibold">
          {operation.name}
          {operation.versionInfo && (
            <Text as="span" fontWeight="normal" ml="2">
              {operation.versionInfo}
            </Text>
          )}
        </Text>
        <Badge colorPalette={getPackageOperationColor(operation.type)} size="sm">
          {operation.type}
        </Badge>
      </HStack>
    );
  };

  return (
    <VStack align="stretch" gap={4}>
      {/* Summary Overview */}
      <Box p={4} bg={summaryBg} borderRadius="md" borderWidth="1px">
        <VStack align="stretch" gap={3}>
          <Grid templateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={3}>
            <GridItem>
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                  {summary.totalOperations}
                </Text>
                <Text fontSize="sm" color="gray.600">Total Packages</Text>
              </VStack>
            </GridItem>
            
            {summary.operationBreakdown.map(({ category, count }) => (
              <GridItem key={category}>
                <VStack>
                  <Text fontSize="xl" fontWeight="bold" color={`${getPackageOperationColor(category.toLowerCase())}.600`}>
                    {count}
                  </Text>
                  <Text fontSize="xs" color="gray.600" textAlign="center">
                    {getPackageOperationLabel(category)}
                  </Text>
                </VStack>
              </GridItem>
            ))}
          </Grid>
        </VStack>
      </Box>

      {/* Collapsible Categories */}
      <VStack align="stretch" gap={3}>
        {summary.operationBreakdown.map(({ category, count, operations }) => (
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
                  {expandedCategories[category] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {getCategoryIcon(category)}
                  <Text fontWeight="semibold">{getPackageOperationLabel(category)} Packages</Text>
                  <Badge colorPalette={getPackageOperationColor(category.toLowerCase())} size="sm">
                    {count} package{count !== 1 ? 's' : ''}
                  </Badge>
                </HStack>
              </HStack>
            </Button>
            
            <Collapsible.Root open={expandedCategories[category]}>
              <Collapsible.Content>
                <Box as="ul" p={4} bg={cardBg} listStyleType="none">
                  {operations.map((operation, index) => (
                    <Box as="li" key={index} py={1}>
                      {renderPackageDetails(operation)}
                    </Box>
                  ))}
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          </Box>
        ))}
      </VStack>
    </VStack>
  );
};