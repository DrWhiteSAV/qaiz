import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashScreen } from './components/SplashScreen';
import { HomePage } from './pages/Home';
import { ProfilePage } from './pages/Profile';
import { BlitzGame } from './pages/BlitzGame';
import { MillionaireGame } from './pages/MillionaireGame';
import { OneHundredToOneGame } from './pages/OneHundredToOneGame';
import { WhatWhereWhenGame } from './pages/WhatWhereWhenGame';
import { MelodyGame } from './pages/MelodyGame';
import { RatingPage } from './pages/Rating';
import { JeopardyGame } from './pages/JeopardyGame';
import { BlogPage } from './pages/Blog';
import { CartPage } from './pages/CartPage';
import { BillingPage } from './pages/Billing';
import { GameCreationPage } from './pages/GameCreation';
import { BrowserLoginPage } from './pages/BrowserLogin';
import { PostRegistrationPage } from './pages/PostRegistration';
import { SystemAdminPage } from './pages/SystemAdminPage';

function AppRoutes() {
  const { loading, profile, entryMode } = useAuth();
  const location = useLocation();
  const [isCacheReady, setIsCacheReady] = React.useState(false);

  React.useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      sessionStorage.setItem('pending_ref', ref);
      localStorage.setItem('pending_ref', ref);
    }
  }, []);

  if (loading || !isCacheReady) {
    return <SplashScreen onComplete={() => setIsCacheReady(true)} />;
  }

  // Browser mode without a session → show login page
  const isBrowserNoAuth = entryMode === 'browser' && !profile;
  const hasSkippedTelegram = sessionStorage.getItem('skip_telegram_link') === 'true';
  const shouldCompletePostRegistration =
    entryMode === 'browser' &&
    !!profile &&
    !profile.telegram_id &&
    !hasSkippedTelegram &&
    location.pathname !== '/post-registration';

  return (
    <Layout>
      <Routes>
        <Route path="/post-registration" element={<PostRegistrationPage />} />

        {isBrowserNoAuth ? (
          <Route path="*" element={<BrowserLoginPage />} />
        ) : shouldCompletePostRegistration ? (
          <Route path="*" element={<Navigate to="/post-registration" replace />} />
        ) : (
          <>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/games" element={<Navigate to="/" replace />} />
            <Route path="/game/blitz" element={<BlitzGame />} />
            <Route path="/game/millionaire" element={<MillionaireGame />} />
            <Route path="/game/100to1" element={<OneHundredToOneGame />} />
            <Route path="/game/whatwherewhen" element={<WhatWhereWhenGame />} />
            <Route path="/game/melody" element={<MelodyGame />} />
            <Route path="/game/jeopardy" element={<JeopardyGame />} />
            <Route path="/game/create" element={<GameCreationPage />} />
            <Route path="/admin" element={<Navigate to="/system-admin" replace />} />
            <Route path="/system-admin" element={<SystemAdminPage />} />
            <Route path="/system-admin/triggers" element={<SystemAdminPage />} />
            <Route path="/system-admin/cron" element={<SystemAdminPage />} />
            <Route path="/system-admin/files" element={<SystemAdminPage />} />
            <Route path="/system-admin/prompts" element={<SystemAdminPage />} />
            <Route path="/system-admin/blog" element={<SystemAdminPage />} />
            <Route path="/system-admin/posts" element={<SystemAdminPage />} />
            <Route path="/system-admin/logs" element={<SystemAdminPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/social" element={<Navigate to="/" replace />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/news" element={<Navigate to="/blog" replace />} />
            <Route path="/rating" element={<RatingPage />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
