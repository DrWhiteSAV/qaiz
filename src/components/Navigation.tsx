import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Gamepad2, 
  Users, 
  User, 
  Newspaper, 
  Image as ImageIcon,
  Settings
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useAuth } from '../context/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Header({ toggleTheme, theme }: { toggleTheme: () => void, theme: string }) {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="https://i.ibb.co/Fcp02H0/61755067-2e42-4ae2-97de-7da4228654ef.png" alt="Logo" className="h-10 w-10" />
          <span className="hidden text-xl font-bold tracking-tighter text-primary sm:block">Квайз</span>
        </Link>

        <div className="flex items-center gap-6">
          <button 
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 hover:bg-primary/10"
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
          
          <div className="hidden items-center gap-4 md:flex">
            <NavLinks />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile && (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <span>{profile.balance}</span>
              <span className="text-xs">₽</span>
            </div>
          )}
          <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-background">
            <User size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-primary/20 bg-background/80 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        <MobileNavLink to="/" icon={<Home size={24} />} label="Главная" />
        <MobileNavLink to="/games" icon={<Gamepad2 size={24} />} label="Игры" />
        <MobileNavLink to="/social" icon={<Users size={24} />} label="Друзья" />
        <MobileNavLink to="/news" icon={<Newspaper size={24} />} label="Новости" />
        <MobileNavLink to="/profile" icon={<User size={24} />} label="Профиль" />
      </div>
    </nav>
  );
}

function NavLinks() {
  return (
    <>
      <Link to="/" className="text-sm font-medium hover:text-primary">Главная</Link>
      <Link to="/games" className="text-sm font-medium hover:text-primary">Игры</Link>
      <Link to="/social" className="text-sm font-medium hover:text-primary">Друзья</Link>
      <Link to="/news" className="text-sm font-medium hover:text-primary">Новости</Link>
      <Link to="/gallery" className="text-sm font-medium hover:text-primary">Галерея</Link>
    </>
  );
}

function MobileNavLink({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-colors",
        isActive ? "text-primary" : "text-foreground/60"
      )}
    >
      {icon}
      <span className="text-[10px] uppercase tracking-widest">{label}</span>
    </Link>
  );
}
