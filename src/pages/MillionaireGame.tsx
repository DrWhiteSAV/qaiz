import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, HelpCircle, Zap, AlertCircle, CheckCircle2, XCircle, RotateCcw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession, saveGameProgress, getGameProgress, deleteGameProgress } from '../supabase';
import { GameError } from '../components/GameError';

import { GameChat, ChatMessage } from '../components/GameChat';

import { GameSubmissionModal } from '../components/GameSubmissionModal';

const PRIZES = [
  100, 200, 300, 500, 1000, // 5: Safety net
  2000, 4000, 8000, 16000, 32000, // 10: Safety net
  64000, 125000, 250000, 500000, 1000000
];

export function MillionaireGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const options = location.state || { mode: 'lite', difficulty: 'people', price: 30, packId: 'pack4' };
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'feedback' | 'result' | 'error'>('setup');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [topic, setTopic] = useState(options.topic || 'Общие знания');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkTimer, setCheckTimer] = useState(0);
  const [checkInterval, setCheckInterval] = useState<any>(null);
  const [hints, setHints] = useState({ fiftyFifty: true, aiHint: true });

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
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [aiHintText, setAiHintText] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hasProgress, setHasProgress] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !options.packId) return;
      const progress = await getGameProgress(user.uid, options.packId, 'millionaire');
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
      const progress = await getGameProgress(user.uid, options.packId, 'millionaire');
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

  const handleSendMessage = (text: string) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: '1',
      senderName: profile?.displayName || 'Игрок 1',
      text,
      isBot: false,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, newMessage]);
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
      // Generate all 15 questions at once
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

  const handleOptionClick = async (option: string) => {
    if (feedback || selectedOption || gameState !== 'playing' || checking) return;
    setSelectedOption(option);
    setChecking(true);
    startCheckTimer();
    
    const currentQuestion = questions[currentIndex];
    const questionCost = options.isPurchased ? 0 : 3;
    
    try {
      // Deduct balance first
      if (questionCost > 0) {
        await balanceService.deductBalance(user!.uid, questionCost);
      }
      
      const result = await geminiService.checkAnswer(currentQuestion.text, option, currentQuestion.correctAnswer);
      const isCorrect = result.isCorrect;
      
      setFeedback({ 
        isCorrect, 
        explanation: result.explanation || (isCorrect ? 'Правильный ответ!' : `Неверно. Правильный ответ: ${currentQuestion.correctAnswer}`)
      });

      setGameState('feedback');
      stopCheckTimer();
    } catch (error) {
      console.error('Error checking answer:', error);
      // Refund if AI check failed
      if (questionCost > 0) {
        await balanceService.addBalance(user!.uid, questionCost);
      }
      setSelectedOption(null);
      stopCheckTimer();
    } finally {
      setChecking(false);
    }
  };

  const handleContinue = async () => {
    if (!feedback) return;

    if (feedback.isCorrect) {
      setScore(PRIZES[currentIndex]);
      if (currentIndex < 14) {
        setCurrentIndex(i => i + 1);
        setSelectedOption(null);
        setFeedback(null);
        setDisabledOptions([]);
        setAiHintText(null);
        setGameState('playing');
      } else {
        // Win!
        await finishGame(true, PRIZES[14]);
      }
    } else {
      // Calculate safety net score
      let finalScore = 0;
      if (currentIndex >= 10) finalScore = PRIZES[9];
      else if (currentIndex >= 5) finalScore = PRIZES[4];
      await finishGame(false, finalScore);
    }
  };

  const handleTakeMoney = async () => {
    const currentPrize = currentIndex > 0 ? PRIZES[currentIndex - 1] : 0;
    await finishGame(true, currentPrize);
  };

  const finishGame = async (isWin: boolean, finalScore: number) => {
    setScore(finalScore);
    if (user) {
      await saveGameSession({
        userId: user.uid,
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
        await deleteGameProgress(user.uid, options.packId, 'millionaire');
      }
    }
    setGameState('result');
    setShowSubmission(true);
  };

  const handleGameSubmission = async (data: any) => {
    // Logic to save game to shop
    console.log('Submitting game to shop:', data);
    setSubmitted(true);
    setShowSubmission(false);
    // In a real app, this would call a service to save to Supabase/Firestore
  };

  const handleCloseSubmission = () => {
    // If closed without info, add automatically as free for Millionaire
    console.log('Submission closed, adding automatically as free');
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
    setAiHintText("ИИ думает...");
    // Mock AI hint for now, or use Gemini
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
          <button 
            onClick={startLevel}
            className="w-full rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
          >
            Начать новую игру
          </button>
          {hasProgress && (
            <button 
              onClick={handleResume}
              className="w-full rounded-full border-2 border-primary py-4 text-xl font-black uppercase tracking-tighter text-primary transition-transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <RotateCcw size={24} />
              Продолжить игру
            </button>
          )}
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
          className="relative w-full max-w-[70vw] md:max-w-[40vw] aspect-square flex items-center justify-center"
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
          <p className="text-xl font-black text-primary animate-pulse uppercase tracking-widest">Подготовка вопросов...</p>
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
      <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 p-12 text-center">
        <h2 className="text-5xl font-black uppercase tracking-tighter text-primary">Игра окончена!</h2>
        <p className="mt-4 text-xl text-foreground/60">Ваш выигрыш:</p>
        <p className="mt-2 text-7xl font-black text-primary">{score} ₽</p>
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
          />
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
                    onClick={() => handleOptionClick(selectedOption!)}
                    className="px-8 py-3 bg-primary text-background rounded-full font-black uppercase tracking-tighter hover:scale-105 transition-transform"
                  >
                    Еще раз
                  </button>
                  <button 
                    onClick={() => {
                      setChecking(false);
                      setFeedback({ isCorrect: false, explanation: 'Проверка пропущена пользователем.' });
                      setGameState('feedback');
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

                <div className="mt-10 flex w-full flex-col gap-4 sm:flex-row">
                  <button
                    onClick={handleContinue}
                    className="flex-1 rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
                  >
                    Продолжить
                  </button>
                  {feedback.isCorrect && currentIndex < 14 && (
                    <button
                      onClick={handleTakeMoney}
                      className="flex-1 rounded-full border-2 border-primary py-4 text-xl font-black uppercase tracking-tighter text-primary transition-transform hover:scale-105"
                    >
                      Забрать деньги
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="text-primary" size={20} />
          <span className="text-sm font-bold uppercase tracking-wider text-primary/60">Тема:</span>
          <span className="text-sm font-black uppercase tracking-wider text-primary">{topic}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={useFiftyFifty}
                disabled={!hints.fiftyFifty || !!feedback}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-background text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                50/50
              </button>
              <button 
                onClick={useAiHint}
                disabled={!hints.aiHint || !!feedback}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-background text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                <Zap size={20} />
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-foreground/60">Текущий приз</p>
              <AnimatePresence mode="wait">
                <motion.p 
                  key={currentIndex}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 1.1 }}
                  className="text-2xl font-black text-primary"
                >
                  {PRIZES[currentIndex]} ₽
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="relative min-h-[200px] rounded-3xl border border-primary/20 bg-background p-8 shadow-xl">
            <h3 className="text-lg font-bold leading-tight sm:text-xl">{currentQuestion.text}</h3>
            {aiHintText && (
              <div className="mt-4 rounded-xl bg-primary/5 p-4 text-sm italic text-primary">
                Подсказка ИИ: {aiHintText}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
            {currentQuestion.options.map((option: string, idx: number) => {
              const isSelected = selectedOption === option;
              const isCorrect = feedback && option === currentQuestion.correctAnswer;
              const isWrong = feedback && isSelected && !isCorrect;
              const isDisabled = disabledOptions.includes(option);

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(option)}
                  disabled={!!feedback || isDisabled}
                  className={`relative flex items-center text-left p-3 sm:p-5 rounded-2xl border-2 transition-all duration-300 group min-h-[80px] sm:min-h-[100px] ${
                    isDisabled ? 'opacity-0 pointer-events-none' :
                    isCorrect ? 'border-green-500 bg-green-500/10 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' :
                    isWrong ? 'border-red-500 bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' :
                    isSelected ? 'border-primary bg-primary/20 animate-pulse' :
                    'border-primary/20 bg-background/40 hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-4 w-full">
                    <span className="text-primary font-black text-sm sm:text-xl shrink-0">
                      {String.fromCharCode(65 + idx)}:
                    </span>
                    <span className="text-xs sm:text-lg font-bold text-foreground leading-tight break-words">
                      {option}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile Prizes List - Moved to bottom */}
          <div className="lg:hidden mt-12 space-y-1 rounded-3xl border border-primary/20 bg-primary/5 p-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-2 px-3">Этапы игры</h4>
            {PRIZES.slice().reverse().map((prize, idx) => {
              const level = 14 - idx;
              const isCurrent = level === currentIndex;
              const isSafety = level === 4 || level === 9 || level === 14;
              
              return (
                <div 
                  key={level}
                  className={`flex justify-between rounded-lg px-3 py-1 text-sm font-bold ${
                    isCurrent ? 'bg-primary text-background' : 
                    isSafety ? 'text-primary' : 'text-foreground/40'
                  }`}
                >
                  <span>{level + 1}</span>
                  <span>{prize} ₽</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-4">
          <div className="space-y-1 rounded-3xl border border-primary/20 bg-primary/5 p-4">
            {PRIZES.slice().reverse().map((prize, idx) => {
              const level = 14 - idx;
              const isCurrent = level === currentIndex;
              const isSafety = level === 4 || level === 9 || level === 14;
              
              return (
                <div 
                  key={level}
                  className={`flex justify-between rounded-lg px-3 py-1 text-sm font-bold ${
                    isCurrent ? 'bg-primary text-background' : 
                    isSafety ? 'text-primary' : 'text-foreground/40'
                  }`}
                >
                  <span>{level + 1}</span>
                  <span>{prize} ₽</span>
                </div>
              );
            })}
          </div>

          {options.playMode === 'multi' && (
            <div className="h-[300px]">
              <GameChat 
                messages={chatMessages} 
                onSendMessage={handleSendMessage} 
                currentUser={{ id: '1', name: profile?.displayName || 'Игрок 1' }} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
