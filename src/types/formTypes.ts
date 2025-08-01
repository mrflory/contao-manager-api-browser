export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
}

export interface AddSiteFormData {
  url: FormField<string>;
  scope: FormField<string>;
}

export interface TokenFormData {
  token: FormField<string>;
}

export interface MigrationFormData {
  hash: FormField<string>;
  type: FormField<string>;
  withDeletes: FormField<boolean>;
}

export interface FormValidators {
  required?: boolean;
  url?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => ValidationResult;
}

export interface FormFieldConfig {
  validators?: FormValidators;
  label?: string;
  placeholder?: string;
  helpText?: string;
}