import React, { useState, useEffect, useRef } from 'react';
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
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { UserAvatar } from './UserAvatar';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Header({ toggleTheme, theme }: { toggleTheme: () => void, theme: string }) {
  const { profile, entryMode } = useAuth();
  const { cart } = useCart();
  const [displayBalance, setDisplayBalance] = useState(profile?.balance ?? 0);
  const [balanceFlash, setBalanceFlash] = useState(false);
  const prevBalance = useRef(profile?.balance ?? 0);

  // Poll for balance changes every 2 seconds
  useEffect(() => {
    if (!profile?.uid) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('balance')
        .eq('uid', profile.uid)
        .maybeSingle();
      if (data && data.balance !== null && data.balance !== displayBalance) {
        setDisplayBalance(data.balance);
        if (data.balance < prevBalance.current) {
          setBalanceFlash(true);
          setTimeout(() => setBalanceFlash(false), 1000);
        }
        prevBalance.current = data.balance;
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [profile?.uid, displayBalance]);

  // Sync when profile changes
  useEffect(() => {
    if (profile) {
      setDisplayBalance(profile.balance ?? 0);
      prevBalance.current = profile.balance ?? 0;
    }
  }, [profile?.balance]);

  const handleLogout = async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-12 md:h-16 items-center justify-between px-3 md:px-4">
        <Link to="/" className="flex items-center gap-1 md:gap-2 group">
          <img src="https://i.ibb.co/QFr4QMLy/qaiz.png" alt="Logo" className="hidden md:block h-6 w-6 md:h-10 md:w-10" />
          <span className="text-xl md:text-xl font-black tracking-tighter text-foreground animate-pulse drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)] group-hover:drop-shadow-[0_0_15px_hsl(var(--primary)/0.8)] transition-all">Квайз</span>
        </Link>

        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={toggleTheme}
            className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300 shadow-[0_0_10px_hsl(var(--primary)/0.2)]"
          >
            {theme === 'dark' ? <Sun size={18} className="md:w-5 md:h-5" /> : <Moon size={18} className="md:w-5 md:h-5" />}
          </button>
          
          <div className="hidden items-center gap-4 md:flex">
            <NavLinks theme={theme} />
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {profile && (
            <motion.div
              animate={balanceFlash ? { scale: [1, 1.3, 1], color: ['hsl(var(--primary))', 'hsl(0 80% 60%)', 'hsl(var(--primary))'] } : {}}
              transition={{ duration: 0.6 }}
            >
              <Link to="/billing" className="flex items-center gap-1 rounded-full bg-primary/20 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-sm font-black text-primary hover:bg-primary/30 transition-colors shadow-sm" id="header-balance">
                <span>{displayBalance}</span>
                <span className="text-[8px] md:text-xs">₽</span>
              </Link>
            </motion.div>
          )}
          <Link to="/cart" className="relative flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300">
            <ShoppingCart size={16} className="md:w-5 md:h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-lg">
                {cart.length}
              </span>
            )}
          </Link>
          <Link to="/profile" className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full overflow-hidden border-2 border-primary bg-primary hover:opacity-90 transition-opacity">
            <UserAvatar avatarUrl={profile?.avatar_url} displayName={profile?.display_name} size="xs" className="h-full w-full border-0 rounded-full" />
          </Link>
          {entryMode === 'browser' && profile && (
            <button 
              onClick={handleLogout}
              className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
              title="Выйти из аккаунта"
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
        ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" 
        : (theme === 'dark' ? "text-foreground/60 hover:text-primary" : "text-primary hover:text-white")
    );
  };

  return (
    <>
      <Link to="/" className={getLinkClass("/")}>Главная</Link>
      <Link to="/games" className={getLinkClass("/games")}>Игры</Link>
      <Link to="/social" className={getLinkClass("/social")}>Друзья</Link>
      <Link to="/news" className={getLinkClass("/news")}>Новости</Link>
      <Link to="/rating" className={getLinkClass("/rating")}>Рейтинг</Link>
      <Link to="/system-admin" className={getLinkClass("/system-admin")}>БД (SQLite)</Link>
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
