import { ValidationResult } from '../types/formTypes';

/**
 * Validates a URL string
 */
export const validateUrl = (url: string): ValidationResult => {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

/**
 * Extracts domain from URL, with fallback for malformed URLs
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // Fallback if URL parsing fails
    const match = url.match(/(?:https?:\/\/)?([^\/]+)/);
    return match ? match[1] : url;
  }
};

/**
 * Cleans URL by removing trailing slash
 */
export const cleanUrl = (url: string): string => {
  return url.replace(/\/$/, '');
};

/**
 * Validates Contao Manager URL specifically
 */
export const validateContaoManagerUrl = (url: string): ValidationResult => {
  const basicValidation = validateUrl(url);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Additional validation for Contao Manager URLs
  if (!url.toLowerCase().includes('manager')) {
    return { 
      isValid: false, 
      error: 'URL should point to a Contao Manager instance' 
    };
  }

  return { isValid: true };
};

/**
 * Builds OAuth redirect URI
 */
export const buildRedirectUri = (basePath: string, fragment: string = 'token'): string => {
  return `${window.location.origin}${basePath}#${fragment}`;
};

/**
 * Encodes URL for use in React Router params
 */
export const encodeUrlParam = (url: string): string => {
  return encodeURIComponent(url);
};

/**
 * Decodes URL from React Router params
 */
export const decodeUrlParam = (encodedUrl: string): string => {
  return decodeURIComponent(encodedUrl);
};