import React from 'react';
import { createListCollection } from '@chakra-ui/react';
import { SelectTrigger, SelectItem, SelectRoot, SelectValueText, SelectContent, SelectItemText } from '../ui/select';
import { OAUTH_SCOPES, OAuthScope } from '../../types/authTypes';

export interface ScopeSelectorProps {
  value: OAuthScope;
  onChange: (scope: OAuthScope) => void;
  size?: 'sm' | 'md' | 'lg';
  width?: string;
  maxWidth?: string;
  placeholder?: string;
  isDisabled?: boolean;
}

export const ScopeSelector: React.FC<ScopeSelectorProps> = ({
  value,
  onChange,
  size = 'md',
  width,
  maxWidth,
  placeholder = 'Select permissions',
  isDisabled = false,
}) => {
  const collection = createListCollection({
    items: OAUTH_SCOPES.map(scope => ({
      label: scope.label,
      value: scope.value
    }))
  });

  return (
    <SelectRoot 
      value={[value]} 
      onValueChange={(details) => onChange(details.value[0] as OAuthScope)}
      size={size}
      width={width}
      maxW={maxWidth}
      collection={collection}
      disabled={isDisabled}
    >
      <SelectTrigger>
        <SelectValueText placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {OAUTH_SCOPES.map((scope) => (
          <SelectItem key={scope.value} item={scope.value}>
            <SelectItemText>{scope.label}</SelectItemText>
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
};