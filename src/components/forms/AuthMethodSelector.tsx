import React from 'react';
import { VStack, Text, BoxProps } from '@chakra-ui/react';
import { Field } from '../ui/field';
import { RadioRoot, RadioItem, RadioItemText } from '../ui/radio';
import { AuthenticationMethod, AUTH_METHOD_OPTIONS } from '../../types/authTypes';

interface AuthMethodSelectorProps extends Pick<BoxProps, 'width' | 'maxWidth' | 'minWidth'> {
  value: AuthenticationMethod;
  onChange: (method: AuthenticationMethod) => void;
  label?: string;
}

export const AuthMethodSelector: React.FC<AuthMethodSelectorProps> = ({
  value,
  onChange,
  label = "Authentication Method",
  width,
  maxWidth,
  minWidth,
}) => {
  return (
    <Field required label={label} width={width} maxWidth={maxWidth} minWidth={minWidth}>
      <RadioRoot
        value={value}
        onValueChange={(details) => onChange(details.value as AuthenticationMethod)}
        width="full"
      >
        <VStack align="stretch" gap={3}>
          {AUTH_METHOD_OPTIONS.map((option) => (
            <RadioItem key={option.value} value={option.value}>
              <RadioItemText>
                <VStack align="start" gap={1}>
                  <Text fontWeight="medium">{option.label}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    {option.description}
                  </Text>
                </VStack>
              </RadioItemText>
            </RadioItem>
          ))}
        </VStack>
      </RadioRoot>
    </Field>
  );
};