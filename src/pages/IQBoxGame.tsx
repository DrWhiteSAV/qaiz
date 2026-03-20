import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFrogSound } from '../hooks/useSound';
import { Timer, Box, Users, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Player {
  uid: string;
  name: string;
  score: number;
  boxIndex: number;
}

export const IQBoxGame: React.FC = () => {
  const { profile } = useAuth();
  const { playCroak } = useFrogSound();
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('Загрузка вопроса...');
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setGameState('finished');
    }
  }, [gameState, timeLeft]);

  const startMatch = () => {
    playCroak();
    setGameState('playing');
    setPlayers([
      { uid: '1', name: profile?.displayName || 'Вы', score: 0, boxIndex: 0 },
      { uid: '2', name: 'Кибер-Жаба 1', score: 0, boxIndex: 1 },
      { uid: '3', name: 'Кибер-Жаба 2', score: 0, boxIndex: 2 },
      { uid: '4', name: 'Кибер-Жаба 3', score: 0, boxIndex: 3 },
    ]);
    setCurrentQuestion('Какое животное является символом нашего приложения?');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-glow bg-background/60 p-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Box className="text-primary" size={32} />
          <h1 className="text-3xl font-black uppercase tracking-tighter text-primary title-glow">IQ Box</h1>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Timer size={24} />
            {timeLeft}с
          </div>
          <div className="flex items-center gap-2 text-foreground/60">
            <Users size={20} />
            {players.length}/4
          </div>
        </div>
      </div>

      {gameState === 'waiting' ? (
        <div className="flex flex-col items-center justify-center space-y-8 py-20 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Box size={120} className="relative text-primary drop-shadow-[0_0_30px_rgba(131,196,46,0.5)]" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Ожидание игроков...</h2>
            <p className="text-foreground/60">Для начала игры необходимо 4 участника</p>
          </div>
          <button onClick={startMatch} className="btn-primary">
            Начать поиск (Демо)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Question Area */}
          <div className="md:col-span-2 border-glow bg-background/40 p-8 text-center backdrop-blur-sm">
            <p className="text-sm uppercase tracking-widest text-primary/60">Вопрос</p>
            <h3 className="mt-4 text-3xl font-bold">{currentQuestion}</h3>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            {players.map((player, idx) => (
              <motion.div
                key={player.uid}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative overflow-hidden border-glow p-6 transition-all ${
                  idx === 0 ? 'bg-primary/10 border-primary' : 'bg-background/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold">{player.name}</p>
                      <p className="text-xs text-foreground/40">Бокс #{player.boxIndex + 1}</p>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-primary">{player.score}</div>
                </div>
                
                {/* Visual indicator of "thinking" or "answering" */}
                <div className="mt-4 h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {gameState === 'finished' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-background/90 backdrop-blur-xl"
          >
            <div className="max-w-md w-full border-glow bg-background p-10 text-center space-y-6">
              <Trophy size={80} className="mx-auto text-primary animate-bounce" />
              <h2 className="text-5xl font-black uppercase tracking-tighter text-primary title-glow">Финиш!</h2>
              <div className="space-y-2">
                <p className="text-2xl font-bold">Вы заняли 1 место</p>
                <p className="text-foreground/60">+50 монет на баланс</p>
              </div>
              <button onClick={() => window.location.reload()} className="btn-primary w-full">
                Вернуться в лобби
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
