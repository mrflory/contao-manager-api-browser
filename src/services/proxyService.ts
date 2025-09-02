import axios, { AxiosResponse } from 'axios';
import { ProxyConfig, UpdateStatusResult, VersionInfoResult } from '../types';
import { ConfigService } from './configService';
import { LoggingService } from './loggingService';
import { AuthService } from './authService';

export class ProxyService {
    private configService: ConfigService;
    private loggingService: LoggingService;
    private authService: AuthService;

    constructor(
        configService: ConfigService, 
        loggingService: LoggingService,
        authService: AuthService
    ) {
        this.configService = configService;
        this.loggingService = loggingService;
        this.authService = authService;
    }

    // Generic proxy helper for Contao Manager API
    public async proxyToContaoManager(
        endpoint: string, 
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', 
        data: any = null, 
        cookieHeader?: string
    ): Promise<AxiosResponse> {
        const activeSite = this.configService.getActiveSite();
        
        if (!activeSite) {
            throw new Error('No active site configured');
        }
        
        // Check scope permissions for cookie authentication
        if (activeSite.authMethod === 'cookie' && activeSite.scope) {
            console.log(`[SCOPE-CHECK] Site: ${activeSite.url}, Auth: ${activeSite.authMethod}, Scope: ${activeSite.scope}, Endpoint: ${method} ${endpoint}`);
            if (!this.authService.checkScopePermission(activeSite.scope, method, endpoint)) {
                console.log(`[SCOPE-CHECK] Permission denied for scope '${activeSite.scope}' on ${method} ${endpoint}`);
                throw new Error(`Access denied: ${method} ${endpoint} requires higher permissions than '${activeSite.scope}' scope`);
            }
            console.log(`[SCOPE-CHECK] Permission granted for scope '${activeSite.scope}' on ${method} ${endpoint}`);
        }

        const config: ProxyConfig = {
            method,
            url: `${activeSite.url}${endpoint}`,
            timeout: 10000,
            validateStatus: status => status < 500
        };

        if (data) {
            config.data = data;
            config.headers = { 'Content-Type': 'application/json' };
        }

        console.log(`[API REQUEST] ${method} ${activeSite.url}${endpoint}`);

        let response: AxiosResponse;
        let requestError: Error | null = null;
        
        // Handle authentication based on the site's auth method
        if (activeSite.authMethod === 'cookie' && cookieHeader) {
            // For cookie authentication, forward cookies from the client request
            console.log('[API REQUEST] Using cookie authentication');
            
            config.headers = {
                ...config.headers,
                // Forward all cookies from the client request to the target server
                'Cookie': cookieHeader || ''
            };
            
            try {
                response = await axios(config as any);
                console.log('[API REQUEST] Cookie authentication worked');
            } catch (error) {
                console.log('[API REQUEST] Cookie authentication failed:', error instanceof Error ? error.message : 'Unknown error');
                requestError = error instanceof Error ? error : new Error('Unknown error');
                response = (error as any).response || { status: 500, data: null };
            }
        } else {
            // For token authentication, use the stored token
            if (!activeSite.token) {
                throw new Error('No token available for token-based authentication');
            }
            
            // Try Contao-Manager-Auth header first (recommended by swagger)
            try {
                config.headers = {
                    ...config.headers,
                    'Contao-Manager-Auth': activeSite.token as string
                };
                console.log('[API REQUEST] Using Contao-Manager-Auth header');
                response = await axios(config as any);
                console.log('[API REQUEST] Contao-Manager-Auth worked');
            } catch (error) {
                console.log('[API REQUEST] Contao-Manager-Auth failed, trying Authorization Bearer fallback');
                // Fallback to Authorization Bearer header
                try {
                    config.headers = {
                        ...config.headers,
                        'Authorization': `Bearer ${activeSite.token}`
                    };
                    delete config.headers['Contao-Manager-Auth'];
                    response = await axios(config as any);
                    console.log('[API REQUEST] Authorization Bearer worked');
                } catch (fallbackError) {
                    requestError = fallbackError instanceof Error ? fallbackError : new Error('Unknown error');
                    response = (fallbackError as any).response || { status: 500, data: null };
                }
            }
        }

        console.log(`[API RESPONSE] Status: ${response.status}`);
        let responseDataForLog: any = response.data;

        // Log the API call
        this.loggingService.logApiCall(
            activeSite.url,
            method,
            endpoint,
            response.status,
            data,
            responseDataForLog,
            requestError ? requestError.message : null
        );

        // If there was an error, throw it
        if (requestError) {
            throw requestError;
        }

        return response;
    }

    public async updateStatus(): Promise<UpdateStatusResult> {
        const activeSite = this.configService.getActiveSite();
        
        if (!activeSite) {
            throw new Error('No active site configured');
        }

        console.log('Making requests to:', activeSite.url);
        
        const result: UpdateStatusResult = {
            composer: null,
            selfUpdate: null,
            errors: {}
        };

        // Try composer endpoint
        try {
            console.log('Getting composer status');
            const updateResponse = await this.proxyToContaoManager('/api/server/composer', 'GET');
            
            console.log('Composer response status:', updateResponse.status);
            console.log('Composer response data:', updateResponse.data);

            if (updateResponse.status === 200) {
                result.composer = updateResponse.data;
            } else if (updateResponse.status === 403) {
                result.errors.composer = 'Insufficient permissions for composer status (requires "read" scope or higher)';
            } else {
                result.errors.composer = `Request failed with status ${updateResponse.status}`;
            }
        } catch (error) {
            console.error('Composer request error:', error instanceof Error ? error.message : 'Unknown error');
            result.errors.composer = `Failed to fetch composer status: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        // Try self-update endpoint
        try {
            console.log('Getting self-update status');
            const statusResponse = await this.proxyToContaoManager('/api/server/self-update', 'GET');
            
            console.log('Self-update response status:', statusResponse.status);
            console.log('Self-update response data:', statusResponse.data);

            if (statusResponse.status === 200) {
                result.selfUpdate = statusResponse.data;
            } else if (statusResponse.status === 403) {
                result.errors.selfUpdate = 'Insufficient permissions for self-update status (requires "update" scope)';
            } else {
                result.errors.selfUpdate = `Request failed with status ${statusResponse.status}`;
            }
        } catch (error) {
            console.error('Self-update request error:', error instanceof Error ? error.message : 'Unknown error');
            result.errors.selfUpdate = `Failed to fetch self-update status: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        // Return results even if some endpoints failed
        return result;
    }

    public async updateVersionInfo(): Promise<VersionInfoResult> {
        const activeSite = this.configService.getActiveSite();
        
        if (!activeSite) {
            throw new Error('No active site configured');
        }

        console.log('Updating version info for:', activeSite.url);
        
        const versionInfo: VersionInfoResult = {
            contaoManagerVersion: null,
            phpVersion: null,
            contaoVersion: null,
            lastUpdated: new Date().toISOString()
        };

        // Get Contao Manager version from self-update endpoint
        try {
            console.log('Getting Contao Manager version');
            const selfUpdateResponse = await this.proxyToContaoManager('/api/server/self-update', 'GET');
            
            if (selfUpdateResponse.status === 200 && selfUpdateResponse.data.current_version) {
                versionInfo.contaoManagerVersion = selfUpdateResponse.data.current_version;
                console.log('Got Contao Manager version:', versionInfo.contaoManagerVersion);
            }
        } catch (error) {
            console.error('Failed to get Contao Manager version:', error instanceof Error ? error.message : 'Unknown error');
        }

        // Get PHP version from php-web endpoint
        try {
            console.log('Getting PHP version');
            const phpWebResponse = await this.proxyToContaoManager('/api/server/php-web', 'GET');
            
            if (phpWebResponse.status === 200 && phpWebResponse.data.version) {
                versionInfo.phpVersion = phpWebResponse.data.version;
                console.log('Got PHP version:', versionInfo.phpVersion);
            }
        } catch (error) {
            console.error('Failed to get PHP version:', error instanceof Error ? error.message : 'Unknown error');
        }

        // Get Contao version from contao endpoint
        try {
            console.log('Getting Contao version');
            const contaoResponse = await this.proxyToContaoManager('/api/server/contao', 'GET');
            
            if (contaoResponse.status === 200 && contaoResponse.data.version) {
                versionInfo.contaoVersion = contaoResponse.data.version;
                console.log('Got Contao version:', versionInfo.contaoVersion);
            }
        } catch (error) {
            console.error('Failed to get Contao version:', error instanceof Error ? error.message : 'Unknown error');
        }

        // Update the site configuration with version info
        if (this.configService.updateSiteVersionInfo(activeSite.url, versionInfo)) {
            console.log('Version info updated successfully:', versionInfo);
        } else {
            throw new Error('Failed to save version information');
        }

        return versionInfo;
    }

    // Helper function to handle API responses properly
    public handleApiResponse(endpoint: string, response: AxiosResponse): { status: number; data: any } {
        console.log(`[${endpoint}] Response status: ${response.status}`);
        
        // Handle 204 No Content responses (empty body)
        if (response.status === 204) {
            console.log(`[${endpoint}] No content response (204)`);
            return { status: 204, data: null };
        }
        
        // Handle responses with data
        if (response.data !== undefined && response.data !== null) {
            if (typeof response.data === 'string' && response.data.trim() === '') {
                console.log(`[${endpoint}] Empty string response`);
                return { status: response.status, data: {} };
            } else {
                console.log(`[${endpoint}] Sending response data`);
                return { status: response.status, data: response.data };
            }
        } else {
            console.log(`[${endpoint}] No data in response, sending empty object`);
            return { status: response.status, data: {} };
        }
    }

    public getAuthenticatedAxiosConfig(url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', data: any = null, cookieHeader?: string): any {
        const activeSite = this.configService.getActiveSite();
        
        if (!activeSite) {
            throw new Error('No active site configured');
        }

        const config: any = {
            method,
            url,
            timeout: 10000,
            validateStatus: (status: number) => status < 500
        };

        if (data) {
            config.data = data;
            config.headers = { 'Content-Type': 'application/json' };
        }

        // Handle authentication based on the site's auth method
        if (activeSite.authMethod === 'cookie' && cookieHeader) {
            // For cookie authentication, forward cookies from the client request
            console.log('[AUTH-CONFIG] Using cookie authentication for', url);
            config.headers = {
                ...config.headers,
                'Cookie': cookieHeader || ''
            };
        } else {
            // For token authentication, use the stored token
            if (!activeSite.token) {
                throw new Error('No token available for token-based authentication');
            }
            
            console.log('[AUTH-CONFIG] Using token authentication for', url);
            config.headers = {
                ...config.headers,
                'Contao-Manager-Auth': activeSite.token
            };
        }

        return config;
    }
}