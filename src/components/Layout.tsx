import React from 'react';
import { Header, Navbar } from './Navigation';
import { useTheme } from '../context/ThemeContext';
import { BackgroundAnimation } from './BackgroundAnimation';

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative min-h-screen pb-12 md:pb-0">
      <BackgroundAnimation />
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <Navbar />
    </div>
  );
}
