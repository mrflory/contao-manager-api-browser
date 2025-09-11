import { LogsResponse } from '../types';
import { UnifiedStorage, LogParams, CleanupParams } from '../storage/interfaces';

export class LoggingService {
    private readonly storage: UnifiedStorage;
    private readonly responseLoggingExclusions: string[] = [
        'GET /api/server/phpinfo',
        'GET /api/server/database',
        'GET /api/files/composer.json',
        'GET /api/files/composer.lock'
    ];

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

    private shouldExcludeResponseLogging(method: string, endpoint: string): boolean {
        const apiCall = `${method} ${endpoint}`;
        return this.responseLoggingExclusions.includes(apiCall);
    }

    public async logApiCall(
        siteUrl: string, 
        method: string, 
        endpoint: string, 
        statusCode: number, 
        requestData: any = null, 
        responseData: any = null, 
        error: string | null = null
    ): Promise<void> {
        try {
            // Check if storage supports logging
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsLogs) {
                // Silently skip logging if not supported (e.g., browser storage)
                return;
            }

            if (!this.storage.logs) {
                console.warn('Storage logs interface not available');
                return;
            }
            
            // Determine if response should be logged for this endpoint
            const excludeResponse = this.shouldExcludeResponseLogging(method, endpoint);
            
            const logParams: LogParams = {
                siteUrl,
                method,
                endpoint,
                statusCode,
                requestData: requestData || null,
                responseData: excludeResponse ? '[Response logging excluded]' : (responseData || null),
                error: error || undefined
            };
            
            const result = await this.storage.logs.addLogEntry(logParams);
            
            if (!result.success) {
                console.error('Failed to log API call:', result.error);
            }
        } catch (logError) {
            console.error('Failed to write to storage log:', logError instanceof Error ? logError.message : 'Unknown error');
        }
    }

    public async readLogs(siteUrl: string): Promise<LogsResponse> {
        try {
            // Check if storage supports logging
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsLogs) {
                const hostname = this.extractSiteName(siteUrl);
                return { 
                    logs: [], 
                    total: 0,
                    siteUrl,
                    hostname,
                    message: 'Log storage not supported by current storage backend'
                } as LogsResponse & { message: string };
            }

            if (!this.storage.logs) {
                throw new Error('Storage logs interface not available');
            }
            
            const result = await this.storage.logs.getLogs(siteUrl);
            
            if (!result.success) {
                throw new Error(`Failed to read logs: ${result.error}`);
            }
            
            const logs = result.data || [];
            const hostname = this.extractSiteName(siteUrl);
            
            return { 
                logs,
                total: logs.length,
                siteUrl,
                hostname
            };
        } catch (error) {
            throw new Error(`Failed to read logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public async cleanupLogs(siteUrl: string): Promise<{ success: boolean; deletedCount: number; message: string }> {
        try {
            // Check if storage supports logging
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsLogs) {
                return { 
                    success: true, 
                    deletedCount: 0, 
                    message: 'Log storage not supported by current storage backend' 
                };
            }

            if (!this.storage.logs) {
                return {
                    success: false,
                    deletedCount: 0,
                    message: 'Storage logs interface not available'
                };
            }
            
            // Clean up logs older than one week
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const cleanupParams: CleanupParams = {
                siteUrl,
                olderThan: oneWeekAgo.toISOString()
            };
            
            const result = await this.storage.logs.cleanupLogs(cleanupParams);
            
            if (!result.success) {
                return {
                    success: false,
                    deletedCount: 0,
                    message: `Failed to cleanup logs: ${result.error}`
                };
            }
            
            return { 
                success: true, 
                deletedCount: result.data?.deletedCount || 0,
                message: result.data?.message || `Successfully deleted ${result.data?.deletedCount || 0} log entries older than 1 week`
            };
        } catch (error) {
            return {
                success: false,
                deletedCount: 0,
                message: `Failed to cleanup logs: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    public addResponseLoggingExclusion(method: string, endpoint: string): void {
        const apiCall = `${method} ${endpoint}`;
        if (!this.responseLoggingExclusions.includes(apiCall)) {
            this.responseLoggingExclusions.push(apiCall);
        }
    }

    public removeResponseLoggingExclusion(method: string, endpoint: string): void {
        const apiCall = `${method} ${endpoint}`;
        const index = this.responseLoggingExclusions.indexOf(apiCall);
        if (index > -1) {
            this.responseLoggingExclusions.splice(index, 1);
        }
    }

    public getResponseLoggingExclusions(): string[] {
        return [...this.responseLoggingExclusions];
    }
}