export type OAuthScope = 'read' | 'update' | 'install' | 'admin';
export type AuthenticationMethod = 'token' | 'cookie';

export interface OAuthConfig {
  managerUrl: string;
  scope: OAuthScope;
  clientId: string;
  redirectUri: string;
}

export interface OAuthUrlParams {
  response_type: string;
  scope: string;
  client_id: string;
  redirect_uri: string;
}

export interface TokenExtractionResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface CookieAuthCredentials {
  username: string;
  password: string;
  totp?: string;
}

export interface CookieAuthResult {
  success: boolean;
  user?: Record<string, unknown>;
  error?: string;
}

export interface AuthenticationState {
  isAuthenticated: boolean;
  currentSite?: string;
  scope?: OAuthScope;
  method?: AuthenticationMethod;
}

export interface AuthMethodOption {
  label: string;
  value: AuthenticationMethod;
  description: string;
}

export interface ScopeOption {
  label: string;
  value: OAuthScope;
  description?: string;
}

export const OAUTH_SCOPES: ScopeOption[] = [
  { 
    label: "Read Only", 
    value: "read",
    description: "View-only access to manager information"
  },
  { 
    label: "Read + Update", 
    value: "update",
    description: "Read access plus update operations"
  },
  { 
    label: "Read + Update + Install", 
    value: "install",
    description: "Read, update, and package installation"
  },
  { 
    label: "Full Admin Access", 
    value: "admin",
    description: "Complete administrative access"
  }
];

export const DEFAULT_OAUTH_CLIENT_ID = 'Contao Manager API Browser';

export const AUTH_METHOD_OPTIONS: AuthMethodOption[] = [
  {
    label: "API Token Authentication",
    value: "token",
    description: "Persistent authentication using API tokens (recommended for automation)"
  },
  {
    label: "Cookie-Based Authentication", 
    value: "cookie",
    description: "Temporary authentication using HTTP-only cookies (expires when browser closes)"
  }
];