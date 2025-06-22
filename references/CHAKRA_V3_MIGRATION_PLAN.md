# Chakra UI v3 Migration Plan

## Overview
This document outlines the comprehensive plan for migrating from Chakra UI v2.8.2 to Chakra UI v3 for the Contao Manager API Browser application.

## Migration Complexity Assessment

### Complexity Score: 9/10 (High Complexity)
This is a **major migration** with significant breaking changes. The codebase has extensive Chakra UI usage (50+ components, custom theming, color mode management) that will require careful migration.

### Key Challenges
1. **50+ Chakra components** used across 8 files
2. **Custom theme configuration** with brand colors and global styles
3. **Complex color mode implementation** (useColorModeValue, ColorModeScript)
4. **3 different modal instances** with various configurations
5. **8+ icon components** from @chakra-ui/icons (deprecated package)
6. **Form components** with validation and editing patterns
7. **Table components** with styling
8. **Accordion and disclosure patterns**

## Breaking Changes Impact Analysis

### 🔴 High Impact Changes (Requires Code Rewrite)

#### 1. Package Structure Changes
**Current Dependencies to Remove:**
```json
{
  "@chakra-ui/react": "^2.8.2",
  "@chakra-ui/icons": "^2.1.1",
  "@emotion/styled": "^11.11.0",
  "framer-motion": "^12.17.3"
}
```

**New Dependencies to Install:**
```json
{
  "@chakra-ui/react": "^3.x",
  "@emotion/react": "^11.x",
  "next-themes": "^0.4.x" // For color mode
}
```

#### 2. Provider Setup Changes
**Current (v2):**
```tsx
<ChakraProvider theme={theme}>
  <ColorModeScript initialColorMode={theme.config.initialColorMode} />
```

**New (v3):**
```tsx
import { Provider } from "@chakra-ui/react"
import { defaultSystem } from "@chakra-ui/react"

<Provider value={customSystem}>
```

#### 3. Theme Configuration Overhaul
**Current (`theme.ts`):**
```tsx
import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

export default extendTheme({
  config,
  colors: {
    brand: {
      50: '#f0f9ff',
      // ... color palette
    }
  }
});
```

**New (v3):**
```tsx
import { createSystem, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f0f9ff' },
          // ... requires { value: } wrapper
        }
      }
    }
  }
})

export const system = createSystem(config)
```

#### 4. Color Mode Implementation
**Current:**
```tsx
import { useColorMode, useColorModeValue, ColorModeScript } from '@chakra-ui/react';

const { colorMode, toggleColorMode } = useColorMode();
const bg = useColorModeValue('white', 'gray.800');
```

**New (v3):**
```tsx
// Requires next-themes integration
import { useTheme } from 'next-themes'
// Color mode values handled differently
```

#### 5. Icon Package Migration
**Current:**
```tsx
import { SunIcon, MoonIcon, AddIcon, etc. } from '@chakra-ui/icons';
```

**New (v3):**
```tsx
// @chakra-ui/icons is removed - need external icon library
import { Sun, Moon, Plus } from 'lucide-react'; // Example
// Or use Chakra UI snippets for icons
```

### 🟡 Medium Impact Changes (Props/API Updates)

#### 1. Component Naming Changes
- **Modal** → **Dialog** (affects 3 modal instances)
- **Collapse** → **Collapsible** (WorkflowTimeline.tsx)
- Some prop names simplified (isOpen → open)

#### 2. Component API Updates
- **colorScheme** → **colorPalette** (affects 50+ Button/Badge instances)
- Boolean prop simplification (isLoading → loading)
- **useDisclosure** → may need replacement

#### 3. Import Pattern Changes
**Current:**
```tsx
import {
  Box,
  Button,
  Text,
  // ... 20+ components
} from '@chakra-ui/react';
```

**New (v3) - Dot Notation:**
```tsx
import { Button, Box } from "@chakra-ui/react"
// Or namespaced imports for some components
```

### 🟢 Low Impact Changes (Minimal Updates)
- Layout components (Box, Flex, VStack, HStack) - likely minimal changes
- Basic text components (Text, Heading) - should remain stable
- Container and Grid components - minimal API changes expected

## Migration Phases

### Phase 1: Environment Setup & Dependencies (2-3 days)

#### 1.1 Create Migration Branch
```bash
git checkout -b feature/chakra-v3-migration
```

#### 1.2 Update Node.js Requirements
- **Minimum Node version**: 20.x (verify current version compatibility)

#### 1.3 Install Chakra UI CLI
```bash
npm install -g @chakra-ui/cli
```

#### 1.4 Dependency Migration
```bash
# Remove old dependencies
npm uninstall @chakra-ui/icons @emotion/styled framer-motion

# Install new dependencies
npm install @chakra-ui/react@latest @emotion/react@latest next-themes@latest

# Install external icon library (recommend lucide-react or react-icons)
npm install lucide-react
```

#### 1.5 Create Migration Testing Scripts
```json
// package.json
{
  "scripts": {
    "test:chakra-v3": "npm run build && npm run dev:react",
    "migrate:icons": "node scripts/migrate-icons.js",
    "migrate:theme": "node scripts/migrate-theme.js"
  }
}
```

### Phase 2: Core System Migration (3-4 days)

#### 2.1 Theme System Migration
**Priority: Critical**

**Files to update:**
- `src/theme.ts` - Complete rewrite using createSystem
- `src/App.tsx` - Update provider setup

**Migration steps:**
1. Convert theme configuration to v3 system format
2. Update color token structure (add `{ value: }` wrappers)
3. Migrate custom colors and global styles
4. Test theme compilation

#### 2.2 Provider Setup Migration
**Update `src/App.tsx`:**
```tsx
// Before
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import theme from './theme';

<ChakraProvider theme={theme}>
  <ColorModeScript initialColorMode={theme.config.initialColorMode} />
  {/* app content */}
</ChakraProvider>

// After
import { Provider } from "@chakra-ui/react"
import { ThemeProvider } from 'next-themes'
import { system } from './theme'

<ThemeProvider attribute="class" disableTransitionOnChange>
  <Provider value={system}>
    {/* app content */}
  </Provider>
</ThemeProvider>
```

#### 2.3 Color Mode Migration
**Files to update:**
- `src/components/Header.tsx` - Color mode toggle
- All files using `useColorModeValue` (8 files)

**Migration approach:**
1. Replace `useColorMode` with `useTheme` from next-themes
2. Update `useColorModeValue` calls or create custom hook
3. Test color mode switching functionality

### Phase 3: Component Migration (4-5 days)

#### 3.1 High-Priority Components (Day 1-2)

**Button Migration** (50+ instances)
- Update `colorScheme` → `colorPalette`
- Test `isLoading` → `loading` prop changes
- Verify variant props (ghost, outline, solid)

**Modal Migration** (3 instances in SiteDetails.tsx)
- **Modal** → **Dialog** component
- Update import paths and prop names
- Test modal functionality

**Icon Migration** (8 different icons)
- Replace all `@chakra-ui/icons` imports
- Install and configure lucide-react or react-icons
- Update icon components in:
  - Header.tsx (SunIcon, MoonIcon)
  - SiteDetails.tsx (various action icons)
  - UpdateWorkflow.tsx (TriangleUpIcon, TriangleDownIcon, etc.)

#### 3.2 Medium-Priority Components (Day 3-4)

**Form Components**
- FormControl, FormLabel, Input, Select, Checkbox
- Test validation patterns
- Update Editable components in SiteDetails.tsx

**Table Components**
- Table, Thead, Tbody, Tr, Th, Td
- Verify styling and responsive behavior

**Feedback Components**
- Alert, Badge, Spinner, Progress
- Update color scheme props
- Test toast functionality

#### 3.3 Low-Priority Components (Day 5)

**Layout Components**
- Box, Flex, VStack, HStack, Grid, Container
- Minimal changes expected
- Verify responsive behavior

**Disclosure Components**
- Accordion (SiteDetails.tsx)
- Collapse → Collapsible (WorkflowTimeline.tsx)

### Phase 4: Advanced Features & Testing (2-3 days)

#### 4.1 Custom Styling Migration
- Update `_hover`, `_active` prop patterns
- Verify custom positioning and z-index
- Test responsive design patterns

#### 4.2 Hook Migration
- Replace `useDisclosure` if necessary
- Update `useToast` implementation
- Test custom form hooks (useEditableControls)

#### 4.3 Build & Runtime Testing
- Test development server startup
- Verify production build
- Test all user flows:
  - Site overview and navigation
  - Site details tabs functionality
  - Update workflow execution
  - Expert functions and modals
  - Color mode switching
  - Form interactions

### Phase 5: Performance & Polish (1-2 days)

#### 5.1 Bundle Analysis
- Compare bundle sizes (v2 vs v3)
- Verify tree-shaking effectiveness
- Check for performance regressions

#### 5.2 Accessibility Testing
- Verify keyboard navigation
- Test screen reader compatibility
- Validate focus management

#### 5.3 Cross-browser Testing
- Chrome, Firefox, Safari, Edge
- Mobile responsive testing
- Dark/light mode in all browsers

## Risk Assessment

### High Risk Areas
1. **Theme configuration** - Complete API rewrite
2. **Color mode functionality** - Major implementation changes
3. **Modal components** - Naming and API changes
4. **Icon replacements** - External dependency required
5. **Form validation** - Potential API changes

### Medium Risk Areas
1. **Button interactions** - Prop name changes
2. **Table styling** - CSS changes possible
3. **Custom styling patterns** - May need updates
4. **Toast notifications** - Hook API changes

### Low Risk Areas
1. **Layout components** - Stable APIs expected
2. **Basic text components** - Minimal changes
3. **Container components** - Likely backwards compatible

## Testing Strategy

### Unit Testing
```bash
# Component rendering tests
npm test -- components/

# Hook functionality tests
npm test -- hooks/

# Theme integration tests
npm test -- theme.test.ts
```

### Integration Testing
```bash
# Full user flow testing
npm run test:e2e

# Color mode switching
npm run test:colormode

# Form submission testing
npm run test:forms
```

### Visual Regression Testing
- Screenshot comparison before/after migration
- Color mode switching verification
- Responsive layout testing

## Rollback Plan

### If Critical Issues Found
1. **Immediate Rollback:**
   ```bash
   git checkout main
   npm install  # Restore v2 dependencies
   ```

2. **Document Issues:**
   - Create detailed issue reports
   - Note specific component failures
   - Identify root causes

3. **Partial Migration:**
   - Consider gradual component migration
   - Use both v2 and v3 components temporarily
   - Focus on most critical components first

## Success Criteria

### Must Have
- [ ] All existing functionality works without errors
- [ ] Color mode switching functions correctly
- [ ] All forms and modals work as expected
- [ ] No performance degradation
- [ ] Build process succeeds
- [ ] All API calls function correctly

### Nice to Have
- [ ] Improved bundle size from v3 optimizations
- [ ] Better development experience
- [ ] Enhanced accessibility
- [ ] Modern component patterns

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Environment Setup | 2-3 days | None |
| Core System Migration | 3-4 days | Phase 1 complete |
| Component Migration | 4-5 days | Phase 2 complete |
| Advanced Features & Testing | 2-3 days | Phase 3 complete |
| Performance & Polish | 1-2 days | Phase 4 complete |
| **Total** | **12-17 days** | |

## File Inventory for Migration

### Critical Files (Must Update)
- `src/theme.ts` - Complete rewrite
- `src/App.tsx` - Provider setup
- `src/components/Header.tsx` - Color mode toggle
- `package.json` - Dependencies

### High Priority Files (Major Updates)
- `src/pages/SiteDetails.tsx` - 3 modals, forms, tables, icons
- `src/components/UpdateWorkflow.tsx` - Multiple components, icons
- `src/pages/SitesOverview.tsx` - Color mode values, buttons

### Medium Priority Files (Moderate Updates)
- `src/pages/AddSite.tsx` - Form components
- `src/components/WorkflowTimeline.tsx` - Collapse component
- `src/components/Modal.tsx` - Custom modal (may need updates)

### Low Priority Files (Minimal Updates)
- `src/main.tsx` - Likely no changes needed
- `src/utils/api.ts` - No Chakra UI usage

## Migration Tools & Scripts

### Custom Migration Scripts
1. **Icon Migration Script** - Automated icon import replacement
2. **Theme Migration Script** - Convert v2 theme to v3 format
3. **Component Props Scanner** - Find colorScheme, isOpen props
4. **Import Path Updater** - Update import statements

### Chakra UI CLI Usage
```bash
# Get component snippets for complex components
npx @chakra-ui/cli snippet add button
npx @chakra-ui/cli snippet add modal
npx @chakra-ui/cli snippet add form
```

## Post-Migration Benefits

### Expected Improvements
1. **Better Performance** - Improved tree-shaking and smaller bundle
2. **Modern APIs** - More intuitive component patterns
3. **Enhanced TypeScript** - Better type inference
4. **Improved Accessibility** - Built-in a11y improvements
5. **Future-Proof** - Latest Chakra UI patterns and features

---

**Migration Status**: 📋 **Planning Phase**  
**Estimated Effort**: 12-17 days  
**Risk Level**: High (Major Breaking Changes)  
**Recommendation**: Proceed with caution, thorough testing required