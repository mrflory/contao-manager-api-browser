# Repository Setup Plan for Open-Source/Closed-Source Architecture

## Overview
This document outlines the repository architecture for managing both open-source and closed-source components of the Contao Manager API Browser platform while maintaining easy access through Claude Code.

---

## **Recommended Approach: Monorepo with Submodules**

### **Repository Structure:**
```
contao-manager-platform/                    # Private umbrella repo
├── packages/
│   ├── open-source/                       # Git submodule → public repo
│   │   ├── src/                           # Core Contao Manager proxy
│   │   ├── components/                    # React components
│   │   ├── storage/                       # Storage abstraction
│   │   ├── server.js                     # Proxy server
│   │   └── package.json
│   └── subscription-service/             # Private code only
│       ├── src/                          # User management, billing
│       ├── admin/                        # Admin dashboard
│       └── package.json
├── docker-compose.yml                    # Full stack deployment
├── .env.example                          # Configuration template
└── README.md                            # Deployment instructions
```

### **How This Works with Claude Code:**

1. **Main Development** - Work in the umbrella repo:
   ```bash
   cd /home/fstallmann/contao-manager-platform
   code .  # Opens entire platform
   ```

2. **Open Source Development** - Navigate to submodule:
   ```bash
   cd packages/open-source
   # This is actually a separate Git repo
   git status  # Shows open-source repo status
   ```

3. **Claude Code Access**:
   - **Full Platform**: `/home/fstallmann/contao-manager-platform`
   - **Open Source Only**: `/home/fstallmann/contao-manager-platform/packages/open-source`
   - **Private Service**: `/home/fstallmann/contao-manager-platform/packages/subscription-service`

---

## **Git Repository Setup:**

### **1. Create the Repositories:**
```bash
# Create private umbrella repository
gh repo create contao-manager-platform --private

# Create public open-source repository  
gh repo create contao-manager-api --public

# Create private subscription service
gh repo create contao-manager-subscription --private
```

### **2. Set Up the Monorepo Structure:**
```bash
# Clone your current repo to the new structure
git clone https://github.com/yourusername/contao-manager-api.git temp-open-source
mkdir -p contao-manager-platform/packages
mv temp-open-source contao-manager-platform/packages/open-source

cd contao-manager-platform

# Add open-source as submodule
git submodule add https://github.com/yourusername/contao-manager-api.git packages/open-source

# Create subscription service directory
mkdir packages/subscription-service
cd packages/subscription-service
git init
# ... add subscription service code

# Add subscription service as submodule (if separate repo)
# OR keep it as regular directory in private repo
```

---

## **Alternative Approach: Separate Repositories**

### **Repository Structure:**
```
contao-manager-api/                       # Public repository
├── src/                                  # All current code
├── storage/                              # Storage abstraction
├── INSTALLATION.md                       # Open source setup
└── README.md

contao-manager-subscription/              # Private repository  
├── src/                                  # User management, billing
├── admin/                               # Admin dashboard
├── docker-compose.yml                   # Full SaaS deployment
└── README.md

contao-manager-deployment/                # Private deployment configs
├── environments/
│   ├── development/
│   ├── staging/
│   └── production/
├── docker/
└── kubernetes/
```

### **Claude Code Usage:**
```bash
# Work on open source
cd /home/fstallmann/contao-manager-api
claude-code

# Work on subscription service  
cd /home/fstallmann/contao-manager-subscription
claude-code

# Work on deployment
cd /home/fstallmann/contao-manager-deployment
claude-code
```

---

## **Recommended Setup for Development:**

### **1. Workspace Configuration:**
Create a VS Code workspace file that includes both repositories:
```json
// contao-manager.code-workspace
{
  "folders": [
    {
      "name": "Open Source Core",
      "path": "./packages/open-source"
    },
    {
      "name": "Subscription Service",
      "path": "./packages/subscription-service"
    },
    {
      "name": "Root",
      "path": "./"
    }
  ],
  "settings": {
    "typescript.preferences.includePackageJsonAutoImports": "on"
  }
}
```

### **2. Package Management:**
Use a monorepo tool like `npm workspaces` or `lerna`:
```json
// Root package.json
{
  "name": "contao-manager-platform",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev:open-source": "npm run dev --workspace=open-source",
    "dev:subscription": "npm run dev --workspace=subscription-service",
    "dev:full": "concurrently \"npm run dev:open-source\" \"npm run dev:subscription\""
  }
}
```

### **3. Environment Configuration:**
```bash
# .env.local (private)
STORAGE_TYPE=database
DATABASE_URL=postgresql://...
SUBSCRIPTION_SERVICE_URL=http://localhost:3001
STRIPE_SECRET_KEY=sk_...

# .env.example (public)
STORAGE_TYPE=json
# DATABASE_URL=postgresql://... (commented)
# SUBSCRIPTION_SERVICE_URL=... (commented)
```

---

## **Claude Code Benefits:**

### **1. Single Entry Point:**
```bash
cd /home/fstallmann/contao-manager-platform
claude-code .
# Claude sees entire platform structure
```

### **2. Cross-Repository References:**
Claude can reference files across both open-source and private components:
```typescript
// In subscription service, reference open-source types
import { Site, Config } from '../open-source/src/types'
```

### **3. Unified Development:**
- Test both components together
- Share TypeScript configurations
- Unified build and deployment scripts

---

## **Detailed Migration Strategy:**

### **Phase 1: Repository Creation**
1. **Create private umbrella repository** (`contao-manager-platform`)
2. **Keep current repository** as the open-source component
3. **Create private subscription service repository**
4. **Set up submodule structure**

### **Phase 2: Code Organization**
1. **Move current code** to open-source package structure
2. **Create storage abstraction** in open-source component
3. **Develop subscription service** in private component
4. **Set up shared interfaces** and type definitions

### **Phase 3: Development Environment**
1. **Configure npm workspaces** for monorepo management
2. **Set up VS Code workspace** configuration
3. **Create unified build scripts** and development commands
4. **Configure environment variable management**

### **Phase 4: CI/CD Setup**
1. **Separate CI/CD pipelines** for open-source and private components
2. **Set up automated testing** across both repositories
3. **Configure deployment scripts** for different environments
4. **Set up security scanning** for private components

---

## **Repository Naming Conventions:**

### **Public Repositories:**
- `contao-manager-api` - Core open-source component
- `contao-manager-storage` - Storage abstraction library (if separate)
- `contao-manager-types` - Shared TypeScript definitions (if separate)

### **Private Repositories:**
- `contao-manager-platform` - Umbrella repository with everything
- `contao-manager-subscription` - Subscription and billing service
- `contao-manager-deployment` - Deployment configurations and scripts
- `contao-manager-admin` - Admin dashboard and management tools

---

## **Access Control Strategy:**

### **Open Source Access:**
- **Public GitHub repository** with standard MIT license
- **Community contributions** accepted via pull requests
- **Issues and discussions** open to public
- **Documentation** includes self-hosting instructions

### **Private Component Access:**
- **Private repositories** for subscription service and deployment
- **Limited team access** to billing and user management code
- **Separate CI/CD** with enhanced security scanning
- **Encrypted secrets** and environment variables

---

## **Development Workflow:**

### **Daily Development:**
```bash
# Start development environment
cd /home/fstallmann/contao-manager-platform
npm run dev:full

# Work on open-source features
cd packages/open-source
git checkout -b feature/new-storage-backend

# Work on subscription features  
cd ../subscription-service
git checkout -b feature/stripe-integration

# Test integration
npm run test:integration
```

### **Release Process:**
```bash
# Release open-source component
cd packages/open-source
npm version patch
git push origin main --tags

# Update umbrella repository
cd ../..
git add packages/open-source
git commit -m "Update open-source to v1.2.3"

# Deploy full platform
npm run deploy:staging
npm run deploy:production
```

---

## **Benefits of This Architecture:**

### **Development Benefits:**
- ✅ **Full Claude Code access** to both components in single workspace
- ✅ **Unified development environment** with shared tooling
- ✅ **Easy testing** of integration between components
- ✅ **Consistent coding standards** across the platform

### **Business Benefits:**
- ✅ **Clear separation** of open-source and proprietary code
- ✅ **Community contributions** limited to appropriate components
- ✅ **Intellectual property protection** for business logic
- ✅ **Flexible deployment** options for different customer needs

### **Technical Benefits:**
- ✅ **Proper dependency management** with npm workspaces
- ✅ **Shared type definitions** between components
- ✅ **Independent versioning** of components
- ✅ **Scalable architecture** for future expansion

---

## **Potential Challenges and Solutions:**

### **Challenge 1: Submodule Complexity**
**Solution:** Use npm workspaces for package management and provide clear documentation for submodule operations.

### **Challenge 2: Cross-Repository Dependencies**
**Solution:** Use shared npm packages for common interfaces and utilities, published to private npm registry if needed.

### **Challenge 3: CI/CD Coordination**
**Solution:** Use GitHub Actions with matrix builds to test different combinations of open-source and private components.

### **Challenge 4: Secret Management**
**Solution:** Use separate environment files for open-source (example only) and private (actual secrets) configurations.

---

## **Next Steps:**

When ready to implement this repository structure:

1. **Create new repositories** as outlined above
2. **Set up submodule structure** in umbrella repository
3. **Migrate current code** to open-source package
4. **Configure development environment** with workspaces
5. **Test Claude Code access** to ensure all components are visible
6. **Set up CI/CD pipelines** for both public and private components

This architecture provides maximum flexibility while maintaining clean separation of concerns and easy development access through Claude Code.