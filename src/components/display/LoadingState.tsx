import React from 'react';
import { Center, Spinner, VStack, Text } from '@chakra-ui/react';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  height?: string;
  showMessage?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'xl',
  height = '200px',
  showMessage = true,
}) => {
  return (
    <Center h={height}>
      <VStack gap={4}>
        <Spinner size={size} />
        {showMessage && <Text color="gray.500">{message}</Text>}
      </VStack>
    </Center>
  );
};

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color,
}) => {
  return <Spinner size={size} color={color} />;
};