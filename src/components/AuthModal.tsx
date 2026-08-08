import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, X } from 'lucide-react';
import { useFrogSound } from '../hooks/useSound';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { profile } = useAuth();
  const { playCroak } = useFrogSound();

  if (!isOpen || profile) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(11,28,28,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="border-glow relative w-full max-w-md p-4 md:p-8 shadow-[12px_12px_0px_0px_#0b1c1c]">
        <button onClick={() => { playCroak(); onClose(); }} className="absolute right-2 top-2 md:right-4 md:top-4 hover:scale-110 transition-transform" style={{ color: 'var(--primary)' }}>
          <X size={20} className="md:w-6 md:h-6" />
        </button>
        
        <div className="text-center">
          <img src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" alt="Logo" className="mx-auto h-12 w-12 md:h-20 md:w-20 drop-shadow-[0_0_10px_rgba(11,28,28,0.2)]" />
          <h2 className="mt-2 md:mt-4 text-xl md:text-3xl font-black uppercase tracking-tighter title-glow" style={{ color: 'var(--primary)' }}>Вход в Квайз</h2>
          <p className="mt-1 md:mt-2 text-[10px] md:text-base" style={{ color: 'var(--fg)', opacity: 0.6 }}>Откройте приложение через Telegram для автоматического входа</p>
        </div>

        <div className="mt-4 md:mt-8 space-y-2 md:space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border-2 p-4 text-center" style={{ borderColor: 'rgba(131,196,46,0.2)', backgroundColor: 'rgba(131,196,46,0.05)' }}>
            <Send size={20} style={{ color: 'var(--primary)' }} className="rotate-[-45deg] flex-shrink-0" />
            <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
              Квайз — это Telegram Mini App. Откройте его через нашего бота в Telegram, чтобы войти автоматически.
            </p>
          </div>

          <a
            href="https://t.me/qaizquizbot"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playCroak()}
            className="btn-primary flex w-full items-center justify-center gap-2 md:gap-3"
          >
            <Send size={16} className="md:w-5 md:h-5 rotate-[-45deg]" />
            Открыть в Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
