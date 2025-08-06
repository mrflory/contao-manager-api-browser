import { Config, UpdateStatus, TokenInfo, ApiResponse, Site } from '../types';

const API_BASE = '/api';

// Helper function for API calls with better error handling
async function makeApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
  console.log(`[CLIENT] Making API call to: ${endpoint}`);
  console.log(`[CLIENT] Request options:`, options);
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  
  console.log(`[CLIENT] Response status: ${response.status}`);
  console.log(`[CLIENT] Response headers:`, Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[CLIENT] Error response text:`, errorText);
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    console.log(`[CLIENT] No content response (204)`);
    return {};
  }

  const contentType = response.headers.get('content-type');
  console.log(`[CLIENT] Content-Type: ${contentType}`);

  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    console.log(`[CLIENT] Response text:`, text);
    console.log(`[CLIENT] Response text length:`, text.length);
    
    if (!text || text.trim() === '') {
      console.log(`[CLIENT] Empty response body, returning empty object`);
      return {};
    }
    
    try {
      const parsed = JSON.parse(text);
      console.log(`[CLIENT] Parsed JSON:`, parsed);
      return parsed;
    } catch (e) {
      console.error(`[CLIENT] JSON parse error:`, e);
      console.error(`[CLIENT] Failed to parse text:`, text);
      throw new Error(`Invalid JSON response: ${text}`);
    }
  } else {
    const text = await response.text();
    console.log(`[CLIENT] Non-JSON response:`, text);
    return text;
  }
}

export const api = {
  async getConfig(): Promise<Config> {
    const response = await fetch(`${API_BASE}/config`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async setActiveSite(url: string): Promise<{ activeSite: Site }> {
    const response = await fetch(`${API_BASE}/set-active-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return response.json();
  },

  async saveToken(token: string, managerUrl: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/save-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, managerUrl })
    });
    return response.json();
  },

  async removeSite(url: string): Promise<void> {
    await fetch(`${API_BASE}/sites/${encodeURIComponent(url)}`, {
      method: 'DELETE'
    });
  },

  async updateSiteName(url: string, newName: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/update-site-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name: newName })
    });
    return response.json();
  },

  async getUpdateStatus(): Promise<UpdateStatus> {
    const response = await fetch(`${API_BASE}/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  },

  async updateVersionInfo(): Promise<{ success: boolean; versionInfo: any; error?: string }> {
    const response = await fetch(`${API_BASE}/update-version-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  },

  async getTokenInfo(): Promise<{ success: boolean; tokenInfo: TokenInfo; error?: string }> {
    const response = await fetch(`${API_BASE}/token-info`);
    return response.json();
  },

  // Server Configuration endpoints
  async getServerConfig(): Promise<any> {
    return makeApiCall('/server/config');
  },

  async getPhpWebConfig(): Promise<any> {
    return makeApiCall('/server/php-web');
  },

  async getContaoConfig(): Promise<any> {
    return makeApiCall('/server/contao');
  },

  // Users endpoints
  async getUsersList(): Promise<any> {
    return makeApiCall('/users');
  },

  async getTokensList(username: string): Promise<any> {
    return makeApiCall(`/users/${username}/tokens`);
  },

  async getTokenDetails(username: string, tokenId: string): Promise<any> {
    return makeApiCall(`/users/${username}/tokens/${tokenId}`);
  },

  // Contao API endpoints
  async getDatabaseMigrationStatus(): Promise<any> {
    return makeApiCall('/contao/database-migration');
  },

  async startDatabaseMigration(payload: any): Promise<any> {
    return makeApiCall('/contao/database-migration', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  async deleteDatabaseMigrationTask(): Promise<any> {
    return makeApiCall('/contao/database-migration', {
      method: 'DELETE'
    });
  },

  async getDatabaseBackups(): Promise<any> {
    return makeApiCall('/contao/backup');
  },

  async getMaintenanceModeStatus(): Promise<any> {
    return makeApiCall('/contao/maintenance-mode');
  },

  async enableMaintenanceMode(): Promise<any> {
    return makeApiCall('/contao/maintenance-mode', {
      method: 'PUT'
    });
  },

  async disableMaintenanceMode(): Promise<any> {
    return makeApiCall('/contao/maintenance-mode', {
      method: 'DELETE'
    });
  },

  // Tasks endpoints
  async getTaskData(): Promise<any> {
    return makeApiCall('/task');
  },

  async setTaskData(taskData: any): Promise<any> {
    return makeApiCall('/task', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
  },

  async deleteTaskData(): Promise<any> {
    return makeApiCall('/task', {
      method: 'DELETE'
    });
  },

  // Packages endpoints
  async getRootPackageDetails(): Promise<any> {
    return makeApiCall('/packages/root');
  },

  async getInstalledPackages(): Promise<any> {
    return makeApiCall('/packages/local/');
  },

  async getLocalPackageDetails(name: string): Promise<any> {
    return makeApiCall(`/packages/local/${encodeURIComponent(name)}`);
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
  async patchTaskStatus(status: 'active' | 'aborting'): Promise<any> {
    return makeApiCall('/task', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  },

  // Server self-update status (using existing getUpdateStatus for consistency)
  async getServerSelfUpdateStatus(): Promise<any> {
    const updateStatus = await this.getUpdateStatus();
    return updateStatus.selfUpdate;
  }
};