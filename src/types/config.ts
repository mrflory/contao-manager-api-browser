export interface SiteConfig {
  name: string;
  url: string;
  authMethod: 'token' | 'cookie';
  lastUsed: string;
  token?: string | EncryptedToken;
  user?: UserInfo;
  scope?: string;
  versionInfo?: VersionInfo;
}

export interface EncryptedToken {
  encrypted: string;
  iv: string;
  tag: string;
}

export interface UserInfo {
  username: string;
  [key: string]: any;
}

export interface VersionInfo {
  contaoManagerVersion?: string | null;
  phpVersion?: string | null;
  contaoVersion?: string | null;
  lastUpdated: string;
}

export interface AppConfig {
  sites: Record<string, SiteConfig>;
  activeSite: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ScopeHierarchy {
  [key: string]: string[];
}

export interface EndpointPermissions {
  [endpoint: string]: string;
}

// Legacy type aliases for backward compatibility
export type Config = AppConfig;
export type Site = SiteConfig;

// Additional types needed by the API layer
export interface UpdateStatus {
  composer?: any;
  selfUpdate?: any;
  errors?: {
    composer?: string;
    selfUpdate?: string;
  };
}

export interface TokenInfo {
  valid?: boolean;
  scope?: string;
  username?: string;
  expires?: string | number;
  [key: string]: any;
}