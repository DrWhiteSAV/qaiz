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
  Moon,
  LogOut,
  ShoppingCart,
  Trophy
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Header({ toggleTheme, theme }: { toggleTheme: () => void, theme: string }) {
  const { profile, user, logout } = useAuth();
  const { cart } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-12 md:h-16 items-center justify-between px-3 md:px-4">
        <Link to="/" className="flex items-center gap-1 md:gap-2 group">
          <img src="https://i.ibb.co/QFr4QMLy/qaiz.png" alt="Logo" className="hidden md:block h-6 w-6 md:h-10 md:w-10" />
          <span className="text-xl md:text-xl font-black tracking-tighter text-white animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all">Квайз</span>
        </Link>

        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={toggleTheme}
            className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300 shadow-[0_0_10px_rgba(131,196,46,0.2)]"
          >
            {theme === 'dark' ? <Sun size={18} className="md:w-5 md:h-5" /> : <Moon size={18} className="md:w-5 md:h-5" />}
          </button>
          
          <div className="hidden items-center gap-4 md:flex">
            <NavLinks theme={theme} />
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {profile && (
            <Link to="/billing" className="flex items-center gap-1 rounded-full bg-white/20 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-sm font-black text-white hover:bg-white/30 transition-colors shadow-sm">
              <span>{profile.balance}</span>
              <span className="text-[8px] md:text-xs">₽</span>
            </Link>
          )}
          <Link to="/cart" className="relative flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300">
            <ShoppingCart size={16} className="md:w-5 md:h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg">
                {cart.length}
              </span>
            )}
          </Link>
          <Link to="/profile" className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary text-background">
            <User size={16} className="md:w-5 md:h-5" />
          </Link>
          {user && (
            <button 
              onClick={() => logout()}
              className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-red-500/20 text-red-500 hover:bg-red-500/10"
              title="Выйти"
            >
              <LogOut size={16} className="md:w-5 md:h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Navbar({ theme }: { theme: string }) {
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-primary/20 bg-background/80 backdrop-blur-md md:hidden">
      <div className="flex h-12 items-center justify-around px-1">
        <MobileNavLink to="/" icon={<Home size={18} />} label="Главная" theme={theme} />
        <MobileNavLink to="/games" icon={<Gamepad2 size={18} />} label="Игры" theme={theme} />
        <MobileNavLink to="/rating" icon={<Trophy size={18} />} label="Рейтинг" theme={theme} />
        <MobileNavLink to="/social" icon={<Users size={18} />} label="Друзья" theme={theme} />
        <MobileNavLink to="/news" icon={<Newspaper size={18} />} label="Новости" theme={theme} />
      </div>
    </nav>
  );
}

function NavLinks({ theme }: { theme: string }) {
  const location = useLocation();
  
  const getLinkClass = (to: string) => {
    const isActive = location.pathname === to;
    return cn(
      "text-sm font-medium transition-colors",
      isActive 
        ? (theme === 'dark' ? "text-primary" : "text-white") 
        : "hover:text-primary"
    );
  };

  return (
    <>
      <Link to="/" className={getLinkClass("/")}>Главная</Link>
      <Link to="/games" className={getLinkClass("/games")}>Игры</Link>
      <Link to="/social" className={getLinkClass("/social")}>Друзья</Link>
      <Link to="/news" className={getLinkClass("/news")}>Новости</Link>
      <Link to="/rating" className={getLinkClass("/rating")}>Рейтинг</Link>
    </>
  );
}

function MobileNavLink({ to, icon, label, theme }: { to: string, icon: React.ReactNode, label: string, theme: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 transition-colors",
        isActive 
          ? (theme === 'dark' ? "text-primary" : "text-white") 
          : (theme === 'dark' ? "text-foreground/60" : "text-primary/60")
      )}
    >
      {icon}
      <span className="text-[7px] uppercase tracking-widest leading-none">{label}</span>
    </Link>
  );
}
