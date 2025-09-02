# Refactoring TODOs

## Architectural Issues Identified During Server.js Refactoring

### High Priority

#### 1. Frontend Components Using Server-Side Services Directly
**Issue**: Multiple frontend components are importing and using server-side service classes instead of making proper HTTP API calls.

**Components affected:**
- `src/components/forms/ReauthenticationForm.tsx` - uses `AuthService.authenticateCookie()`
- `src/pages/AddSite.tsx` - uses `AuthService.isReauthCallback()`, `AuthService.authenticateCookie()`  
- `src/hooks/useAuth.ts` - uses multiple `AuthService` static methods:
  - `AuthService.buildOAuthRedirectUri()`
  - `AuthService.initiateOAuth()`
  - `AuthService.initiateReauth()`
  - `AuthService.isOAuthCallback()`
  - `AuthService.extractTokenFromHash()`
  - `AuthService.clearOAuthHash()`
  - `AuthService.getStoredManagerUrl()`
  - `AuthService.cleanupOAuthData()`
  - `AuthService.getStoredReauthSiteUrl()`
- `src/workflow/engine/WorkflowEngine.ts` - uses `HistoryService` directly

**Solution needed**: 
- Create proper API service classes that make HTTP calls to server endpoints
- Update components to use API services instead of server-side services
- Separate client-side utilities from server-side business logic

#### 2. Missing API Service Patterns
**Issue**: Not all server endpoints have corresponding frontend API service classes.

**Missing services:**
- Full `AuthApiService` for authentication flows
- Proper OAuth flow handling via API calls
- Client-side authentication state management

**Solution needed**:
- Complete the API service pattern for all server functionality
- Implement proper client-server separation

### Medium Priority

#### 3. TypeScript Import/Export Issues
**Issue**: Mixed ES6 modules and CommonJS causing compilation issues in some contexts.

**Files affected:**
- Various service imports need consistent module patterns
- Server.ts has mixed import styles

**Solution needed**:
- Standardize on consistent import/export patterns
- Fix remaining TypeScript compilation warnings

#### 4. WorkflowEngine Client-Server Boundary
**Issue**: WorkflowEngine appears to be client-side but imports server-side services.

**Solution needed**:
- Determine if WorkflowEngine should be server-side or client-side
- If client-side, convert to use API calls
- If server-side, move to appropriate location

### Low Priority

#### 5. Type Definition Consolidation
**Issue**: Some type definitions might be duplicated between frontend and backend.

**Solution needed**:
- Review and consolidate shared types
- Ensure proper type safety across client-server boundary

#### 6. Error Handling Standardization
**Issue**: Inconsistent error handling patterns between old and new code.

**Solution needed**:
- Standardize error handling across all API calls
- Ensure consistent error message formats

## Completed ✅

- ✅ Server.js refactored into modular TypeScript services
- ✅ HistoryTab fixed to use HistoryApiService instead of server-side HistoryService
- ✅ Basic service architecture established
- ✅ TypeScript conversion of core backend services
- ✅ TokenEncryptionService import/export issues resolved

## Next Steps

1. **Fix AuthService client-server boundary** - Highest impact
2. **Create comprehensive API service layer** - Foundation for clean architecture
3. **Update all frontend components** - Complete the separation
4. **Add proper error boundaries** - Improve user experience
5. **Consolidate type definitions** - Better maintainability