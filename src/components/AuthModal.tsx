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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 rounded-3xl border border-primary/25 bg-card/95 text-foreground shadow-2xl my-auto animate-in fade-in zoom-in-95">
        <button
          onClick={() => { playCroak(); onClose(); }}
          className="absolute right-4 top-4 p-2 rounded-xl text-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="text-center mb-5">
          <img 
            src="/file/13/logo.png" 
            alt="Logo" 
            className="mx-auto h-14 w-14 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] select-none pointer-events-none" 
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          />
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-primary">Вход в Квайз</h2>
        </div>

        <EmailAuthForm onSuccess={() => onClose()} />

        <div className="mt-6 pt-4 border-t border-primary/15 text-center">
          <p className="text-xs text-foreground/70 mb-2.5">Или откройте приложение через Telegram</p>
          <a
            href="https://t.me/qaiz_aibot"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playCroak()}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider rounded-2xl shadow-lg"
          >
            <Send size={16} className="rotate-[-45deg]" />
            Открыть в Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
