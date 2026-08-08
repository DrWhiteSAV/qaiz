import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, X } from 'lucide-react';
import { useFrogSound } from '../hooks/useSound';
import { EmailAuthForm } from './EmailAuthForm';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { profile } = useAuth();
  const { playCroak } = useFrogSound();

  if (!isOpen || profile) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(11,28,28,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="border-glow relative w-full max-w-md p-4 md:p-6 shadow-[12px_12px_0px_0px_#0b1c1c] my-auto">
        <button onClick={() => { playCroak(); onClose(); }} className="absolute right-3 top-3 hover:scale-110 transition-transform" style={{ color: 'var(--primary)' }}>
          <X size={20} className="md:w-6 md:h-6" />
        </button>
        
        <div className="text-center mb-4">
          <img src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" alt="Logo" className="mx-auto h-12 w-12 md:h-16 md:w-16 drop-shadow-[0_0_10px_rgba(11,28,28,0.2)]" />
          <h2 className="mt-2 text-xl md:text-2xl font-black uppercase tracking-tighter title-glow" style={{ color: 'var(--primary)' }}>Вход в Квайз</h2>
        </div>

        <EmailAuthForm onSuccess={() => onClose()} />

        <div className="mt-6 pt-4 border-t border-primary/20 text-center">
          <p className="text-xs text-foreground/60 mb-2">Или откройте приложение через Telegram</p>
          <a
            href="https://t.me/qaizquizbot"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playCroak()}
            className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm"
          >
            <Send size={16} className="rotate-[-45deg]" />
            Открыть в Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
