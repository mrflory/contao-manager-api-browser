import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import { Provider } from './components/ui/provider';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import Header from './components/Header';

// Import pages
import SitesOverview from './pages/SitesOverview';
import SiteDetails from './pages/SiteDetails';
import AddSite from './pages/AddSite';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

const App: React.FC = () => {
  return (
    <Provider>
      <AuthProvider>
        <Router>
          <Header />
          <Box pt={8}>
            <Routes>
              {/* Public routes - redirect to dashboard if authenticated */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />

              {/* Protected routes - require authentication */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <SitesOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/site/:siteUrl"
                element={
                  <ProtectedRoute>
                    <SiteDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add-site"
                element={
                  <ProtectedRoute>
                    <AddSite />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/oauth-callback"
                element={
                  <ProtectedRoute>
                    <AddSite />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all route - redirect to dashboard */}
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <SitesOverview />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Box>
        </Router>
        <Toaster />
      </AuthProvider>
    </Provider>
  );
};

export default App;
