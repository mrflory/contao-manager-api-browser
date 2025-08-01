import React from 'react';
import { Box, VStack, Text, Button } from '@chakra-ui/react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  children,
}) => {
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={12}
      textAlign="center"
    >
      <VStack gap={4}>
        {icon && (
          <Box fontSize="4xl" color="gray.400">
            {icon}
          </Box>
        )}
        
        <Text fontSize="lg" color="gray.500" fontWeight="medium">
          {title}
        </Text>
        
        {description && (
          <Text color="gray.500">
            {description}
          </Text>
        )}
        
        {actionLabel && onAction && (
          <Button
            colorPalette="blue"
            onClick={onAction}
            mt={2}
          >
            {actionLabel}
          </Button>
        )}
        
        {children}
      </VStack>
    </Box>
  );
};