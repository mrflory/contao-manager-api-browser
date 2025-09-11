import { AppConfig, SiteConfig, VersionInfo, AuthMethod } from '../types';
import { SiteConfigStorage, StorageType, StorageConfig } from '../storage/interfaces';
import { StorageFactory } from '../storage/StorageFactory';
import fs from 'fs/promises';
import path from 'path';

export class ConfigService {
    private storage: SiteConfigStorage;

    constructor(storageConfig?: StorageConfig, dataDir?: string) {
        // Maintain backward compatibility
        if (!storageConfig) {
            // Use environment-based configuration or fall back to JSON file storage
            if (process.env.STORAGE_TYPE) {
                this.storage = StorageFactory.createFromEnvironment();
            } else {
                // Default to JSON file storage with optional dataDir
                const config: StorageConfig = {
                    type: StorageType.JSON_FILE,
                    dataDir: dataDir
                };
                this.storage = StorageFactory.createStorage(config);
            }
        } else {
            this.storage = StorageFactory.createStorage(storageConfig);
        }
    }

    /**
     * Initialize the storage backend
     * Call this before using the service for the first time
     */
    async initialize(): Promise<{ success: boolean; error?: string }> {
        try {
            const result = await this.storage.initialize();
            return { success: result.success, error: result.error };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Check if storage backend is available
     */
    async isStorageAvailable(): Promise<boolean> {
        return await this.storage.isAvailable();
    }

    /**
     * Get the current storage backend type for debugging/info purposes
     */
    getStorageInfo(): { type: string; available: boolean } {
        const storageType = (this.storage.constructor.name || 'Unknown').replace('Storage', '');
        return {
            type: storageType,
            available: false // This would be updated by calling isStorageAvailable()
        };
    }

    public loadConfig(): AppConfig {
        // Convert async storage call to sync for backward compatibility
        // In production, consider making this async
        try {
            const result = this.loadConfigAsync();
            // Note: This is a temporary sync wrapper. In a full refactor, 
            // all calling code should be updated to use the async version
            return this.blockingAsyncCall(result);
        } catch (error) {
            console.error('Error loading config:', error instanceof Error ? error.message : 'Unknown error');
            return { sites: {}, activeSite: null };
        }
    }

    /**
     * Async version of loadConfig - preferred for new code
     */
    public async loadConfigAsync(): Promise<AppConfig> {
        try {
            const result = await this.storage.loadConfig();
            if (result.success && result.data) {
                return result.data;
            }
            
            console.error('Error loading config:', result.error);
            return { sites: {}, activeSite: null };
        } catch (error) {
            console.error('Error loading config:', error instanceof Error ? error.message : 'Unknown error');
            return { sites: {}, activeSite: null };
        }
    }

    /**
     * Temporary blocking async call wrapper for backward compatibility
     * This should be removed when all calling code is updated to async
     */
    private blockingAsyncCall<T>(promise: Promise<T>): T {
        let result: T;
        let error: any;
        let completed = false;

        promise.then(
            (res) => {
                result = res;
                completed = true;
            },
            (err) => {
                error = err;
                completed = true;
            }
        );

        // Simple blocking wait - not recommended for production
        const start = Date.now();
        while (!completed && Date.now() - start < 5000) {
            // Busy wait with timeout
        }

        if (error) throw error;
        if (!completed) throw new Error('Storage operation timed out');
        return result!;
    }

    public saveConfig(config: AppConfig): boolean {
        try {
            const result = this.saveConfigAsync(config);
            return this.blockingAsyncCall(result);
        } catch (error) {
            console.error('Error saving config:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    /**
     * Async version of saveConfig - preferred for new code
     */
    public async saveConfigAsync(config: AppConfig): Promise<boolean> {
        try {
            const result = await this.storage.saveConfig(config);
            return result.success;
        } catch (error) {
            console.error('Error saving config:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public addSite(
        url: string, 
        token?: string, 
        name?: string, 
        authMethod: AuthMethod = 'token', 
        user?: any, 
        scope?: string
    ): boolean {
        try {
            const result = this.addSiteAsync(url, token, name, authMethod, user, scope);
            return this.blockingAsyncCall(result);
        } catch (error) {
            console.error('Error adding site:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    /**
     * Async version of addSite - preferred for new code
     */
    public async addSiteAsync(
        url: string, 
        token?: string, 
        name?: string, 
        authMethod: AuthMethod = 'token', 
        user?: any, 
        scope?: string
    ): Promise<boolean> {
        try {
            const result = await this.storage.addSite({
                url,
                token,
                name,
                authMethod,
                user,
                scope
            });
            return result.success;
        } catch (error) {
            console.error('Error adding site:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public getActiveSite(): SiteConfig | null {
        try {
            const result = this.getActiveSiteAsync();
            return this.blockingAsyncCall(result);
        } catch (error) {
            console.error('Error getting active site:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    public async getActiveSiteAsync(): Promise<SiteConfig | null> {
        try {
            const result = await this.storage.getActiveSite();
            return result.success ? (result.data || null) : null;
        } catch (error) {
            console.error('Error getting active site:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    public setActiveSite(url: string): boolean {
        try {
            const result = this.setActiveSiteAsync(url);
            return this.blockingAsyncCall(result);
        } catch (error) {
            console.error('Error setting active site:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public async setActiveSiteAsync(url: string): Promise<boolean> {
        try {
            const result = await this.storage.setActiveSite(url);
            return result.success;
        } catch (error) {
            console.error('Error setting active site:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public removeSite(url: string): boolean {
        try {
            const result = this.removeSiteAsync(url);
            return this.blockingAsyncCall(result);
        } catch (error) {
            console.error('Error removing site:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public async removeSiteAsync(url: string): Promise<boolean> {
        try {
            const result = await this.storage.removeSite(url);
            return result.success;
        } catch (error) {
            console.error('Error removing site:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public updateSiteName(url: string, name: string): boolean {
        try {
            const result = this.updateSiteNameAsync(url, name);
            return this.blockingAsyncCall(result);
        } catch (error) {
            console.error('Error updating site name:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public async updateSiteNameAsync(url: string, name: string): Promise<boolean> {
        try {
            const result = await this.storage.updateSite({ url, name });
            return result.success;
        } catch (error) {
            console.error('Error updating site name:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public updateSiteVersionInfo(url: string, versionInfo: Omit<VersionInfo, 'lastUpdated'>): boolean {
        try {
            const result = this.updateSiteVersionInfoAsync(url, versionInfo);
            return this.blockingAsyncCall(result);
        } catch (error) {
            console.error('Error updating site version info:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public async updateSiteVersionInfoAsync(url: string, versionInfo: Omit<VersionInfo, 'lastUpdated'>): Promise<boolean> {
        try {
            const result = await this.storage.updateSite({ url, versionInfo });
            return result.success;
        } catch (error) {
            console.error('Error updating site version info:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public getAllSites(): Record<string, SiteConfig> {
        try {
            const result = this.getAllSitesAsync();
            return this.blockingAsyncCall(result);
        } catch (error) {
            console.error('Error getting all sites:', error instanceof Error ? error.message : 'Unknown error');
            return {};
        }
    }

    public async getAllSitesAsync(): Promise<Record<string, SiteConfig>> {
        try {
            const result = await this.storage.getAllSites();
            return result.success ? result.data || {} : {};
        } catch (error) {
            console.error('Error getting all sites:', error instanceof Error ? error.message : 'Unknown error');
            return {};
        }
    }

    public getConfig(): AppConfig {
        return this.loadConfig();
    }

    public async getConfigAsync(): Promise<AppConfig> {
        return this.loadConfigAsync();
    }

    /**
     * Cleanup storage resources
     * Should be called when the service is no longer needed
     */
    public async cleanup(): Promise<void> {
        try {
            await this.storage.cleanup();
        } catch (error) {
            console.error('Error cleaning up storage:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * Utility method for extracting site name from URL
     * Kept for backward compatibility
     */
    public extractSiteName(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    // Migration support methods for backward compatibility

    /**
     * Detect if legacy file-based config exists
     */
    async hasLegacyConfig(): Promise<boolean> {
        try {
            const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
            const legacyConfigPath = path.join(dataDir, 'config.json');
            await fs.access(legacyConfigPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Load legacy config file directly for migration purposes
     */
    async loadLegacyConfig(): Promise<any> {
        try {
            const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
            const legacyConfigPath = path.join(dataDir, 'config.json');
            const content = await fs.readFile(legacyConfigPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to load legacy config:', error);
            return null;
        }
    }

    /**
     * Check if current storage is compatible with legacy format
     */
    isLegacyCompatible(): boolean {
        return this.storage.constructor.name === 'JsonFileStorage' || 
               this.storage.constructor.name === 'JsonFileStorageUnified';
    }

    /**
     * Migrate from legacy format to current storage
     */
    async migrateLegacyConfig(): Promise<{ success: boolean; error?: string }> {
        try {
            if (!await this.hasLegacyConfig()) {
                return { success: true }; // No legacy config to migrate
            }

            const legacyConfig = await this.loadLegacyConfig();
            if (!legacyConfig) {
                return { success: false, error: 'Failed to load legacy config' };
            }

            // Convert legacy format to new format if needed
            const convertedConfig = await this.convertLegacyConfig(legacyConfig);
            
            // Save using current storage
            const result = await this.saveConfigAsync(convertedConfig);
            if (!result) {
                return { success: false, error: 'Failed to save migrated config' };
            }

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error during migration' 
            };
        }
    }

    /**
     * Convert legacy config format to current format
     */
    private async convertLegacyConfig(legacyConfig: any): Promise<AppConfig> {
        const convertedConfig: AppConfig = {
            sites: {},
            activeSite: legacyConfig.activeSite || null,
            version: '2.0',
            lastUpdated: new Date().toISOString()
        };

        // Convert sites
        if (legacyConfig.sites && typeof legacyConfig.sites === 'object') {
            for (const [url, siteData] of Object.entries(legacyConfig.sites)) {
                if (typeof siteData === 'object' && siteData !== null) {
                    const legacySite = siteData as any;
                    
                    convertedConfig.sites[url] = {
                        url,
                        name: legacySite.name || this.extractSiteName(url),
                        token: legacySite.token,
                        encryptedToken: legacySite.encryptedToken,
                        authMethod: legacySite.authMethod || 'token',
                        scope: legacySite.scope || 'read',
                        user: legacySite.user,
                        addedAt: legacySite.addedAt || new Date().toISOString(),
                        lastAccess: legacySite.lastAccess,
                        versionInfo: legacySite.versionInfo
                    };
                }
            }
        }

        return convertedConfig;
    }

    /**
     * Graceful service fallback for migration scenarios
     * Attempts to load from current storage, falls back to legacy if needed
     */
    async loadConfigWithFallback(): Promise<AppConfig> {
        try {
            // Try current storage first
            const config = await this.loadConfigAsync();
            if (config && Object.keys(config.sites || {}).length > 0) {
                return config;
            }

            // Fall back to legacy if current storage is empty and legacy exists
            if (await this.hasLegacyConfig()) {
                console.log('Falling back to legacy config format');
                const legacyConfig = await this.loadLegacyConfig();
                if (legacyConfig) {
                    return await this.convertLegacyConfig(legacyConfig);
                }
            }

            return config;
        } catch (error) {
            console.error('Error in loadConfigWithFallback:', error);
            // Return empty config as last resort
            return {
                sites: {},
                activeSite: null,
                version: '2.0',
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Check if migration is needed
     */
    async needsMigration(): Promise<boolean> {
        try {
            const hasLegacy = await this.hasLegacyConfig();
            if (!hasLegacy) {
                return false;
            }

            // Check if current storage has data
            const currentConfig = await this.loadConfigAsync();
            const hasCurrentData = currentConfig && Object.keys(currentConfig.sites || {}).length > 0;

            // Migration needed if we have legacy data but no current data
            return hasLegacy && !hasCurrentData;
        } catch {
            return false;
        }
    }

    /**
     * Auto-migrate if needed (called during service initialization)
     */
    async autoMigrateIfNeeded(): Promise<void> {
        try {
            if (await this.needsMigration()) {
                console.log('Auto-migrating legacy configuration...');
                const result = await this.migrateLegacyConfig();
                if (result.success) {
                    console.log('Legacy configuration migrated successfully');
                } else {
                    console.warn('Failed to auto-migrate legacy configuration:', result.error);
                }
            }
        } catch (error) {
            console.warn('Error during auto-migration:', error);
        }
    }
}