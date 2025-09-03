import * as fs from 'fs';
import * as path from 'path';
import { LogEntry, LogsResponse } from '../types';

export class LoggingService {
    private readonly dataDir: string;
    private readonly responseLoggingExclusions: string[] = [
        'GET /api/server/phpinfo',
        'GET /api/server/database',
        'GET /api/files/composer.json',
        'GET /api/files/composer.lock'
    ];

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

    private shouldExcludeResponseLogging(method: string, endpoint: string): boolean {
        const apiCall = `${method} ${endpoint}`;
        return this.responseLoggingExclusions.includes(apiCall);
    }

    public logApiCall(
        siteUrl: string, 
        method: string, 
        endpoint: string, 
        statusCode: number, 
        requestData: any = null, 
        responseData: any = null, 
        error: string | null = null
    ): void {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const logFile = path.join(this.dataDir, `${hostname}.log`);
            
            const timestamp = new Date().toISOString();
            
            // Determine if response should be logged for this endpoint
            const excludeResponse = this.shouldExcludeResponseLogging(method, endpoint);
            
            const logEntry: LogEntry = {
                timestamp,
                method,
                endpoint,
                statusCode,
                requestData: requestData || null,
                responseData: excludeResponse ? '[Response logging excluded]' : (responseData || null),
                error: error || undefined
            };
            
            const logLine = JSON.stringify(logEntry) + '\n';
            
            // Append to log file
            fs.appendFileSync(logFile, logLine);
        } catch (logError) {
            console.error('Failed to write to log file:', logError instanceof Error ? logError.message : 'Unknown error');
        }
    }

    public readLogs(siteUrl: string): LogsResponse {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const logFile = path.join(this.dataDir, `${hostname}.log`);
            
            // Check if log file exists
            if (!fs.existsSync(logFile)) {
                return { 
                    logs: [], 
                    total: 0,
                    siteUrl,
                    hostname,
                    message: 'No logs found for this site'
                } as LogsResponse & { message: string };
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
                    console.error('Failed to parse log line:', parseError instanceof Error ? parseError.message : 'Unknown error');
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
            
            return { 
                logs,
                total: logs.length,
                siteUrl,
                hostname
            };
        } catch (error) {
            throw new Error(`Failed to read log file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public cleanupLogs(siteUrl: string): { success: boolean; deletedCount: number; message: string } {
        try {
            const hostname = this.extractSiteName(siteUrl);
            const logFile = path.join(this.dataDir, `${hostname}.log`);
            
            // Check if log file exists
            if (!fs.existsSync(logFile)) {
                return { 
                    success: true, 
                    deletedCount: 0, 
                    message: 'No logs found for this site' 
                };
            }
            
            // Read log file and parse JSON lines
            const logContent = fs.readFileSync(logFile, 'utf8');
            const logLines = logContent.trim().split('\n').filter(line => line.trim());
            
            const logs: string[] = [];
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            let deletedCount = 0;
            
            for (const line of logLines) {
                try {
                    const logEntry = JSON.parse(line);
                    const logDate = new Date(logEntry.timestamp);
                    
                    // Keep logs that are newer than one week
                    if (logDate > oneWeekAgo) {
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
                deletedCount,
                message: `Successfully deleted ${deletedCount} log entries older than 1 week`
            };
        } catch (error) {
            return {
                success: false,
                deletedCount: 0,
                error: `Failed to cleanup log file: ${error instanceof Error ? error.message : 'Unknown error'}`
            } as any;
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