import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Gamepad2, 
  Users, 
  User, 
  Newspaper, 
  Image as ImageIcon,
  Settings,
  Sun,
  Moon
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
      <div className="container mx-auto flex h-12 md:h-16 items-center justify-between px-3 md:px-4">
        <Link to="/" className="flex items-center gap-1 md:gap-2">
          <img src="https://i.ibb.co/QFr4QMLy/qaiz.png" alt="Logo" className="h-6 w-6 md:h-10 md:w-10" />
          <span className="hidden text-sm md:text-xl font-bold tracking-tighter text-primary sm:block">Квайз</span>
        </Link>

        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={toggleTheme}
            className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300 shadow-[0_0_10px_rgba(131,196,46,0.2)]"
          >
            {theme === 'dark' ? <Sun size={18} className="md:w-5 md:h-5" /> : <Moon size={18} className="md:w-5 md:h-5" />}
          </button>
          
          <div className="hidden items-center gap-4 md:flex">
            <NavLinks />
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {profile && (
            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-sm font-medium text-primary">
              <span>{profile.balance}</span>
              <span className="text-[8px] md:text-xs">₽</span>
            </div>
          )}
          <Link to="/profile" className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary text-background">
            <User size={16} className="md:w-5 md:h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-primary/20 bg-background/80 backdrop-blur-md md:hidden">
      <div className="flex h-12 items-center justify-around px-1">
        <MobileNavLink to="/" icon={<Home size={18} />} label="Главная" />
        <MobileNavLink to="/games" icon={<Gamepad2 size={18} />} label="Игры" />
        <MobileNavLink to="/social" icon={<Users size={18} />} label="Друзья" />
        <MobileNavLink to="/news" icon={<Newspaper size={18} />} label="Новости" />
        <MobileNavLink to="/profile" icon={<User size={18} />} label="Профиль" />
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
        "flex flex-col items-center justify-center gap-0.5 transition-colors",
        isActive ? "text-primary" : "text-foreground/60"
      )}
    >
      {icon}
      <span className="text-[7px] uppercase tracking-widest leading-none">{label}</span>
    </Link>
  );
}
