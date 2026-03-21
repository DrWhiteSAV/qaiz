import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/Home';
import { ProfilePage } from './pages/Profile';
import { BlitzGame } from './pages/BlitzGame';
import { MillionaireGame } from './pages/MillionaireGame';
import { OneHundredToOneGame } from './pages/OneHundredToOneGame';
import { WhatWhereWhenGame } from './pages/WhatWhereWhenGame';
import { MelodyGame } from './pages/MelodyGame';
import { SocialPage } from './pages/Social';
import { NewsPage } from './pages/News';
import { GalleryPage } from './pages/Gallery';
import { IQBoxGame } from './pages/IQBoxGame';
import { JeopardyGame } from './pages/JeopardyGame';
import { AdminPage } from './pages/Admin';
import { ShopPage } from './pages/Shop';
import { useFrogSound } from './hooks/useSound';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Layout>
              <Routes>
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
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/social" element={<SocialPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
              </Routes>
            </Layout>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
