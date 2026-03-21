import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LogIn, X, Send } from 'lucide-react';
import { useFrogSound } from '../hooks/useSound';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user, loginWithTelegram } = useAuth();
  const [loading, setLoading] = useState(false);
  const { playCroak } = useFrogSound();

  if (!isOpen || user) return null;

  const handleGoogleLogin = async () => {
    if (!auth) {
      console.error('Firebase Auth is not initialized');
      alert('Ошибка инициализации Firebase. Проверьте подключение к интернету.');
      return;
    }
    playCroak();
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (error) {
      console.error('Login error:', error);
      alert('Ошибка входа: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    playCroak();
    await loginWithTelegram();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md border-glow bg-background p-4 md:p-8 shadow-2xl">
        <button onClick={() => { playCroak(); onClose(); }} className="absolute right-2 top-2 md:right-4 md:top-4 text-foreground/60 hover:text-primary">
          <X size={20} className="md:w-6 md:h-6" />
        </button>
        
        <div className="text-center">
          <img src="https://i.ibb.co/Fcp02H0/61755067-2e42-4ae2-97de-7da4228654ef.png" alt="Logo" className="mx-auto h-12 w-12 md:h-20 md:w-20 drop-shadow-[0_0_10px_rgba(131,196,46,0.3)]" />
          <h2 className="mt-2 md:mt-4 text-xl md:text-3xl font-black uppercase tracking-tighter text-primary title-glow">Вход в Квайз</h2>
          <p className="mt-1 md:mt-2 text-[10px] md:text-base text-foreground/60">Войдите, чтобы начать игру и получать бонусы</p>
        </div>

        <div className="mt-4 md:mt-8 space-y-2 md:space-y-4">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 md:gap-3 rounded-full border-2 border-primary/20 bg-primary/5 py-2 md:py-4 text-xs md:text-base font-bold transition-all hover:bg-primary/10 hover:border-primary/50 disabled:opacity-50"
          >
            <LogIn size={16} className="md:w-5 md:h-5" />
            {loading ? 'Загрузка...' : 'Войти через Google'}
          </button>
          
          <div className="relative py-2 md:py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-primary/10"></div></div>
            <div className="relative flex justify-center text-[8px] md:text-xs uppercase"><span className="bg-background px-2 text-foreground/40 tracking-widest">Или</span></div>
          </div>

          <button 
            onClick={handleTelegramLogin}
            className="flex w-full items-center justify-center gap-2 md:gap-3 rounded-full border-2 border-primary/20 bg-primary/5 py-2 md:py-4 text-xs md:text-base font-bold transition-all hover:bg-primary/10 hover:border-primary/50 text-foreground/80 hover:text-primary"
          >
            <Send size={16} className="md:w-5 md:h-5 rotate-[-45deg]" />
            Войти через Telegram
          </button>
        </div>
      </div>
    </div>
  );
}
