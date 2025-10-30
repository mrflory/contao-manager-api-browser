import { UnifiedStorage, SnapshotParams, CleanupParams } from '../storage/interfaces';

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
    private readonly storage: UnifiedStorage;

    constructor(storage: UnifiedStorage) {
        this.storage = storage;
    }



    public async createSnapshot(request: CreateSnapshotRequest, userId?: string): Promise<SnapshotMetadata | null> {
        try {
            const { siteUrl, composerJson, composerLock, workflowId, stepId } = request;

            if (!siteUrl) {
                throw new Error('siteUrl is required');
            }

            if (!composerJson && !composerLock) {
                throw new Error('At least one of composerJson or composerLock is required');
            }

            // Check if storage supports snapshots
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsSnapshots) {
                console.warn('Snapshot storage not supported by current storage backend');
                return null;
            }

            if (!this.storage.snapshots) {
                console.warn('Storage snapshots interface not available');
                return null;
            }

            const snapshotParams: SnapshotParams = {
                siteUrl,
                userId,
                composerJson,
                composerLock,
                workflowId,
                stepId
            };

            const result = await this.storage.snapshots.createSnapshot(snapshotParams);
            
            if (!result.success) {
                console.error('[SNAPSHOT] Failed to create snapshot:', result.error);
                return null;
            }

            const metadata = result.data;
            if (metadata) {
                console.log(`[SNAPSHOT] Created snapshot: ${metadata.id} for site: ${siteUrl}`);
            }
            
            return metadata || null;

        } catch (error) {
            console.error('[SNAPSHOT] Failed to create snapshot:', error);
            return null;
        }
    }

    public async getSnapshot(snapshotId: string, filename: 'composer.json' | 'composer.lock', userId?: string): Promise<Buffer | null> {
        try {
            // Check if storage supports snapshots
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsSnapshots) {
                return null;
            }

            if (!this.storage.snapshots) {
                console.warn('Storage snapshots interface not available');
                return null;
            }

            const result = await this.storage.snapshots.getSnapshotFile(snapshotId, filename, userId);
            
            if (!result.success || !result.data) {
                console.error(`[SNAPSHOT] Failed to get snapshot file ${filename} for ${snapshotId}:`, result.error);
                return null;
            }

            return Buffer.from(result.data.content, 'utf8');
        } catch (error) {
            console.error(`[SNAPSHOT] Failed to get snapshot file ${filename} for ${snapshotId}:`, error);
            return null;
        }
    }

    public async getSnapshotFileContent(snapshotId: string, filename: string, userId?: string): Promise<{ content: string; size: number } | null> {
        try {
            // Validate filename - only allow specific files for security
            const allowedFiles = ['composer.json', 'composer.lock', 'metadata.json'];
            if (!allowedFiles.includes(filename)) {
                throw new Error(`Invalid filename. Only ${allowedFiles.join(', ')} are allowed`);
            }

            // Check if storage supports snapshots
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsSnapshots) {
                return null;
            }

            if (!this.storage.snapshots) {
                console.warn('Storage snapshots interface not available');
                return null;
            }

            const result = await this.storage.snapshots.getSnapshotFile(snapshotId, filename, userId);
            
            if (!result.success || !result.data) {
                console.error(`[SNAPSHOT] Failed to get snapshot file content ${filename} for ${snapshotId}:`, result.error);
                return null;
            }

            return {
                content: result.data.content,
                size: result.data.size
            };
        } catch (error) {
            console.error(`[SNAPSHOT] Failed to get snapshot file content ${filename} for ${snapshotId}:`, error);
            return null;
        }
    }

    public async getSnapshotMetadata(snapshotId: string, userId?: string): Promise<SnapshotMetadata | null> {
        try {
            // Check if storage supports snapshots
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsSnapshots) {
                return null;
            }

            if (!this.storage.snapshots) {
                console.warn('Storage snapshots interface not available');
                return null;
            }

            const result = await this.storage.snapshots.getSnapshotMetadata(snapshotId, userId);
            
            if (!result.success) {
                console.error(`[SNAPSHOT] Failed to get metadata for ${snapshotId}:`, result.error);
                return null;
            }

            return result.data || null;
        } catch (error) {
            console.error(`[SNAPSHOT] Failed to get metadata for ${snapshotId}:`, error);
            return null;
        }
    }

    public async listSnapshotsForSite(siteUrl: string, userId?: string): Promise<SnapshotListResponse> {
        try {
            // Check if storage supports snapshots
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsSnapshots) {
                return {
                    success: true,
                    snapshots: [],
                    total: 0,
                    siteUrl
                };
            }

            if (!this.storage.snapshots) {
                console.warn('Storage snapshots interface not available');
                return {
                    success: false,
                    snapshots: [],
                    total: 0,
                    siteUrl,
                    error: 'Storage snapshots interface not available'
                };
            }

            const result = await this.storage.snapshots.getSnapshots(siteUrl, userId);
            
            if (!result.success) {
                console.error(`[SNAPSHOT] Failed to list snapshots for site ${siteUrl}:`, result.error);
                return {
                    success: false,
                    snapshots: [],
                    total: 0,
                    siteUrl,
                    error: result.error || 'Unknown error'
                };
            }

            const snapshots = result.data || [];

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

    public async deleteSnapshot(snapshotId: string, userId?: string): Promise<boolean> {
        try {
            // Check if storage supports snapshots
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsSnapshots) {
                console.warn('Snapshot storage not supported by current storage backend');
                return false;
            }

            if (!this.storage.snapshots) {
                console.warn('Storage snapshots interface not available');
                return false;
            }

            const result = await this.storage.snapshots.deleteSnapshot(snapshotId, userId);
            
            if (!result.success) {
                console.error(`[SNAPSHOT] Failed to delete snapshot ${snapshotId}:`, result.error);
                return false;
            }
            
            console.log(`[SNAPSHOT] Deleted snapshot: ${snapshotId}`);
            return result.data || false;

        } catch (error) {
            console.error(`[SNAPSHOT] Failed to delete snapshot ${snapshotId}:`, error);
            return false;
        }
    }

    public async cleanupOldSnapshots(siteUrl: string, keepLast: number = 10, userId?: string): Promise<{ deletedCount: number; error?: string }> {
        try {
            // Check if storage supports snapshots
            const capabilities = this.storage.getCapabilities();
            if (!capabilities.supportsSnapshots) {
                return { deletedCount: 0 };
            }

            if (!this.storage.snapshots) {
                console.warn('Storage snapshots interface not available');
                return { deletedCount: 0, error: 'Storage snapshots interface not available' };
            }

            const cleanupParams: CleanupParams = {
                siteUrl,
                userId,
                keepLast
            };

            const result = await this.storage.snapshots.cleanupSnapshots(cleanupParams);
            
            if (!result.success) {
                console.error(`[SNAPSHOT] Failed to cleanup snapshots for site ${siteUrl}:`, result.error);
                return { deletedCount: 0, error: result.error };
            }

            const deletedCount = result.data?.deletedCount || 0;
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

    /**
     * Delete all snapshots for a site
     * Used when removing a site to clean up all associated data
     */
    public async deleteAllSnapshotsForSite(siteUrl: string, userId?: string): Promise<{ deletedCount: number; error?: string }> {
        try {
            // Use cleanup with keepLast=0 to delete all snapshots
            return await this.cleanupOldSnapshots(siteUrl, 0, userId);
        } catch (error) {
            console.error(`[SNAPSHOT] Failed to delete all snapshots for site ${siteUrl}:`, error);
            return {
                deletedCount: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}