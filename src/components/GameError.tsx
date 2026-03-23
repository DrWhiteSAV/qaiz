import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GameErrorProps {
  message?: string;
  onRetry: () => void;
  onReturn?: () => void;
}

export function GameError({ message, onRetry, onReturn }: GameErrorProps) {
  const navigate = useNavigate();

  const handleReturn = () => {
    if (onReturn) {
      onReturn();
    } else {
      navigate('/');
    }
  };

  const isQuotaError = message?.includes('429') || message?.toLowerCase().includes('quota') || message?.includes('RESOURCE_EXHAUSTED');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto max-w-lg rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center shadow-2xl backdrop-blur-sm"
    >
      <div className="mb-6 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-500">
          <AlertCircle size={48} />
        </div>
      </div>
      
      <h2 className="text-3xl font-black uppercase tracking-tighter text-red-500">
        {isQuotaError ? 'Лимит ИИ исчерпан' : 'Ой! Ошибка ИИ'}
      </h2>
      <p className="mt-4 text-foreground/60 leading-relaxed">
        {isQuotaError 
          ? 'К сожалению, в данный момент ИИ перегружен или достигнут лимит запросов. Пожалуйста, попробуйте через минуту. Средства возвращены на ваш баланс.'
          : (message || 'Произошла ошибка при генерации вопросов. Потраченные средства возвращены на ваш баланс.')}
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <button
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
        >
          <RotateCcw size={24} />
          Повторить
        </button>
        <button
          onClick={handleReturn}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-primary py-4 text-xl font-black uppercase tracking-tighter text-primary transition-transform hover:scale-105"
        >
          <Home size={24} />
          Вернуться
        </button>
      </div>
    </motion.div>
  );
}
