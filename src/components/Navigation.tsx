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
import { db } from '../db';

import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { UserAvatar } from './UserAvatar';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { BubbleCurrencyIcon } from './BubbleIcon';

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
      const { data } = await db
        .from('users')
        .select('balance_rr')
        .eq('uid', profile.uid)
        .maybeSingle();
      if (data && data.balance_rr !== null && data.balance_rr !== displayBalance) {
        setDisplayBalance(data.balance_rr);
        if (data.balance_rr < prevBalance.current) {
          setBalanceFlash(true);
          setTimeout(() => setBalanceFlash(false), 1000);
        }
        prevBalance.current = data.balance_rr;
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

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    localStorage.removeItem('user_email_session');
    window.location.href = '/';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-transparent border-none shadow-none transition-all">
      <div className="container mx-auto px-3 md:px-4 relative z-10">
        {/* DESKTOP HEADER (PC Version: Left=Logo/Title, Center=NavLinks, Right=Balance,Cart,Profile) */}
        <div className="hidden md:flex items-center justify-between h-16 w-full">
          {/* LEFT: Logo + Title "Квайз" */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <img 
              src="/file/13/logo.png" 
              alt="Logo" 
              className="h-10 w-10 object-contain select-none pointer-events-none" 
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
            <span className="text-xl font-black tracking-tighter text-foreground animate-pulse drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)] group-hover:drop-shadow-[0_0_15px_hsl(var(--primary)/0.8)] transition-all">Квайз</span>
          </Link>

          {/* CENTER: Navigation Links */}
          <div className="flex items-center gap-6 justify-center flex-1 mx-4">
            <NavLinks theme={theme} />
          </div>

          {/* RIGHT: Balance (ИИкра), Cart, Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Balance Widget */}
            <motion.div
              animate={balanceFlash ? { scale: [1, 1.3, 1], color: ['hsl(var(--primary))', 'hsl(0 80% 60%)', 'hsl(var(--primary))'] } : {}}
              transition={{ duration: 0.6 }}
            >
              <Link to={profile ? "/billing" : "/profile"} className="flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-sm font-black text-primary hover:bg-primary/30 transition-colors shadow-sm" id="header-balance">
                <span>{profile ? displayBalance : 0}</span>
                <BubbleCurrencyIcon className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Cart Widget */}
            <Link to="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300" title="Корзина">
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-lg">
                  {cart.length}
                </span>
              )}
            </Link>

            {/* Profile Avatar Widget */}
            <Link to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden border-2 border-primary bg-primary hover:opacity-90 transition-opacity" title="Профиль">
              <UserAvatar avatarUrl={profile?.avatar_url} displayName={profile?.display_name} size="xs" className="h-full w-full border-0 rounded-full" />
            </Link>

            {/* Logout button (browser mode) */}
            {entryMode === 'browser' && profile && (
              <button 
                onClick={handleLogout}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
                title="Выйти из аккаунта"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>

        {/* MOBILE HEADER (Mobile Version: Left=Balance, Center=Title, Right=Cart,Profile) */}
        <div className="flex md:hidden items-center justify-between h-12 w-full">
          {/* LEFT: Balance (ИИкра) */}
          <div className="flex items-center justify-start min-w-[70px]">
            <motion.div
              animate={balanceFlash ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6 }}
            >
              <Link to={profile ? "/billing" : "/profile"} className="flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-black text-primary hover:bg-primary/30 transition-colors shadow-sm" id="header-balance-mobile">
                <span>{profile ? displayBalance : 0}</span>
                <BubbleCurrencyIcon className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </div>

          {/* CENTER: Title "Квайз" */}
          <div className="flex items-center justify-center">
            <Link to="/" className="flex items-center gap-1.5 group">
              <img 
                src="/file/13/logo.png" 
                alt="Logo" 
                className="h-6 w-6 object-contain select-none pointer-events-none" 
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
              <span className="text-xl font-black tracking-tighter text-foreground animate-pulse drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]">Квайз</span>
            </Link>
          </div>

          {/* RIGHT: Cart + Profile */}
          <div className="flex items-center justify-end gap-1.5 min-w-[70px]">
            <Link to="/cart" className="relative flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300">
              <ShoppingCart size={16} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground shadow-lg">
                  {cart.length}
                </span>
              )}
            </Link>

            <Link to="/profile" className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border-2 border-primary bg-primary hover:opacity-90 transition-opacity" title="Профиль">
              <UserAvatar avatarUrl={profile?.avatar_url} displayName={profile?.display_name} size="xs" className="h-full w-full border-0 rounded-full" />
            </Link>

            {entryMode === 'browser' && profile && (
              <button 
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
                title="Выйти"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Animated Glowing Bottom Rounded Border Line - Desktop Only */}
      <div className="hidden md:block absolute inset-0 rounded-b-3xl border-b-[1.5px] border-x-[1.5px] border-[#99d037]/80 pointer-events-none animate-pulse shadow-[0_4px_16px_rgba(153,208,55,0.4)]" />
    </header>
  );
}

export function Navbar({ theme }: { theme: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-transparent border-none backdrop-blur-none shadow-none md:hidden pointer-events-none pb-1">
      <div className="flex h-16 items-center justify-around px-1 pointer-events-auto">
        <MobileNavLink to="/" icon={<Home size={18} />} label="Главная" theme={theme} />
        <MobileNavLink to="/blog" icon={<Newspaper size={18} />} label="Блог" theme={theme} />
        <MobileNavLink to="/rating" icon={<Trophy size={18} />} label="Рейтинг" theme={theme} />
        <MobileNavLink to="/profile" icon={<User size={18} />} label="Профиль" theme={theme} />
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
      <Link to="/blog" className={getLinkClass("/blog")}>Блог</Link>
      <Link to="/rating" className={getLinkClass("/rating")}>Рейтинг</Link>
      <Link to="/system-admin" className={getLinkClass("/system-admin")}>Админ-панель</Link>
    </>
  );
}

function MobileNavLink({ to, icon, label, theme }: { to: string, icon: React.ReactNode, label: string, theme: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      className="relative flex flex-col items-center justify-center w-12 h-14 transition-all duration-300"
    >
      {/* Bubble Container - Icon strictly in the center */}
      <div 
        className={cn(
          "relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300",
          "bg-[radial-gradient(circle_at_35%_35%,rgba(153,208,55,0.75),rgba(20,40,10,0.85)_60%,rgba(5,15,2,0.95)_100%)]",
          "shadow-[inset_2px_2px_4px_rgba(255,255,255,0.35)]",
          isActive 
            ? "border-2 border-[#99d037] shadow-[0_0_20px_rgba(153,208,55,0.85),inset_2px_2px_5px_rgba(255,255,255,0.6)] scale-105 bg-[radial-gradient(circle_at_35%_35%,rgba(200,250,80,0.95),rgba(40,75,15,0.95)_60%,rgba(8,20,4,0.98)_100%)]" 
            : "border border-[#99d037]/60 shadow-[0_0_10px_rgba(153,208,55,0.3)] opacity-85 hover:opacity-100 hover:scale-105"
        )}
      >
        <div className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] flex items-center justify-center">
          {icon}
        </div>
      </div>

      {/* Label on top layer with bottom orientation in its transparent container, size 10 (text-[10px]) */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-max px-0.5 bg-transparent z-10 pointer-events-none flex justify-center items-center">
        <span className="text-[10px] font-black uppercase tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] leading-none">
          {label}
        </span>
      </div>
    </Link>
  );
}
