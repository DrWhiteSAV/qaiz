import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, HelpCircle, Zap, AlertCircle, CheckCircle2, XCircle, Heart, Send, Loader2, RotateCcw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession } from '../supabase';
import { GameError } from '../components/GameError';

interface Answer {
  text: string;
  points: number;
  revealed: boolean;
}

export function OneHundredToOneGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const options = location.state || { mode: 'lite', difficulty: 'people', price: 40 };
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'feedback' | 'result' | 'error'>(options ? 'loading' : 'setup');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [topic, setTopic] = useState(options.topic || 'Общие знания');
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState<string>('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [checking, setChecking] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string, points?: number } | null>(null);

  useEffect(() => {
    if (options && gameState === 'loading' && question === '') {
      startLevel();
    }
  }, [gameState, question]);

  const startLevel = async () => {
    if (!user || !profile) return;
    
    const cost = options.price || 40; 
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      setGameState('setup');
      return;
    }

    setGameState('loading');
    try {
      await loadRound(1);
    } catch (error: any) {
      console.error('Error loading round:', error);
      setErrorMessage(error?.message || String(error));
      setGameState('error');
    }
  };

  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');

  const loadRound = async (roundNum: number) => {
    setGameState('loading');
    try {
      const data = await geminiService.generateQuestions(topic, options.difficulty || 'people', 1, '100to1');
      const gameData = Array.isArray(data) ? data[0] : data;
      
      setQuestion(gameData.question);
      setAnswers(gameData.answers.map((a: any) => ({ ...a, revealed: false })));
      setHintText(gameData.hint || 'Попробуйте подумать о самых частых ассоциациях.');
      setMistakes(0);
      setRound(roundNum);
      setGameState('playing');
      setShowHint(false);
      setFeedback(null);
      setUserAnswer('');
    } catch (error) {
      console.error('Error loading round:', error);
      setGameState('setup');
    }
  };

  const handleAnswer = async () => {
    if (checking || !userAnswer || gameState !== 'playing') return;
    setChecking(true);
    
    let foundIndex = -1;
    let bestExplanation = '';
    const questionCost = 1;

    try {
      // Deduct balance first
      await balanceService.deductBalance(user!.uid, questionCost);

      // Check against all unrevealed answers
      for (let i = 0; i < answers.length; i++) {
        if (answers[i].revealed) continue;
        
        const check = await geminiService.checkAnswer(question, userAnswer, answers[i].text);
        if (check.isCorrect) {
          foundIndex = i;
          bestExplanation = check.explanation;
          break;
        }
        if (!bestExplanation) bestExplanation = check.explanation;
      }

      if (foundIndex !== -1) {
        const newAnswers = [...answers];
        newAnswers[foundIndex].revealed = true;
        setAnswers(newAnswers);
        
        const multiplier = round === 1 ? 1 : round === 2 ? 2 : round === 3 ? 3 : -1;
        const points = multiplier === -1 ? answers[foundIndex].points : answers[foundIndex].points * multiplier;
        setScore(s => s + points);
        
        setFeedback({ isCorrect: true, explanation: bestExplanation, points });
      } else {
        setMistakes(m => m + 1);
        setFeedback({ isCorrect: false, explanation: bestExplanation });
      }

      setGameState('feedback');
    } catch (error) {
      console.error('Error checking answer:', error);
      // Refund if AI check failed
      await balanceService.addBalance(user!.uid, questionCost);
    } finally {
      setChecking(false);
    }
  };

  const handleContinue = async () => {
    setFeedback(null);
    setUserAnswer('');
    
    const allRevealed = answers.every(a => a.revealed);
    const tooManyMistakes = mistakes >= 3;

    if (allRevealed || tooManyMistakes) {
      if (round < 4) {
        await loadRound(round + 1);
      } else {
        // Save session
        if (user) {
          await saveGameSession({
            userId: user.uid,
            gameId: '100to1',
            score: score,
            totalQuestions: 4,
            correctAnswers: answers.filter(a => a.revealed).length,
            mode: options.mode,
            difficulty: options.difficulty,
            topic: options.topic || topic,
            pricePaid: options.price,
            isWin: score > 0
          });
        }
        setGameState('result');
      }
    } else {
      setGameState('playing');
    }
  };

  if (gameState === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-primary/20 bg-primary/5 p-8">
        <div className="text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Сто Квадному</h2>
          <p className="mt-2 text-foreground/60">Простые вопросы и 6 популярных ответов. 4 тура.</p>
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
          <p className="text-xl font-black text-primary animate-pulse uppercase tracking-widest">Опрос 100 человек...</p>
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
        <p className="mt-4 text-xl text-foreground/60">Ваш итоговый счет:</p>
        <p className="mt-2 text-7xl font-black text-primary">{score}</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-12 rounded-full bg-primary px-12 py-4 text-xl font-black uppercase tracking-tighter text-background"
        >
          На главную
        </button>
      </div>
    );
  }

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

                {feedback.isCorrect && feedback.points && (
                  <p className="mt-2 text-2xl font-black text-primary">
                    +{feedback.points} очков
                  </p>
                )}

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

      <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-primary/10 px-4 py-1 text-sm font-bold text-primary">
            ТУР {round}
            {round === 2 && ' (x2)'}
            {round === 3 && ' (x3)'}
            {round === 4 && ' (НАОБОРОТ)'}
          </div>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <XCircle 
                key={i} 
                size={24} 
                className={i < mistakes ? 'text-red-500' : 'text-foreground/20'} 
              />
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-foreground/60">Счет</p>
          <p className="text-2xl font-black text-primary">{score}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-primary/20 bg-background p-8 shadow-xl space-y-4">
        <h3 className="text-center text-lg font-bold leading-tight sm:text-xl">{question}</h3>
        <div className="flex justify-center">
          <button 
            onClick={() => setShowHint(true)}
            disabled={showHint}
            className="flex items-center gap-2 text-primary/60 hover:text-primary disabled:opacity-30"
          >
            <Zap size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Подсказка ИИ</span>
          </button>
        </div>
        {showHint && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/5 p-4 rounded-xl border border-primary/10">
            <p className="text-xs italic text-center text-primary/80">{hintText}</p>
          </motion.div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-1 max-w-xl mx-auto w-full">
        {answers.map((answer, idx) => (
          <div 
            key={idx}
            className={`flex h-16 items-center justify-between rounded-xl border-2 px-6 transition-all ${
              answer.revealed 
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-primary/10 bg-primary/5 text-primary/40'
            }`}
          >
            <span className="text-lg font-bold">
              {idx + 1}. {answer.revealed ? answer.text : '???'}
            </span>
            <span className={`text-xl font-black ${answer.revealed ? 'opacity-100' : 'opacity-60'}`}>
              {answer.points * (round === 4 ? 1 : (round || 1))}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          placeholder="Ваш вариант..."
          disabled={checking || gameState !== 'playing'}
          className="flex-1 rounded-2xl border border-primary/20 bg-background p-6 text-xl focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={e => e.key === 'Enter' && handleAnswer()}
        />
        <button 
          onClick={handleAnswer}
          disabled={!userAnswer || checking || gameState !== 'playing'}
          className="flex items-center justify-center rounded-2xl bg-primary px-8 text-background transition-transform hover:scale-105 disabled:opacity-50"
        >
          {checking ? <Loader2 className="animate-spin" /> : <Send size={24} />}
        </button>
      </div>
    </div>
  );
}
