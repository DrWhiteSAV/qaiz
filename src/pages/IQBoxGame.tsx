import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFrogSound } from '../hooks/useSound';
import { Timer, Box, Users, Trophy, Loader2, RotateCcw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { saveGameSession, saveGameProgress, getGameProgress, deleteGameProgress } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';

import { GameSubmissionModal } from '../components/GameSubmissionModal';

interface Player {
  uid: string;
  name: string;
  score: number;
  boxIndex: number;
}

export const IQBoxGame: React.FC = () => {
  const { profile, user } = useAuth();
  const { playCroak } = useFrogSound();
  const navigate = useNavigate();
  const location = useLocation();
  const options = location.state || { mode: 'human', difficulty: 'people', price: 50 };
  
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('Загрузка вопроса...');
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasProgress, setHasProgress] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !options.packId) return;
      const progress = await getGameProgress(user.uid, options.packId, 'iqbox');
      if (progress) {
        setHasProgress(true);
      }
    };
    loadProgress();
  }, [user, options.packId]);

  // Save progress whenever state changes
  useEffect(() => {
    const saveProgress = async () => {
      if (gameState === 'playing' && user && options.packId && players.length > 0) {
        await saveGameProgress({
          userId: user.uid,
          packId: options.packId,
          gameType: 'iqbox',
          currentStep: 1,
          totalSteps: 1,
          state: {
            players,
            currentQuestion,
            timeLeft,
            score
          }
        });
      }
    };
    saveProgress();
  }, [players, currentQuestion, timeLeft, score, gameState, user, options.packId]);

  const handleResume = async () => {
    if (!user || !options.packId) return;
    setLoading(true);
    try {
      const progress = await getGameProgress(user.uid, options.packId, 'iqbox');
      if (progress && progress.state) {
        const { players, currentQuestion, timeLeft, score } = progress.state;
        setPlayers(players);
        setCurrentQuestion(currentQuestion);
        setTimeLeft(timeLeft);
        setScore(score);
        setGameState('playing');
      } else {
        startMatch();
      }
    } catch (error) {
      console.error('Error resuming game:', error);
      startMatch();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      finishGame();
    }
  }, [gameState, timeLeft]);

  const finishGame = async () => {
    setGameState('finished');
    if (user) {
      await saveGameSession({
        userId: user.uid,
        gameId: 'iqbox',
        score: score,
        totalQuestions: 1,
        correctAnswers: 1,
        mode: options.mode,
        difficulty: options.difficulty,
        topic: options.topic || 'IQ Box',
        pricePaid: options.price,
        isWin: true // Demo always wins
      });
      if (options.packId) {
        await deleteGameProgress(user.uid, options.packId, 'iqbox');
      }
    }
    setShowSubmission(true);
  };

  const handleGameSubmission = async (data: any) => {
    // Logic to save game to shop
    console.log('Submitting game to shop:', data);
    setSubmitted(true);
    setShowSubmission(false);
  };

  const handleCloseSubmission = () => {
    // For "other 4", do nothing if closed
    setShowSubmission(false);
  };

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
    setScore(1000); // Demo score
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
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-8">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <div className="absolute -inset-4 animate-pulse rounded-full bg-primary/20 blur-xl" />
            <img 
              src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" 
              alt="Logo" 
              className="relative h-24 w-24 rounded-2xl border-2 border-primary/30 object-cover shadow-xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <div className="space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-primary animate-pulse">Ожидание игроков...</h2>
            <p className="text-foreground/60 uppercase tracking-widest text-xs">Для начала игры необходимо 4 участника</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {hasProgress && (
              <button 
                onClick={handleResume} 
                disabled={loading}
                className="bg-foreground/10 text-foreground hover:bg-foreground/20 px-12 py-4 text-xl rounded-full font-black uppercase transition-all flex items-center gap-2 justify-center"
              >
                {loading ? <Loader2 className="animate-spin" /> : <RotateCcw size={24} />}
                Продолжить
              </button>
            )}
            <button 
              onClick={startMatch} 
              disabled={loading}
              className="btn-primary px-12 py-4 text-xl flex items-center gap-2"
            >
              {loading && !hasProgress && <Loader2 className="animate-spin" />}
              Начать поиск (Демо)
            </button>
          </div>
        </div>
      ) : gameState === 'playing' ? (
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
      ) : null}

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
              <div className="flex flex-col gap-4">
                <button 
                  onClick={async () => {
                    if (user && options.packId) await deleteGameProgress(user.uid, options.packId, 'iqbox');
                    window.location.reload();
                  }} 
                  className="btn-primary w-full py-4 text-xl"
                >
                  Сыграть Еще
                </button>
                <button 
                  onClick={async () => {
                    if (user && options.packId) await deleteGameProgress(user.uid, options.packId, 'iqbox');
                    navigate('/');
                  }} 
                  className="bg-foreground/10 text-foreground hover:bg-foreground/20 px-12 py-4 text-xl rounded-full font-black uppercase transition-all flex items-center gap-2 justify-center"
                >
                  <Home size={24} />
                  В Меню
                </button>
              </div>

              {showSubmission && !submitted && (
                <GameSubmissionModal 
                  gameType="100 квадному"
                  onClose={handleCloseSubmission}
                  onSubmit={handleGameSubmission}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
