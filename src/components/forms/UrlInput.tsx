import React from 'react';
import { Input, BoxProps } from '@chakra-ui/react';
import { Field } from '../ui/field';
import { validateContaoManagerUrl } from '../../utils/urlUtils';

export interface UrlInputProps extends Pick<BoxProps, 'width' | 'maxWidth' | 'minWidth'> {
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
  width,
  maxWidth,
  minWidth,
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
      helperText={helpText}
      invalid={!!displayError}
      errorText={displayError}
      width={width}
      maxWidth={maxWidth}
      minWidth={minWidth}
    >
      <Input
        type="url"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={isDisabled}
        width="full"
      />
    </Field>
  );
};