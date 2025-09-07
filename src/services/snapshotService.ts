import * as fs from 'fs';
import * as path from 'path';

export interface SnapshotMetadata {
    id: string;
    siteUrl: string;
    timestamp: string;
    files: {
        'composer.json'?: {
            size: number;
            exists: boolean;
        };
        'composer.lock'?: {
            size: number;
            exists: boolean;
        };
    };
    workflowId?: string;
    stepId?: string;
}

export interface CreateSnapshotRequest {
    siteUrl: string;
    composerJson?: string;
    composerLock?: string;
    workflowId?: string;
    stepId?: string;
}

export interface SnapshotListResponse {
    success: boolean;
    snapshots: SnapshotMetadata[];
    total: number;
    siteUrl: string;
    error?: string;
}

export class SnapshotService {
    private readonly dataDir: string;
    private readonly snapshotsDir: string;

    constructor(dataDir: string = path.join(process.cwd(), 'data')) {
        this.dataDir = dataDir;
        this.snapshotsDir = path.join(this.dataDir, 'snapshots');
        
        // Ensure snapshots directory exists
        if (!fs.existsSync(this.snapshotsDir)) {
            fs.mkdirSync(this.snapshotsDir, { recursive: true });
        }
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

    public async createSnapshot(request: CreateSnapshotRequest): Promise<SnapshotMetadata | null> {
        try {
            const { siteUrl, composerJson, composerLock, workflowId, stepId } = request;
            
            if (!siteUrl) {
                throw new Error('siteUrl is required');
            }

            if (!composerJson && !composerLock) {
                throw new Error('At least one of composerJson or composerLock is required');
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

            console.log(`[SNAPSHOT] Created snapshot: ${snapshotId} for site: ${siteUrl}`);
            return metadata;

        } catch (error) {
            console.error('[SNAPSHOT] Failed to create snapshot:', error);
            return null;
        }
    }

    public getSnapshot(snapshotId: string, filename: 'composer.json' | 'composer.lock'): Buffer | null {
        try {
            const snapshotDir = path.join(this.snapshotsDir, snapshotId);
            const filePath = path.join(snapshotDir, filename);
            
            // Security check - ensure we're not accessing files outside the snapshot directory
            if (!filePath.startsWith(snapshotDir)) {
                throw new Error('Invalid file path');
            }

            if (!fs.existsSync(filePath)) {
                return null;
            }

            return fs.readFileSync(filePath);
        } catch (error) {
            console.error(`[SNAPSHOT] Failed to get snapshot file ${filename} for ${snapshotId}:`, error);
            return null;
        }
    }

    public getSnapshotFileContent(snapshotId: string, filename: string): { content: string; size: number } | null {
        try {
            // Validate filename - only allow specific files for security
            const allowedFiles = ['composer.json', 'composer.lock', 'metadata.json'];
            if (!allowedFiles.includes(filename)) {
                throw new Error(`Invalid filename. Only ${allowedFiles.join(', ')} are allowed`);
            }

            const snapshotDir = path.join(this.snapshotsDir, snapshotId);
            const filePath = path.join(snapshotDir, filename);
            
            // Security check - ensure we're not accessing files outside the snapshot directory
            if (!filePath.startsWith(snapshotDir)) {
                throw new Error('Invalid file path');
            }

            // Check if snapshot directory exists
            if (!fs.existsSync(snapshotDir)) {
                throw new Error('Snapshot not found');
            }

            if (!fs.existsSync(filePath)) {
                throw new Error('File not found in snapshot');
            }

            // Get file stats for size validation
            const stats = fs.statSync(filePath);
            const maxFileSize = 10 * 1024 * 1024; // 10MB limit
            
            if (stats.size > maxFileSize) {
                throw new Error('File too large to display');
            }

            const content = fs.readFileSync(filePath, 'utf8');
            
            return {
                content,
                size: stats.size
            };
        } catch (error) {
            console.error(`[SNAPSHOT] Failed to get snapshot file content ${filename} for ${snapshotId}:`, error);
            return null;
        }
    }

    public getSnapshotMetadata(snapshotId: string): SnapshotMetadata | null {
        try {
            const metadataPath = path.join(this.snapshotsDir, snapshotId, 'metadata.json');
            
            if (!fs.existsSync(metadataPath)) {
                return null;
            }

            const metadata = fs.readFileSync(metadataPath, 'utf8');
            return JSON.parse(metadata);
        } catch (error) {
            console.error(`[SNAPSHOT] Failed to get metadata for ${snapshotId}:`, error);
            return null;
        }
    }

    public listSnapshotsForSite(siteUrl: string): SnapshotListResponse {
        try {
            const siteName = this.extractSiteName(siteUrl);
            const snapshots: SnapshotMetadata[] = [];

            if (!fs.existsSync(this.snapshotsDir)) {
                return {
                    success: true,
                    snapshots: [],
                    total: 0,
                    siteUrl
                };
            }

            const entries = fs.readdirSync(this.snapshotsDir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith(siteName + '-')) {
                    const metadata = this.getSnapshotMetadata(entry.name);
                    if (metadata && metadata.siteUrl === siteUrl) {
                        snapshots.push(metadata);
                    }
                }
            }

            // Sort by timestamp (newest first)
            snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return {
                success: true,
                snapshots,
                total: snapshots.length,
                siteUrl
            };

        } catch (error) {
            console.error(`[SNAPSHOT] Failed to list snapshots for site ${siteUrl}:`, error);
            return {
                success: false,
                snapshots: [],
                total: 0,
                siteUrl,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    public deleteSnapshot(snapshotId: string): boolean {
        try {
            const snapshotDir = path.join(this.snapshotsDir, snapshotId);
            
            if (!fs.existsSync(snapshotDir)) {
                return false;
            }

            // Remove the entire snapshot directory
            fs.rmSync(snapshotDir, { recursive: true, force: true });
            
            console.log(`[SNAPSHOT] Deleted snapshot: ${snapshotId}`);
            return true;

        } catch (error) {
            console.error(`[SNAPSHOT] Failed to delete snapshot ${snapshotId}:`, error);
            return false;
        }
    }

    public cleanupOldSnapshots(siteUrl: string, keepLast: number = 10): { deletedCount: number; error?: string } {
        try {
            const response = this.listSnapshotsForSite(siteUrl);
            
            if (!response.success) {
                return { deletedCount: 0, error: response.error };
            }

            const snapshots = response.snapshots;
            
            if (snapshots.length <= keepLast) {
                return { deletedCount: 0 };
            }

            const toDelete = snapshots.slice(keepLast);
            let deletedCount = 0;

            for (const snapshot of toDelete) {
                if (this.deleteSnapshot(snapshot.id)) {
                    deletedCount++;
                }
            }

            console.log(`[SNAPSHOT] Cleanup: deleted ${deletedCount} old snapshots for site ${siteUrl}`);
            return { deletedCount };

        } catch (error) {
            console.error(`[SNAPSHOT] Failed to cleanup snapshots for site ${siteUrl}:`, error);
            return { 
                deletedCount: 0, 
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}