import { ValidationResult, FormValidators } from '../types/formTypes';

/**
 * Validates required fields
 */
export const validateRequired = (value: any): ValidationResult => {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: 'This field is required' };
  }
  if (typeof value === 'string' && !value.trim()) {
    return { isValid: false, error: 'This field is required' };
  }
  return { isValid: true };
};

/**
 * Validates minimum length
 */
export const validateMinLength = (value: string, minLength: number): ValidationResult => {
  if (value.length < minLength) {
    return { 
      isValid: false, 
      error: `Must be at least ${minLength} character${minLength !== 1 ? 's' : ''}` 
    };
  }
  return { isValid: true };
};

/**
 * Validates maximum length
 */
export const validateMaxLength = (value: string, maxLength: number): ValidationResult => {
  if (value.length > maxLength) {
    return { 
      isValid: false, 
      error: `Must be no more than ${maxLength} character${maxLength !== 1 ? 's' : ''}` 
    };
  }
  return { isValid: true };
};

/**
 * Validates pattern using regex
 */
export const validatePattern = (value: string, pattern: RegExp, errorMessage?: string): ValidationResult => {
  if (!pattern.test(value)) {
    return { 
      isValid: false, 
      error: errorMessage || 'Invalid format' 
    };
  }
  return { isValid: true };
};

/**
 * Validates token format (basic check for non-empty alphanumeric)
 */
export const validateToken = (token: string): ValidationResult => {
  if (!token || !token.trim()) {
    return { isValid: false, error: 'Token is required' };
  }

  if (token.length < 10) {
    return { isValid: false, error: 'Token appears to be too short' };
  }

  return { isValid: true };
};

/**
 * Validates scope selection
 */
export const validateScope = (scope: string): ValidationResult => {
  const validScopes = ['read', 'update', 'install', 'admin'];
  if (!validScopes.includes(scope)) {
    return { isValid: false, error: 'Please select a valid scope' };
  }
  return { isValid: true };
};

/**
 * Generic field validator that applies multiple validation rules
 */
export const validateField = (value: any, validators: FormValidators): ValidationResult => {
  // Required validation
  if (validators.required) {
    const requiredResult = validateRequired(value);
    if (!requiredResult.isValid) {
      return requiredResult;
    }
  }

  // Skip other validations if value is empty and not required
  if (!validators.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return { isValid: true };
  }

  // String-based validations
  if (typeof value === 'string') {
    // Min length validation
    if (validators.minLength !== undefined) {
      const minLengthResult = validateMinLength(value, validators.minLength);
      if (!minLengthResult.isValid) {
        return minLengthResult;
      }
    }

    // Max length validation
    if (validators.maxLength !== undefined) {
      const maxLengthResult = validateMaxLength(value, validators.maxLength);
      if (!maxLengthResult.isValid) {
        return maxLengthResult;
      }
    }

    // Pattern validation
    if (validators.pattern) {
      const patternResult = validatePattern(value, validators.pattern);
      if (!patternResult.isValid) {
        return patternResult;
      }
    }
  }

  // Custom validation
  if (validators.custom) {
    const customResult = validators.custom(value);
    if (!customResult.isValid) {
      return customResult;
    }
  }

  return { isValid: true };
};