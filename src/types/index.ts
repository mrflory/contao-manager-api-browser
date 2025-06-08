export interface Site {
  name: string;
  url: string;
  token: string;
  lastUsed: string;
}

export interface Config {
  sites: { [url: string]: Site };
  activeSite?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UpdateStatus {
  composer?: {
    current_version: string;
    latest_version: string;
  };
  selfUpdate?: {
    current_version: string;
    latest_version: string;
  };
  errors?: {
    composer?: string;
    selfUpdate?: string;
  };
}

export interface TokenInfo {
  scope: string;
  username?: string;
  totp_enabled?: boolean;
}