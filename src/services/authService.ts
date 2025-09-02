import axios, { AxiosResponse } from 'axios';
import { 
    AuthCredentials, 
    TokenValidationRequest, 
    TokenValidationResponse, 
    CookieAuthRequest, 
    CookieAuthResponse,
    SaveTokenRequest,
    SaveSiteCookieRequest,
    SessionInfo,
    ScopeHierarchy,
    EndpointPermissions,
    Scope
} from '../types';
import { ConfigService } from './configService';
import { LoggingService } from './loggingService';

export class AuthService {
    private configService: ConfigService;
    private loggingService: LoggingService;
    
    // Scope hierarchy for permission checking (higher includes lower)
    private readonly scopeHierarchy: ScopeHierarchy = {
        'read': ['read'],
        'update': ['read', 'update'],
        'install': ['read', 'update', 'install'],
        'admin': ['read', 'update', 'install', 'admin']
    };

    constructor(configService: ConfigService, loggingService: LoggingService) {
        this.configService = configService;
        this.loggingService = loggingService;
    }

    public async validateToken(request: TokenValidationRequest): Promise<TokenValidationResponse> {
        const { url, token } = request;
        
        if (!url || !token) {
            throw new Error('URL and token are required');
        }

        const managerUrl = url.replace(/\/$/, '');
        
        // Test the token by making a simple API call
        let testResponse: AxiosResponse;
        
        // Try Authorization Bearer first
        try {
            console.log('Trying token validation with Authorization Bearer header');
            testResponse = await axios.get(`${managerUrl}/api/session`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000,
                validateStatus: status => status < 500
            });
            console.log('Authorization Bearer worked for token validation');
        } catch (error) {
            console.log('Bearer auth failed for token validation, trying Contao-Manager-Auth header');
            // Fallback to Contao-Manager-Auth header
            testResponse = await axios.get(`${managerUrl}/api/session`, {
                headers: {
                    'Contao-Manager-Auth': token
                },
                timeout: 10000,
                validateStatus: status => status < 500
            });
            console.log('Contao-Manager-Auth header worked for token validation');
        }

        if (testResponse.status === 200) {
            // Log successful token validation
            this.loggingService.logApiCall(managerUrl, 'GET', '/api/session', testResponse.status, null, testResponse.data);
            return { success: true, url: managerUrl };
        } else {
            // Log failed token validation
            this.loggingService.logApiCall(managerUrl, 'GET', '/api/session', testResponse.status, null, testResponse.data);
            throw new Error('Invalid token');
        }
    }

    public async saveToken(request: SaveTokenRequest): Promise<{ success: boolean; activeSite: any }> {
        const { token, managerUrl } = request;
        
        if (!token || !managerUrl) {
            throw new Error('Token and manager URL are required');
        }

        // Validate token before saving
        const testResponse = await axios.get(`${managerUrl}/api/session`, {
            headers: {
                'Contao-Manager-Auth': token
            },
            timeout: 10000,
            validateStatus: status => status < 500
        });

        // Log save-token validation request
        this.loggingService.logApiCall(managerUrl, 'GET', '/api/session', testResponse.status, null, testResponse.data);

        if (testResponse.status !== 200) {
            throw new Error('Invalid token');
        }

        if (this.configService.addSite(managerUrl, token)) {
            const activeSite = this.configService.getActiveSite();
            return { success: true, activeSite };
        } else {
            throw new Error('Failed to save site configuration');
        }
    }

    public async cookieAuth(request: CookieAuthRequest): Promise<CookieAuthResponse> {
        const { managerUrl, credentials } = request;
        
        if (!managerUrl || !credentials) {
            throw new Error('Manager URL and credentials are required');
        }

        const cleanedUrl = managerUrl.replace(/\/$/, '');

        // Prepare the request body
        const requestBody: any = {
            username: credentials.username,
            password: credentials.password
        };

        // Add TOTP if provided
        if (credentials.totp) {
            requestBody.totp = credentials.totp;
        }

        console.log(`[COOKIE-AUTH] Authenticating to ${cleanedUrl}`);
        console.log(`[COOKIE-AUTH] Request credentials:`, {
            username: requestBody.username,
            password: requestBody.password ? '[REDACTED]' : 'undefined',
            totp: requestBody.totp || 'undefined'
        });

        // Make the login request to Contao Manager
        const response = await axios.post(`${cleanedUrl}/api/session`, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000,
            validateStatus: status => status < 500,
            // Important: Don't follow redirects, and capture cookies
            maxRedirects: 0,
            withCredentials: false // We'll handle cookies manually
        });

        console.log(`[COOKIE-AUTH] Response status: ${response.status}`);
        console.log(`[COOKIE-AUTH] Response data:`, response.data);
        console.log(`[COOKIE-AUTH] Response headers:`, response.headers);

        // Log the authentication attempt
        this.loggingService.logApiCall(cleanedUrl, 'POST', '/api/session', response.status, requestBody, response.data);

        if (response.status === 200 || response.status === 201) {
            return { 
                success: true, 
                user: response.data,
                managerUrl: cleanedUrl
            };
        } else {
            return {
                success: false,
                error: response.data?.detail || response.data?.message || 'Authentication failed'
            };
        }
    }

    public async cookieSessionCheck(managerUrl: string, cookieHeader: string): Promise<{ success: boolean; user?: any; error?: string }> {
        if (!managerUrl) {
            throw new Error('Manager URL is required');
        }

        const cleanedUrl = managerUrl.replace(/\/$/, '');

        console.log(`[COOKIE-SESSION-CHECK] Checking session for ${cleanedUrl}`);

        const response = await axios.get(`${cleanedUrl}/api/session`, {
            headers: {
                'Cookie': cookieHeader
            },
            timeout: 10000,
            validateStatus: status => status < 500
        });

        console.log(`[COOKIE-SESSION-CHECK] Response status: ${response.status}`);

        // Log the session check
        this.loggingService.logApiCall(cleanedUrl, 'GET', '/api/session', response.status, null, response.data);

        if (response.status === 200) {
            return { 
                success: true, 
                user: response.data 
            };
        } else if (response.status === 401) {
            return { 
                success: false,
                error: 'Not authenticated'
            };
        } else {
            return { 
                success: false,
                error: 'Failed to check session status'
            };
        }
    }

    public async cookieLogout(managerUrl: string, cookieHeader: string): Promise<{ success: boolean }> {
        if (!managerUrl) {
            throw new Error('Manager URL is required');
        }

        const cleanedUrl = managerUrl.replace(/\/$/, '');

        console.log(`[COOKIE-LOGOUT] Logging out from ${cleanedUrl}`);

        const response = await axios.delete(`${cleanedUrl}/api/session`, {
            headers: {
                'Cookie': cookieHeader
            },
            timeout: 10000,
            validateStatus: status => status < 500
        });

        console.log(`[COOKIE-LOGOUT] Response status: ${response.status}`);

        // Log the logout attempt
        this.loggingService.logApiCall(cleanedUrl, 'DELETE', '/api/session', response.status, null, response.data);

        return { 
            success: response.status === 204 || response.status === 200 || response.status === 201
        };
    }

    public saveSiteCookie(request: SaveSiteCookieRequest): { success: boolean; activeSite: any; isReauth: boolean } {
        const { managerUrl, user, authMethod, scope, isReauth } = request;
        
        if (!managerUrl || !user || !authMethod) {
            throw new Error('Manager URL, user data, and auth method are required');
        }

        if (authMethod !== 'cookie') {
            throw new Error('Invalid auth method for this endpoint');
        }

        // Save site configuration with cookie authentication and scope
        // For reauthentication, this will update the existing site configuration
        if (this.configService.addSite(managerUrl, undefined, undefined, authMethod, user, scope)) {
            // If this is a reauthentication, set the site as active
            if (isReauth) {
                this.configService.setActiveSite(managerUrl);
            }
            const activeSite = this.configService.getActiveSite();
            return { success: true, activeSite, isReauth: !!isReauth };
        } else {
            throw new Error('Failed to save site configuration');
        }
    }

    public async getTokenInfo(cookieHeader?: string): Promise<SessionInfo> {
        const activeSite = this.configService.getActiveSite();
        
        if (!activeSite) {
            throw new Error('No active site configured');
        }

        console.log('Getting session info for:', activeSite.url);
        
        // For token auth, show token info. For cookie auth, show user info.
        if (activeSite.authMethod === 'token' && activeSite.token && typeof activeSite.token === 'string') {
            console.log('Token length:', activeSite.token.length);
            console.log('Token starts with:', activeSite.token.substring(0, 20) + '...');
        }
        
        // Get session info using the appropriate authentication method
        const config: any = {
            method: 'GET',
            url: `${activeSite.url}/api/session`,
            timeout: 10000,
            validateStatus: (status: number) => status < 500
        };

        // Handle authentication based on the site's auth method
        if (activeSite.authMethod === 'cookie' && cookieHeader) {
            config.headers = {
                'Cookie': cookieHeader
            };
        } else if (activeSite.token) {
            config.headers = {
                'Contao-Manager-Auth': activeSite.token
            };
        } else {
            throw new Error('No authentication method available');
        }
        
        const sessionResponse = await axios(config);
        
        console.log('Session response status:', sessionResponse.status);
        console.log('Session response data:', sessionResponse.data);

        // Log session request
        this.loggingService.logApiCall(activeSite.url, 'GET', '/api/session', sessionResponse.status, null, sessionResponse.data);

        if (sessionResponse.status === 200) {
            return {
                tokenInfo: sessionResponse.data,
                site: activeSite
            };
        } else {
            throw new Error(`Failed to get token info: ${sessionResponse.status} - ${JSON.stringify(sessionResponse.data)}`);
        }
    }

    // Check if a request is allowed based on scope and endpoint
    public checkScopePermission(scope: string | undefined, method: string, endpoint: string): boolean {
        if (!scope) {
            return true; // No scope restriction
        }
        
        if (scope === 'admin') {
            return true; // Admin can do everything
        }
        
        const allowedScopes = this.scopeHierarchy[scope] || ['read'];
        
        // Define endpoint permission requirements
        const endpointPermissions: EndpointPermissions = {
            // Read-only endpoints
            '/api/session': 'read',
            '/api/server/config': 'read',
            '/api/server/php-web': 'read',
            '/api/server/contao': 'read',
            '/api/users': 'read',
            '/api/packages/root': 'read',
            '/api/packages/local/': 'read',
            '/api/contao/backup': 'read',
            
            // Update endpoints
            '/api/server/composer': 'read', // GET composer info is read
            '/api/server/self-update': 'update', // Self-update requires update
            '/api/contao/maintenance-mode': method === 'GET' ? 'read' : 'update',
            '/api/task': method === 'GET' ? 'read' : 'update',
            
            // Install endpoints
            '/api/contao/database-migration': method === 'GET' ? 'read' : 'install',
            
            // Admin endpoints
            '/api/users/*': 'admin', // User management
            '/api/files/*': 'admin' // File access requires admin permissions
        };
        
        // Find required permission for this endpoint
        let requiredPermission = 'read'; // Default
        
        // Check exact match first
        if (endpointPermissions[endpoint]) {
            requiredPermission = endpointPermissions[endpoint];
        } else {
            // Check pattern matches
            for (const pattern in endpointPermissions) {
                if (pattern.includes('*') && endpoint.match(pattern.replace('*', '.*'))) {
                    requiredPermission = endpointPermissions[pattern];
                    break;
                }
            }
        }
        
        const hasPermission = allowedScopes.includes(requiredPermission);
        console.log(`[SCOPE-CHECK] ${method} ${endpoint} requires '${requiredPermission}', user has [${allowedScopes.join(', ')}], granted: ${hasPermission}`);
        
        return hasPermission;
    }
}