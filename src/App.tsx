import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider, ColorModeScript, Box } from '@chakra-ui/react';
import theme from './theme';
import Header from './components/Header';
import SitesOverview from './pages/SitesOverview';
import SiteDetails from './pages/SiteDetails';
import AddSite from './pages/AddSite';

const App: React.FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
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
    </ChakraProvider>
  );
};

export default App;