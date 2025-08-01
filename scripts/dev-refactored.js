#!/usr/bin/env node

/**
 * Development script to enable refactored components
 * Usage: npm run dev:refactored
 */

const fs = require('fs');
const path = require('path');

const ROUTER_FILE = path.join(__dirname, '../src/App.tsx');
const BACKUP_FILE = path.join(__dirname, '../src/App.tsx.backup');

// Backup original App.tsx if not already backed up
if (!fs.existsSync(BACKUP_FILE) && fs.existsSync(ROUTER_FILE)) {
  fs.copyFileSync(ROUTER_FILE, BACKUP_FILE);
  console.log('✅ Backed up original App.tsx');
}

// Create refactored App.tsx content
const refactoredAppContent = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import { Provider } from './components/ui/provider';
import { Toaster } from './components/ui/toaster';
import Header from './components/Header';

// Import refactored components
import SitesOverviewRefactored from './pages/SitesOverviewRefactored';
import SiteDetailsRefactored from './pages/SiteDetailsRefactored';
import AddSiteRefactored from './pages/AddSiteRefactored';

const App: React.FC = () => {
  return (
    <Provider>
      <Router>
        <Header />
        <Box pt={8}>
          <Routes>
            <Route path="/" element={<SitesOverviewRefactored />} />
            <Route path="/site/:siteUrl" element={<SiteDetailsRefactored />} />
            <Route path="/add-site" element={<AddSiteRefactored />} />
          </Routes>
        </Box>
      </Router>
      <Toaster />
    </Provider>
  );
};

export default App;
`;

// Write refactored App.tsx
fs.writeFileSync(ROUTER_FILE, refactoredAppContent);
console.log('🚀 Enabled refactored components!');
console.log('');
console.log('📋 Changes made:');
console.log('  • SitesOverview → SitesOverviewRefactored');
console.log('  • SiteDetails → SiteDetailsRefactored');
console.log('  • AddSite → AddSiteRefactored');
console.log('');
console.log('🔄 To restore original components, run: npm run dev:original');
console.log('📝 Original App.tsx backed up to App.tsx.backup');