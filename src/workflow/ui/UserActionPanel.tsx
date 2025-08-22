import React, { useState } from 'react';
import { VStack, HStack, Button, Text, Alert } from '@chakra-ui/react';
import { UserAction } from '../engine/types';

interface UserActionPanelProps {
  actions: UserAction[];
  onAction: (actionId: string) => Promise<void>;
  onRetry?: () => Promise<void>;
  onSkip?: () => Promise<void>;
}

export const UserActionPanel: React.FC<UserActionPanelProps> = ({
  actions,
  onAction,
  onRetry,
  onSkip
}) => {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleAction = async (actionId: string) => {
    if (isExecuting) return;
    
    setIsExecuting(actionId);
    setError(null);
    
    try {
      await onAction(actionId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsExecuting(null);
    }
  };
  
  const handleRetry = async () => {
    if (isExecuting || !onRetry) return;
    
    setIsExecuting('retry');
    setError(null);
    
    try {
      await onRetry();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Retry failed');
    } finally {
      setIsExecuting(null);
    }
  };
  
  const handleSkip = async () => {
    if (isExecuting || !onSkip) return;
    
    setIsExecuting('skip');
    setError(null);
    
    try {
      await onSkip();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Skip failed');
    } finally {
      setIsExecuting(null);
    }
  };
  
  return (
    <VStack align="stretch" gap={3}>
      {error && (
        <Alert.Root status="error" size="sm">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description fontSize="sm">
              {error}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}
      
      <VStack align="stretch" gap={2}>
        {actions.map((action) => (
          <VStack key={action.id} align="stretch" gap={1}>
            <Button
              variant={action.variant === 'primary' ? 'solid' : action.variant === 'danger' ? 'outline' : 'outline'}
              colorPalette={action.variant === 'danger' ? 'red' : action.variant === 'primary' ? 'blue' : 'gray'}
              onClick={() => handleAction(action.id)}
              disabled={action.disabled || !!isExecuting}
              loading={isExecuting === action.id}
              size="sm"
            >
              {action.label}
            </Button>
            
            {action.description && (
              <Text fontSize="xs" color="gray.600" pl={2}>
                {action.description}
              </Text>
            )}
          </VStack>
        ))}
        
        {/* Additional actions */}
        <HStack gap={2} justify="flex-end">
          {onRetry && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleRetry}
              disabled={!!isExecuting}
              loading={isExecuting === 'retry'}
            >
              Retry
            </Button>
          )}
          
          {onSkip && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleSkip}
              disabled={!!isExecuting}
              loading={isExecuting === 'skip'}
            >
              Skip
            </Button>
          )}
        </HStack>
      </VStack>
    </VStack>
  );
};