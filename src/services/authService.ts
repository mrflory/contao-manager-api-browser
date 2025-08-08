import { 
  OAuthConfig, 
  OAuthScope, 
  TokenExtractionResult, 
  CookieAuthCredentials, 
  CookieAuthResult,
  AuthenticationMethod,
  DEFAULT_OAUTH_CLIENT_ID 
} from '../types/authTypes';
import { cleanUrl, buildRedirectUri } from '../utils/urlUtils';

export class AuthService {
  /**
   * Generates OAuth URL for Contao Manager authentication
   */
  static generateOAuthUrl(config: Omit<OAuthConfig, 'clientId'>): string {
    const cleanedUrl = cleanUrl(config.managerUrl);
    const params = new URLSearchParams({
      response_type: 'token',
      scope: config.scope,
      client_id: DEFAULT_OAUTH_CLIENT_ID,
      redirect_uri: config.redirectUri
    });

    return `${cleanedUrl}/#oauth?${params.toString()}`;
  }

  /**
   * Extracts access token from URL hash (OAuth redirect)
   */
  static extractTokenFromHash(hash: string = window.location.hash): TokenExtractionResult {
    try {
      if (!hash || !hash.includes('access_token=')) {
        return { success: false, error: 'No access token found in URL' };
      }

      const hashParams = hash.substring(1); // Remove the # symbol
      const params = new URLSearchParams(hashParams);
      const token = params.get('access_token');

      if (!token) {
        return { success: false, error: 'Access token parameter is empty' };
      }

      return { success: true, token };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to extract token: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Clears OAuth parameters from URL hash
   */
  static clearOAuthHash(): void {
    if (window.location.hash.includes('access_token=')) {
      window.location.hash = '';
    }
  }

  /**
   * Builds OAuth redirect URI for current page
   */
  static buildOAuthRedirectUri(fragment: string = 'token'): string {
    return buildRedirectUri(window.location.pathname, fragment);
  }

  /**
   * Builds OAuth redirect URI for reauthentication
   */
  static buildReauthRedirectUri(): string {
    return buildRedirectUri('/add-site', 'reauth=true&token');
  }

  /**
   * Checks if current URL contains OAuth callback parameters
   */
  static isOAuthCallback(hash: string = window.location.hash): boolean {
    return hash.includes('access_token=');
  }

  /**
   * Checks if current URL is a reauthentication callback
   */
  static isReauthCallback(hash: string = window.location.hash): boolean {
    return hash.includes('access_token=') && hash.includes('reauth=true');
  }

  /**
   * Initiates OAuth flow by redirecting to Contao Manager
   */
  static initiateOAuth(managerUrl: string, scope: OAuthScope, redirectUri: string): void {
    const oauthUrl = this.generateOAuthUrl({
      managerUrl,
      scope,
      redirectUri
    });

    // Store manager URL for later use
    localStorage.setItem('managerUrl', cleanUrl(managerUrl));
    
    // Redirect to OAuth provider
    setTimeout(() => {
      window.location.href = oauthUrl;
    }, 1000);
  }

  /**
   * Initiates reauthentication flow
   */
  static initiateReauth(managerUrl: string, scope: OAuthScope): void {
    const redirectUri = this.buildReauthRedirectUri();
    
    // Store site URL for reauthentication
    localStorage.setItem('reauthSiteUrl', managerUrl);
    
    this.initiateOAuth(managerUrl, scope, redirectUri);
  }

  /**
   * Gets stored manager URL from localStorage
   */
  static getStoredManagerUrl(): string | null {
    return localStorage.getItem('managerUrl');
  }

  /**
   * Gets stored reauth site URL from localStorage
   */
  static getStoredReauthSiteUrl(): string | null {
    return localStorage.getItem('reauthSiteUrl');
  }

  /**
   * Cleans up stored OAuth data
   */
  static cleanupOAuthData(): void {
    localStorage.removeItem('managerUrl');
    localStorage.removeItem('reauthSiteUrl');
  }

  /**
   * Validates OAuth scope
   */
  static validateScope(scope: string): scope is OAuthScope {
    return ['read', 'update', 'install', 'admin'].includes(scope);
  }

  /**
   * Authenticates using cookie-based authentication
   */
  static async authenticateCookie(
    managerUrl: string, 
    credentials: CookieAuthCredentials
  ): Promise<CookieAuthResult> {
    try {
      // Use our backend proxy for cookie authentication to avoid CORS issues
      const response = await fetch('/api/cookie-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Important: This enables cookie handling
        body: JSON.stringify({
          managerUrl,
          credentials
        })
      });

      const data = await response.json();
      console.log('[COOKIE-AUTH] Backend response:', { status: response.status, data });

      if (response.ok && data.success) {
        return {
          success: true,
          user: data.user
        };
      } else {
        return {
          success: false,
          error: data.error || 'Authentication failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error during authentication'
      };
    }
  }

  /**
   * Checks session status for cookie authentication
   */
  static async checkCookieSession(managerUrl: string): Promise<CookieAuthResult> {
    try {
      // Use our backend proxy for session check to avoid CORS issues
      const response = await fetch('/api/cookie-session-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ managerUrl })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          user: data.user
        };
      } else {
        return {
          success: false,
          error: data.error || 'Session check failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Logs out from cookie-based authentication
   */
  static async logoutCookie(managerUrl: string): Promise<boolean> {
    try {
      // Use our backend proxy for logout to avoid CORS issues
      const response = await fetch('/api/cookie-logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ managerUrl })
      });

      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Validates authentication method
   */
  static validateAuthMethod(method: string): method is AuthenticationMethod {
    return ['token', 'cookie'].includes(method);
  }
}