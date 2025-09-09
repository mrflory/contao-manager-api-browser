/**
 * Client-side authentication utilities for OAuth flows
 * These functions handle browser-side OAuth operations like redirects and URL parsing
 */

export class AuthUtils {
  private static readonly OAUTH_STATE_KEY = 'oauth_state';
  private static readonly OAUTH_MANAGER_URL_KEY = 'oauth_manager_url';
  private static readonly OAUTH_SCOPE_KEY = 'oauth_scope';
  private static readonly REAUTH_SITE_URL_KEY = 'reauth_site_url';

  /**
   * Build OAuth redirect URI for the current domain
   */
  static buildOAuthRedirectUri(): string {
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}/oauth-callback`;
  }

  /**
   * Initiate OAuth flow by redirecting to Contao Manager
   */
  static initiateOAuth(managerUrl: string, scope: string, redirectUri: string): void {
    // Store OAuth state for callback handling
    const state = this.generateRandomState();
    localStorage.setItem(this.OAUTH_STATE_KEY, state);
    localStorage.setItem(this.OAUTH_MANAGER_URL_KEY, managerUrl);
    localStorage.setItem(this.OAUTH_SCOPE_KEY, scope);

    // Build OAuth URL - Contao Manager uses hash-based OAuth
    const oauthParams = new URLSearchParams({
      'response_type': 'token',
      'client_id': 'Contao Manager API Browser',
      'scope': scope,
      'redirect_uri': redirectUri,
      'state': state
    });
    
    const oauthUrl = `${managerUrl}/#oauth?${oauthParams.toString()}`;

    // Redirect to OAuth provider
    window.location.href = oauthUrl;
  }

  /**
   * Initiate reauthentication flow
   */
  static initiateReauth(managerUrl: string, scope: string): void {
    const redirectUri = this.buildOAuthRedirectUri();
    
    // Store reauth-specific data
    localStorage.setItem(this.REAUTH_SITE_URL_KEY, managerUrl);
    localStorage.setItem('reauth_mode', 'true');
    
    this.initiateOAuth(managerUrl, scope, redirectUri);
  }

  /**
   * Check if current URL is an OAuth callback
   */
  static isOAuthCallback(): boolean {
    const hash = window.location.hash;
    return hash.includes('access_token=') && hash.includes('token_type=');
  }

  /**
   * Check if current URL is a reauthentication callback
   */
  static isReauthCallback(): boolean {
    return this.isOAuthCallback() && localStorage.getItem('reauth_mode') === 'true';
  }

  /**
   * Extract access token from URL hash fragment
   */
  static extractTokenFromHash(): { token: string; managerUrl: string; scope: string } | null {
    const hash = window.location.hash.substring(1); // Remove #
    const params = new URLSearchParams(hash);
    
    const token = params.get('access_token');
    const tokenType = params.get('token_type');
    const state = params.get('state');
    
    if (!token || (tokenType && tokenType.toLowerCase() !== 'bearer')) {
      return null;
    }

    // Verify state matches what we stored
    const storedState = localStorage.getItem(this.OAUTH_STATE_KEY);
    if (state !== storedState) {
      console.error('OAuth state mismatch');
      return null;
    }

    const managerUrl = localStorage.getItem(this.OAUTH_MANAGER_URL_KEY);
    const scope = localStorage.getItem(this.OAUTH_SCOPE_KEY);

    if (!managerUrl || !scope) {
      console.error('Missing OAuth state data');
      return null;
    }

    return {
      token,
      managerUrl,
      scope
    };
  }

  /**
   * Clear OAuth hash from URL
   */
  static clearOAuthHash(): void {
    // Use replaceState to remove hash without page reload
    const newUrl = window.location.href.split('#')[0];
    window.history.replaceState({}, document.title, newUrl);
  }

  /**
   * Get stored manager URL from OAuth flow
   */
  static getStoredManagerUrl(): string | null {
    return localStorage.getItem(this.OAUTH_MANAGER_URL_KEY);
  }

  /**
   * Get stored reauth site URL
   */
  static getStoredReauthSiteUrl(): string | null {
    return localStorage.getItem(this.REAUTH_SITE_URL_KEY);
  }

  /**
   * Clean up OAuth data from localStorage
   */
  static cleanupOAuthData(): void {
    localStorage.removeItem(this.OAUTH_STATE_KEY);
    localStorage.removeItem(this.OAUTH_MANAGER_URL_KEY);
    localStorage.removeItem(this.OAUTH_SCOPE_KEY);
    localStorage.removeItem(this.REAUTH_SITE_URL_KEY);
    localStorage.removeItem('reauth_mode');
  }

  /**
   * Generate a random state string for OAuth security
   */
  private static generateRandomState(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Authenticate with cookie credentials - this needs to be an API call
   */
  static async authenticateCookie(managerUrl: string, credentials: { username: string; password: string; totp?: string }): Promise<any> {
    // This should be moved to AuthApiService, but for now, make a direct API call
    const response = await fetch('/api/cookie-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        managerUrl,
        credentials
      })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    return response.json();
  }
}