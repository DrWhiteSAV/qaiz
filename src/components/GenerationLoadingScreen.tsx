import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface GenerationLoadingScreenProps {
  title?: string;
  messages?: string[];
  maxSeconds?: number;
}

const DEFAULT_MESSAGES = [
  'Подключаемся к нейросети...',
  'Генерируем уникальные вопросы...',
  'Проверяем корректность ответов...',
  'Формируем игровой пакет...',
  'Почти готово...',
];

export function GenerationLoadingScreen({ 
  title = 'Генерация игры', 
  messages = DEFAULT_MESSAGES,
  maxSeconds = 100 
}: GenerationLoadingScreenProps) {
  const [seconds, setSeconds] = useState(maxSeconds);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => {
      setSeconds(s => s - 1);
      if (seconds % Math.floor(maxSeconds / messages.length) === 0 && msgIndex < messages.length - 1) {
        setMsgIndex(i => i + 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [seconds, maxSeconds, messages.length, msgIndex]);

  const progress = ((maxSeconds - seconds) / maxSeconds) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md text-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 1,
          scale: [0.8, 1, 0.95, 1],
          rotate: [0, 2, -2, 0]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
    className="relative flex aspect-square w-[40vw] min-w-[180px] max-w-[420px] items-center justify-center"
      >
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-3xl" />
        <img 
          src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" 
          alt="Logo" 
          className="relative w-full h-full object-contain drop-shadow-2xl"
          referrerPolicy="no-referrer"
        />
      </motion.div>

      <div className="mt-6 flex flex-col items-center gap-3 max-w-xs w-full">
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-primary">
          {title}
        </h2>
        <p className="text-sm text-foreground/60 min-h-[1.5rem] transition-all duration-500">
          {messages[msgIndex]}
        </p>
      </div>

      <div className="mt-6 w-full max-w-xs">
        <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between items-center">
          <p className="text-xs text-foreground/40">
            {seconds > 0 ? `~${seconds} сек` : 'Завершение...'}
          </p>
          <p className="text-[10px] text-foreground/30">
            Может завершиться раньше
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-primary/30 text-xl">
        <span className="animate-spin" style={{ animationDuration: '3s' }}>⚙</span>
        <span className="animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>⚙</span>
        <span className="animate-spin" style={{ animationDuration: '4s' }}>⚙</span>
      </div>
    </div>
  );
}