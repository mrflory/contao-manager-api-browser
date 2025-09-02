import * as fs from 'fs';
import * as path from 'path';
import { HistoryEntry, HistoryResponse, CreateHistoryRequest, UpdateHistoryRequest } from '../types';

export class HistoryService {
    private readonly dataDir: string;

    constructor(dataDir: string = path.join(process.cwd(), 'data')) {
        this.dataDir = dataDir;
        
        // Ensure data directory exists
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    private extractSiteName(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    public saveHistoryEntry(siteUrl: string, historyEntry: HistoryEntry): boolean {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const historyFile = path.join(this.dataDir, `${hostname}.history.json`);
            
            let history: HistoryEntry[] = [];
            
            // Load existing history if file exists
            if (fs.existsSync(historyFile)) {
                const data = fs.readFileSync(historyFile, 'utf8');
                if (data.trim()) {
                    history = JSON.parse(data);
                }
            }
            
            // Find existing entry or add new one
            const existingIndex = history.findIndex(entry => entry.id === historyEntry.id);
            if (existingIndex !== -1) {
                history[existingIndex] = historyEntry;
            } else {
                history.unshift(historyEntry); // Add to beginning (newest first)
            }
            
            // Keep only last 50 entries
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            // Save back to file
            fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
            return true;
        } catch (error) {
            console.error('Failed to save history entry:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public loadHistoryForSite(siteUrl: string): HistoryEntry[] {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const historyFile = path.join(this.dataDir, `${hostname}.history.json`);
            
            if (!fs.existsSync(historyFile)) {
                return [];
            }
            
            const data = fs.readFileSync(historyFile, 'utf8');
            if (!data.trim()) {
                return [];
            }
            
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load history:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }

    public findHistoryEntry(siteUrl: string, historyId: string): HistoryEntry | null {
        try {
            const history = this.loadHistoryForSite(siteUrl);
            return history.find(entry => entry.id === historyId) || null;
        } catch (error) {
            console.error('Failed to find history entry:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    public createHistoryEntry(request: CreateHistoryRequest): HistoryEntry | null {
        try {
            const { siteUrl, workflowType } = request;
            
            if (!siteUrl || !workflowType) {
                throw new Error('siteUrl and workflowType are required');
            }

            // Create new history entry
            const historyEntry: HistoryEntry = {
                id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
                siteUrl,
                startTime: new Date().toISOString(),
                status: 'started',
                steps: [],
                workflowType
            };

            // Save to history file
            if (this.saveHistoryEntry(siteUrl, historyEntry)) {
                return historyEntry;
            }
            
            return null;
        } catch (error) {
            console.error('Create history error:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    public updateHistoryEntry(id: string, request: UpdateHistoryRequest): HistoryEntry | null {
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

            // Find history entry by id in the history file
            const historyEntry = this.findHistoryEntry(siteUrl, id);
            console.log('[HISTORY SERVICE] Found existing entry:', historyEntry ? 'Yes' : 'No');
            
            if (!historyEntry) {
                return null;
            }

            // Update fields if provided
            if (status) historyEntry.status = status as any;
            if (endTime) historyEntry.endTime = endTime;
            if (steps) historyEntry.steps = steps;

            console.log('[HISTORY SERVICE] Updated entry:', {
                id: historyEntry.id,
                status: historyEntry.status,
                stepsCount: historyEntry.steps.length
            });

            // Save updated entry back to history file
            const saveResult = this.saveHistoryEntry(siteUrl, historyEntry);
            console.log('[HISTORY SERVICE] Save result:', saveResult);
            
            if (saveResult) {
                return historyEntry;
            }
            
            return null;
        } catch (error) {
            console.error('[HISTORY SERVICE] Update history error:', error instanceof Error ? error.message : 'Unknown error');
            console.error('[HISTORY SERVICE] Error stack:', error instanceof Error ? error.stack : 'No stack');
            return null;
        }
    }

    public getHistoryForSite(siteUrl: string): HistoryResponse {
        try {
            // Load history from file (already sorted newest first)
            const history = this.loadHistoryForSite(siteUrl);
            
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

    public deleteHistoryEntry(siteUrl: string, historyId: string): boolean {
        try {
            const history = this.loadHistoryForSite(siteUrl);
            const filteredHistory = history.filter(entry => entry.id !== historyId);
            
            if (filteredHistory.length === history.length) {
                return false; // Entry not found
            }

            const hostname = this.extractSiteName(siteUrl);
            const historyFile = path.join(this.dataDir, `${hostname}.history.json`);
            
            fs.writeFileSync(historyFile, JSON.stringify(filteredHistory, null, 2));
            return true;
        } catch (error) {
            console.error('Failed to delete history entry:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public clearHistoryForSite(siteUrl: string): boolean {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const historyFile = path.join(this.dataDir, `${hostname}.history.json`);
            
            if (fs.existsSync(historyFile)) {
                fs.unlinkSync(historyFile);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to clear history:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public getHistoryStats(siteUrl: string): { 
        total: number; 
        completed: number; 
        failed: number; 
        running: number; 
        lastActivity?: string 
    } {
        try {
            const history = this.loadHistoryForSite(siteUrl);
            
            const stats = {
                total: history.length,
                completed: history.filter(h => h.status === 'completed').length,
                failed: history.filter(h => h.status === 'failed').length,
                running: history.filter(h => h.status === 'started').length,
                lastActivity: history.length > 0 ? history[0].startTime : undefined
            };

            return stats;
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