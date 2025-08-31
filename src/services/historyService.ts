import { api } from '../utils/api';
import { HistoryEntry } from '../types';

export interface CreateHistoryEntryRequest {
  siteUrl: string;
  workflowType: 'update' | 'migration' | 'composer';
}

export interface UpdateHistoryEntryRequest {
  siteUrl: string;
  status?: 'started' | 'finished' | 'cancelled' | 'error';
  endTime?: string;
  steps?: Array<{
    id: string;
    title: string;
    summary: string;
    startTime: string;
    endTime?: string;
    status: string;
    error?: string;
  }>;
}

export interface HistoryResponse {
  success: boolean;
  history: HistoryEntry[];
  total: number;
  siteUrl: string;
}

export interface HistoryEntryResponse {
  success: boolean;
  historyEntry: HistoryEntry;
}

export class HistoryService {
  /**
   * Create a new history entry for a workflow
   */
  static async createHistoryEntry(request: CreateHistoryEntryRequest): Promise<HistoryEntry> {
    const response = await api.post<HistoryEntryResponse>('/history/create', request);
    
    if (!response.data.success) {
      throw new Error('Failed to create history entry');
    }
    
    return response.data.historyEntry;
  }

  /**
   * Update an existing history entry
   */
  static async updateHistoryEntry(historyId: string, request: UpdateHistoryEntryRequest): Promise<HistoryEntry> {
    const response = await api.put<HistoryEntryResponse>(`/history/${historyId}`, request);
    
    if (!response.data.success) {
      throw new Error('Failed to update history entry');
    }
    
    return response.data.historyEntry;
  }

  /**
   * Get history entries for a specific site
   */
  static async getHistoryForSite(siteUrl: string): Promise<HistoryEntry[]> {
    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const response = await api.get<HistoryResponse>(`/history/${encodedSiteUrl}`);
    
    if (!response.data.success) {
      throw new Error('Failed to get history for site');
    }
    
    return response.data.history;
  }
}