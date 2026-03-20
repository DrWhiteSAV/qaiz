import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthModal } from './components/AuthModal';
import { ProfilePage } from './pages/Profile';
import { BlitzGame } from './pages/BlitzGame';
import { MillionaireGame } from './pages/MillionaireGame';
import { OneHundredToOneGame } from './pages/OneHundredToOneGame';
import { WhatWhereWhenGame } from './pages/WhatWhereWhenGame';
import { MelodyGame } from './pages/MelodyGame';
import { SocialPage } from './pages/Social';
import { NewsPage } from './pages/News';
import { GalleryPage } from './pages/Gallery';
import { GamesPage } from './pages/Games';
import { IQBoxGame } from './pages/IQBoxGame';
import { AdminPage } from './pages/Admin';
import { useFrogSound } from './hooks/useSound';

// Home Page
const Home = () => {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { playCroak } = useFrogSound();

  return (
    <div className="space-y-12">
      <section className="text-center">
        <div className="relative inline-block">
          <img src="https://i.ibb.co/Fcp02H0/61755067-2e42-4ae2-97de-7da4228654ef.png" alt="Logo" className="mx-auto h-32 w-32 animate-bounce drop-shadow-[0_0_20px_rgba(131,196,46,0.5)]" />
        </div>
        <h1 className="mt-4 text-6xl font-black uppercase tracking-tighter text-primary sm:text-8xl title-glow">Квайз</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/80">
          Онлайн платформа для проведения онлайн-квизов на разные тематики в режиме одиночных игр и мультиплеера.
        </p>
        {!user && (
          <button 
            onClick={() => { playCroak(); setIsAuthModalOpen(true); }}
            className="btn-primary mt-8"
          >
            Начать играть
          </button>
        )}
      </section>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <GameCard title="Блиц-Квиз" description="10 вопросов по 60 секунд. Текстовый ввод." to="/game/blitz" />
        <GameCard title="Миллионер" description="15 вопросов с 4 вариантами. Классика." to="/game/millionaire" />
        <GameCard title="100 к 1" description="Популярные ответы. Игра до 3х ошибок." to="/game/100to1" />
        <GameCard title="Что? Где? Когда?" description="Логика и сообразительность. 6 побед." to="/game/whatwherewhen" />
        <GameCard title="Угадай мелодию" description="Музыкальный квиз на время." to="/game/melody" />
        <GameCard title="IQ Box" description="Мультиплеерное соревнование (4 бокса)." to="/game/iqbox" />
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

const GameCard = ({ title, description, to }: { title: string, description: string, to: string }) => {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { playCroak } = useFrogSound();

  return (
    <div className="group relative overflow-hidden border-glow bg-background/40 p-8 transition-all hover:bg-primary/10 backdrop-blur-sm">
      <div className="absolute -right-4 -top-4 h-24 w-24 rotate-12 opacity-10 transition-transform group-hover:rotate-0 group-hover:scale-150">
        <img src="https://i.ibb.co/Fcp02H0/61755067-2e42-4ae2-97de-7da4228654ef.png" alt="Frog" />
      </div>
      <h3 className="text-2xl font-black uppercase tracking-tighter text-primary title-glow">{title}</h3>
      <p className="mt-2 text-sm text-foreground/60">{description}</p>
      
      {user ? (
        <Link 
          to={to}
          onClick={() => playCroak()}
          className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-xs font-bold uppercase tracking-widest text-background transition-transform hover:scale-105 shadow-[0_0_15px_rgba(131,196,46,0.3)]"
        >
          Играть
        </Link>
      ) : (
        <button 
          onClick={() => { playCroak(); setIsAuthModalOpen(true); }}
          className="mt-6 rounded-full bg-primary px-6 py-2 text-xs font-bold uppercase tracking-widest text-background transition-transform hover:scale-105 shadow-[0_0_15px_rgba(131,196,46,0.3)]"
        >
          Войти
        </button>
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/game/blitz" element={<BlitzGame />} />
                <Route path="/game/millionaire" element={<MillionaireGame />} />
                <Route path="/game/100to1" element={<OneHundredToOneGame />} />
                <Route path="/game/whatwherewhen" element={<WhatWhereWhenGame />} />
                <Route path="/game/melody" element={<MelodyGame />} />
                <Route path="/game/iqbox" element={<IQBoxGame />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/games" element={<GamesPage />} />
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
