# React 19 Migration Plan

## Overview
This document outlines the step-by-step plan for migrating from React 18.3.1 to React 19.x while maintaining compatibility with the existing Contao Manager API Browser application.

## Current State Analysis

### Compatibility Score: 8.5/10
The codebase is well-positioned for React 19 migration with modern patterns and TypeScript usage.

### Key Findings
- ✅ All functional components (no class components)
- ✅ Modern hook usage patterns
- ✅ Proper TypeScript integration
- 🟡 Some useEffect dependency optimization needed
- 🟡 Direct DOM access in SiteDetails component
- 🟡 Missing React.StrictMode
- 🔴 Complex recursive function patterns in useWorkflow hook

## Migration Phases

### Phase 1: Pre-Migration Preparation (1-2 days)

#### 1.1 Add React.StrictMode
**Priority**: High  
**Files**: `src/main.tsx`  
**Objective**: Enable strict mode to catch potential React 19 compatibility issues early

**Changes needed**:
```tsx
// Current
root.render(<App />);

// Updated
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

#### 1.2 Fix Direct DOM Access
**Priority**: High  
**Files**: `src/pages/SiteDetails.tsx` (lines 455-457)  
**Objective**: Replace `document.getElementById` with React refs

**Changes needed**:
```tsx
// Current problematic pattern
const hash = (document.getElementById('migration-hash') as HTMLInputElement)?.value;

// Recommended approach using refs
const migrationHashRef = useRef<HTMLInputElement>(null);
const hash = migrationHashRef.current?.value;
```

#### 1.3 Optimize useWorkflow Hook
**Priority**: Medium  
**Files**: `src/hooks/useWorkflow.ts`  
**Objective**: Reduce complexity and improve dependency management

**Areas to review**:
- Large useCallback dependency arrays (lines 459-473)
- Recursive function ref pattern (line 476)
- useEffect dependencies (line 127)

### Phase 2: Test Environment Setup (1 day)

#### 2.1 Create React 19 Branch
```bash
git checkout -b feature/react-19-migration
```

#### 2.2 Update Dependencies (Staged)
```json
{
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

#### 2.3 Set up Testing Commands
Add to `package.json`:
```json
{
  "scripts": {
    "test:react19": "npm run build && npm run preview",
    "test:workflow": "npm run dev:react"
  }
}
```

### Phase 3: React 19 Beta Testing (2-3 days)

#### 3.1 Install React 19 Beta/RC
```bash
npm install react@beta react-dom@beta
npm install --save-dev @types/react@beta @types/react-dom@beta
```

#### 3.2 Build and Test
```bash
npm run build
npm run test:react19
```

#### 3.3 Component Testing Checklist

**Critical Path Testing**:
- [ ] Site overview page loads correctly
- [ ] Site details page functionality
- [ ] Update workflow execution
- [ ] Database migration workflow
- [ ] OAuth authentication flow
- [ ] API call modals and responses
- [ ] Expert functions

**Hook Testing**:
- [ ] useWorkflow hook state management
- [ ] usePolling hook cleanup
- [ ] Custom hooks stability

**Performance Testing**:
- [ ] Initial page load times
- [ ] State update performance
- [ ] Memory usage patterns
- [ ] Hook re-render frequency

### Phase 4: Compatibility Verification (1-2 days)

#### 4.1 Chakra UI Compatibility
Test all Chakra UI components for React 19 compatibility:
- [ ] Modal components
- [ ] Form components (Input, Select, Checkbox)
- [ ] Layout components (VStack, HStack, Grid)
- [ ] Feedback components (Toast, Alert)
- [ ] Navigation components (Tabs)

#### 4.2 Third-Party Library Testing
- [ ] React Router DOM compatibility
- [ ] Axios requests
- [ ] Framer Motion animations
- [ ] @emotion/react styling

#### 4.3 Browser Testing
Test in multiple browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Phase 5: Code Optimization (1-2 days)

#### 5.1 TypeScript Updates
Update type definitions for React 19:
- [ ] Component prop types
- [ ] Event handler types
- [ ] Ref types
- [ ] Hook return types

#### 5.2 Performance Optimizations
- [ ] Review and optimize useCallback dependencies
- [ ] Verify memo usage is still optimal
- [ ] Check for unnecessary re-renders

#### 5.3 Error Handling Updates
- [ ] Update error boundaries for React 19
- [ ] Test error handling in async operations
- [ ] Verify toast notifications work correctly

## Testing Strategy

### Automated Testing Setup
```bash
# Add to package.json devDependencies
"@testing-library/react": "^14.0.0",
"@testing-library/jest-dom": "^6.0.0",
"vitest": "^1.0.0"
```

### Key Test Cases

#### 1. Workflow Integration Tests
```typescript
// Test the complete update workflow
describe('Update Workflow with React 19', () => {
  test('should complete full workflow cycle', async () => {
    // Test implementation
  });
});
```

#### 2. Hook Stability Tests
```typescript
// Test useWorkflow hook stability
describe('useWorkflow Hook', () => {
  test('should maintain state consistency', () => {
    // Test implementation
  });
});
```

#### 3. Component Rendering Tests
```typescript
// Test component rendering with React 19
describe('Component Rendering', () => {
  test('should render without errors', () => {
    // Test implementation
  });
});
```

## Risk Assessment

### High Risk Areas
1. **useWorkflow Hook**: Complex state management and recursive patterns
2. **SiteDetails Component**: Direct DOM manipulation
3. **Modal Components**: Heavy Chakra UI dependency

### Medium Risk Areas
1. **OAuth Flow**: URL fragment parsing and token management
2. **API Integration**: Axios requests and response handling
3. **Routing**: React Router DOM compatibility

### Low Risk Areas
1. **Static Components**: Header, simple display components
2. **Type Definitions**: Most TypeScript types should remain compatible
3. **Styling**: Emotion and Chakra UI styling

## Rollback Plan

### If Critical Issues Found
1. **Immediate Rollback**:
   ```bash
   git checkout main
   npm install  # Restore original package-lock.json
   ```

2. **Document Issues**:
   - Create detailed issue reports
   - Note specific error messages
   - Identify root causes

3. **Staged Migration**:
   - Consider partial migration approach
   - Update dependencies individually
   - Test each change separately

## Success Criteria

### Must Have
- [ ] All existing functionality works without errors
- [ ] No performance degradation
- [ ] All API calls function correctly
- [ ] Workflow execution completes successfully
- [ ] OAuth authentication works

### Nice to Have
- [ ] Improved performance from React 19 optimizations
- [ ] Better development experience
- [ ] Enhanced debugging capabilities

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Pre-Migration Prep | 1-2 days | None |
| Test Environment | 1 day | Phase 1 complete |
| Beta Testing | 2-3 days | Phase 2 complete |
| Compatibility Check | 1-2 days | Phase 3 complete |
| Code Optimization | 1-2 days | Phase 4 complete |
| **Total** | **6-10 days** | |

## Next Steps

1. **Review this plan** with the development team
2. **Schedule migration window** when downtime is acceptable
3. **Begin Phase 1** with React.StrictMode implementation
4. **Set up testing environment** for safe experimentation
5. **Monitor React 19 release** schedule and compatibility reports

## Resources

- [React 19 Migration Guide](https://react.dev/blog/2024/04/25/react-19)
- [Chakra UI React 19 Compatibility](https://chakra-ui.com/)
- [TypeScript React 19 Types](https://github.com/DefinitelyTyped/DefinitelyTyped)

---

**Last Updated**: December 2024  
**Status**: Planning Phase  
**Owner**: Development Team