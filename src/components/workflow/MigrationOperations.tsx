import React from 'react';
import { VStack, HStack, Text, Badge, Code } from '@chakra-ui/react';

export interface MigrationOperationsProps {
  data: any;
}

export const MigrationOperations: React.FC<MigrationOperationsProps> = ({ data }) => {
  if (!data || !data.operations) return null;

  return (
    <VStack align="stretch" gap={2}>
      {data.type && (
        <HStack>
          <Text fontSize="sm" fontWeight="semibold">Type:</Text>
          <Badge colorPalette="blue" size="sm">{data.type}</Badge>
        </HStack>
      )}
      
      <HStack>
        <Text fontSize="sm" fontWeight="semibold">Operations:</Text>
        <Text fontSize="sm">{data.operations.length} pending</Text>
      </HStack>
      
      {data.hash && (
        <HStack>
          <Text fontSize="sm" fontWeight="semibold">Hash:</Text>
          <Code fontSize="sm">{data.hash.substring(0, 12)}...</Code>
        </HStack>
      )}
    </VStack>
  );
};