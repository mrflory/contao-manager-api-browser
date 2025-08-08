const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_FILE = path.join(__dirname, 'data', 'config.json');

app.use(cors());
app.use(express.json());
// Serve React build in production, public in development
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
} else {
    app.use(express.static('public'));
}

// Helper functions for multi-site config storage
function loadConfig() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            const data = fs.readFileSync(TOKEN_FILE, 'utf8');
            const config = JSON.parse(data);
            
            // Migrate old format to new format
            if (config.token && config.managerUrl) {
                console.log('Migrating old config format to multi-site format');
                const oldConfig = { ...config };
                const newConfig = {
                    sites: {
                        [oldConfig.managerUrl]: {
                            name: extractSiteName(oldConfig.managerUrl),
                            url: oldConfig.managerUrl,
                            token: oldConfig.token,
                            lastUsed: new Date().toISOString()
                        }
                    },
                    activeSite: oldConfig.managerUrl
                };
                saveConfig(newConfig);
                return newConfig;
            }
            
            return config;
        }
    } catch (error) {
        console.error('Error loading config:', error.message);
    }
    return { sites: {}, activeSite: null };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving config:', error.message);
        return false;
    }
}

function extractSiteName(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return url;
    }
}

function logApiCall(siteUrl, method, endpoint, statusCode, requestData = null, responseData = null, error = null) {
    try {
        const hostname = extractSiteName(siteUrl);
        const logFile = path.join(__dirname, 'data', `${hostname}.log`);
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            method,
            endpoint,
            statusCode,
            requestData: requestData || null,
            responseData: responseData || null,
            error: error || null
        };
        
        const logLine = JSON.stringify(logEntry) + '\n';
        
        // Ensure data directory exists
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Append to log file
        fs.appendFileSync(logFile, logLine);
    } catch (logError) {
        console.error('Failed to write to log file:', logError.message);
    }
}

function addSite(url, token, name = null) {
    const config = loadConfig();
    
    // Check if site already exists to preserve its data
    if (config.sites[url]) {
        // Site exists - preserve existing data, only update token and lastUsed
        config.sites[url].token = token;
        config.sites[url].lastUsed = new Date().toISOString();
        
        // Only update name if explicitly provided
        if (name) {
            config.sites[url].name = name;
        }
        
        // Set as active site when updating token (reauthentication)
        config.activeSite = url;
    } else {
        // New site - create complete entry
        const siteName = name || extractSiteName(url);
        config.sites[url] = {
            name: siteName,
            url: url,
            token: token,
            lastUsed: new Date().toISOString()
        };
        
        // Set as active site if it's the first one or no active site
        if (!config.activeSite || Object.keys(config.sites).length === 1) {
            config.activeSite = url;
        }
    }
    
    return saveConfig(config);
}

function getActiveSite() {
    const config = loadConfig();
    if (config.activeSite && config.sites[config.activeSite]) {
        return config.sites[config.activeSite];
    }
    return null;
}

function setActiveSite(url) {
    const config = loadConfig();
    if (config.sites[url]) {
        config.activeSite = url;
        config.sites[url].lastUsed = new Date().toISOString();
        return saveConfig(config);
    }
    return false;
}

function updateSiteVersionInfo(url, versionInfo) {
    const config = loadConfig();
    if (config.sites[url]) {
        config.sites[url].versionInfo = {
            ...versionInfo,
            lastUpdated: new Date().toISOString()
        };
        return saveConfig(config);
    }
    return false;
}

app.get('/api/config', (req, res) => {
    try {
        console.log('Loading config for /api/config endpoint');
        const config = loadConfig();
        const activeSite = getActiveSite();
        
        const response = { 
            sites: config.sites || {},
            activeSite: activeSite,
            hasActiveSite: !!activeSite
        };
        
        console.log('Config response:', JSON.stringify(response, null, 2));
        res.json(response);
    } catch (error) {
        console.error('Error in /api/config:', error);
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

app.post('/api/set-active-site', (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'Site URL is required' });
    }
    
    if (setActiveSite(url)) {
        const activeSite = getActiveSite();
        res.json({ success: true, activeSite });
    } else {
        res.status(404).json({ error: 'Site not found' });
    }
});

app.delete('/api/sites/:url', (req, res) => {
    const url = decodeURIComponent(req.params.url);
    const config = loadConfig();
    
    if (config.sites[url]) {
        delete config.sites[url];
        
        // If this was the active site, set a new active site or none
        if (config.activeSite === url) {
            const remainingSites = Object.keys(config.sites);
            config.activeSite = remainingSites.length > 0 ? remainingSites[0] : null;
        }
        
        saveConfig(config);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Site not found' });
    }
});

app.post('/api/update-site-name', (req, res) => {
    try {
        const { url, name } = req.body;
        
        if (!url || !name) {
            return res.status(400).json({ error: 'URL and name are required' });
        }
        
        const config = loadConfig();
        
        if (!config.sites[url]) {
            return res.status(404).json({ error: 'Site not found' });
        }
        
        // Update the site name
        config.sites[url].name = name;
        
        if (saveConfig(config)) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to save configuration' });
        }
    } catch (error) {
        console.error('Update site name error:', error.message);
        res.status(500).json({ error: 'Failed to update site name: ' + error.message });
    }
});

app.get('/api/token-info', async (req, res) => {
    try {
        const activeSite = getActiveSite();
        
        if (!activeSite) {
            return res.status(400).json({ error: 'No active site configured' });
        }

        console.log('Checking token info for:', activeSite.url);
        console.log('Token length:', activeSite.token.length);
        console.log('Token starts with:', activeSite.token.substring(0, 20) + '...');
        
        // Get session info to see token scope
        let sessionResponse;
        
        // Try Contao-Manager-Auth header first (recommended by swagger)
        try {
            console.log('Trying Contao-Manager-Auth header for session');
            sessionResponse = await axios.get(`${activeSite.url}/api/session`, {
                headers: {
                    'Contao-Manager-Auth': activeSite.token
                },
                timeout: 10000,
                validateStatus: status => status < 500
            });
            console.log('Contao-Manager-Auth worked for session');
        } catch (error) {
            console.log('Contao-Manager-Auth failed for session, trying Authorization Bearer');
            // Fallback to Authorization Bearer header
            sessionResponse = await axios.get(`${activeSite.url}/api/session`, {
                headers: {
                    'Authorization': `Bearer ${activeSite.token}`
                },
                timeout: 10000,
                validateStatus: status => status < 500
            });
            console.log('Authorization Bearer worked for session');
        }
        
        console.log('Session response status:', sessionResponse.status);
        console.log('Session response data:', sessionResponse.data);

        // Log session request
        logApiCall(activeSite.url, 'GET', '/api/session', sessionResponse.status, null, sessionResponse.data);

        if (sessionResponse.status === 200) {
            res.json({
                success: true,
                tokenInfo: sessionResponse.data,
                site: activeSite
            });
        } else {
            res.status(sessionResponse.status).json({ 
                error: 'Failed to get token info',
                status: sessionResponse.status,
                response: sessionResponse.data
            });
        }
    } catch (error) {
        console.error('Token info error:', error.message);
        // Log failed session request
        if (activeSite) {
            logApiCall(activeSite.url, 'GET', '/api/session', error.response?.status || 500, null, null, error.message);
        }
        res.status(500).json({ error: 'Failed to get token info: ' + error.message });
    }
});

app.post('/api/save-token', async (req, res) => {
    try {
        const { token, managerUrl } = req.body;
        
        if (!token || !managerUrl) {
            return res.status(400).json({ error: 'Token and manager URL are required' });
        }

        // Validate token before saving
        const testResponse = await axios.get(`${managerUrl}/api/session`, {
            headers: {
                'Contao-Manager-Auth': token
            },
            timeout: 10000,
            validateStatus: status => status < 500
        });

        // Log save-token validation request
        logApiCall(managerUrl, 'GET', '/api/session', testResponse.status, null, testResponse.data);

        if (testResponse.status !== 200) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (addSite(managerUrl, token)) {
            const activeSite = getActiveSite();
            res.json({ success: true, activeSite });
        } else {
            res.status(500).json({ error: 'Failed to save site configuration' });
        }
    } catch (error) {
        console.error('Save token error:', error.message);
        // Log failed save-token validation request
        const { managerUrl } = req.body;
        if (managerUrl) {
            logApiCall(managerUrl, 'GET', '/api/session', error.response?.status || 500, null, null, error.message);
        }
        res.status(500).json({ error: 'Failed to validate and save token' });
    }
});

app.post('/api/validate-token', async (req, res) => {
    try {
        const { url, token } = req.body;
        
        if (!url || !token) {
            return res.status(400).json({ error: 'URL and token are required' });
        }

        const managerUrl = url.replace(/\/$/, '');
        
        // Test the token by making a simple API call
        let testResponse;
        
        // Try Authorization Bearer first
        try {
            console.log('Trying token validation with Authorization Bearer header');
            testResponse = await axios.get(`${managerUrl}/api/session`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000,
                validateStatus: status => status < 500
            });
            console.log('Authorization Bearer worked for token validation');
        } catch (error) {
            console.log('Bearer auth failed for token validation, trying Contao-Manager-Auth header');
            // Fallback to Contao-Manager-Auth header
            testResponse = await axios.get(`${managerUrl}/api/session`, {
                headers: {
                    'Contao-Manager-Auth': token
                },
                timeout: 10000,
                validateStatus: status => status < 500
            });
            console.log('Contao-Manager-Auth header worked for token validation');
        }

        if (testResponse.status === 200) {
            // Log successful token validation
            logApiCall(managerUrl, 'GET', '/api/session', testResponse.status, null, testResponse.data);
            res.json({ success: true, url: managerUrl });
        } else {
            // Log failed token validation
            logApiCall(managerUrl, 'GET', '/api/session', testResponse.status, null, testResponse.data);
            res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        console.error('Token validation error:', error.message);
        res.status(500).json({ error: 'Failed to validate token' });
    }
});

app.post('/api/update-version-info', async (req, res) => {
    try {
        const activeSite = getActiveSite();
        
        if (!activeSite) {
            return res.status(400).json({ error: 'No active site configured' });
        }

        console.log('Updating version info for:', activeSite.url);
        
        const versionInfo = {
            contaoManagerVersion: null,
            phpVersion: null,
            contaoVersion: null
        };

        // Get Contao Manager version from self-update endpoint
        try {
            let selfUpdateResponse;
            
            try {
                console.log('Getting Contao Manager version with Contao-Manager-Auth header');
                selfUpdateResponse = await axios.get(`${activeSite.url}/api/server/self-update`, {
                    headers: {
                        'Contao-Manager-Auth': activeSite.token
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Contao-Manager-Auth worked for self-update version');
            } catch (error) {
                console.log('Contao-Manager-Auth failed for self-update version, trying Authorization Bearer');
                selfUpdateResponse = await axios.get(`${activeSite.url}/api/server/self-update`, {
                    headers: {
                        'Authorization': `Bearer ${activeSite.token}`
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Authorization Bearer worked for self-update version');
            }
            
            if (selfUpdateResponse.status === 200 && selfUpdateResponse.data.current_version) {
                versionInfo.contaoManagerVersion = selfUpdateResponse.data.current_version;
                console.log('Got Contao Manager version:', versionInfo.contaoManagerVersion);
            }
            
            // Log self-update version request
            logApiCall(activeSite.url, 'GET', '/api/server/self-update', selfUpdateResponse.status, null, selfUpdateResponse.data);
        } catch (error) {
            console.error('Failed to get Contao Manager version:', error.message);
            // Log failed self-update version request
            logApiCall(activeSite.url, 'GET', '/api/server/self-update', error.response?.status || 500, null, null, error.message);
        }

        // Get PHP version from php-web endpoint
        try {
            let phpWebResponse;
            
            try {
                console.log('Getting PHP version with Contao-Manager-Auth header');
                phpWebResponse = await axios.get(`${activeSite.url}/api/server/php-web`, {
                    headers: {
                        'Contao-Manager-Auth': activeSite.token
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Contao-Manager-Auth worked for php-web version');
            } catch (error) {
                console.log('Contao-Manager-Auth failed for php-web version, trying Authorization Bearer');
                phpWebResponse = await axios.get(`${activeSite.url}/api/server/php-web`, {
                    headers: {
                        'Authorization': `Bearer ${activeSite.token}`
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Authorization Bearer worked for php-web version');
            }
            
            if (phpWebResponse.status === 200 && phpWebResponse.data.version) {
                versionInfo.phpVersion = phpWebResponse.data.version;
                console.log('Got PHP version:', versionInfo.phpVersion);
            }
            
            // Log php-web version request
            logApiCall(activeSite.url, 'GET', '/api/server/php-web', phpWebResponse.status, null, phpWebResponse.data);
        } catch (error) {
            console.error('Failed to get PHP version:', error.message);
            // Log failed php-web version request
            logApiCall(activeSite.url, 'GET', '/api/server/php-web', error.response?.status || 500, null, null, error.message);
        }

        // Get Contao version from contao endpoint
        try {
            let contaoResponse;
            
            try {
                console.log('Getting Contao version with Contao-Manager-Auth header');
                contaoResponse = await axios.get(`${activeSite.url}/api/server/contao`, {
                    headers: {
                        'Contao-Manager-Auth': activeSite.token
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Contao-Manager-Auth worked for contao version');
            } catch (error) {
                console.log('Contao-Manager-Auth failed for contao version, trying Authorization Bearer');
                contaoResponse = await axios.get(`${activeSite.url}/api/server/contao`, {
                    headers: {
                        'Authorization': `Bearer ${activeSite.token}`
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Authorization Bearer worked for contao version');
            }
            
            if (contaoResponse.status === 200 && contaoResponse.data.version) {
                versionInfo.contaoVersion = contaoResponse.data.version;
                console.log('Got Contao version:', versionInfo.contaoVersion);
            }
            
            // Log contao version request
            logApiCall(activeSite.url, 'GET', '/api/server/contao', contaoResponse.status, null, contaoResponse.data);
        } catch (error) {
            console.error('Failed to get Contao version:', error.message);
            // Log failed contao version request
            logApiCall(activeSite.url, 'GET', '/api/server/contao', error.response?.status || 500, null, null, error.message);
        }

        // Update the site configuration with version info
        if (updateSiteVersionInfo(activeSite.url, versionInfo)) {
            console.log('Version info updated successfully:', versionInfo);
            res.json({ 
                success: true, 
                versionInfo: {
                    ...versionInfo,
                    lastUpdated: new Date().toISOString()
                }
            });
        } else {
            res.status(500).json({ error: 'Failed to save version information' });
        }
    } catch (error) {
        console.error('Update version info error:', error.message);
        res.status(500).json({ error: 'Failed to update version info: ' + error.message });
    }
});

app.post('/api/update-status', async (req, res) => {
    try {
        const activeSite = getActiveSite();
        
        if (!activeSite) {
            return res.status(400).json({ error: 'No active site configured' });
        }

        console.log('Making requests to:', activeSite.url);
        
        const result = {
            composer: null,
            selfUpdate: null,
            errors: {}
        };

        // Try composer endpoint
        try {
            let updateResponse;
            
            // Try Contao-Manager-Auth first (recommended by swagger)
            try {
                console.log('Trying composer endpoint with Contao-Manager-Auth header');
                updateResponse = await axios.get(`${activeSite.url}/api/server/composer`, {
                    headers: {
                        'Contao-Manager-Auth': activeSite.token
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Contao-Manager-Auth worked for composer');
            } catch (error) {
                console.log('Contao-Manager-Auth failed for composer, trying Authorization Bearer');
                // Fallback to Authorization Bearer header
                updateResponse = await axios.get(`${activeSite.url}/api/server/composer`, {
                    headers: {
                        'Authorization': `Bearer ${activeSite.token}`
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Authorization Bearer worked for composer');
            }
            
            console.log('Composer response status:', updateResponse.status);
            console.log('Composer response data:', updateResponse.data);

            if (updateResponse.status === 200) {
                result.composer = updateResponse.data;
            } else if (updateResponse.status === 403) {
                result.errors.composer = 'Insufficient permissions for composer status (requires "read" scope or higher)';
            } else {
                result.errors.composer = `Request failed with status ${updateResponse.status}`;
            }
            
            // Log composer request
            logApiCall(activeSite.url, 'GET', '/api/server/composer', updateResponse.status, null, updateResponse.data);
        } catch (error) {
            console.error('Composer request error:', error.message);
            result.errors.composer = `Failed to fetch composer status: ${error.message}`;
        }

        // Try self-update endpoint
        try {
            let statusResponse;
            
            // Try Contao-Manager-Auth first (recommended by swagger)
            try {
                console.log('Trying self-update endpoint with Contao-Manager-Auth header');
                statusResponse = await axios.get(`${activeSite.url}/api/server/self-update`, {
                    headers: {
                        'Contao-Manager-Auth': activeSite.token
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Contao-Manager-Auth worked for self-update');
            } catch (error) {
                console.log('Contao-Manager-Auth failed for self-update, trying Authorization Bearer');
                // Fallback to Authorization Bearer header
                statusResponse = await axios.get(`${activeSite.url}/api/server/self-update`, {
                    headers: {
                        'Authorization': `Bearer ${activeSite.token}`
                    },
                    timeout: 10000,
                    validateStatus: status => status < 500
                });
                console.log('Authorization Bearer worked for self-update');
            }
            
            console.log('Self-update response status:', statusResponse.status);
            console.log('Self-update response data:', statusResponse.data);

            if (statusResponse.status === 200) {
                result.selfUpdate = statusResponse.data;
            } else if (statusResponse.status === 403) {
                result.errors.selfUpdate = 'Insufficient permissions for self-update status (requires "update" scope)';
            } else {
                result.errors.selfUpdate = `Request failed with status ${statusResponse.status}`;
            }
            
            // Log self-update request
            logApiCall(activeSite.url, 'GET', '/api/server/self-update', statusResponse.status, null, statusResponse.data);
        } catch (error) {
            console.error('Self-update request error:', error.message);
            result.errors.selfUpdate = `Failed to fetch self-update status: ${error.message}`;
        }

        // Return results even if some endpoints failed
        res.json(result);
    } catch (error) {
        console.error('Update status error:', error.message);
        console.error('Error details:', error.response?.data || error);
        res.status(500).json({ error: 'Failed to get update status: ' + error.message });
    }
});

// Generic proxy helper for Contao Manager API
async function proxyToContaoManager(endpoint, method = 'GET', data = null) {
    const activeSite = getActiveSite();
    
    if (!activeSite) {
        throw new Error('No active site configured');
    }

    const config = {
        method,
        url: `${activeSite.url}${endpoint}`,
        timeout: 10000,
        validateStatus: status => status < 500
    };

    if (data) {
        config.data = data;
        config.headers = { 'Content-Type': 'application/json' };
    }

    console.log(`[API REQUEST] ${method} ${activeSite.url}${endpoint}`);
    if (data) {
        console.log('[API REQUEST BODY]', JSON.stringify(data, null, 2));
    }

    let response;
    let requestError = null;
    
    // Try Contao-Manager-Auth header first (recommended by swagger)
    try {
        config.headers = {
            ...config.headers,
            'Contao-Manager-Auth': activeSite.token
        };
        console.log('[API REQUEST] Using Contao-Manager-Auth header');
        response = await axios(config);
        console.log('[API REQUEST] Contao-Manager-Auth worked');
    } catch (error) {
        console.log('[API REQUEST] Contao-Manager-Auth failed, trying Authorization Bearer');
        // Fallback to Authorization Bearer header
        try {
            config.headers = {
                ...config.headers,
                'Authorization': `Bearer ${activeSite.token}`
            };
            delete config.headers['Contao-Manager-Auth'];
            response = await axios(config);
            console.log('[API REQUEST] Authorization Bearer worked');
        } catch (fallbackError) {
            requestError = fallbackError;
            response = fallbackError.response || { status: 500, data: null };
        }
    }

    console.log(`[API RESPONSE] Status: ${response.status}`);
    console.log('[API RESPONSE] Headers:', response.headers);
    
    // Log response data safely
    let responseDataForLog = null;
    if (response.data !== undefined) {
        try {
            const dataStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
            console.log('[API RESPONSE] Data:', dataStr);
            console.log('[API RESPONSE] Data type:', typeof response.data);
            console.log('[API RESPONSE] Data length:', dataStr.length);
            responseDataForLog = response.data;
        } catch (e) {
            console.log('[API RESPONSE] Data (stringify failed):', response.data);
            console.log('[API RESPONSE] Data type:', typeof response.data);
            responseDataForLog = response.data;
        }
    } else {
        console.log('[API RESPONSE] No data in response');
    }

    // Log the API call
    logApiCall(
        activeSite.url,
        method,
        endpoint,
        response.status,
        data,
        responseDataForLog,
        requestError ? requestError.message : null
    );

    // If there was an error, throw it
    if (requestError) {
        throw requestError;
    }

    return response;
}

// Helper function to handle API responses properly
function handleApiResponse(endpoint, response, res) {
    console.log(`[${endpoint}] Response status: ${response.status}`);
    
    // Handle 204 No Content responses (empty body)
    if (response.status === 204) {
        console.log(`[${endpoint}] No content response (204)`);
        res.status(204).send();
        return;
    }
    
    // Handle responses with data
    if (response.data !== undefined && response.data !== null) {
        if (typeof response.data === 'string' && response.data.trim() === '') {
            console.log(`[${endpoint}] Empty string response`);
            res.status(response.status).json({});
        } else {
            console.log(`[${endpoint}] Sending response data`);
            res.status(response.status).json(response.data);
        }
    } else {
        console.log(`[${endpoint}] No data in response, sending empty object`);
        res.status(response.status).json({});
    }
}

// Server Configuration endpoints
app.get('/api/server/config', async (req, res) => {
    try {
        console.log('[SERVER-CONFIG] Starting request');
        const response = await proxyToContaoManager('/api/server/config');
        handleApiResponse('SERVER-CONFIG', response, res);
    } catch (error) {
        console.error('[SERVER-CONFIG] Error:', error.message);
        console.error('[SERVER-CONFIG] Full error:', error);
        res.status(500).json({ error: 'Failed to get server configuration: ' + error.message });
    }
});

app.get('/api/server/php-web', async (req, res) => {
    try {
        console.log('[PHP-WEB] Starting request');
        const response = await proxyToContaoManager('/api/server/php-web');
        handleApiResponse('PHP-WEB', response, res);
    } catch (error) {
        console.error('[PHP-WEB] Error:', error.message);
        console.error('[PHP-WEB] Full error:', error);
        res.status(500).json({ error: 'Failed to get PHP web configuration: ' + error.message });
    }
});

app.get('/api/server/contao', async (req, res) => {
    try {
        console.log('[CONTAO-CONFIG] Starting request');
        const response = await proxyToContaoManager('/api/server/contao');
        handleApiResponse('CONTAO-CONFIG', response, res);
    } catch (error) {
        console.error('[CONTAO-CONFIG] Error:', error.message);
        console.error('[CONTAO-CONFIG] Full error:', error);
        res.status(500).json({ error: 'Failed to get Contao configuration: ' + error.message });
    }
});

// Users endpoints
app.get('/api/users', async (req, res) => {
    try {
        console.log('[USERS] Starting request');
        const response = await proxyToContaoManager('/api/users');
        handleApiResponse('USERS', response, res);
    } catch (error) {
        console.error('[USERS] Error:', error.message);
        console.error('[USERS] Full error:', error);
        res.status(500).json({ error: 'Failed to get users list: ' + error.message });
    }
});

app.get('/api/users/:username/tokens', async (req, res) => {
    try {
        const username = req.params.username;
        console.log(`[USER-TOKENS] Starting request for user: ${username}`);
        const response = await proxyToContaoManager(`/api/users/${username}/tokens`);
        handleApiResponse('USER-TOKENS', response, res);
    } catch (error) {
        console.error('[USER-TOKENS] Error:', error.message);
        console.error('[USER-TOKENS] Full error:', error);
        res.status(500).json({ error: 'Failed to get token list: ' + error.message });
    }
});

app.get('/api/users/:username/tokens/:id', async (req, res) => {
    try {
        const { username, id } = req.params;
        console.log(`[TOKEN-INFO] Starting request for user: ${username}, token: ${id}`);
        const response = await proxyToContaoManager(`/api/users/${username}/tokens/${id}`);
        handleApiResponse('TOKEN-INFO', response, res);
    } catch (error) {
        console.error('[TOKEN-INFO] Error:', error.message);
        console.error('[TOKEN-INFO] Full error:', error);
        res.status(500).json({ error: 'Failed to get token info: ' + error.message });
    }
});

// Contao API endpoints
app.get('/api/contao/database-migration', async (req, res) => {
    try {
        console.log('[MIGRATION] Starting request');
        const response = await proxyToContaoManager('/api/contao/database-migration');
        handleApiResponse('MIGRATION', response, res);
    } catch (error) {
        console.error('[MIGRATION] Error:', error.message);
        console.error('[MIGRATION] Full error:', error);
        res.status(500).json({ error: 'Failed to get migration status: ' + error.message });
    }
});

app.put('/api/contao/database-migration', async (req, res) => {
    try {
        console.log('[MIGRATION-START] Starting request');
        console.log('[MIGRATION-START] Request body:', JSON.stringify(req.body, null, 2));
        const response = await proxyToContaoManager('/api/contao/database-migration', 'PUT', req.body);
        handleApiResponse('MIGRATION-START', response, res);
    } catch (error) {
        console.error('[MIGRATION-START] Error:', error.message);
        console.error('[MIGRATION-START] Full error:', error);
        res.status(500).json({ error: 'Failed to start migration: ' + error.message });
    }
});

app.delete('/api/contao/database-migration', async (req, res) => {
    try {
        console.log('[MIGRATION-DELETE] Starting request');
        const response = await proxyToContaoManager('/api/contao/database-migration', 'DELETE');
        handleApiResponse('MIGRATION-DELETE', response, res);
    } catch (error) {
        console.error('[MIGRATION-DELETE] Error:', error.message);
        console.error('[MIGRATION-DELETE] Full error:', error);
        res.status(500).json({ error: 'Failed to delete migration task: ' + error.message });
    }
});

app.get('/api/contao/backup', async (req, res) => {
    try {
        console.log('[BACKUP] Starting request');
        const response = await proxyToContaoManager('/api/contao/backup');
        handleApiResponse('BACKUP', response, res);
    } catch (error) {
        console.error('[BACKUP] Error:', error.message);
        console.error('[BACKUP] Full error:', error);
        res.status(500).json({ error: 'Failed to get database backups: ' + error.message });
    }
});

app.get('/api/contao/maintenance-mode', async (req, res) => {
    try {
        console.log('[MAINTENANCE] Starting request');
        const response = await proxyToContaoManager('/api/contao/maintenance-mode');
        handleApiResponse('MAINTENANCE', response, res);
    } catch (error) {
        console.error('[MAINTENANCE] Error:', error.message);
        console.error('[MAINTENANCE] Full error:', error);
        res.status(500).json({ error: 'Failed to get maintenance mode status: ' + error.message });
    }
});

app.put('/api/contao/maintenance-mode', async (req, res) => {
    try {
        console.log('[MAINTENANCE-ENABLE] Starting request');
        const response = await proxyToContaoManager('/api/contao/maintenance-mode', 'PUT');
        handleApiResponse('MAINTENANCE-ENABLE', response, res);
    } catch (error) {
        console.error('[MAINTENANCE-ENABLE] Error:', error.message);
        console.error('[MAINTENANCE-ENABLE] Full error:', error);
        res.status(500).json({ error: 'Failed to enable maintenance mode: ' + error.message });
    }
});

app.delete('/api/contao/maintenance-mode', async (req, res) => {
    try {
        console.log('[MAINTENANCE-DISABLE] Starting request');
        const response = await proxyToContaoManager('/api/contao/maintenance-mode', 'DELETE');
        handleApiResponse('MAINTENANCE-DISABLE', response, res);
    } catch (error) {
        console.error('[MAINTENANCE-DISABLE] Error:', error.message);
        console.error('[MAINTENANCE-DISABLE] Full error:', error);
        res.status(500).json({ error: 'Failed to disable maintenance mode: ' + error.message });
    }
});

// Tasks endpoints
app.get('/api/task', async (req, res) => {
    try {
        console.log('[TASK-GET] Starting request');
        const response = await proxyToContaoManager('/api/task');
        handleApiResponse('TASK-GET', response, res);
    } catch (error) {
        console.error('[TASK-GET] Error:', error.message);
        console.error('[TASK-GET] Full error:', error);
        res.status(500).json({ error: 'Failed to get task data: ' + error.message });
    }
});

app.put('/api/task', async (req, res) => {
    try {
        console.log('[TASK-PUT] Starting request');
        console.log('[TASK-PUT] Request body:', JSON.stringify(req.body, null, 2));
        const response = await proxyToContaoManager('/api/task', 'PUT', req.body);
        handleApiResponse('TASK-PUT', response, res);
    } catch (error) {
        console.error('[TASK-PUT] Error:', error.message);
        console.error('[TASK-PUT] Full error:', error);
        res.status(500).json({ error: 'Failed to set task data: ' + error.message });
    }
});

app.delete('/api/task', async (req, res) => {
    try {
        console.log('[TASK-DELETE] Starting request');
        const response = await proxyToContaoManager('/api/task', 'DELETE');
        handleApiResponse('TASK-DELETE', response, res);
    } catch (error) {
        console.error('[TASK-DELETE] Error:', error.message);
        console.error('[TASK-DELETE] Full error:', error);
        res.status(500).json({ error: 'Failed to delete task data: ' + error.message });
    }
});

// Packages endpoints
app.get('/api/packages/root', async (req, res) => {
    try {
        console.log('[PACKAGES] Starting request');
        const response = await proxyToContaoManager('/api/packages/root');
        handleApiResponse('PACKAGES', response, res);
    } catch (error) {
        console.error('[PACKAGES] Error:', error.message);
        console.error('[PACKAGES] Full error:', error);
        res.status(500).json({ error: 'Failed to get root package details: ' + error.message });
    }
});

app.get('/api/packages/local/', async (req, res) => {
    try {
        console.log('[PACKAGES-LOCAL] Starting request');
        const response = await proxyToContaoManager('/api/packages/local/');
        handleApiResponse('PACKAGES-LOCAL', response, res);
    } catch (error) {
        console.error('[PACKAGES-LOCAL] Error:', error.message);
        console.error('[PACKAGES-LOCAL] Full error:', error);
        res.status(500).json({ error: 'Failed to get installed packages: ' + error.message });
    }
});

// Log reading endpoint
app.get('/api/logs/:siteUrl', (req, res) => {
    try {
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        const hostname = extractSiteName(siteUrl);
        const logFile = path.join(__dirname, 'data', `${hostname}.log`);
        
        // Check if log file exists
        if (!fs.existsSync(logFile)) {
            return res.json({ logs: [], message: 'No logs found for this site' });
        }
        
        // Read log file and parse JSON lines
        const logContent = fs.readFileSync(logFile, 'utf8');
        const logLines = logContent.trim().split('\n').filter(line => line.trim());
        
        const logs = [];
        for (const line of logLines) {
            try {
                const logEntry = JSON.parse(line);
                logs.push(logEntry);
            } catch (parseError) {
                console.error('Failed to parse log line:', parseError.message);
                // Include unparseable lines as raw text
                logs.push({
                    timestamp: new Date().toISOString(),
                    method: 'UNKNOWN',
                    endpoint: 'PARSE_ERROR',
                    statusCode: null,
                    error: `Failed to parse: ${line}`,
                    requestData: null,
                    responseData: null
                });
            }
        }
        
        // Sort logs by timestamp (newest first)
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        res.json({ 
            logs,
            total: logs.length,
            siteUrl,
            hostname
        });
    } catch (error) {
        console.error('[LOGS] Error:', error.message);
        res.status(500).json({ error: 'Failed to read log file: ' + error.message });
    }
});

// Log cleanup endpoint
app.delete('/api/logs/:siteUrl/cleanup', (req, res) => {
    try {
        const siteUrl = decodeURIComponent(req.params.siteUrl);
        const hostname = extractSiteName(siteUrl);
        const logFile = path.join(__dirname, 'data', `${hostname}.log`);
        
        // Check if log file exists
        if (!fs.existsSync(logFile)) {
            return res.json({ 
                success: true, 
                deletedCount: 0, 
                message: 'No logs found for this site' 
            });
        }
        
        // Read log file and parse JSON lines
        const logContent = fs.readFileSync(logFile, 'utf8');
        const logLines = logContent.trim().split('\n').filter(line => line.trim());
        
        const logs = [];
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
        
        res.json({ 
            success: true, 
            deletedCount,
            message: `Successfully deleted ${deletedCount} log entries older than 1 week`
        });
    } catch (error) {
        console.error('[LOG-CLEANUP] Error:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to cleanup log file: ' + error.message 
        });
    }
});

// Serve React app for all non-API routes
app.get('/', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Catch-all handler for React Router (MUST be last)
app.get('/*splat', (req, res) => {
    // Don't handle API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Serve React app for all other routes
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});