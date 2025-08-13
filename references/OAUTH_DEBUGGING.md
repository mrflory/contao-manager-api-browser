# OAuth Flow Debugging Guide

## Common Issues and Solutions

### 1. "Access token parameter is empty"

**Symptoms:**
- Frontend shows "Access token parameter is empty" error
- OAuth redirect seems to work but token is not found

**Most Common Cause:**
Double hash fragments in the redirect URL, e.g.:
```
❌ BAD:  http://localhost:5173/add-site#token#access_token=abc123
✅ GOOD: http://localhost:5173/add-site#token&access_token=abc123
```

**Solution:**
The mock server now handles this correctly by checking if the redirect URI already contains a hash fragment.

### 2. Testing OAuth Flow

Use the included `oauth-test.html` page:
1. Start mock server: `npm run mock:server`
2. Open `oauth-test.html` in browser
3. Click "Start OAuth Flow"
4. Check the results for token parsing

### 3. Authentication Header Formats

The mock server supports both authentication header formats:

**OAuth Standard (from frontend):**
```javascript
headers: { 'Authorization': 'Bearer mock_abc123' }
```

**Contao Manager Format (from your main server):**
```javascript
headers: { 'Contao-Manager-Auth': 'mock_abc123' }
```

### 4. Manual URL Testing

Test redirect logic with Node.js:
```bash
node -e "
const redirect_uri = 'YOUR_REDIRECT_URI_HERE';
const separator = redirect_uri.includes('#') ? '&' : '#';
console.log('Will use separator:', separator);
"
```

### 4. Expected OAuth Response Format

The mock server returns tokens in this format:
```
access_token=mock_abc123&token_type=Bearer&expires_in=3600&scope=admin&state=xyz
```

### 5. Frontend Token Parsing

Your frontend should:
1. Get the hash fragment: `window.location.hash`
2. Remove the `#`: `hash.substring(1)`
3. Handle multiple hash fragments: `hash.split('#').pop()`
4. Parse parameters: `new URLSearchParams(paramString)`
5. Get token: `params.get('access_token')`

### 6. Debug Console Output

The mock server logs OAuth details:
```
[OAUTH] OAuth request detected: { response_type: 'token', scope: 'admin', ... }
[OAUTH] User allowed access, redirecting to: http://...
[OAUTH] Token details: { access_token: 'mock_abc123', token_type: 'Bearer', ... }
```

### 7. API Testing

Once you have the token, test API calls:
```javascript
fetch('http://localhost:3001/api/server/self-update', {
  headers: {
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json'
  }
})
```

## Mock Server Endpoints

- **Main interface**: `http://localhost:3001/`
- **OAuth endpoint**: `http://localhost:3001/contao-manager.phar.php`
- **API endpoints**: `http://localhost:3001/api/*`
- **Health check**: `http://localhost:3001/health`

## Testing Different Scenarios

```bash
# Test with error scenarios
curl -X POST http://localhost:3001/mock/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "error-scenarios.authentication-error"}'

# Reset to success scenario  
curl -X POST http://localhost:3001/mock/reset
```