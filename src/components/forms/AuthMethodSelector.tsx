import React from 'react';
import { VStack, Text, BoxProps } from '@chakra-ui/react';
import { Field } from '../ui/field';
import { RadioGroup, Radio } from '../ui/radio';
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
      <RadioGroup
        value={value}
        onValueChange={(details) => onChange(details.value as AuthenticationMethod)}
        width="full"
      >
        <VStack align="stretch" gap={3}>
          {AUTH_METHOD_OPTIONS.map((option) => (
            <Radio key={option.value} value={option.value}>
              <VStack align="start" gap={1}>
                <Text fontWeight="medium">{option.label}</Text>
                <Text fontSize="sm" color="fg.muted">
                  {option.description}
                </Text>
              </VStack>
            </Radio>
          ))}
        </VStack>
      </RadioGroup>
    </Field>
  );
};