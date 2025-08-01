import React from 'react';
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
