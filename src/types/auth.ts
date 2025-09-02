export interface AuthCredentials {
  username: string;
  password: string;
  totp?: string;
}

export interface TokenValidationRequest {
  url: string;
  token: string;
}

export interface TokenValidationResponse {
  success: boolean;
  url: string;
}

export interface CookieAuthRequest {
  managerUrl: string;
  credentials: AuthCredentials;
}

export interface CookieAuthResponse {
  success: boolean;
  user?: any;
  managerUrl?: string;
  error?: string;
}

export interface SaveTokenRequest {
  token: string;
  managerUrl: string;
}

export interface SaveSiteCookieRequest {
  managerUrl: string;
  user: any;
  authMethod: 'cookie';
  scope: string;
  isReauth?: boolean;
}

export interface SessionInfo {
  tokenInfo: any;
  site: any;
}

export type AuthMethod = 'token' | 'cookie';
export type Scope = 'read' | 'update' | 'install' | 'admin';