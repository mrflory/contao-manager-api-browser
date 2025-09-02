import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, SiteConfig, VersionInfo, AuthMethod } from '../types';
import TokenEncryptionService = require('./tokenEncryption');

export class ConfigService {
    private readonly tokenFile: string;
    private tokenEncryption: TokenEncryptionService | null;

    constructor(dataDir: string = path.join(process.cwd(), 'data')) {
        this.tokenFile = path.join(dataDir, 'config.json');
        
        // Initialize encryption service
        try {
            this.tokenEncryption = new TokenEncryptionService();
        } catch (error) {
            console.error('Failed to initialize token encryption service:', error);
            console.error('Please set TOKEN_MASTER_KEY in your .env file');
            this.tokenEncryption = null;
        }
    }

    public loadConfig(): AppConfig {
        try {
            if (fs.existsSync(this.tokenFile)) {
                const data = fs.readFileSync(this.tokenFile, 'utf8');
                const config = JSON.parse(data);
                
                // Migrate old format to new format
                if (config.token && config.managerUrl) {
                    console.log('Migrating old config format to multi-site format');
                    const oldConfig = { ...config };
                    const newConfig: AppConfig = {
                        sites: {
                            [oldConfig.managerUrl]: {
                                name: this.extractSiteName(oldConfig.managerUrl),
                                url: oldConfig.managerUrl,
                                token: oldConfig.token,
                                authMethod: 'token' as AuthMethod,
                                lastUsed: new Date().toISOString()
                            }
                        },
                        activeSite: oldConfig.managerUrl
                    };
                    this.saveConfig(newConfig);
                    return newConfig;
                }
                
                // Migrate sites without authMethod to token-based auth
                if (config.sites) {
                    let migrationNeeded = false;
                    Object.keys(config.sites).forEach(siteUrl => {
                        const site = config.sites[siteUrl];
                        if (!site.authMethod && site.token) {
                            site.authMethod = 'token';
                            migrationNeeded = true;
                        }
                        // Fix sites that might have read scope as default (should be admin)
                        if (!site.scope || (site.authMethod === 'cookie' && site.scope === 'read')) {
                            site.scope = 'admin';
                            migrationNeeded = true;
                        }
                        
                        // Decrypt encrypted tokens for runtime use
                        if (this.tokenEncryption && site.token && this.tokenEncryption.isTokenEncrypted(site.token)) {
                            try {
                                site.token = this.tokenEncryption.decryptToken(site.token, siteUrl);
                            } catch (error) {
                                console.error(`Failed to decrypt token for site ${siteUrl}:`, error instanceof Error ? error.message : 'Unknown error');
                                delete site.token; // Remove invalid encrypted token
                            }
                        }
                    });
                    
                    if (migrationNeeded) {
                        console.log('Migrating existing sites to include authMethod field');
                        this.saveConfig(config);
                    }
                }
                
                return config;
            }
        } catch (error) {
            console.error('Error loading config:', error instanceof Error ? error.message : 'Unknown error');
        }
        return { sites: {}, activeSite: null };
    }

    public saveConfig(config: AppConfig): boolean {
        try {
            // Create a deep copy to avoid modifying the original config
            const configToSave = JSON.parse(JSON.stringify(config));
            
            // Encrypt tokens before saving
            if (this.tokenEncryption && configToSave.sites) {
                Object.keys(configToSave.sites).forEach(siteUrl => {
                    const site = configToSave.sites[siteUrl];
                    if (site.token && typeof site.token === 'string') {
                        // Only encrypt if token is a plain string (not already encrypted)
                        try {
                            site.token = this.tokenEncryption!.encryptToken(site.token, siteUrl);
                        } catch (error) {
                            console.error(`Failed to encrypt token for site ${siteUrl}:`, error instanceof Error ? error.message : 'Unknown error');
                            // Keep original token if encryption fails
                        }
                    }
                });
            }
            
            // Ensure data directory exists
            const dataDir = path.dirname(this.tokenFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.tokenFile, JSON.stringify(configToSave, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving config:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    public extractSiteName(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
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
        const config = this.loadConfig();
        
        // Check if site already exists to preserve its data
        if (config.sites[url]) {
            // Site exists - preserve existing data, update authentication info
            if (authMethod === 'token') {
                if (token) config.sites[url].token = token;
                if (scope) config.sites[url].scope = scope;
            } else {
                config.sites[url].user = user;
                config.sites[url].scope = scope || 'admin'; // Set scope for cookie auth
                delete config.sites[url].token; // Remove token for cookie auth
            }
            config.sites[url].authMethod = authMethod;
            config.sites[url].lastUsed = new Date().toISOString();
            
            // Only update name if explicitly provided
            if (name) {
                config.sites[url].name = name;
            }
            
            // Set as active site when updating authentication (reauthentication)
            config.activeSite = url;
        } else {
            // New site - create complete entry
            const siteName = name || this.extractSiteName(url);
            const siteConfig: SiteConfig = {
                name: siteName,
                url: url,
                authMethod: authMethod,
                lastUsed: new Date().toISOString()
            };

            // Add authentication-specific fields
            if (authMethod === 'token') {
                if (token) siteConfig.token = token;
                if (scope) siteConfig.scope = scope; // For token auth, scope might come from OAuth flow
            } else {
                siteConfig.user = user;
                siteConfig.scope = scope || 'admin'; // Default to admin for cookie auth
            }

            config.sites[url] = siteConfig;
            
            // Set as active site if it's the first one or no active site
            if (!config.activeSite || Object.keys(config.sites).length === 1) {
                config.activeSite = url;
            }
        }
        
        return this.saveConfig(config);
    }

    public getActiveSite(): SiteConfig | null {
        const config = this.loadConfig();
        if (config.activeSite && config.sites[config.activeSite]) {
            return config.sites[config.activeSite];
        }
        return null;
    }

    public setActiveSite(url: string): boolean {
        const config = this.loadConfig();
        if (config.sites[url]) {
            config.activeSite = url;
            config.sites[url].lastUsed = new Date().toISOString();
            return this.saveConfig(config);
        }
        return false;
    }

    public removeSite(url: string): boolean {
        const config = this.loadConfig();
        
        if (config.sites[url]) {
            delete config.sites[url];
            
            // If this was the active site, set a new active site or none
            if (config.activeSite === url) {
                const remainingSites = Object.keys(config.sites);
                config.activeSite = remainingSites.length > 0 ? remainingSites[0] : null;
            }
            
            return this.saveConfig(config);
        }
        return false;
    }

    public updateSiteName(url: string, name: string): boolean {
        const config = this.loadConfig();
        
        if (!config.sites[url]) {
            return false;
        }
        
        // Update the site name
        config.sites[url].name = name;
        
        return this.saveConfig(config);
    }

    public updateSiteVersionInfo(url: string, versionInfo: Omit<VersionInfo, 'lastUpdated'>): boolean {
        const config = this.loadConfig();
        if (config.sites[url]) {
            config.sites[url].versionInfo = {
                ...versionInfo,
                lastUpdated: new Date().toISOString()
            };
            return this.saveConfig(config);
        }
        return false;
    }

    public getAllSites(): Record<string, SiteConfig> {
        const config = this.loadConfig();
        return config.sites;
    }

    public getConfig(): AppConfig {
        return this.loadConfig();
    }
}