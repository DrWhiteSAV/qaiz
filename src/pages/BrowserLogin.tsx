import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

export function BrowserLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [linkTma, setLinkTma] = useState<string | null>(null);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('link_tma');
    if (param) {
      sessionStorage.setItem('pending_link_tma', param);
      setLinkTma(param);
    }
  }, []);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 p-8 text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 max-w-sm w-full"
      >
        {/* Animated Logo */}
        <motion.div
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, -5, 5, -5, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="relative"
        >
          <div className="absolute inset-0 bg-primary/20 blur-[20px] rounded-full scale-75 opacity-50" />
          <img 
            src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" 
            alt="Квайз" 
            className="relative h-[40vh] max-h-[280px] w-auto drop-shadow-[0_0_15px_rgba(131,196,46,0.4)]" 
          />
        </motion.div>

        <motion.h1
          className="text-4xl font-black uppercase tracking-tighter text-primary drop-shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Квайз
        </motion.h1>

        <p className="text-sm text-foreground/60">
          {linkTma
            ? 'Войдите через Google, чтобы привязать аккаунты'
            : 'Войдите, чтобы начать играть'}
        </p>

        <div className="w-full rounded-[2rem] border border-primary/10 bg-card/40 backdrop-blur-md p-8 space-y-4 shadow-xl">
          {linkTma && (
            <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 mb-2">
              <p className="text-sm font-black text-primary">+100 ₽ бонус</p>
              <p className="text-xs text-foreground/60 mt-1">
                После входа через Google аккаунты объединятся и вы получите бонус
              </p>
            </div>
          )}

          <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
            Вход через браузер
          </p>
          
          <GoogleAuthButton
            mode="signin"
            className="w-full"
            onError={setError}
          />

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-xl p-3">
              {error}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}