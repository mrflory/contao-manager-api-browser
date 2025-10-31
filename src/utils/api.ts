import { Config, UpdateStatus, TokenInfo, ApiResponse, Site } from '../types';
import { HttpClient } from '../services/httpClient';

const API_BASE = '/api';

// Create a global HTTP client instance that will use axios interceptors for authentication
const httpClient = HttpClient.getInstance();

// Helper function for API calls with JWT authentication via axios interceptors
async function makeApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
  console.log(`[CLIENT] Making authenticated API call to: ${endpoint}`);
  console.log(`[CLIENT] Request options:`, options);

  try {
    const result = await httpClient.makeApiCall(`${API_BASE}${endpoint}`, options);

    if (result.success) {
      console.log(`[CLIENT] API call successful:`, result.data);
      return result.data;
    } else {
      console.error(`[CLIENT] API call failed:`, result.error);
      throw new Error(result.error || 'API call failed');
    }
  } catch (error) {
    console.error(`[CLIENT] API call error:`, error);
    throw error;
  }
}

export const api = {
  async getConfig(): Promise<Config> {
    return makeApiCall('/config');
  },

  async setActiveSite(url: string): Promise<{ activeSite: Site }> {
    return makeApiCall('/set-active-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
  },

  async saveToken(token: string, managerUrl: string): Promise<ApiResponse> {
    return makeApiCall('/save-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, managerUrl })
    });
  },

  async removeSite(url: string): Promise<void> {
    await makeApiCall(`/sites/${encodeURIComponent(url)}`, {
      method: 'DELETE'
    });
  },

  async updateSiteName(url: string, newName: string): Promise<ApiResponse> {
    return makeApiCall('/update-site-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name: newName })
    });
  },

  async getUpdateStatus(): Promise<UpdateStatus> {
    return makeApiCall('/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async updateVersionInfo(): Promise<{ success: boolean; versionInfo: any; error?: string }> {
    return makeApiCall('/update-version-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async getTokenInfo(): Promise<{ success: boolean; tokenInfo: TokenInfo; error?: string }> {
    return makeApiCall('/token-info');
  },

  // ============================================================================
  // Site-Specific API Endpoints (No Active Site Dependency)
  // ============================================================================

  // Server Configuration endpoints
  async getServerConfig(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/server/config`);
  },

  async getSessionStatus(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/session`);
  },

  async createSession(siteUrl: string, credentials: { username?: string; password?: string; totp?: string; token?: string }): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
  },

  async deleteSession(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/session`, {
      method: 'DELETE'
    });
  },

  async getPhpInfo(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/server/phpinfo`);
  },

  async getComposerConfig(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/server/composer`);
  },

  async getDatabaseStatus(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/server/database`);
  },

  async getComposerCloudData(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/packages/cloud`);
  },

  async getLogFiles(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/logs`);
  },

  async getPhpWebConfig(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/server/php-web`);
  },

  async getContaoConfig(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/server/contao`);
  },

  // Users endpoints
  async getUsersList(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/users`);
  },

  async getTokensList(siteUrl: string, username: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/users/${username}/tokens`);
  },

  async getTokenDetails(siteUrl: string, username: string, tokenId: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/users/${username}/tokens/${tokenId}`);
  },

  async deleteToken(siteUrl: string, username: string, tokenId: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/users/${username}/tokens/${tokenId}`, {
      method: 'DELETE'
    });
  },

  async generateUserToken(siteUrl: string, username: string, clientId: string = 'contao-manager-api', scope: string = 'admin', grantType?: string): Promise<any> {
    const payload: any = {
      client_id: clientId,
      scope: scope
    };

    // Only add grant_type if specified
    if (grantType) {
      payload.grant_type = grantType;
    }

    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/users/${username}/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  // Contao API endpoints
  async getDatabaseMigrationStatus(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/contao/database-migration`);
  },

  async startDatabaseMigration(siteUrl: string, payload: any): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/contao/database-migration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  async deleteDatabaseMigrationTask(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/contao/database-migration`, {
      method: 'DELETE'
    });
  },

  async getDatabaseBackups(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/contao/backup`);
  },

  async getMaintenanceModeStatus(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/maintenance-mode`);
  },

  async enableMaintenanceMode(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/maintenance-mode`, {
      method: 'PUT'
    });
  },

  async disableMaintenanceMode(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/maintenance-mode`, {
      method: 'DELETE'
    });
  },

  async getSiteMaintenanceModeStatus(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/maintenance-mode`);
  },

  // Tasks endpoints
  async getTaskData(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/task`);
  },

  async setTaskData(siteUrl: string, taskData: any): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/task`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
  },

  async deleteTaskData(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/task`, {
      method: 'DELETE'
    });
  },

  // Packages endpoints
  async getRootPackageDetails(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/packages/root`);
  },

  async getInstalledPackages(siteUrl: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/packages/local/`);
  },

  async getLocalPackageDetails(siteUrl: string, name: string): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/packages/local/${encodeURIComponent(name)}`);
  },

  // Logs endpoint
  async getLogs(siteUrl: string): Promise<{ logs: any[]; total: number; siteUrl: string; hostname: string; message?: string }> {
    return makeApiCall(`/logs/${encodeURIComponent(siteUrl)}`);
  },

  async cleanupOldLogs(siteUrl: string): Promise<{ success: boolean; deletedCount: number; message?: string; error?: string }> {
    return makeApiCall(`/logs/${encodeURIComponent(siteUrl)}/cleanup`, {
      method: 'DELETE'
    });
  },

  // Task status management
  async patchTaskStatus(siteUrl: string, status: 'active' | 'aborting'): Promise<any> {
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/task`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  },

  // Server self-update status (using existing getUpdateStatus for consistency)
  async getServerSelfUpdateStatus(): Promise<any> {
    const updateStatus = await this.getUpdateStatus();
    return updateStatus.selfUpdate;
  },

  // Files endpoint
  async getFiles(siteUrl: string, file: 'composer.json' | 'composer.lock'): Promise<string> {
    console.log(`[CLIENT] Making authenticated file API call to: /site/${encodeURIComponent(siteUrl)}/files/${encodeURIComponent(file)}`);
    return makeApiCall(`/site/${encodeURIComponent(siteUrl)}/files/${encodeURIComponent(file)}`);
  },

  // History endpoints
  async post<T = any>(endpoint: string, data: any): Promise<{ data: T }> {
    const response = await makeApiCall(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return { data: response };
  },

  async put<T = any>(endpoint: string, data: any): Promise<{ data: T }> {
    const response = await makeApiCall(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return { data: response };
  },

  async get<T = any>(endpoint: string): Promise<{ data: T }> {
    const response = await makeApiCall(endpoint);
    return { data: response };
  },

  // History API functions
  async getHistoryForSite(siteUrl: string): Promise<any> {
    return makeApiCall(`/history/${encodeURIComponent(siteUrl)}`);
  },

  async createHistoryEntry(data: { siteUrl: string; workflowType: string }): Promise<any> {
    return makeApiCall('/history/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async updateHistoryEntry(id: string, data: { siteUrl: string; status?: string; endTime?: string; steps?: any[] }): Promise<any> {
    return makeApiCall(`/history/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteHistoryEntry(siteUrl: string, historyId: string): Promise<any> {
    return makeApiCall(`/history/${encodeURIComponent(siteUrl)}/${historyId}`, {
      method: 'DELETE'
    });
  },

  // Authentication API functions
  async validateToken(data: { url: string; token: string }): Promise<any> {
    return makeApiCall('/validate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async cookieAuth(data: { managerUrl: string; credentials: { username: string; password: string; totp?: string } }): Promise<any> {
    return makeApiCall('/cookie-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async cookieSessionCheck(data: { managerUrl: string }): Promise<any> {
    return makeApiCall('/cookie-session-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async cookieLogout(data: { managerUrl: string }): Promise<any> {
    return makeApiCall('/cookie-logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async saveSiteCookie(data: { managerUrl: string; user: any; authMethod: string; scope: string; isReauth?: boolean }): Promise<any> {
    return makeApiCall('/save-site-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  // Snapshot endpoints
  async createSnapshot(data: { siteUrl: string; workflowId?: string; stepId?: string }): Promise<any> {
    return makeApiCall('/snapshots/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async downloadSnapshot(snapshotId: string, filename: 'composer.json' | 'composer.lock'): Promise<Blob> {
    console.log(`[CLIENT] Making authenticated blob download to: /snapshots/${encodeURIComponent(snapshotId)}/${filename}`);

    try {
      // Use the HttpClient's axios instance directly for blob downloads
      const response = await httpClient.axios.get(`${API_BASE}/snapshots/${encodeURIComponent(snapshotId)}/${filename}`, {
        responseType: 'blob'
      });

      console.log(`[CLIENT] Blob download successful:`, response.status);
      return response.data;
    } catch (error) {
      console.error(`[CLIENT] Blob download error:`, error);
      throw error;
    }
  },

  async getSnapshotFileContent(snapshotId: string, filename: 'composer.json' | 'composer.lock'): Promise<string> {
    const response = await makeApiCall(`/snapshots/${encodeURIComponent(snapshotId)}/${filename}/content`);
    // The API now returns an object with { content, size, filename }
    return response.content || response;
  },

  async listSnapshots(siteUrl: string): Promise<any> {
    return makeApiCall(`/snapshots/list/${encodeURIComponent(siteUrl)}`);
  },

  async deleteSnapshot(snapshotId: string): Promise<any> {
    return makeApiCall(`/snapshots/${encodeURIComponent(snapshotId)}`, {
      method: 'DELETE'
    });
  },

  async cleanupSnapshots(siteUrl: string, keepLast: number = 10): Promise<any> {
    return makeApiCall(`/snapshots/cleanup/${encodeURIComponent(siteUrl)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepLast })
    });
  }
};