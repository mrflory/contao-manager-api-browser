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
  static getConfig = api.getConfig;

  /**
   * Save authentication token for a site
   */
  static saveToken = api.saveToken;

  /**
   * Remove site from configuration
   */
  static removeSite = api.removeSite;

  /**
   * Update site name
   */
  static updateSiteName = api.updateSiteName;

  /**
   * Set active site
   */
  static setActiveSite = api.setActiveSite;

  /**
   * Update version information for current site
   */
  static updateVersionInfo = api.updateVersionInfo;
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
}