import { api } from '../utils/api';
import { ApiCallResult, ApiFunction } from '../types/apiTypes';
import { StorageType } from '../types/storage';
import { browserStorageService } from './browserStorageService';

export class ApiCallService {
  /**
   * Detect if we should use browser storage mode
   */
  static async isUsingBrowserStorage(): Promise<boolean> {
    try {
      const storageType = await browserStorageService.detectStorageType();
      return storageType === StorageType.BROWSER;
    } catch (error) {
      return false;
    }
  }

  /**
   * Route API call based on storage mode
   */
  static async routeApiCall<T = unknown, P = unknown>(
    apiFunction: ApiFunction<T, P>,
    browserStorageFunction: () => Promise<T> | T,
    params?: P,
    context?: string
  ): Promise<ApiCallResult<T>> {
    try {
      const useBrowserStorage = await this.isUsingBrowserStorage();
      
      if (useBrowserStorage) {
        // Use browser storage function
        const result = await browserStorageFunction();
        return {
          success: true,
          data: result,
          statusCode: 200
        };
      } else {
        // Use server API function
        return await this.executeApiCall(apiFunction, params, context);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const contextMessage = context ? `${context}: ${errorMessage}` : errorMessage;
      
      return {
        success: false,
        error: contextMessage,
        statusCode: this.extractStatusCode(error)
      };
    }
  }

  /**
   * Generic API call wrapper with standardized error handling
   */
  static async executeApiCall<T = unknown, P = unknown>(
    apiFunction: ApiFunction<T, P>,
    params?: P,
    context?: string
  ): Promise<ApiCallResult<T>> {
    try {
      const result = await apiFunction(params);
      
      return {
        success: true,
        data: result,
        statusCode: 200
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const contextMessage = context ? `${context}: ${errorMessage}` : errorMessage;
      
      return {
        success: false,
        error: contextMessage,
        statusCode: this.extractStatusCode(error)
      };
    }
  }

  /**
   * Execute API call with automatic loading state management
   */
  static async executeWithLoading<T = unknown, P = unknown>(
    apiFunction: ApiFunction<T, P>,
    params?: P,
    options?: {
      context?: string;
      onStart?: () => void;
      onFinish?: () => void;
    }
  ): Promise<ApiCallResult<T>> {
    options?.onStart?.();
    
    try {
      const result = await this.executeApiCall(apiFunction, params, options?.context);
      return result;
    } finally {
      options?.onFinish?.();
    }
  }

  /**
   * Format API response for display in modals
   */
  static formatApiResponse<T = unknown>(
    data: T,
    formatFunction?: (data: T) => React.ReactNode
  ): React.ReactNode {
    if (formatFunction) {
      return formatFunction(data);
    }

    // Default JSON formatting
    return JSON.stringify(data, null, 2);
  }

  /**
   * Extract status code from error object
   */
  private static extractStatusCode(error: any): number {
    if (error?.response?.status) {
      return error.response.status;
    }
    if (error?.status) {
      return error.status;
    }
    if (error?.message?.includes('404')) {
      return 404;
    }
    if (error?.message?.includes('400')) {
      return 400;
    }
    if (error?.message?.includes('401')) {
      return 401;
    }
    if (error?.message?.includes('403')) {
      return 403;
    }
    if (error?.message?.includes('500')) {
      return 500;
    }
    return 0; // Unknown status
  }
}

/**
 * Site-specific API service with browser storage support
 */
export class SiteApiService {
  /**
   * Get site configuration (supports browser storage)
   */
  static async getConfig() {
    const result = await ApiCallService.routeApiCall(
      api.getConfig,
      () => browserStorageService.loadConfig(),
      undefined,
      'Get site configuration'
    );
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to get configuration');
    }
  }

  /**
   * Save authentication token for a site (supports browser storage)
   */
  static async saveToken(token: string, managerUrl: string) {
    return ApiCallService.routeApiCall(
      () => api.saveToken(token, managerUrl),
      async () => {
        const config = await browserStorageService.loadConfig();
        
        // Add or update site in config
        if (!config.sites) {
          config.sites = {};
        }
        
        config.sites[managerUrl] = {
          name: new URL(managerUrl).hostname,
          url: managerUrl,
          token: token,
          authMethod: 'token' as const,
          scope: 'read',
          lastUsed: new Date().toISOString()
        };
        
        // Set as active site if no active site exists
        if (!config.activeSite) {
          config.activeSite = managerUrl;
        }
        
        await browserStorageService.saveConfig(config);
        return { success: true, message: 'Token saved successfully' };
      },
      { token, managerUrl },
      'Save authentication token'
    );
  }

  /**
   * Remove site from configuration (supports browser storage)
   */
  static async removeSite(url: string) {
    return ApiCallService.routeApiCall(
      () => api.removeSite(url),
      async () => {
        const config = await browserStorageService.loadConfig();
        
        if (config.sites && config.sites[url]) {
          delete config.sites[url];
          
          // Clear active site if it was the removed site
          if (config.activeSite === url) {
            const remainingSites = Object.keys(config.sites);
            config.activeSite = remainingSites.length > 0 ? remainingSites[0] : null;
          }
          
          await browserStorageService.saveConfig(config);
        }
        
        return;
      },
      { url },
      'Remove site'
    );
  }

  /**
   * Update site name (supports browser storage)
   */
  static async updateSiteName(url: string, newName: string) {
    return ApiCallService.routeApiCall(
      () => api.updateSiteName(url, newName),
      async () => {
        const config = await browserStorageService.loadConfig();
        
        if (config.sites && config.sites[url]) {
          config.sites[url].name = newName;
          await browserStorageService.saveConfig(config);
        }
        
        return { success: true, message: 'Site name updated successfully' };
      },
      { url, name: newName },
      'Update site name'
    );
  }

  /**
   * Set active site (supports browser storage)
   */
  static async setActiveSite(url: string) {
    return ApiCallService.routeApiCall(
      () => api.setActiveSite(url),
      async () => {
        const config = await browserStorageService.loadConfig();
        
        if (config.sites && config.sites[url]) {
          config.activeSite = url;
          config.sites[url].lastUsed = new Date().toISOString();
          await browserStorageService.saveConfig(config);
        }
        
        return { activeSite: config.sites[url] };
      },
      { url },
      'Set active site'
    );
  }

  /**
   * Update version information for current site
   * Note: Browser storage mode cannot update version info without server API
   */
  static async updateVersionInfo() {
    const useBrowserStorage = await ApiCallService.isUsingBrowserStorage();
    
    if (useBrowserStorage) {
      // In browser storage mode, we can't fetch live version info
      // Return cached info or placeholder
      return {
        success: true,
        data: {
          success: true,
          versionInfo: {
            message: 'Version info not available in browser storage mode',
            cached: true
          }
        },
        statusCode: 200
      };
    }
    
    return ApiCallService.executeApiCall(api.updateVersionInfo, undefined, 'Update version info');
  }
}

/**
 * Expert API functions service
 */
export class ExpertApiService {
  /**
   * Get update status (composer and self-update)
   */
  static getUpdateStatus = api.getUpdateStatus;

  /**
   * Get token information
   */
  static getTokenInfo = api.getTokenInfo;

  /**
   * Get PHP web server configuration
   */
  static getPhpWebConfig = api.getPhpWebConfig;

  /**
   * Get Contao configuration
   */
  static getContaoConfig = api.getContaoConfig;

  /**
   * Get users list
   */
  static getUsersList = api.getUsersList;

  /**
   * Get tokens list for a user
   */
  static getTokensList = api.getTokensList;

  /**
   * Delete a user token
   */
  static deleteToken = api.deleteToken;

  /**
   * Generate a one-time token for a user
   */
  static generateUserToken = api.generateUserToken;

  /**
   * Get database backups
   */
  static getDatabaseBackups = api.getDatabaseBackups;

  /**
   * Get installed packages
   */
  static getInstalledPackages = api.getInstalledPackages;

  /**
   * Get root package details
   */
  static getRootPackageDetails = api.getRootPackageDetails;

  /**
   * Get specific local package details
   */
  static getLocalPackageDetails = api.getLocalPackageDetails;

  /**
   * Get file contents (composer.json or composer.lock)
   */
  static getFiles = api.getFiles;

  /**
   * Get session status
   */
  static getSessionStatus = api.getSessionStatus;

  /**
   * Create session (login)
   */
  static createSession = api.createSession;

  /**
   * Delete session (logout)
   */
  static deleteSession = api.deleteSession;

  /**
   * Get server configuration
   */
  static getServerConfig = api.getServerConfig;

  /**
   * Get PHP information
   */
  static getPhpInfo = api.getPhpInfo;

  /**
   * Get Composer configuration
   */
  static getComposerConfig = api.getComposerConfig;

  /**
   * Get database status
   */
  static getDatabaseStatus = api.getDatabaseStatus;

  /**
   * Get Composer Cloud data
   */
  static getComposerCloudData = api.getComposerCloudData;

  /**
   * Get log files list
   */
  static getLogFiles = api.getLogFiles;
}

/**
 * Migration and task API service
 */
export class TaskApiService {
  /**
   * Get database migration status
   */
  static getDatabaseMigrationStatus = api.getDatabaseMigrationStatus;

  /**
   * Start database migration
   */
  static startDatabaseMigration = api.startDatabaseMigration;

  /**
   * Delete database migration task
   */
  static deleteDatabaseMigrationTask = api.deleteDatabaseMigrationTask;

  /**
   * Get task data
   */
  static getTaskData = api.getTaskData;

  /**
   * Set task data
   */
  static setTaskData = api.setTaskData;

  /**
   * Delete task data
   */
  static deleteTaskData = api.deleteTaskData;

  /**
   * Patch task status (for aborting tasks)
   */
  static patchTaskStatus = api.patchTaskStatus;

  /**
   * Get maintenance mode status
   */
  static getMaintenanceModeStatus = api.getMaintenanceModeStatus;

  /**
   * Enable maintenance mode
   */
  static enableMaintenanceMode = api.enableMaintenanceMode;

  /**
   * Disable maintenance mode
   */
  static disableMaintenanceMode = api.disableMaintenanceMode;

  /**
   * Get maintenance mode status for specific site
   */
  static getSiteMaintenanceModeStatus = (siteUrl: string) => api.getSiteMaintenanceModeStatus(siteUrl);
}

/**
 * Logs API service
 */
export class LogsApiService {
  /**
   * Get API call logs for a site
   */
  static getLogs = api.getLogs;

  /**
   * Cleanup old log entries
   */
  static cleanupOldLogs = api.cleanupOldLogs;
}

/**
 * History API service
 */
export class HistoryApiService {
  /**
   * Get workflow history for a site
   */
  static getHistoryForSite = api.getHistoryForSite;

  /**
   * Create new history entry
   */
  static createHistoryEntry = api.createHistoryEntry;

  /**
   * Update existing history entry
   */
  static updateHistoryEntry = api.updateHistoryEntry;

  /**
   * Download snapshot file as blob
   */
  static downloadSnapshot = api.downloadSnapshot;

  /**
   * Get snapshot file content as text
   */
  static getSnapshotFileContent = api.getSnapshotFileContent;

  /**
   * Delete history entry
   */
  static deleteHistoryEntry = api.deleteHistoryEntry;

  /**
   * List snapshots for a site
   */
  static listSnapshots = api.listSnapshots;

  /**
   * Delete a snapshot
   */
  static deleteSnapshot = api.deleteSnapshot;

  /**
   * Cleanup old snapshots
   */
  static cleanupSnapshots = api.cleanupSnapshots;
}

/**
 * Authentication API service
 */
export class AuthApiService {
  /**
   * Validate OAuth token
   */
  static validateToken = api.validateToken;

  /**
   * Save OAuth token for a site
   */
  static saveToken = api.saveToken;

  /**
   * Authenticate with username/password (cookie auth)
   */
  static cookieAuth = api.cookieAuth;

  /**
   * Check cookie session status
   */
  static cookieSessionCheck = api.cookieSessionCheck;

  /**
   * Logout from cookie session
   */
  static cookieLogout = api.cookieLogout;

  /**
   * Save site configuration after cookie authentication
   */
  static saveSiteCookie = api.saveSiteCookie;

  /**
   * Get current session/token info
   */
  static getTokenInfo = api.getTokenInfo;
}