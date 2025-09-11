import * as fs from 'fs';
import * as path from 'path';
import { JsonFileStorage } from './JsonFileStorage';
import { 
    UnifiedStorage, 
    StorageConfig, 
    StorageResult, 
    StorageCapabilities,
    LogsStorage,
    HistoryStorage,
    SnapshotsStorage,
    LogParams,
    HistoryParams,
    SnapshotParams,
    QueryParams,
    CleanupParams,
    StorageType,
    STORAGE_TYPE_CAPABILITIES
} from './interfaces';
import { LogEntry, HistoryEntry } from '../types';
import { SnapshotMetadata } from '../services/snapshotService';

/**
 * JsonFileStorage implementation with UnifiedStorage support
 * Extends the base JsonFileStorage to add logs, history, and snapshots functionality
 */
export class JsonFileStorageUnified extends JsonFileStorage implements UnifiedStorage {
    private readonly dataDir: string;
    
    public readonly logs: LogsStorage;
    public readonly history: HistoryStorage;
    public readonly snapshots: SnapshotsStorage;

    constructor(config: StorageConfig) {
        super(config);
        this.dataDir = config.dataDir || path.join(process.cwd(), 'data');
        
        // Initialize the sub-storage interfaces
        this.logs = new JsonLogsStorage(this.dataDir);
        this.history = new JsonHistoryStorage(this.dataDir);
        this.snapshots = new JsonSnapshotsStorage(this.dataDir);
    }

    override getCapabilities(): StorageCapabilities {
        return STORAGE_TYPE_CAPABILITIES[StorageType.JSON_FILE];
    }

    override async initialize(): Promise<StorageResult<boolean>> {
        // Call parent initialization
        const parentResult = await super.initialize();
        if (!parentResult.success) {
            return parentResult;
        }

        // Ensure data directory exists for sub-storages
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }

            // Ensure snapshots subdirectory exists
            const snapshotsDir = path.join(this.dataDir, 'snapshots');
            if (!fs.existsSync(snapshotsDir)) {
                fs.mkdirSync(snapshotsDir, { recursive: true });
            }

            return this.createStorageResult(true, true);
        } catch (error) {
            return this.createStorageResult(false, false, error instanceof Error ? error.message : 'Unknown error');
        }
    }
}

/**
 * JSON file-based logs storage implementation
 */
class JsonLogsStorage implements LogsStorage {
    constructor(private readonly dataDir: string) {}

    private extractSiteName(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    async addLogEntry(params: LogParams): Promise<StorageResult<boolean>> {
        try {
            const { siteUrl, method, endpoint, statusCode, requestData, responseData, error } = params;
            const hostname = this.extractSiteName(siteUrl);
            const logFile = path.join(this.dataDir, `${hostname}.log`);
            
            const timestamp = new Date().toISOString();
            
            const logEntry: LogEntry = {
                timestamp,
                method: method || 'UNKNOWN',
                endpoint: endpoint || '',
                statusCode: statusCode || 0,
                requestData: requestData || null,
                responseData: responseData || null,
                error: error || undefined
            };
            
            const logLine = JSON.stringify(logEntry) + '\n';
            
            // Append to log file
            fs.appendFileSync(logFile, logLine);
            
            return { success: true, data: true };
        } catch (error) {
            return { 
                success: false, 
                data: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    async getLogs(siteUrl: string, query?: QueryParams): Promise<StorageResult<LogEntry[]>> {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const logFile = path.join(this.dataDir, `${hostname}.log`);
            
            // Check if log file exists
            if (!fs.existsSync(logFile)) {
                return { success: true, data: [] };
            }
            
            // Read log file and parse JSON lines
            const logContent = fs.readFileSync(logFile, 'utf8');
            const logLines = logContent.trim().split('\n').filter(line => line.trim());
            
            const logs: LogEntry[] = [];
            for (const line of logLines) {
                try {
                    const logEntry = JSON.parse(line);
                    logs.push(logEntry);
                } catch (parseError) {
                    // Include unparseable lines as raw text
                    logs.push({
                        timestamp: new Date().toISOString(),
                        method: 'UNKNOWN',
                        endpoint: 'PARSE_ERROR',
                        statusCode: 0,
                        error: `Failed to parse: ${line}`,
                        requestData: null,
                        responseData: null
                    });
                }
            }
            
            // Sort logs by timestamp (newest first)
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            return { success: true, data: logs };
        } catch (error) {
            return { 
                success: false, 
                data: [], 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    async getLogStats(siteUrl: string): Promise<StorageResult<{ total: number; errorCount: number; lastActivity?: string }>> {
        try {
            const result = await this.getLogs(siteUrl);
            if (!result.success || !result.data) {
                return { success: false, data: { total: 0, errorCount: 0 }, error: result.error };
            }

            const logs = result.data;
            const errorCount = logs.filter(log => log.statusCode >= 400 || log.error).length;
            const lastActivity = logs.length > 0 ? logs[0].timestamp : undefined;

            return {
                success: true,
                data: {
                    total: logs.length,
                    errorCount,
                    lastActivity
                }
            };
        } catch (error) {
            return { 
                success: false, 
                data: { total: 0, errorCount: 0 }, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    async cleanupLogs(params: CleanupParams): Promise<StorageResult<{ deletedCount: number; message: string }>> {
        try {
            const { siteUrl, olderThan } = params;
            const hostname = this.extractSiteName(siteUrl);
            const logFile = path.join(this.dataDir, `${hostname}.log`);
            
            // Check if log file exists
            if (!fs.existsSync(logFile)) {
                return { 
                    success: true, 
                    data: { deletedCount: 0, message: 'No logs found for this site' }
                };
            }
            
            // Read log file and parse JSON lines
            const logContent = fs.readFileSync(logFile, 'utf8');
            const logLines = logContent.trim().split('\n').filter(line => line.trim());
            
            const logs: string[] = [];
            const cutoffDate = olderThan ? new Date(olderThan) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 1 week ago
            
            let deletedCount = 0;
            
            for (const line of logLines) {
                try {
                    const logEntry = JSON.parse(line);
                    const logDate = new Date(logEntry.timestamp);
                    
                    // Keep logs that are newer than cutoff
                    if (logDate > cutoffDate) {
                        logs.push(line);
                    } else {
                        deletedCount++;
                    }
                } catch (parseError) {
                    // Keep unparseable lines as they might be important
                    logs.push(line);
                }
            }
            
            // Write the filtered logs back to the file
            const newLogContent = logs.length > 0 ? logs.join('\n') + '\n' : '';
            fs.writeFileSync(logFile, newLogContent);
            
            return { 
                success: true, 
                data: { 
                    deletedCount, 
                    message: `Successfully deleted ${deletedCount} log entries older than ${cutoffDate.toISOString()}`
                }
            };
        } catch (error) {
            return {
                success: false,
                data: { deletedCount: 0, message: 'Failed to cleanup logs' },
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async clearLogs(siteUrl: string): Promise<StorageResult<boolean>> {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const logFile = path.join(this.dataDir, `${hostname}.log`);
            
            if (fs.existsSync(logFile)) {
                fs.unlinkSync(logFile);
            }
            
            return { success: true, data: true };
        } catch (error) {
            return { 
                success: false, 
                data: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }
}

/**
 * JSON file-based history storage implementation
 */
class JsonHistoryStorage implements HistoryStorage {
    constructor(private readonly dataDir: string) {}

    private extractSiteName(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    private generateHistoryId(): string {
        return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    }

    async createHistoryEntry(params: HistoryParams): Promise<StorageResult<HistoryEntry>> {
        try {
            const { siteUrl, workflowType, status, startTime, steps } = params;
            
            if (!siteUrl || !workflowType) {
                return {
                    success: false,
                    error: 'siteUrl and workflowType are required'
                };
            }

            // Create new history entry
            const historyEntry: HistoryEntry = {
                id: this.generateHistoryId(),
                siteUrl,
                startTime: startTime || new Date().toISOString(),
                status: status || 'started',
                steps: steps || [],
                workflowType
            };

            // Save to history file
            const result = await this.saveHistoryEntry(siteUrl, historyEntry);
            if (!result.success) {
                return { success: false, error: result.error };
            }
            
            return { success: true, data: historyEntry };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async updateHistoryEntry(id: string, params: HistoryParams): Promise<StorageResult<HistoryEntry>> {
        try {
            const { siteUrl, status, endTime, steps } = params;
            
            if (!siteUrl) {
                return {
                    success: false,
                    error: 'siteUrl is required'
                };
            }

            // Find existing entry
            const existingResult = await this.getHistoryEntry(siteUrl, id);
            if (!existingResult.success || !existingResult.data) {
                return {
                    success: false,
                    error: 'History entry not found'
                };
            }

            const historyEntry = existingResult.data;

            // Update fields if provided
            if (status) historyEntry.status = status as any;
            if (endTime) historyEntry.endTime = endTime;
            if (steps) historyEntry.steps = steps;

            // Save updated entry
            const result = await this.saveHistoryEntry(siteUrl, historyEntry);
            if (!result.success) {
                return { success: false, error: result.error };
            }
            
            return { success: true, data: historyEntry };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getHistoryEntry(siteUrl: string, id: string): Promise<StorageResult<HistoryEntry | null>> {
        try {
            const result = await this.getHistory(siteUrl);
            if (!result.success || !result.data) {
                return { success: false, data: null, error: result.error };
            }

            const entry = result.data.find(h => h.id === id) || null;
            return { success: true, data: entry };
        } catch (error) {
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getHistory(siteUrl: string, query?: QueryParams): Promise<StorageResult<HistoryEntry[]>> {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const historyFile = path.join(this.dataDir, `${hostname}.history.json`);
            
            if (!fs.existsSync(historyFile)) {
                return { success: true, data: [] };
            }
            
            const data = fs.readFileSync(historyFile, 'utf8');
            if (!data.trim()) {
                return { success: true, data: [] };
            }
            
            const history = JSON.parse(data);
            return { success: true, data: history };
        } catch (error) {
            return {
                success: false,
                data: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getHistoryStats(siteUrl: string): Promise<StorageResult<{ total: number; completed: number; failed: number; running: number; lastActivity?: string }>> {
        try {
            const result = await this.getHistory(siteUrl);
            if (!result.success || !result.data) {
                return { success: false, data: { total: 0, completed: 0, failed: 0, running: 0 }, error: result.error };
            }

            const history = result.data;
            const stats = {
                total: history.length,
                completed: history.filter(h => h.status === 'completed').length,
                failed: history.filter(h => h.status === 'failed').length,
                running: history.filter(h => h.status === 'started').length,
                lastActivity: history.length > 0 ? history[0].startTime : undefined
            };

            return { success: true, data: stats };
        } catch (error) {
            return {
                success: false,
                data: { total: 0, completed: 0, failed: 0, running: 0 },
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async deleteHistoryEntry(siteUrl: string, id: string): Promise<StorageResult<boolean>> {
        try {
            const result = await this.getHistory(siteUrl);
            if (!result.success || !result.data) {
                return { success: false, data: false, error: result.error };
            }

            const history = result.data;
            const filteredHistory = history.filter(entry => entry.id !== id);
            
            if (filteredHistory.length === history.length) {
                return { success: false, data: false, error: 'Entry not found' };
            }

            const hostname = this.extractSiteName(siteUrl);
            const historyFile = path.join(this.dataDir, `${hostname}.history.json`);
            
            fs.writeFileSync(historyFile, JSON.stringify(filteredHistory, null, 2));
            return { success: true, data: true };
        } catch (error) {
            return {
                success: false,
                data: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async clearHistory(siteUrl: string): Promise<StorageResult<boolean>> {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const historyFile = path.join(this.dataDir, `${hostname}.history.json`);
            
            if (fs.existsSync(historyFile)) {
                fs.unlinkSync(historyFile);
            }
            
            return { success: true, data: true };
        } catch (error) {
            return {
                success: false,
                data: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async saveHistoryEntry(siteUrl: string, historyEntry: HistoryEntry): Promise<StorageResult<boolean>> {
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
            return { success: true, data: true };
        } catch (error) {
            return {
                success: false,
                data: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

/**
 * JSON file-based snapshots storage implementation
 */
class JsonSnapshotsStorage implements SnapshotsStorage {
    private readonly snapshotsDir: string;

    constructor(private readonly dataDir: string) {
        this.snapshotsDir = path.join(this.dataDir, 'snapshots');
    }

    private extractSiteName(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
        } catch {
            return url.replace(/[^a-zA-Z0-9.-]/g, '_');
        }
    }

    private generateSnapshotId(siteUrl: string): string {
        const siteName = this.extractSiteName(siteUrl);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').split('.')[0];
        return `${siteName}-${timestamp}`;
    }

    async createSnapshot(params: SnapshotParams): Promise<StorageResult<SnapshotMetadata>> {
        try {
            const { siteUrl, composerJson, composerLock, workflowId, stepId } = params;
            
            if (!siteUrl) {
                return { success: false, error: 'siteUrl is required' };
            }

            if (!composerJson && !composerLock) {
                return { success: false, error: 'At least one of composerJson or composerLock is required' };
            }

            const snapshotId = this.generateSnapshotId(siteUrl);
            const snapshotDir = path.join(this.snapshotsDir, snapshotId);
            
            // Create snapshot directory
            if (!fs.existsSync(snapshotDir)) {
                fs.mkdirSync(snapshotDir, { recursive: true });
            }

            const metadata: SnapshotMetadata = {
                id: snapshotId,
                siteUrl,
                timestamp: new Date().toISOString(),
                files: {},
                workflowId,
                stepId
            };

            // Save composer.json if provided
            if (composerJson) {
                const composerJsonPath = path.join(snapshotDir, 'composer.json');
                fs.writeFileSync(composerJsonPath, composerJson, 'utf8');
                metadata.files['composer.json'] = {
                    size: Buffer.byteLength(composerJson, 'utf8'),
                    exists: true
                };
            }

            // Save composer.lock if provided
            if (composerLock) {
                const composerLockPath = path.join(snapshotDir, 'composer.lock');
                fs.writeFileSync(composerLockPath, composerLock, 'utf8');
                metadata.files['composer.lock'] = {
                    size: Buffer.byteLength(composerLock, 'utf8'),
                    exists: true
                };
            }

            // Save metadata
            const metadataPath = path.join(snapshotDir, 'metadata.json');
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

            return { success: true, data: metadata };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getSnapshotMetadata(id: string): Promise<StorageResult<SnapshotMetadata | null>> {
        try {
            const metadataPath = path.join(this.snapshotsDir, id, 'metadata.json');
            
            if (!fs.existsSync(metadataPath)) {
                return { success: true, data: null };
            }

            const metadata = fs.readFileSync(metadataPath, 'utf8');
            return { success: true, data: JSON.parse(metadata) };
        } catch (error) {
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getSnapshotFile(id: string, filename: string): Promise<StorageResult<{ content: string; size: number; mimeType?: string } | null>> {
        try {
            // Validate filename - only allow specific files for security
            const allowedFiles = ['composer.json', 'composer.lock', 'metadata.json'];
            if (!allowedFiles.includes(filename)) {
                return {
                    success: false,
                    data: null,
                    error: `Invalid filename. Only ${allowedFiles.join(', ')} are allowed`
                };
            }

            const snapshotDir = path.join(this.snapshotsDir, id);
            const filePath = path.join(snapshotDir, filename);
            
            // Security check - ensure we're not accessing files outside the snapshot directory
            if (!filePath.startsWith(snapshotDir)) {
                return {
                    success: false,
                    data: null,
                    error: 'Invalid file path'
                };
            }

            // Check if snapshot directory exists
            if (!fs.existsSync(snapshotDir)) {
                return {
                    success: false,
                    data: null,
                    error: 'Snapshot not found'
                };
            }

            if (!fs.existsSync(filePath)) {
                return {
                    success: false,
                    data: null,
                    error: 'File not found in snapshot'
                };
            }

            // Get file stats for size validation
            const stats = fs.statSync(filePath);
            const maxFileSize = 10 * 1024 * 1024; // 10MB limit
            
            if (stats.size > maxFileSize) {
                return {
                    success: false,
                    data: null,
                    error: 'File too large to display'
                };
            }

            const content = fs.readFileSync(filePath, 'utf8');
            
            return {
                success: true,
                data: {
                    content,
                    size: stats.size,
                    mimeType: filename.endsWith('.json') ? 'application/json' : 'text/plain'
                }
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getSnapshots(siteUrl: string, query?: QueryParams): Promise<StorageResult<SnapshotMetadata[]>> {
        try {
            const siteName = this.extractSiteName(siteUrl);
            const snapshots: SnapshotMetadata[] = [];

            if (!fs.existsSync(this.snapshotsDir)) {
                return { success: true, data: [] };
            }

            const entries = fs.readdirSync(this.snapshotsDir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith(siteName + '-')) {
                    const metadataResult = await this.getSnapshotMetadata(entry.name);
                    if (metadataResult.success && metadataResult.data && metadataResult.data.siteUrl === siteUrl) {
                        snapshots.push(metadataResult.data);
                    }
                }
            }

            // Sort by timestamp (newest first)
            snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return { success: true, data: snapshots };
        } catch (error) {
            return {
                success: false,
                data: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async deleteSnapshot(id: string): Promise<StorageResult<boolean>> {
        try {
            const snapshotDir = path.join(this.snapshotsDir, id);
            
            if (!fs.existsSync(snapshotDir)) {
                return { success: false, data: false, error: 'Snapshot not found' };
            }

            // Remove the entire snapshot directory
            fs.rmSync(snapshotDir, { recursive: true, force: true });
            
            return { success: true, data: true };
        } catch (error) {
            return {
                success: false,
                data: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async cleanupSnapshots(params: CleanupParams): Promise<StorageResult<{ deletedCount: number; freedSpace: number }>> {
        try {
            const { siteUrl, keepLast = 10 } = params;
            
            const snapshotsResult = await this.getSnapshots(siteUrl);
            if (!snapshotsResult.success || !snapshotsResult.data) {
                return { success: false, data: { deletedCount: 0, freedSpace: 0 }, error: snapshotsResult.error };
            }

            const snapshots = snapshotsResult.data;
            
            if (snapshots.length <= keepLast) {
                return { success: true, data: { deletedCount: 0, freedSpace: 0 } };
            }

            const toDelete = snapshots.slice(keepLast);
            let deletedCount = 0;
            let freedSpace = 0;

            for (const snapshot of toDelete) {
                // Calculate space used by snapshot before deleting
                try {
                    const snapshotDir = path.join(this.snapshotsDir, snapshot.id);
                    if (fs.existsSync(snapshotDir)) {
                        const files = fs.readdirSync(snapshotDir);
                        for (const file of files) {
                            const filePath = path.join(snapshotDir, file);
                            const stats = fs.statSync(filePath);
                            freedSpace += stats.size;
                        }
                    }
                } catch (sizeError) {
                    // Continue with deletion even if size calculation fails
                }

                const deleteResult = await this.deleteSnapshot(snapshot.id);
                if (deleteResult.success) {
                    deletedCount++;
                }
            }

            return { success: true, data: { deletedCount, freedSpace } };
        } catch (error) {
            return {
                success: false,
                data: { deletedCount: 0, freedSpace: 0 },
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async getSnapshotStats(siteUrl: string): Promise<StorageResult<{ total: number; totalSize: number; oldestSnapshot?: string; newestSnapshot?: string }>> {
        try {
            const snapshotsResult = await this.getSnapshots(siteUrl);
            if (!snapshotsResult.success || !snapshotsResult.data) {
                return { success: false, data: { total: 0, totalSize: 0 }, error: snapshotsResult.error };
            }

            const snapshots = snapshotsResult.data;
            let totalSize = 0;

            // Calculate total size
            for (const snapshot of snapshots) {
                for (const [filename, fileInfo] of Object.entries(snapshot.files)) {
                    if (fileInfo.exists) {
                        totalSize += fileInfo.size;
                    }
                }
            }

            const stats = {
                total: snapshots.length,
                totalSize,
                oldestSnapshot: snapshots.length > 0 ? snapshots[snapshots.length - 1].timestamp : undefined,
                newestSnapshot: snapshots.length > 0 ? snapshots[0].timestamp : undefined
            };

            return { success: true, data: stats };
        } catch (error) {
            return {
                success: false,
                data: { total: 0, totalSize: 0 },
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}