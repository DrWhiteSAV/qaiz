import React from 'react';
import { useLocation } from 'react-router-dom';
import { Header, Navbar } from './Navigation';
import { useTheme } from '../context/ThemeContext';
import { BackgroundAnimation } from './BackgroundAnimation';

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="relative min-h-screen pb-12 md:pb-0">
      <BackgroundAnimation />
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className={isHome ? "w-full max-w-full p-0 m-0 pt-12 md:pt-16" : "container mx-auto px-4 py-8 pt-16 md:pt-20"}>
        {children}
      </main>
      <Navbar theme={theme} />
    </div>
  );
}

