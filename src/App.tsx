import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import { Provider } from './components/ui/provider';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import Header from './components/Header';
import { DatabaseDegradedMode } from './components/display/DatabaseDegradedMode';
import { useDatabaseHealth } from './hooks/useDatabaseHealth';

// Import pages
import SitesOverview from './pages/SitesOverview';
import SiteDetails from './pages/SiteDetails';
import AddSite from './pages/AddSite';
import SubscriptionPage from './pages/Subscription';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import TwoFactorVerify from './pages/TwoFactorVerify';
import ErrorPage from './pages/ErrorPage';

const App: React.FC = () => {
  const { isHealthy, checkHealth, isChecking } = useDatabaseHealth(30000);

  // Show degraded mode overlay when database is unhealthy
  if (!isHealthy) {
    return (
      <Provider>
        <DatabaseDegradedMode
          onRetry={checkHealth}
          isRetrying={isChecking}
        />
      </Provider>
    );
  }

  return (
    <Provider>
      <ErrorBoundary>
        <AuthProvider>
          <SubscriptionProvider>
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
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPasswordPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PublicRoute>
                    <ResetPasswordPage />
                  </PublicRoute>
                }
              />

              {/* 2FA verification - accessible during login flow */}
              <Route path="/2fa-verify" element={<TwoFactorVerify />} />

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
                path="/billing"
                element={
                  <ProtectedRoute>
                    <SubscriptionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscription"
                element={
                  <ProtectedRoute>
                    <SubscriptionPage />
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

              {/* Error pages */}
              <Route path="/error/429" element={<ErrorPage statusCode={429} />} />
              <Route path="/error/404" element={<ErrorPage statusCode={404} />} />
              <Route path="/error/403" element={<ErrorPage statusCode={403} />} />
              <Route path="/error/401" element={<ErrorPage statusCode={401} />} />
              <Route path="/error/:code" element={<ErrorPage statusCode={500} />} />

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
          </SubscriptionProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Provider>
  );
};

export default App;
