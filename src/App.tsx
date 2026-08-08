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
import { SocialPage } from './pages/Social';
import { NewsPage } from './pages/News';
import { RatingPage } from './pages/Rating';
import { IQBoxGame } from './pages/IQBoxGame';
import { JeopardyGame } from './pages/JeopardyGame';
import { AdminPage } from './pages/Admin';
import { ShopPage } from './pages/Shop';
import { CartPage } from './pages/CartPage';
import { BillingPage } from './pages/Billing';
import { GameCreationPage } from './pages/GameCreation';
import { GoogleCallbackPage } from './pages/GoogleCallback';
import { BrowserLoginPage } from './pages/BrowserLogin';
import { PostRegistrationPage } from './pages/PostRegistration';
import { SystemAdminPage } from './pages/SystemAdminPage';

function AppRoutes() {
  const { loading, profile, entryMode } = useAuth();
  const location = useLocation();

  // Save ?ref= to both sessionStorage AND localStorage so it survives Google OAuth redirect
  React.useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      sessionStorage.setItem('pending_ref', ref);
      localStorage.setItem('pending_ref', ref);
    }
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  // Browser mode without a Google session → show login page
  const isBrowserNoAuth = entryMode === 'browser' && !profile;
  // Only force post-registration if user hasn't skipped it
  const hasSkippedTelegram = sessionStorage.getItem('skip_telegram_link') === 'true';
  const shouldCompletePostRegistration =
    entryMode === 'browser' &&
    !!profile &&
    !profile.telegram_id &&
    !hasSkippedTelegram &&
    location.pathname !== '/post-registration' &&
    location.pathname !== '/auth/google/callback';

  return (
    <Layout>
      <Routes>
        {/* Always accessible — no auth required */}
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/post-registration" element={<PostRegistrationPage />} />

        {isBrowserNoAuth ? (
          <Route path="*" element={<BrowserLoginPage />} />
        ) : shouldCompletePostRegistration ? (
          <Route path="*" element={<Navigate to="/post-registration" replace />} />
        ) : (
          <>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/games" element={<ShopPage />} />
            <Route path="/game/blitz" element={<BlitzGame />} />
            <Route path="/game/millionaire" element={<MillionaireGame />} />
            <Route path="/game/100to1" element={<OneHundredToOneGame />} />
            <Route path="/game/whatwherewhen" element={<WhatWhereWhenGame />} />
            <Route path="/game/melody" element={<MelodyGame />} />
            <Route path="/game/jeopardy" element={<JeopardyGame />} />
            <Route path="/game/iqbox" element={<IQBoxGame />} />
            <Route path="/game/create" element={<GameCreationPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/system-admin" element={<SystemAdminPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/news" element={<NewsPage />} />
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
