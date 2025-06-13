import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, Box } from '@chakra-ui/react';
import { ThemeProvider } from 'next-themes';
import { system } from './theme';
import Header from './components/Header';
import SitesOverview from './pages/SitesOverview';
import SiteDetails from './pages/SiteDetails';
import AddSite from './pages/AddSite';

const App: React.FC = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <Provider value={system}>
        <Router>
          <Header />
          <Box pt={8}>
            <Routes>
              <Route path="/" element={<SitesOverview />} />
              <Route path="/site/:siteUrl" element={<SiteDetails />} />
              <Route path="/add-site" element={<AddSite />} />
            </Routes>
          </Box>
        </Router>
      </Provider>
    </ThemeProvider>
  );
};

export default App;