import { HistoryEntry, HistoryResponse, CreateHistoryRequest, UpdateHistoryRequest } from '../types';
import { UnifiedStorage, HistoryParams, QueryParams } from '../storage/interfaces';

export class HistoryService {
    private readonly storage: UnifiedStorage;

    constructor(storage: UnifiedStorage) {
        this.storage = storage;
    }

    private extractSiteName(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    public async saveHistoryEntry(siteUrl: string, historyEntry: HistoryEntry): Promise<boolean> {
        try {
            // Check if storage supports history
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsHistory) {
                console.warn('History storage not supported by current storage backend');
                return false;
            }

            if (!this.storage.history) {
                console.warn('Storage history interface not available');
                return false;
            }
            
            // Use storage abstraction to update the history entry
            const historyParams: HistoryParams = {
                siteUrl,
                workflowType: historyEntry.workflowType,
                status: historyEntry.status,
                startTime: historyEntry.startTime,
                endTime: historyEntry.endTime,
                steps: historyEntry.steps
            };
            
            const result = await this.storage.history.updateHistoryEntry(historyEntry.id, historyParams);
            
            if (!result.success) {
                console.error('Failed to save history entry:', result.error);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Failed to save history entry:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public async loadHistoryForSite(siteUrl: string): Promise<HistoryEntry[]> {
        try {
            // Check if storage supports history
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsHistory) {
                return [];
            }

            if (!this.storage.history) {
                console.warn('Storage history interface not available');
                return [];
            }
            
            const result = await this.storage.history.getHistory(siteUrl);
            
            if (!result.success) {
                console.error('Failed to load history:', result.error);
                return [];
            }
            
            return result.data || [];
        } catch (error) {
            console.error('Failed to load history:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }

    public async findHistoryEntry(siteUrl: string, historyId: string): Promise<HistoryEntry | null> {
        try {
            // Check if storage supports history
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsHistory) {
                return null;
            }

            if (!this.storage.history) {
                console.warn('Storage history interface not available');
                return null;
            }
            
            const result = await this.storage.history.getHistoryEntry(siteUrl, historyId);
            
            if (!result.success) {
                console.error('Failed to find history entry:', result.error);
                return null;
            }
            
            return result.data || null;
        } catch (error) {
            console.error('Failed to find history entry:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    public async createHistoryEntry(request: CreateHistoryRequest): Promise<HistoryEntry | null> {
        try {
            const { siteUrl, workflowType } = request;
            
            if (!siteUrl || !workflowType) {
                throw new Error('siteUrl and workflowType are required');
            }

            // Check if storage supports history
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsHistory) {
                console.warn('History storage not supported by current storage backend');
                return null;
            }

            if (!this.storage.history) {
                console.warn('Storage history interface not available');
                return null;
            }
            
            const historyParams: HistoryParams = {
                siteUrl,
                workflowType,
                status: 'started',
                startTime: new Date().toISOString(),
                steps: []
            };

            const result = await this.storage.history.createHistoryEntry(historyParams);
            
            if (!result.success) {
                console.error('Create history error:', result.error);
                return null;
            }
            
            return result.data || null;
        } catch (error) {
            console.error('Create history error:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    public async updateHistoryEntry(id: string, request: UpdateHistoryRequest): Promise<HistoryEntry | null> {
        console.log('[HISTORY SERVICE] updateHistoryEntry called:', {
            id,
            request: JSON.stringify(request, null, 2)
        });
        
        try {
            const { siteUrl, status, endTime, steps } = request;
            
            console.log('[HISTORY SERVICE] Extracted params:', { siteUrl, status, endTime, stepsCount: steps?.length });
            
            if (!siteUrl) {
                throw new Error('siteUrl is required');
            }

            // Check if storage supports history
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsHistory) {
                console.warn('History storage not supported by current storage backend');
                return null;
            }

            if (!this.storage.history) {
                console.warn('Storage history interface not available');
                return null;
            }

            const historyParams: HistoryParams = {
                siteUrl,
                status: status as any,
                endTime,
                steps
            };

            console.log('[HISTORY SERVICE] Calling storage update with params:', historyParams);

            const result = await this.storage.history.updateHistoryEntry(id, historyParams);
            console.log('[HISTORY SERVICE] Storage update result:', result.success);
            
            if (!result.success) {
                console.error('[HISTORY SERVICE] Update history error:', result.error);
                return null;
            }
            
            return result.data || null;
        } catch (error) {
            console.error('[HISTORY SERVICE] Update history error:', error instanceof Error ? error.message : 'Unknown error');
            console.error('[HISTORY SERVICE] Error stack:', error instanceof Error ? error.stack : 'No stack');
            return null;
        }
    }

    public async getHistoryForSite(siteUrl: string): Promise<HistoryResponse> {
        try {
            // Load history from storage abstraction
            const history = await this.loadHistoryForSite(siteUrl);
            
            return { 
                success: true,
                history,
                total: history.length,
                siteUrl
            };
        } catch (error) {
            throw new Error(`Failed to get history: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public async deleteHistoryEntry(siteUrl: string, historyId: string): Promise<boolean> {
        try {
            // Check if storage supports history
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsHistory) {
                console.warn('History storage not supported by current storage backend');
                return false;
            }

            if (!this.storage.history) {
                console.warn('Storage history interface not available');
                return false;
            }
            
            const result = await this.storage.history.deleteHistoryEntry(siteUrl, historyId);
            
            if (!result.success) {
                console.error('Failed to delete history entry:', result.error);
                return false;
            }
            
            return result.data || false;
        } catch (error) {
            console.error('Failed to delete history entry:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public async clearHistoryForSite(siteUrl: string): Promise<boolean> {
        try {
            // Check if storage supports history
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsHistory) {
                console.warn('History storage not supported by current storage backend');
                return false;
            }

            if (!this.storage.history) {
                console.warn('Storage history interface not available');
                return false;
            }
            
            const result = await this.storage.history.clearHistory(siteUrl);
            
            if (!result.success) {
                console.error('Failed to clear history:', result.error);
                return false;
            }
            
            return result.data || false;
        } catch (error) {
            console.error('Failed to clear history:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public async getHistoryStats(siteUrl: string): Promise<{ 
        total: number; 
        completed: number; 
        failed: number; 
        running: number; 
        lastActivity?: string 
    }> {
        try {
            // Check if storage supports history
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsHistory) {
                return {
                    total: 0,
                    completed: 0,
                    failed: 0,
                    running: 0
                };
            }

            if (!this.storage.history) {
                console.warn('Storage history interface not available');
                return {
                    total: 0,
                    completed: 0,
                    failed: 0,
                    running: 0
                };
            }
            
            const result = await this.storage.history.getHistoryStats(siteUrl);
            
            if (!result.success) {
                console.error('Failed to get history stats:', result.error);
                return {
                    total: 0,
                    completed: 0,
                    failed: 0,
                    running: 0
                };
            }
            
            return result.data || {
                total: 0,
                completed: 0,
                failed: 0,
                running: 0
            };
        } catch (error) {
            console.error('Failed to get history stats:', error instanceof Error ? error.message : 'Unknown error');
            return {
                total: 0,
                completed: 0,
                failed: 0,
                running: 0
            };
        }
    }
}