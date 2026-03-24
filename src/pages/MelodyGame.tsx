import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, Music, Send, AlertCircle, CheckCircle2, XCircle, RotateCcw, Home, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession, saveGameProgress, getGameProgress, deleteGameProgress } from '../supabase';
import { GameError } from '../components/GameError';

import { GameSubmissionModal } from '../components/GameSubmissionModal';

export function MelodyGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const options = location.state || { mode: 'human', difficulty: 'people', price: 30 };
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'result' | 'error'>(options ? 'loading' : 'setup');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [topic, setTopic] = useState(options.topic || 'Популярные хиты');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(1000);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkTimer, setCheckTimer] = useState(0);
  const [checkInterval, setCheckInterval] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasProgress, setHasProgress] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [isBuzzed, setIsBuzzed] = useState(false);
  const [buzzerPlayer, setBuzzerPlayer] = useState<string | null>(null);

  const startCheckTimer = () => {
    setCheckTimer(20);
    if (checkInterval) clearInterval(checkInterval);
    const interval = setInterval(() => {
      setCheckTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setCheckInterval(interval);
  };

  const stopCheckTimer = () => {
    if (checkInterval) clearInterval(checkInterval);
    setCheckTimer(0);
  };

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !options.packId) return;
      const progress = await getGameProgress(user.uid, options.packId, 'melody');
      if (progress) {
        setHasProgress(true);
      }
    };
    loadProgress();
  }, [user, options.packId]);

  // Save progress whenever state changes
  useEffect(() => {
    const saveProgress = async () => {
      if (gameState === 'playing' && user && options.packId && questions.length > 0) {
        await saveGameProgress({
          userId: user.uid,
          packId: options.packId,
          gameType: 'melody',
          currentStep: currentIndex,
          totalSteps: questions.length,
          state: {
            questions,
            currentIndex,
            score,
            correctCount,
            topic
          }
        });
      }
    };
    saveProgress();
  }, [currentIndex, score, correctCount, gameState, user, options.packId, questions, topic]);

  const handleResume = async () => {
    if (!user || !options.packId) return;
    setLoading(true);
    try {
      const progress = await getGameProgress(user.uid, options.packId, 'melody');
      if (progress && progress.state) {
        const { questions, currentIndex, score, correctCount, topic } = progress.state;
        setQuestions(questions);
        setCurrentIndex(currentIndex);
        setScore(score);
        setCorrectCount(correctCount);
        setTopic(topic);
        setGameState('playing');
        setCurrentPoints(1000);
      } else {
        startLevel();
      }
    } catch (error) {
      console.error('Error resuming game:', error);
      startLevel();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options && gameState === 'loading' && questions.length === 0) {
      startLevel();
    }
  }, [gameState, questions.length]);

  const startLevel = async () => {
    if (!user || !profile) return;
    
    const cost = options.price || 3; // Updated cost to 3 rubles
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      setGameState('setup');
      return;
    }

    setGameState('loading');
    try {
      // 25 questions: 5 categories x 5 questions
      const generated = await geminiService.generateQuestions(topic, options.difficulty || 'people', 25, 'melody');
      setQuestions(generated);
      setGameState('playing');
      setCurrentPoints(1000);
      setAudioLoaded(false);
    } catch (error: any) {
      console.error('Error generating questions:', error);
      setErrorMessage(error?.message || String(error));
      setGameState('error');
    }
  };

  const handleAnswer = async () => {
    if (checking || feedback) return;
    setChecking(true);
    startCheckTimer();
    
    const currentQuestion = questions[currentIndex];
    const questionCost = options.isPurchased ? 0 : 3;

    try {
      // Deduct balance first
      if (questionCost > 0) {
        await balanceService.deductBalance(user!.uid, questionCost);
      }

      const result = await geminiService.checkAnswer(currentQuestion.text, userAnswer, currentQuestion.correctAnswer);
      
      setFeedback(result);
      if (result.isCorrect) {
        setScore(s => s + currentPoints);
        setCorrectCount(c => c + 1);
      } else {
        // Subtract points if incorrect
        setScore(s => Math.max(0, s - currentPoints));
      }
      
      setChecking(false);
      stopCheckTimer();

      setTimeout(async () => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(i => i + 1);
          setCurrentPoints(1000);
          setUserAnswer('');
          setFeedback(null);
          setAudioLoaded(false);
          setIsBuzzed(false);
          setBuzzerPlayer(null);
        } else {
          // Save session
          if (user) {
            const finalScore = score + (result.isCorrect ? currentPoints : (result.isCorrect === false ? -currentPoints : 0));
            const finalCorrectCount = correctCount + (result.isCorrect ? 1 : 0);
            await saveGameSession({
              userId: user.uid,
              gameId: 'melody',
              score: Math.max(0, finalScore),
              totalQuestions: 25,
              correctAnswers: finalCorrectCount,
              mode: options.mode,
              difficulty: options.difficulty,
              topic: options.topic || topic,
              pricePaid: options.price,
              isWin: finalCorrectCount >= 15 // 60% for win
            });
            if (options.packId) {
              await deleteGameProgress(user.uid, options.packId, 'melody');
            }
          }
          setGameState('result');
          setShowSubmission(true);
        }
      }, 3000);
    } catch (error) {
      console.error('Error checking answer:', error);
      // Refund if AI check failed
      if (questionCost > 0) {
        await balanceService.addBalance(user!.uid, questionCost);
      }
      setChecking(false);
      stopCheckTimer();
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && currentPoints > 0 && !feedback && audioLoaded && !isBuzzed) {
      const timer = setInterval(() => {
        setCurrentPoints(p => Math.max(0, p - 1));
      }, 30); // 1000 points over 30s is ~33.3ms per point (30ms is close enough)
      return () => clearInterval(timer);
    } else if (currentPoints === 0 && gameState === 'playing' && !feedback && !isBuzzed) {
      setFeedback({ isCorrect: false, explanation: 'Время вышло!' });
    }
  }, [currentPoints, gameState, feedback, audioLoaded, isBuzzed]);

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

  if (gameState === 'setup' || (options && gameState === 'loading' && questions.length === 0)) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-primary/20 bg-primary/5 p-8">
        <div className="text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Уквадай Мелодию</h2>
          <p className="mt-2 text-foreground/60">Угадывание 25 мелодий на время. Очки тают каждую секунду!</p>
        </div>
        <input 
          type="text" 
          value={topic} 
          onChange={e => setTopic(e.target.value)}
          placeholder="Тема (например, Хиты 90-х)..."
          className="w-full rounded-2xl border border-primary/20 bg-background p-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />
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
            onClick={startLevel}
            disabled={loading}
            className="flex-1 rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105 flex items-center justify-center gap-2"
          >
            {loading && !hasProgress && <Loader2 className="animate-spin" />}
            Начать игру
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm text-center p-4">
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
          className="relative w-full max-w-[70vw] aspect-square flex items-center justify-center"
        >
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-3xl" />
          <img 
            src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" 
            alt="Logo" 
            className="relative w-full h-full object-contain drop-shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xl font-black text-primary animate-pulse uppercase tracking-widest">Настраиваем инструменты...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <GameError 
          message={errorMessage}
          onRetry={startLevel} 
          onReturn={() => navigate('/')} 
        />
      </div>
    );
  }

  if (gameState === 'result') {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 p-12 text-center space-y-8">
        <h2 className="text-5xl font-black uppercase tracking-tighter text-primary">Игра окончена!</h2>
        <div className="space-y-2">
          <p className="text-xl text-foreground/60">Ваш итоговый счет:</p>
          <p className="text-7xl font-black text-primary">{score}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={async () => {
              if (user && options.packId) await deleteGameProgress(user.uid, options.packId, 'melody');
              window.location.reload();
            }} 
            className="btn-primary flex-1 py-4 text-xl"
          >
            Сыграть Еще
          </button>
          <button 
            onClick={async () => {
              if (user && options.packId) await deleteGameProgress(user.uid, options.packId, 'melody');
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
            gameType="Уквадай Мелодию"
            onClose={handleCloseSubmission}
            onSubmit={handleGameSubmission}
          />
        )}
      </div>
    );
  }

  const handleBuzzer = () => {
    if (isBuzzed || !audioLoaded || feedback) return;
    setIsBuzzed(true);
    setBuzzerPlayer('user');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AnimatePresence>
        {checking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative"
            >
              <div className="absolute -inset-4 animate-pulse rounded-full bg-primary/20 blur-xl" />
              <img 
                src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" 
                alt="Logo" 
                className="relative h-32 w-32 rounded-3xl border-4 border-primary/50 object-cover shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <p className="mt-8 text-2xl font-black uppercase tracking-tighter text-primary animate-pulse">
              ИИ проверяет ваш ответ... ({checkTimer}с)
            </p>
            {checkTimer === 0 && (
              <div className="mt-8 text-center space-y-4">
                <p className="text-sm text-red-500 font-bold uppercase tracking-widest">ИИ Немного тупит, надо повторить</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleAnswer()}
                    className="px-8 py-3 bg-primary text-background rounded-full font-black uppercase tracking-tighter hover:scale-105 transition-transform"
                  >
                    Еще раз
                  </button>
                  <button 
                    onClick={() => {
                      setChecking(false);
                      setFeedback({ isCorrect: false, explanation: 'Проверка пропущена пользователем.' });
                      // Don't auto-continue, let user see feedback
                    }}
                    className="px-8 py-3 bg-primary/10 text-primary rounded-full font-black uppercase tracking-tighter hover:bg-primary/20 transition-all"
                  >
                    Пропустить
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-widest text-foreground/60">Мелодия</span>
          <span className="text-2xl font-black text-primary">{currentIndex + 1}/25</span>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-xs uppercase tracking-widest text-foreground/60">Текущие баллы</p>
          <p className="text-3xl font-black text-primary">{currentPoints}</p>
        </div>
      </div>

      <div className="relative flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-primary/20 bg-background p-10 shadow-xl overflow-hidden">
        {questions[currentIndex]?.audioUrl && (
          <audio 
            src={questions[currentIndex].audioUrl} 
            autoPlay 
            onCanPlayThrough={() => setAudioLoaded(true)}
            onEnded={() => setFeedback({ isCorrect: false, explanation: 'Время вышло!' })}
          />
        )}
        
        {!audioLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <Loader2 className="animate-spin text-primary mb-2" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Загрузка аудио...</p>
          </div>
        )}

        <div className={`flex h-24 w-24 items-center justify-center rounded-full transition-all ${audioLoaded ? 'bg-primary/10 text-primary animate-pulse' : 'bg-foreground/5 text-foreground/20'}`}>
          <Music size={48} />
        </div>
        
        <p className="mt-6 text-center text-xl font-bold italic text-foreground/60">
          {audioLoaded ? (isBuzzed ? 'ОТВЕЧАЕТЕ!' : 'Играет мелодия...') : 'Подготовка...'}
        </p>

        {questions[currentIndex]?.category && (
          <div className="mt-2 px-4 py-1 bg-primary/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary">
            Категория: {questions[currentIndex].category}
          </div>
        )}
        
        {feedback && (
          <div className={`mt-8 flex items-start gap-4 rounded-2xl p-6 ${
            feedback.isCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          }`}>
            {feedback.isCorrect ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
            <div>
              <p className="text-xl font-bold">{feedback.isCorrect ? 'Верно!' : 'Не совсем...'}</p>
              <div className="mt-1 max-h-32 overflow-y-auto pr-2 text-xs opacity-80">
                {feedback.explanation}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isBuzzed ? (
          <button 
            onClick={handleBuzzer}
            disabled={!audioLoaded || !!feedback || checking}
            className="w-full rounded-2xl bg-primary py-6 text-2xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            Я ЗНАЮ!
          </button>
        ) : (
          <>
            <input 
              type="text" 
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              placeholder="Название песни или исполнитель..."
              autoFocus
              disabled={!!feedback || checking}
              className="flex-1 rounded-2xl border border-primary/20 bg-background p-6 text-xl focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={e => e.key === 'Enter' && handleAnswer()}
            />
            <button 
              onClick={handleAnswer}
              disabled={!userAnswer || !!feedback || checking}
              className="flex items-center justify-center rounded-2xl bg-primary px-8 text-background transition-transform hover:scale-105 disabled:opacity-50"
            >
              {checking ? <Loader2 className="animate-spin" /> : <Send size={24} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
