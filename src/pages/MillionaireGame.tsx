import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, HelpCircle, Zap, AlertCircle, CheckCircle2, XCircle, RotateCcw, Home, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession, saveGameProgress, getGameProgress, deleteGameProgress } from '../supabase';
import { GameError } from '../components/GameError';
import { GameSubmissionModal } from '../components/GameSubmissionModal';
import { GenerationLoadingScreen } from '../components/GenerationLoadingScreen';

const PRIZES = [
  100, 200, 300, 500, 1000,
  2000, 4000, 8000, 16000, 32000,
  64000, 125000, 250000, 500000, 1000000
];

const SAFE_LEVELS = [4, 9]; // indices of fireproof levels (1000 and 32000)

const HOST_PHRASES = [
  "Хм, интересный выбор...",
  "Вы уверены? Давайте подумаем ещё раз...",
  "Это ваш окончательный ответ?",
  "Зал замер в ожидании...",
  "Камеры направлены на вас...",
  "Ваш ответ заставляет задуматься...",
  "Давайте проверим, что скажет компьютер...",
  "Напряжение нарастает...",
  "Один неверный шаг — и всё может измениться...",
  "Публика затаила дыхание...",
  "Интуиция или знание? Сейчас узнаем...",
  "Этот вопрос стоил многим участникам победы...",
  "Вижу сомнение в ваших глазах...",
  "Время покажет, правы ли вы...",
  "Ставки высоки, а ответ — рядом...",
  "Мурашки по коже от этого момента...",
  "Помните, вы всегда можете забрать деньги...",
  "Какой поворот событий!",
  "Я бы на вашем месте тоже волновался...",
  "Последний шанс передумать...",
  "Компьютер обрабатывает ваш ответ...",
  "Сердце бьётся быстрее, не так ли?",
  "Этот вопрос — один из самых коварных...",
  "Все глаза устремлены на табло...",
  "Момент истины приближается...",
  "Какая развязка нас ждёт?",
  "Зрители дома тоже переживают за вас...",
  "Внимание, сейчас будет ответ...",
  "Судьба миллиона решается прямо сейчас...",
  "Ваш выбор может войти в историю...",
  "Дрожь в руках — это нормально...",
  "Нервы из стали? Проверим!",
  "Три... два... один...",
  "Барабанная дробь!",
  "Ответ принят. Обрабатываем...",
  "Сможете ли вы удержать эту сумму?",
  "Аплодисменты или вздох разочарования?",
  "В студии повисла тишина...",
  "Каждая секунда — как вечность...",
  "Готовы узнать результат?"
];

function getRandomPhrases(count: number): string[] {
  const shuffled = [...HOST_PHRASES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function MillionaireGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const options = location.state || { mode: 'lite', difficulty: 'people', price: 30, packId: 'pack4' };
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'dramatic_pause' | 'feedback' | 'continue_choice' | 'ladder_animation' | 'result' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [topic, setTopic] = useState(options.topic || 'Общие знания');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string } | null>(null);
  const [hints, setHints] = useState({ fiftyFifty: true, aiHint: true, chatHelp: true });
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const [chatHelpLoading, setChatHelpLoading] = useState(false);
  const [chatHelpMessages, setChatHelpMessages] = useState<string[] | null>(null);
  const [showChatHelpInfo, setShowChatHelpInfo] = useState(false);
  const [chatHelpTimer, setChatHelpTimer] = useState(0);

  // Dramatic pause state
  const [pauseTimer, setPauseTimer] = useState(10);
  const [hostPhrase, setHostPhrase] = useState('');
  const pauseIntervalRef = useRef<any>(null);
  const deductedRef = useRef(false);

  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [aiHintText, setAiHintText] = useState<string | null>(null);
  const [hasProgress, setHasProgress] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ladderTarget, setLadderTarget] = useState<number | null>(null);

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !options.packId) return;
      const progress = await getGameProgress(profile?.uid ?? "", options.packId, 'millionaire');
      if (progress) {
        setHasProgress(true);
        // Don't auto-start, show setup with resume option
        setGameState('setup');
      }
    };
    loadProgress();
  }, [user, options.packId]);

  useEffect(() => {
    if (gameState === 'loading' && questions.length === 0 && !hasProgress) {
      startLevel();
    }
  }, [gameState, questions.length, hasProgress]);

  // Save progress whenever state changes
  useEffect(() => {
    const saveProgress = async () => {
      if (gameState === 'playing' && user && options.packId && questions.length > 0) {
        await saveGameProgress({
          userId: profile?.uid ?? "",
          packId: options.packId,
          gameType: 'millionaire',
          currentStep: currentIndex,
          totalSteps: 15,
          state: {
            questions,
            currentIndex,
            hints,
            score,
            topic
          }
        });
      }
    };
    saveProgress();
  }, [currentIndex, hints, score, gameState, questions, user, options.packId, topic]);

  const handleResume = async () => {
    if (!user || !options.packId) return;
    setGameState('loading');
    try {
      const progress = await getGameProgress(profile?.uid ?? "", options.packId, 'millionaire');
      if (progress && progress.state) {
        const { questions, currentIndex, hints, score, topic } = progress.state;
        setQuestions(questions);
        setCurrentIndex(currentIndex);
        setHints(hints);
        setScore(score);
        setTopic(topic);
        setGameState('playing');
      } else {
        startLevel();
      }
    } catch (error) {
      console.error('Error resuming game:', error);
      startLevel();
    }
  };

  const useChatHelp = async () => {
    if (!hints.chatHelp || feedback || selectedOption) return;
    setShowChatHelpInfo(false);
    setHints(h => ({ ...h, chatHelp: false }));
    setChatHelpLoading(true);
    setChatHelpTimer(15);
    
    const timer = setInterval(() => {
      setChatHelpTimer(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);

    try {
      const currentQ = questions[currentIndex];
      const prompt = `Ты симулируешь чат зрителей в прямом эфире игры-викторины "Квиллионер". 
        Вопрос: "${currentQ.text}". 
        Варианты: ${currentQ.options.join(', ')}. 
        Правильный ответ: ${currentQ.correctAnswer}.
        
        Сгенерируй ровно 3 сообщения от разных "зрителей" чата. Сообщения могут быть:
        - Явный ответ (может быть правильным или неправильным)
        - Косвенный намёк
        - Странное сообщение, спам, реклама, шутка или не по теме
        
        Верни JSON массив из 3 строк — текстов сообщений. Каждое сообщение 1-2 предложения. Формат никнеймов: "НикнеймПользователя: текст сообщения".`;
      
      const result = await geminiService.generateQuestions('', '', 1, 'generate', prompt);
      if (Array.isArray(result)) {
        setChatHelpMessages(result.map(String));
      } else if (typeof result === 'string') {
        setChatHelpMessages([result]);
      } else {
        setChatHelpMessages(['Chat_User_42: Мне кажется ответ очевиден...', 'xXx_ProGamer: Ставлю на Б!', 'КУПИ_КРЕМ_ДЛЯ_РУК: Скидка 50%! Переходите по ссылке!!!']);
      }
    } catch {
      setChatHelpMessages(['Зритель123: Я бы выбрал наугад...', 'Умник_2026: Тут нужно подумать логически', 'Спам_бот: Подписывайтесь на мой канал!']);
    } finally {
      clearInterval(timer);
      setChatHelpLoading(false);
    }
  };

  const startLevel = async () => {
    if (!user || !profile) return;
    
    const cost = options.price || 30; 
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      return;
    }

    setGameState('loading');
    try {
      const allQuestions = await geminiService.generateQuestions(topic, options.difficulty || 'people', 15, 'millionaire');
      if (!Array.isArray(allQuestions) || allQuestions.length < 15) {
        throw new Error("Не удалось сгенерировать достаточное количество вопросов");
      }
      setQuestions(allQuestions);
      setGameState('playing');
    } catch (error: any) {
      console.error('Error generating questions:', error);
      setErrorMessage(error?.message || String(error));
      setGameState('error');
    }
  };

  const triggerCoinAnimation = () => {
    setShowCoinAnimation(true);
    setTimeout(() => setShowCoinAnimation(false), 1500);
  };

  const handleOptionClick = async (option: string) => {
    if (feedback || selectedOption || gameState !== 'playing') return;
    setSelectedOption(option);
    deductedRef.current = false;
    
    // Deduct exactly 1 ruble
    const questionCost = options.isPurchased ? 0 : 1;
    if (questionCost > 0) {
      await balanceService.deductBalance(profile?.uid ?? "", questionCost);
      triggerCoinAnimation();
      // Update local profile balance
      if (profile) {
        (profile as any).balance = (profile.balance || 0) - 1;
      }
      deductedRef.current = true;
    }

    // Start dramatic pause
    const phrases = getRandomPhrases(2);
    setHostPhrase('');
    setPauseTimer(10);
    setGameState('dramatic_pause');

    setTimeout(() => setHostPhrase(phrases[0]), 1000);
    setTimeout(() => setHostPhrase(phrases[1]), 6000);

    const currentQuestion = questions[currentIndex];
    let countdown = 10;
    if (pauseIntervalRef.current) clearInterval(pauseIntervalRef.current);
    pauseIntervalRef.current = setInterval(() => {
      countdown--;
      setPauseTimer(countdown);
      if (countdown <= 0) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
        
        const isCorrect = option === currentQuestion.correctAnswer;
        setFeedback({
          isCorrect,
          explanation: isCorrect
            ? `Правильно! ${currentQuestion.hint || ''}`
            : `Неверно. Правильный ответ: ${currentQuestion.correctAnswer}. ${currentQuestion.hint || ''}`
        });
        setGameState('feedback');
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (pauseIntervalRef.current) clearInterval(pauseIntervalRef.current);
    };
  }, []);

  const handleFeedbackContinue = () => {
    if (!feedback) return;

    if (feedback.isCorrect) {
      // Show ladder animation
      setLadderTarget(currentIndex);
      setGameState('ladder_animation');
      // After 2 seconds of animation, show continue choice
      setTimeout(() => {
        setScore(PRIZES[currentIndex]);
        if (currentIndex < 14) {
          setGameState('continue_choice');
        } else {
          finishGame(true, PRIZES[14]);
        }
      }, 2000);
    } else {
      let finalScore = 0;
      if (currentIndex >= 10) finalScore = PRIZES[9];
      else if (currentIndex >= 5) finalScore = PRIZES[4];
      finishGame(false, finalScore);
    }
  };

  const handleContinuePlaying = () => {
    setCurrentIndex(i => i + 1);
    setSelectedOption(null);
    setFeedback(null);
    setDisabledOptions([]);
    setAiHintText(null);
    setLadderTarget(null);
    setGameState('playing');
  };

  const handleTakeMoney = async () => {
    const currentPrize = PRIZES[currentIndex];
    await finishGame(true, currentPrize);
  };

  const handleTakeMoneyFromGame = async () => {
    const currentPrize = currentIndex > 0 ? PRIZES[currentIndex - 1] : 0;
    await finishGame(true, currentPrize);
  };

  const finishGame = async (isWin: boolean, finalScore: number) => {
    setScore(finalScore);
    if (user) {
      await saveGameSession({
        userId: profile?.uid ?? "",
        gameId: 'millionaire',
        score: finalScore,
        totalQuestions: 15,
        correctAnswers: isWin ? (currentIndex + 1) : currentIndex,
        mode: options.mode,
        difficulty: options.difficulty,
        topic: options.topic || topic,
        pricePaid: options.price,
        isWin: isWin
      });
      if (options.packId) {
        await deleteGameProgress(profile?.uid ?? "", options.packId, 'millionaire');
      }
    }
    setGameState('result');
    setShowSubmission(true);
  };

  const handleGameSubmission = async (data: any) => {
    console.log('Submitting game to shop:', data);
    setSubmitted(true);
    setShowSubmission(false);
  };

  const handleCloseSubmission = () => {
    setSubmitted(true);
    setShowSubmission(false);
  };

  const useFiftyFifty = () => {
    if (!hints.fiftyFifty || feedback) return;
    const currentQuestion = questions[currentIndex];
    const wrongOptions = currentQuestion.options.filter((o: string) => o !== currentQuestion.correctAnswer);
    const toDisable = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2);
    setDisabledOptions(toDisable);
    setHints(h => ({ ...h, fiftyFifty: false }));
  };

  const useAiHint = async () => {
    if (!hints.aiHint || feedback) return;
    setHints(h => ({ ...h, aiHint: false }));
    const currentQuestion = questions[currentIndex];
    setAiHintText(currentQuestion.hint || "Я думаю, что правильный ответ связан с темой вопроса.");
  };

  if (gameState === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-primary/20 bg-primary/5 p-8">
        <div className="text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Квиллионер</h2>
          <p className="mt-2 text-foreground/60">15 вопросов с 4 вариантами ответов. Несгораемые суммы.</p>
        </div>
        <input 
          type="text" 
          value={topic} 
          onChange={e => setTopic(e.target.value)}
          placeholder="Тема игры..."
          className="w-full rounded-2xl border border-primary/20 bg-background p-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex flex-col gap-4">
          {hasProgress && (
            <button 
              onClick={handleResume}
              className="w-full rounded-full border-2 border-primary bg-primary/10 py-4 text-xl font-black uppercase tracking-tighter text-primary transition-transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <RotateCcw size={24} />
              Продолжить прошлую игру
            </button>
          )}
          <button 
            onClick={startLevel}
            className="w-full rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
          >
            Начать новую игру
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <GenerationLoadingScreen 
        title="Квиллионер"
        messages={[
          'Подключаемся к ИИ...',
          'Генерируем 15 вопросов...',
          'Калибруем сложность...',
          'Проверяем варианты ответов...',
          'Почти готово...',
        ]}
      />
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
      <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 p-12 text-center">
        <h2 className="text-5xl font-black uppercase tracking-tighter text-primary">Игра окончена!</h2>
        <p className="mt-4 text-xl text-foreground/60">Ваш выигрыш:</p>
        <p className="mt-2 text-7xl font-black text-primary">{score.toLocaleString()} ₽</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-12 rounded-full bg-primary px-12 py-4 text-xl font-black uppercase tracking-tighter text-background"
        >
          На главную
        </button>

        {showSubmission && !submitted && (
          <GameSubmissionModal 
            gameType="Квиллионер"
            onClose={handleCloseSubmission}
            onSubmit={handleGameSubmission}
            userRole={profile?.role || 'player'}
          />
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  // Prize ladder component
  const PrizeLadder = ({ mobile = false }: { mobile?: boolean }) => {
    if (mobile) {
      return (
        <div className="lg:hidden rounded-2xl border border-primary/10 bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">Вопрос {currentIndex + 1}/15</span>
            <span className="text-sm font-black text-primary">{PRIZES[currentIndex].toLocaleString()} ₽</span>
          </div>
          <div className="flex gap-0.5">
            {PRIZES.map((prize, i) => (
              <motion.div
                key={i}
                animate={i === currentIndex ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={i === currentIndex ? { duration: 1, repeat: Infinity } : {}}
                className={`flex-1 h-2 rounded-full transition-all ${
                  i === currentIndex
                    ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary))]'
                    : i < currentIndex
                      ? 'bg-primary/40'
                      : SAFE_LEVELS.includes(i)
                        ? 'bg-primary/20 ring-1 ring-primary/30'
                        : 'bg-primary/10'
                }`}
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="hidden lg:block">
        <div className="sticky top-20 rounded-2xl border border-primary/20 bg-gradient-to-b from-[hsl(var(--card))]/90 to-[hsl(var(--background))]/90 backdrop-blur-sm p-4 space-y-1 shadow-xl">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 text-center mb-3">Лестница призов</p>
          {[...PRIZES].reverse().map((prize, reverseIdx) => {
            const i = 14 - reverseIdx;
            const isCurrent = i === currentIndex;
            const isPassed = i < currentIndex;
            const isSafe = SAFE_LEVELS.includes(i);
            const isAnimating = ladderTarget !== null && i === ladderTarget;
            
            return (
              <motion.div
                key={i}
                animate={isCurrent ? {
                  boxShadow: ['0 0 0px hsl(var(--primary))', '0 0 20px hsl(var(--primary))', '0 0 0px hsl(var(--primary))'],
                } : isAnimating ? {
                  boxShadow: ['0 0 0px hsl(var(--primary))', '0 0 30px hsl(var(--primary))', '0 0 0px hsl(var(--primary))'],
                  scale: [1, 1.08, 1],
                } : {}}
                transition={isCurrent || isAnimating ? { duration: 1.5, repeat: Infinity } : {}}
                className={`relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all overflow-hidden ${
                  isCurrent
                    ? 'bg-primary text-background scale-[1.03] shadow-lg shadow-primary/40 z-10'
                    : isPassed
                      ? 'bg-primary/20 text-primary'
                      : isSafe
                        ? 'bg-primary/10 text-primary/80 border border-primary/30'
                        : 'bg-primary/5 text-foreground/30'
                }`}
              >
                {/* Diamond decorations for safe levels */}
                {isSafe && (
                  <>
                    <span className="absolute left-1 text-[8px] text-primary/50">◆</span>
                  </>
                )}
                {/* Glow rays for current */}
                {isCurrent && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                )}
                <span className="w-5 text-center relative z-10">{i + 1}</span>
                <span className={`relative z-10 ${isCurrent ? 'text-background' : ''}`}>
                  {prize >= 1000000 ? '1M ₽' : prize >= 1000 ? `${(prize / 1000).toLocaleString()}K ₽` : `${prize} ₽`}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
      {/* Coin fly animation */}
      <AnimatePresence>
        {showCoinAnimation && (
          <motion.div
            initial={{ opacity: 1, x: '50vw', y: '50vh', scale: 1.5 }}
            animate={{ opacity: 0, x: 'calc(100vw - 120px)', y: '24px', scale: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="fixed z-[9999] pointer-events-none"
          >
            <div className="flex items-center gap-1 bg-primary/90 rounded-full px-3 py-1.5 text-background font-black text-sm shadow-lg shadow-primary/50">
              <Coins size={16} />
              <span>−1 ₽</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main game area */}
      <div className="space-y-6">
        <AnimatePresence>
          {/* Dramatic pause - popup for desktop */}
          {gameState === 'dramatic_pause' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mx-4 w-full max-w-md rounded-3xl border-2 border-primary/30 bg-card p-8 shadow-2xl shadow-primary/20"
              >
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.15, 1],
                      rotate: [0, 5, -5, 0]
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
                      className="relative h-24 w-24 rounded-3xl border-4 border-primary/50 object-cover shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                  <p className="mt-6 text-xl font-black uppercase tracking-tighter text-primary animate-pulse">
                    Проверяем ответ... ({pauseTimer}с)
                  </p>
                  <AnimatePresence mode="wait">
                    {hostPhrase && (
                      <motion.p
                        key={hostPhrase}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mt-4 text-sm italic text-foreground/70 min-h-[2.5rem]"
                      >
                        «{hostPhrase}»
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Feedback popup */}
          {gameState === 'feedback' && feedback && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-lg rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl"
              >
                <div className="flex flex-col items-center text-center">
                  {feedback.isCorrect ? (
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                      <CheckCircle2 size={48} />
                    </div>
                  ) : (
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                      <XCircle size={48} />
                    </div>
                  )}
                  
                  <h3 className={`text-3xl font-black uppercase tracking-tighter ${feedback.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                    {feedback.isCorrect ? 'Правильно!' : 'Неверно!'}
                  </h3>
                  
                  <div className="mt-6 max-h-48 overflow-y-auto pr-2 text-sm leading-relaxed text-foreground/80">
                    {feedback.explanation}
                  </div>

                  <button
                    onClick={handleFeedbackContinue}
                    className="mt-10 w-full rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
                  >
                    Продолжить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Ladder animation */}
          {gameState === 'ladder_animation' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <p className="text-6xl font-black text-primary drop-shadow-[0_0_30px_hsl(var(--primary))]">
                    {PRIZES[currentIndex].toLocaleString()} ₽
                  </p>
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-foreground/60"
                >
                  Уровень {currentIndex + 1} пройден!
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* Continue or take money choice */}
          {gameState === 'continue_choice' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl"
              >
                <div className="flex flex-col items-center text-center space-y-6">
                  <p className="text-4xl font-black text-primary">{PRIZES[currentIndex].toLocaleString()} ₽</p>
                  <p className="text-lg text-foreground/70">Играем дальше на {PRIZES[currentIndex + 1]?.toLocaleString()} ₽ или забираем деньги?</p>
                  
                  {SAFE_LEVELS.includes(currentIndex) && (
                    <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-2">
                      <p className="text-xs font-bold text-primary">◆ Несгораемая сумма достигнута!</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={handleContinuePlaying}
                      className="w-full rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
                    >
                      Играть дальше
                    </button>
                    <button
                      onClick={handleTakeMoney}
                      className="w-full rounded-full border-2 border-green-500 py-4 text-xl font-black uppercase tracking-tighter text-green-500 transition-transform hover:scale-105 hover:bg-green-500/10"
                    >
                      Забрать {PRIZES[currentIndex].toLocaleString()} ₽
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-primary/20 bg-card p-6 md:p-8 shadow-2xl"
        >
          <div className="text-center mb-4">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary/40">Вопрос {currentIndex + 1}/15</span>
            <span className="mx-2 text-primary/20">•</span>
            <span className="text-sm font-black text-primary">{PRIZES[currentIndex].toLocaleString()} ₽</span>
          </div>
          <p className="text-center text-lg md:text-xl font-bold leading-relaxed">{currentQuestion?.text}</p>
        </motion.div>

        {/* Options - diamond shaped buttons like reference */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {currentQuestion?.options?.map((opt: string, i: number) => {
            const isDisabled = disabledOptions.includes(opt);
            const isSelected = selectedOption === opt;
            const letter = ['A', 'B', 'C', 'D'][i];
            
            return (
              <motion.button
                key={i}
                whileHover={!isDisabled && !selectedOption ? { scale: 1.02 } : {}}
                whileTap={!isDisabled && !selectedOption ? { scale: 0.98 } : {}}
                onClick={() => handleOptionClick(opt)}
                disabled={isDisabled || !!selectedOption}
                className={`relative overflow-hidden rounded-2xl border-2 p-4 md:p-5 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/20 ring-2 ring-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.3)]'
                    : isDisabled
                      ? 'border-primary/5 bg-primary/5 opacity-30'
                      : 'border-primary/20 bg-card hover:border-primary/40 hover:bg-primary/10'
                }`}
              >
                {/* Decorative rays */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-primary/30" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-primary/30" />
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-black text-primary">
                    {letter}
                  </span>
                  <span className="font-bold text-sm md:text-base">{opt}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Hints */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={useFiftyFifty}
            disabled={!hints.fiftyFifty || !!selectedOption}
            className={`rounded-full border-2 px-5 py-2.5 text-sm font-black uppercase tracking-tighter transition-all ${
              hints.fiftyFifty && !selectedOption
                ? 'border-primary text-primary hover:bg-primary/10'
                : 'border-primary/20 text-primary/30'
            }`}
          >
            50:50
          </button>
          <button
            onClick={useAiHint}
            disabled={!hints.aiHint || !!selectedOption}
            className={`rounded-full border-2 px-5 py-2.5 text-sm font-black uppercase tracking-tighter transition-all ${
              hints.aiHint && !selectedOption
                ? 'border-primary text-primary hover:bg-primary/10'
                : 'border-primary/20 text-primary/30'
            }`}
          >
            Подсказка ИИ
          </button>
          <button
            onClick={() => setShowChatHelpInfo(true)}
            disabled={!hints.chatHelp || !!selectedOption}
            className={`rounded-full border-2 px-5 py-2.5 text-sm font-black uppercase tracking-tighter transition-all ${
              hints.chatHelp && !selectedOption
                ? 'border-primary text-primary hover:bg-primary/10'
                : 'border-primary/20 text-primary/30'
            }`}
          >
            💬 Помощь чата
          </button>
          {currentIndex > 0 && (
            <button
              onClick={handleTakeMoneyFromGame}
              disabled={!!selectedOption}
              className="rounded-full border-2 border-green-500 px-5 py-2.5 text-sm font-black uppercase tracking-tighter text-green-500 transition-all hover:bg-green-500/10"
            >
              Забрать {PRIZES[currentIndex - 1].toLocaleString()} ₽
            </button>
          )}
        </div>

        {/* AI Hint text */}
        {aiHintText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center"
          >
            <p className="text-sm font-bold text-primary">Подсказка ИИ:</p>
            <p className="mt-1 text-sm text-foreground/70">{aiHintText}</p>
          </motion.div>
        )}

        {/* Chat Help Info Modal */}
        <AnimatePresence>
          {showChatHelpInfo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-primary">Помощь чата</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  ИИ сгенерирует 3 последних сообщения из чата зрителей по текущему вопросу. 
                  Сообщения могут содержать: явные ответы (правильные или нет), косвенные намёки, 
                  а также случайные сообщения, спам или шутки. Используйте с осторожностью!
                </p>
                <div className="flex gap-3">
                  <button onClick={useChatHelp} className="flex-1 rounded-full bg-primary py-3 text-lg font-black uppercase text-background hover:scale-105 transition-transform">Использовать</button>
                  <button onClick={() => setShowChatHelpInfo(false)} className="flex-1 rounded-full border-2 border-primary/20 py-3 text-lg font-black uppercase text-primary/60 hover:bg-primary/10 transition-all">Отмена</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Chat Help Loading */}
          {chatHelpLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md">
              <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="relative">
                <div className="absolute -inset-4 animate-pulse rounded-full bg-primary/20 blur-xl" />
                <img src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" alt="Logo" className="relative h-24 w-24 rounded-3xl border-4 border-primary/50 object-cover shadow-2xl" referrerPolicy="no-referrer" />
              </motion.div>
              <p className="mt-6 text-xl font-black uppercase tracking-tighter text-primary animate-pulse">Загружаем чат... ({chatHelpTimer}с)</p>
            </motion.div>
          )}

          {/* Chat Help Result */}
          {chatHelpMessages && !chatHelpLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tighter text-primary">💬 Чат зрителей</h3>
                <div className="space-y-2">
                  {chatHelpMessages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }} className="rounded-2xl bg-primary/5 border border-primary/10 p-3">
                      <p className="text-sm text-foreground/80">{msg}</p>
                    </motion.div>
                  ))}
                </div>
                <button onClick={() => setChatHelpMessages(null)} className="w-full rounded-full bg-primary py-3 text-lg font-black uppercase text-background hover:scale-105 transition-transform">Закрыть</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Prize Ladder */}
      <PrizeLadder />
      <PrizeLadder mobile />
    </div>
  );
}
