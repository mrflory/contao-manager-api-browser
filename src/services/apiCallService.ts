import { api } from '../utils/api';
import { ApiCallResult, ApiFunction } from '../types/apiTypes';

export class ApiCallService {
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
 * Site-specific API service
 */
export class SiteApiService {
  /**
   * Get site configuration
   */
  static async getConfig() {
    const result = await ApiCallService.executeApiCall(api.getConfig, undefined, 'Get site configuration');

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to get configuration');
    }
  }

  /**
   * Save authentication token for a site
   */
  static async saveToken(token: string, managerUrl: string) {
    return ApiCallService.executeApiCall(
      () => api.saveToken(token, managerUrl),
      { token, managerUrl },
      'Save authentication token'
    );
  }

  /**
   * Remove site from configuration
   */
  static async removeSite(url: string) {
    return ApiCallService.executeApiCall(
      () => api.removeSite(url),
      { url },
      'Remove site'
    );
  }

  /**
   * Update site name
   */
  static async updateSiteName(url: string, newName: string) {
    return ApiCallService.executeApiCall(
      () => api.updateSiteName(url, newName),
      { url, name: newName },
      'Update site name'
    );
  }

  /**
   * Save cookie authentication site
   */
  static async saveSiteCookie(data: { managerUrl: string; user: any; authMethod: string; scope: string; isReauth?: boolean }) {
    return ApiCallService.executeApiCall(
      () => api.saveSiteCookie(data),
      data,
      'Save cookie authentication site'
    );
  }

  /**
   * Set active site
   */
  static async setActiveSite(url: string) {
    return ApiCallService.executeApiCall(
      () => api.setActiveSite(url),
      { url },
      'Set active site'
    );
  }

  /**
   * Update version information for a specific site
   */
  static async updateVersionInfo(siteUrl: string) {
    return ApiCallService.executeApiCall(
      (params?: string) => {
        if (!params) throw new Error('Site URL is required');
        return api.updateVersionInfo(params);
      },
      siteUrl,
      'Update version info'
    );
  }
}

/**
 * Expert API functions service
 * All methods now require siteUrl parameter
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
  static getPhpWebConfig = (siteUrl: string) => api.getPhpWebConfig(siteUrl);

  /**
   * Get Contao configuration
   */
  static getContaoConfig = (siteUrl: string) => api.getContaoConfig(siteUrl);

  /**
   * Get users list
   */
  static getUsersList = (siteUrl: string) => api.getUsersList(siteUrl);

  /**
   * Get tokens list for a user
   */
  static getTokensList = (siteUrl: string, username: string) => api.getTokensList(siteUrl, username);

  /**
   * Delete a user token
   */
  static deleteToken = (siteUrl: string, username: string, tokenId: string) => api.deleteToken(siteUrl, username, tokenId);

  /**
   * Generate a one-time token for a user
   */
  static generateUserToken = (siteUrl: string, username: string, clientId?: string, scope?: string, grantType?: string) =>
    api.generateUserToken(siteUrl, username, clientId, scope, grantType);

  /**
   * Get database backups
   */
  static getDatabaseBackups = (siteUrl: string) => api.getDatabaseBackups(siteUrl);

  /**
   * Get installed packages
   */
  static getInstalledPackages = (siteUrl: string) => api.getInstalledPackages(siteUrl);

  /**
   * Get root package details
   */
  static getRootPackageDetails = (siteUrl: string) => api.getRootPackageDetails(siteUrl);

  /**
   * Get specific local package details
   */
  static getLocalPackageDetails = (siteUrl: string, name: string) => api.getLocalPackageDetails(siteUrl, name);

  /**
   * Get file contents (composer.json or composer.lock)
   */
  static getFiles = (siteUrl: string, file: 'composer.json' | 'composer.lock') => api.getFiles(siteUrl, file);

  /**
   * Get session status
   */
  static getSessionStatus = (siteUrl: string) => api.getSessionStatus(siteUrl);

  /**
   * Create session (login)
   */
  static createSession = (siteUrl: string, credentials: any) => api.createSession(siteUrl, credentials);

  /**
   * Delete session (logout)
   */
  static deleteSession = (siteUrl: string) => api.deleteSession(siteUrl);

  /**
   * Get server configuration
   */
  static getServerConfig = (siteUrl: string) => api.getServerConfig(siteUrl);

  /**
   * Set server configuration
   */
  static setServerConfig = (siteUrl: string, config: { php_cli?: string; cloud?: boolean }) =>
    api.setServerConfig(siteUrl, config);

  /**
   * Get PHP information
   */
  static getPhpInfo = (siteUrl: string) => api.getPhpInfo(siteUrl);

  /**
   * Get Composer configuration
   */
  static getComposerConfig = (siteUrl: string) => api.getComposerConfig(siteUrl);

  /**
   * Get database status
   */
  static getDatabaseStatus = (siteUrl: string) => api.getDatabaseStatus(siteUrl);

  /**
   * Get Composer Cloud data
   */
  static getComposerCloudData = (siteUrl: string) => api.getComposerCloudData(siteUrl);

  /**
   * Get log files list
   */
  static getLogFiles = (siteUrl: string) => api.getLogFiles(siteUrl);
}

/**
 * Migration and task API service
 * All methods now require siteUrl parameter
 */
export class TaskApiService {
  /**
   * Get database migration status
   */
  static getDatabaseMigrationStatus = (siteUrl: string) => api.getDatabaseMigrationStatus(siteUrl);

  /**
   * Start database migration
   */
  static startDatabaseMigration = (siteUrl: string, payload: any) => api.startDatabaseMigration(siteUrl, payload);

  /**
   * Delete database migration task
   */
  static deleteDatabaseMigrationTask = (siteUrl: string) => api.deleteDatabaseMigrationTask(siteUrl);

  /**
   * Get task data
   */
  static getTaskData = (siteUrl: string) => api.getTaskData(siteUrl);

  /**
   * Set task data
   */
  static setTaskData = (siteUrl: string, taskData: any) => api.setTaskData(siteUrl, taskData);

  /**
   * Delete task data
   */
  static deleteTaskData = (siteUrl: string) => api.deleteTaskData(siteUrl);

  /**
   * Patch task status (for aborting tasks)
   */
  static patchTaskStatus = (siteUrl: string, status: 'active' | 'aborting') => api.patchTaskStatus(siteUrl, status);

  /**
   * Get maintenance mode status
   */
  static getMaintenanceModeStatus = (siteUrl: string) => api.getMaintenanceModeStatus(siteUrl);

  /**
   * Enable maintenance mode
   */
  static enableMaintenanceMode = (siteUrl: string) => api.enableMaintenanceMode(siteUrl);

  /**
   * Disable maintenance mode
   */
  static disableMaintenanceMode = (siteUrl: string) => api.disableMaintenanceMode(siteUrl);

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

/**
 * Snapshot API Service
 * Handles composer file snapshots
 */
export class SnapshotApiService {
  static createSnapshot = (siteUrl: string, composerJson?: string, composerLock?: string) =>
    api.createSnapshot(siteUrl, { composerJson, composerLock });

  static getSnapshotFile = (snapshotId: string, filename: string) =>
    api.getSnapshotFile(snapshotId, filename);
}

/**
 * Backup API Service
 * Handles database backups and restore operations
 */
export class BackupApiService {
  static createComposerSnapshot = (siteUrl: string, composerJson?: string, composerLock?: string) =>
    api.createSnapshot(siteUrl, { composerJson, composerLock });

  static createDatabaseBackup = (siteUrl: string) =>
    api.createDatabaseBackup(siteUrl);

  static restoreDatabaseBackup = (siteUrl: string, filename: string, createBackup?: boolean) =>
    api.restoreDatabaseBackup(siteUrl, filename, createBackup);

  static getDatabaseBackups = (siteUrl: string) =>
    api.getDatabaseBackups(siteUrl);
}