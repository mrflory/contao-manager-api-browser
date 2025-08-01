import React from 'react';
import { Input } from '@chakra-ui/react';
import { Field } from '../ui/field';
import { ValidationResult } from '../../types/formTypes';
import { validateContaoManagerUrl } from '../../utils/urlUtils';

export interface UrlInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  validateOnChange?: boolean;
  error?: string;
  helpText?: string;
  isDisabled?: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  label = 'Contao Manager URL',
  value,
  onChange,
  placeholder = 'https://example.com/contao-manager.phar.php',
  required = false,
  validateOnChange = false,
  error,
  helpText,
  isDisabled = false,
}) => {
  const [validationError, setValidationError] = React.useState<string>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Validate on change if requested
    if (validateOnChange && newValue.trim()) {
      const validation = validateContaoManagerUrl(newValue);
      setValidationError(validation.isValid ? undefined : validation.error);
    } else if (!newValue.trim()) {
      setValidationError(undefined);
    }
  };

  const displayError = error || validationError;

  return (
    <Field 
      label={label}
      required={required}
      helpText={helpText}
      invalid={!!displayError}
      errorText={displayError}
    >
      <Input
        type="url"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={isDisabled}
      />
    </Field>
  );
};