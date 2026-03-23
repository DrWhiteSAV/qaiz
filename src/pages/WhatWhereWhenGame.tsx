import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, Send, AlertCircle, CheckCircle2, XCircle, Users, User, HelpCircle, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession } from '../supabase';

export function WhatWhereWhenGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const options = location.state || { mode: 'human', difficulty: 'genius', price: 33 };
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'feedback' | 'result'>(options ? 'loading' : 'setup');
  const [topic, setTopic] = useState(options.topic || 'Логика и факты');
  const [expertScore, setExpertScore] = useState(0);
  const [viewerScore, setViewerScore] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (options && gameState === 'loading' && questions.length === 0) {
      startLevel();
    }
  }, [gameState, questions.length]);

  const startLevel = async () => {
    if (!user || !profile) return;
    
    const cost = options.price || 33; 
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      setGameState('setup');
      return;
    }

    setGameState('loading');
    try {
      const generated = await geminiService.generateQuestions(topic, options.difficulty || 'genius', 11, 'whatwherewhen');
      setQuestions(generated);
      setGameState('playing');
      setTimeLeft(60);
    } catch (error) {
      console.error('Error generating questions:', error);
      setGameState('setup');
    }
  };

  const handleAnswer = async () => {
    if (checking || feedback || gameState !== 'playing') return;
    setChecking(true);
    
    const currentQuestion = questions[currentIndex];
    const result = await geminiService.checkAnswer(currentQuestion.text, userAnswer, currentQuestion.correctAnswer);
    setFeedback(result);
    
    // Deduct balance
    const questionCost = 1;
    await balanceService.deductBalance(user!.uid, questionCost);

    const newExpertScore = result.isCorrect ? expertScore + 1 : expertScore;
    const newViewerScore = !result.isCorrect ? viewerScore + 1 : viewerScore;

    if (result.isCorrect) {
      setExpertScore(newExpertScore);
    } else {
      setViewerScore(newViewerScore);
    }

    setChecking(false);
    setGameState('feedback');
  };

  const handleContinue = async () => {
    setFeedback(null);
    setUserAnswer('');
    
    if (expertScore >= 6 || viewerScore >= 6) {
      // Save session
      if (user) {
        await saveGameSession({
          userId: user.uid,
          gameId: 'whatwherewhen',
          score: expertScore * 1000,
          totalQuestions: expertScore + viewerScore,
          correctAnswers: expertScore,
          mode: options.mode,
          difficulty: options.difficulty,
          topic: options.topic || topic,
          pricePaid: options.price,
          isWin: expertScore >= 6
        });
      }
      setGameState('result');
    } else {
      setCurrentIndex(i => i + 1);
      setTimeLeft(60);
      setGameState('playing');
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !feedback && !checking) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing' && !feedback && !checking) {
      if (userAnswer.trim()) {
        handleAnswer();
      } else {
        setFeedback({ isCorrect: false, explanation: 'Время вышло! Вы не ввели ответ.' });
        setGameState('feedback');
      }
    }
  }, [timeLeft, gameState, feedback, checking, userAnswer]);

  if (gameState === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-primary/20 bg-primary/5 p-8">
        <div className="text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Что? Где? Квада?</h2>
          <p className="mt-2 text-foreground/60">Логические вопросы от телезрителей. Игра до 6 побед.</p>
        </div>
        <input 
          type="text" 
          value={topic} 
          onChange={e => setTopic(e.target.value)}
          placeholder="Тема игры..."
          className="w-full rounded-2xl border border-primary/20 bg-background p-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button 
          onClick={startLevel}
          className="w-full rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
        >
          Начать игру
        </button>
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
          <p className="text-xl font-black text-primary animate-pulse uppercase tracking-widest">Крутим волчок...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'result') {
    const expertWon = expertScore >= 6;
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 p-12 text-center">
        <h2 className="text-5xl font-black uppercase tracking-tighter text-primary">
          {expertWon ? 'Знатоки победили!' : 'Телезрители победили!'}
        </h2>
        <div className="mt-8 flex justify-center gap-12">
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-foreground/60">Знатоки</p>
            <p className="text-6xl font-black text-primary">{expertScore}</p>
          </div>
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-foreground/60">Зрители</p>
            <p className="text-6xl font-black text-red-500">{viewerScore}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="mt-12 rounded-full bg-primary px-12 py-4 text-xl font-black uppercase tracking-tighter text-background"
        >
          На главную
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  const difficultyNames: Record<string, string> = {
    'dummy': 'Для чайников',
    'people': 'Для людей',
    'genius': 'Для гениев',
    'god': 'Для богов'
  };

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
              ИИ проверяет ваш ответ...
            </p>
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

                <button
                  onClick={handleContinue}
                  className="mt-10 w-full rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
                >
                  Продолжить
                </button>
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
        <div className="flex items-center gap-2">
          <Zap className="text-primary" size={20} />
          <span className="text-sm font-bold uppercase tracking-wider text-primary/60">Сложность:</span>
          <span className="text-sm font-black uppercase tracking-wider text-primary">{difficultyNames[options.difficulty] || options.difficulty}</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <Users size={32} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">Знатоки</span>
            <span className="text-3xl font-black text-primary">{expertScore}</span>
          </div>
          <div className="text-3xl font-black text-foreground/20">:</div>
          <div className="flex flex-col items-center">
            <User size={32} className="text-red-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">Зрители</span>
            <span className="text-3xl font-black text-red-500">{viewerScore}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-6 py-3 text-primary">
          <Timer size={24} />
          <span className="text-2xl font-black">{timeLeft}с</span>
        </div>
      </div>

      <div className="relative min-h-[300px] rounded-3xl border border-primary/20 bg-background p-10 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Вопрос от телезрителя:</p>
        <h3 className="text-lg font-bold leading-tight sm:text-xl">{currentQuestion.text}</h3>
        
        <div className="mt-12 space-y-4">
          <label className="text-sm font-bold uppercase tracking-widest text-primary">Ваш ответ</label>
          <div className="flex gap-4">
            <input 
              type="text" 
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnswer()}
              disabled={checking || gameState !== 'playing'}
              placeholder="Введите ответ..."
              className="flex-1 rounded-2xl border border-primary/20 bg-background p-4 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <button 
              onClick={handleAnswer}
              disabled={checking || !userAnswer || gameState !== 'playing'}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-background transition-transform hover:scale-105 disabled:opacity-50"
            >
              {checking ? <Loader2 className="animate-spin" /> : <Send size={24} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
