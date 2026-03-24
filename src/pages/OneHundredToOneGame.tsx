import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, HelpCircle, Zap, AlertCircle, CheckCircle2, XCircle, Heart, Send, Loader2, RotateCcw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession, saveGameProgress, getGameProgress, deleteGameProgress } from '../supabase';
import { GameError } from '../components/GameError';

import { GameChat, ChatMessage } from '../components/GameChat';
import { AI_TEMPLATES, AITemplate } from '../constants';
import { GameSubmissionModal } from '../components/GameSubmissionModal';

interface Answer {
  text: string;
  points: number;
  revealed: boolean;
  hint?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

interface Player {
  id: string;
  name: string;
  score: number;
  isBot: boolean;
  avatar?: string;
  personality?: string;
  difficulty?: string;
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
  const [players, setPlayers] = useState<Player[]>(() => {
    const p: Player[] = [{ id: '1', name: profile?.displayName || 'Игрок 1', score: 0, isBot: false }];
    if (options.playMode === 'ai' && options.aiOpponents) {
      options.aiOpponents.forEach((aiId: string, idx: number) => {
        const template = AI_TEMPLATES.find(t => t.id === aiId);
        if (template) {
          p.push({ 
            id: `bot-${idx}`, 
            name: template.name, 
            score: 0, 
            isBot: true,
            avatar: template.avatar,
            personality: template.personality,
            difficulty: template.difficulty
          });
        }
      });
    } else if (options.playMode === 'ai') {
      p.push({ id: '2', name: 'Кибер-Жаба', score: 0, isBot: true });
    }
    return p;
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [question, setQuestion] = useState<string>('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkTimer, setCheckTimer] = useState(0);
  const [checkInterval, setCheckInterval] = useState<any>(null);

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
  const [hintUsed, setHintUsed] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string, points?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasProgress, setHasProgress] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !options.packId) return;
      const progress = await getGameProgress(user.uid, options.packId, '100to1');
      if (progress) {
        setHasProgress(true);
      }
    };
    loadProgress();
  }, [user, options.packId]);

  // Save progress whenever state changes
  useEffect(() => {
    const saveProgress = async () => {
      if (gameState === 'playing' && user && options.packId && question !== '') {
        await saveGameProgress({
          userId: user.uid,
          packId: options.packId,
          gameType: '100to1',
          currentStep: round,
          totalSteps: 3,
          state: {
            round,
            players,
            question,
            answers,
            mistakes,
            currentPlayerIndex,
            chatMessages,
            topic
          }
        });
      }
    };
    saveProgress();
  }, [round, players, question, answers, mistakes, currentPlayerIndex, gameState, user, options.packId, chatMessages, topic]);

  const handleResume = async () => {
    if (!user || !options.packId) return;
    setLoading(true);
    try {
      const progress = await getGameProgress(user.uid, options.packId, '100to1');
      if (progress && progress.state) {
        const { round, players, question, answers, mistakes, currentPlayerIndex, chatMessages, topic } = progress.state;
        setRound(round);
        setPlayers(players);
        setQuestion(question);
        setAnswers(answers);
        setMistakes(mistakes);
        setCurrentPlayerIndex(currentPlayerIndex);
        setChatMessages(chatMessages || []);
        setTopic(topic);
        setGameState('playing');
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

  const addBotMessage = useCallback(async (botPlayer: Player, event: string, isCorrect: boolean) => {
    if (!botPlayer.personality) return;
    
    try {
      const comment = await geminiService.generateAIComment(
        botPlayer.personality,
        event,
        question,
        '', // No specific answer for 100to1 as it's multiple
        isCorrect
      );
      
      const newMessage: ChatMessage = {
        id: `bot-msg-${Date.now()}`,
        senderId: botPlayer.id,
        senderName: botPlayer.name,
        text: comment,
        isBot: true,
        avatar: botPlayer.avatar,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Error generating bot message:', error);
    }
  }, [question]);

  const handleAnswer = async (overrideAnswer?: string) => {
    const answerToSubmit = overrideAnswer || userAnswer;
    if (checking || !answerToSubmit || gameState !== 'playing') return;
    setChecking(true);
    startCheckTimer();
    
    let foundIndex = -1;
    let bestExplanation = '';
    const questionCost = options.isPurchased ? 0 : 3;

    try {
      // Deduct balance first
      if (!overrideAnswer && questionCost > 0) {
        await balanceService.deductBalance(user!.uid, questionCost);
      }

      // Check against all unrevealed answers
      for (let i = 0; i < answers.length; i++) {
        if (answers[i].revealed) continue;
        
        const check = await geminiService.checkAnswer(question, answerToSubmit, answers[i].text);
        if (check.isCorrect) {
          foundIndex = i;
          bestExplanation = check.explanation;
          break;
        }
        if (!bestExplanation) bestExplanation = check.explanation;
      }

      const currentPlayer = players[currentPlayerIndex];
      if (currentPlayer.isBot) {
        addBotMessage(currentPlayer, foundIndex !== -1 ? 'ответил правильно' : 'ошибся в ответе', foundIndex !== -1);
      }

      if (foundIndex !== -1) {
        const newAnswers = [...answers];
        newAnswers[foundIndex].revealed = true;
        setAnswers(newAnswers);
        
        const multiplier = round === 1 ? 1 : round === 2 ? 2 : round === 3 ? 3 : -1;
        const points = multiplier === -1 ? answers[foundIndex].points : answers[foundIndex].points * multiplier;
        
        setPlayers(prev => prev.map((p, idx) => {
          if (idx === currentPlayerIndex) {
            return { ...p, score: p.score + points };
          }
          return p;
        }));
        
        setFeedback({ isCorrect: true, explanation: bestExplanation, points });
      } else {
        setMistakes(m => m + 1);
        setFeedback({ isCorrect: false, explanation: bestExplanation });
      }

      setGameState('feedback');
      stopCheckTimer();
    } catch (error) {
      console.error('Error checking answer:', error);
      // Refund if AI check failed
      if (!overrideAnswer) {
        await balanceService.addBalance(user!.uid, questionCost);
      }
      stopCheckTimer();
    } finally {
      setChecking(false);
    }
  };

  // AI Turn Logic
  useEffect(() => {
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer.isBot && gameState === 'playing' && !checking && !feedback) {
      const timer = setTimeout(async () => {
        const difficulty = currentPlayer.difficulty || options.difficulty || 'people';
        let successProbability = 0.5;
        
        switch(difficulty) {
          case 'dummy': successProbability = 0.2; break;
          case 'people': successProbability = 0.4; break;
          case 'genius': successProbability = 0.7; break;
          case 'god': successProbability = 0.9; break;
        }

        const shouldSucceed = Math.random() < successProbability;
        
        if (shouldSucceed) {
          // Pick an unrevealed answer
          const unrevealed = answers.filter(a => !a.revealed);
          if (unrevealed.length > 0) {
            const randomAnswer = unrevealed[Math.floor(Math.random() * unrevealed.length)];
            handleAnswer(randomAnswer.text);
          } else {
            handleAnswer('Я не знаю');
          }
        } else {
          // Give a wrong answer
          handleAnswer('Лягушка в космосе');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentPlayerIndex, gameState, checking, feedback, answers, options.difficulty, players]);

  const handleContinue = async () => {
    const wasCorrect = feedback?.isCorrect;
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
          const userScore = players.find(p => !p.isBot)?.score || 0;
          const botScore = players.find(p => p.isBot)?.score || 0;
          
          await saveGameSession({
            userId: user.uid,
            gameId: '100to1',
            score: userScore,
            totalQuestions: 4,
            correctAnswers: answers.filter(a => a.revealed).length,
            mode: options.mode,
            difficulty: options.difficulty,
            topic: options.topic || topic,
            pricePaid: options.price,
            isWin: userScore > botScore
          });
          if (options.packId) {
            await deleteGameProgress(user.uid, options.packId, '100to1');
          }
        }
        setGameState('result');
        setShowSubmission(true);
      }
    } else {
      // In 100 to 1, player continues if they are right.
      if (!wasCorrect) {
        setCurrentPlayerIndex(prev => (prev + 1) % players.length);
      }
      setGameState('playing');
    }
  };

  const handleGameSubmission = async (data: any) => {
    // Logic to save game to shop
    console.log('Submitting game to shop:', data);
    setSubmitted(true);
    setShowSubmission(false);
  };

  const handleCloseSubmission = () => {
    // If closed without info, add automatically as free for 100to1
    console.log('Submission closed, adding automatically as free');
    setSubmitted(true);
    setShowSubmission(false);
  };

  if (gameState === 'setup' || (options && gameState === 'loading' && question === '')) {
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
    const userScore = players.find(p => !p.isBot)?.score || 0;
    const botScore = players.find(p => p.isBot)?.score || 0;
    const isWin = userScore > botScore;

    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 p-12 text-center space-y-8">
        <h2 className="text-5xl font-black uppercase tracking-tighter text-primary">
          {isWin ? 'Победа!' : 'Поражение!'}
        </h2>
        <div className="space-y-4">
          {players.map(p => (
            <div key={p.id} className="flex justify-between items-center p-4 rounded-2xl bg-background/40 border border-primary/10">
              <span className="text-xl font-bold">{p.name}</span>
              <span className="text-3xl font-black text-primary">{p.score}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={async () => {
              if (user && options.packId) await deleteGameProgress(user.uid, options.packId, '100to1');
              window.location.reload();
            }} 
            className="btn-primary flex-1 py-4 text-xl"
          >
            Сыграть Еще
          </button>
          <button 
            onClick={async () => {
              if (user && options.packId) await deleteGameProgress(user.uid, options.packId, '100to1');
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
    );
  }

  const difficultyNames: Record<string, string> = {
    'dummy': 'ИИкра',
    'people': 'Головастик',
    'genius': 'Квант',
    'god': 'Ляга-омега'
  };

  return (
    <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3 space-y-6">
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
          <div className="flex gap-4">
            {players.map((p, idx) => (
              <div key={p.id} className={`text-right p-2 rounded-xl transition-all ${idx === currentPlayerIndex ? 'bg-primary/20 ring-1 ring-primary' : ''}`}>
                <p className="text-[10px] uppercase tracking-widest text-foreground/60">{p.name}</p>
                <p className="text-xl font-black text-primary">{p.score}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-background p-8 shadow-xl space-y-4">
          <h3 className="text-center text-lg font-bold leading-tight sm:text-xl">{question}</h3>
          <div className="flex justify-center flex-col items-center gap-4">
            <button 
              onClick={() => setShowHint(true)}
              disabled={showHint}
              className="flex items-center gap-2 text-primary/60 hover:text-primary disabled:opacity-30"
            >
              <Zap size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Подсказка ИИ</span>
            </button>

            {mistakes >= 1 && (
              <div className="space-y-2 w-full max-w-md">
                <p className="text-[10px] font-black uppercase text-foreground/40 text-center">Наводки по закрытым ответам:</p>
                <div className="grid gap-2">
                  {answers.map((a, i) => !a.revealed && (
                    <div key={i} className="bg-primary/5 p-2 rounded-lg border border-primary/10 text-[10px] italic text-primary/60">
                      Ответ {i + 1}: {a.hint || 'Нет наводки'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {showHint && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <p className="text-xs italic text-center text-primary/80">{hintText}</p>
            </motion.div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-1 max-w-xl mx-auto w-full">
          {answers.map((answer, idx) => (
            <div key={idx} className="space-y-2">
              <div 
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
              
              <AnimatePresence>
                {answer.revealed && answer.mediaUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-xl border border-primary/20 bg-background/40"
                  >
                    {answer.mediaType === 'video' ? (
                      <video 
                        src={answer.mediaUrl} 
                        controls 
                        autoPlay 
                        className="w-full aspect-video object-cover"
                      />
                    ) : (
                      <img 
                        src={answer.mediaUrl} 
                        alt={answer.text} 
                        className="w-full h-48 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            placeholder={players[currentPlayerIndex].isBot ? "ИИ думает..." : "Ваш вариант..."}
            disabled={checking || gameState !== 'playing' || players[currentPlayerIndex].isBot}
            className="flex-1 rounded-2xl border border-primary/20 bg-background p-6 text-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            onKeyDown={e => e.key === 'Enter' && handleAnswer()}
          />
          <button 
            onClick={() => handleAnswer()}
            disabled={!userAnswer || checking || gameState !== 'playing' || players[currentPlayerIndex].isBot}
            className="flex items-center justify-center rounded-2xl bg-primary px-8 text-background transition-transform hover:scale-105 disabled:opacity-50"
          >
            {checking ? <Loader2 className="animate-spin" /> : <Send size={24} />}
          </button>
        </div>
      </div>

      {(options.playMode === 'ai' || options.playMode === 'multi') && (
        <div className="lg:col-span-1 h-[400px] lg:h-auto">
          <GameChat 
            messages={chatMessages} 
            onSendMessage={handleSendMessage} 
            currentUser={{ id: '1', name: profile?.displayName || 'Игрок 1' }} 
          />
        </div>
      )}
    </div>
  );
}
