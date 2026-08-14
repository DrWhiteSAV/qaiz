import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { CoinAnimation } from '../components/CoinAnimation';
import { useFrogSound } from '../hooks/useSound';
import { Trophy, Star, User, Zap, Gift, Gavel, Trash2, Info, X, CheckCircle2, XCircle, HelpCircle, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession, saveGameProgress, getGameProgress, deleteGameProgress } from '../db';
import { protalkService } from '../services/protalk';
import { balanceService } from '../services/balanceService';
import { Loader2, Timer, Lightbulb, RotateCcw, Home } from 'lucide-react';
import { GameError } from '../components/GameError';
import { GenerationLoadingScreen } from '../components/GenerationLoadingScreen';
import { TopicRevealScreen } from '../components/TopicRevealScreen';

import { GameChat, ChatMessage } from '../components/GameChat';
import { AI_TEMPLATES, AITemplate } from '../lib/gameHelpers';

interface Question {
  id: string;
  category: string;
  value: number;
  question: string;
  answer: string;
  hint?: string;
  explanation?: string;
  isAnswered: boolean;
  type: 'normal' | 'cat' | 'auction';
}

interface Category {
  name: string;
  description: string;
  questions: Question[];
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

const ROUND_CONFIGS = [
  { multiplier: 1, baseValues: [100, 200, 300, 400, 500], description: 'Первый раунд: Разминка. Стандартные вопросы.' },
  { multiplier: 2, baseValues: [100, 200, 300, 400, 500], description: 'Второй раунд: Ставки растут. Вопросы становятся сложнее.' },
  { multiplier: 3, baseValues: [100, 200, 300, 400, 500], description: 'Третий раунд: Финишная прямая. Максимальные баллы.' },
];

import { GameSubmissionModal } from '../components/GameSubmissionModal';

export const JeopardyGame: React.FC = () => {
  const { profile, user } = useAuth();
  const { playCroak } = useFrogSound();
  const location = useLocation();
  const navigate = useNavigate();
  const options = location.state || { mode: 'lite', price: 40, packId: 'pack2' };
  
  const [round, setRound] = useState(1);
  const [players, setPlayers] = useState<Player[]>(() => {
    const p: Player[] = [{ id: '1', name: profile?.display_name || 'Игрок 1', score: 0, isBot: false }];
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
  const [answeringPlayerIndex, setAnsweringPlayerIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [gameState, setGameState] = useState<'loading' | 'lobby' | 'playing' | 'category_reveal' | 'special' | 'final_bet' | 'final_elimination' | 'final_question' | 'game_over' | 'finished' | 'feedback' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation: string; points?: number } | null>(null);
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [generatingRound, setGeneratingRound] = useState(false);
  const [generationTimer, setGenerationTimer] = useState(40);
  const [checking, setChecking] = useState(false);
  const [checkTimer, setCheckTimer] = useState(0);
  const checkIntervalRef = useRef<any>(null);
  const checkingRef = useRef(false);

  const startCheckTimer = () => {
    setCheckTimer(30);
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    checkIntervalRef.current = setInterval(() => {
      setCheckTimer(prev => {
        if (prev <= 1) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCheckTimer = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    setCheckTimer(0);
  };

  const [showSubmission, setShowSubmission] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Special Question States
  const [specialType, setSpecialType] = useState<'cat' | 'auction' | null>(null);
  const [auctionBet, setAuctionBet] = useState(0);
  const [auctionHighBidder, setAuctionHighBidder] = useState<number | null>(null);

  // Final Round States
  const [finalCategories, setFinalCategories] = useState<string[]>([]);
  const [finalBets, setFinalBets] = useState<Record<string, number>>({});

  const [showCategoryInfo, setShowCategoryInfo] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState(40);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasProgress, setHasProgress] = useState(false);
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, []);

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      if (!user || !options.packId) return;
      const progress = await getGameProgress(profile?.uid ?? "", options.packId, 'jeopardy');
      if (progress) {
        setHasProgress(true);
      }
    };
    loadProgress();
  }, [user, options.packId]);

  // Save progress whenever state changes
  useEffect(() => {
    const saveProgress = async () => {
      if (gameState === 'playing' && user && options.packId && categories.length > 0) {
        await saveGameProgress({
          userId: profile?.uid ?? "",
          packId: options.packId,
          gameType: 'jeopardy',
          currentStep: round,
          totalSteps: 3,
          state: {
            round,
            players,
            categories,
            currentPlayerIndex,
            chatMessages
          }
        });
      }
    };
    saveProgress();
  }, [round, players, categories, currentPlayerIndex, gameState, user, options.packId, chatMessages]);

  const handleResume = async () => {
    if (!user || !options.packId) return;
    setLoading(true);
    try {
      const progress = await getGameProgress(profile?.uid ?? "", options.packId, 'jeopardy');
      if (progress && progress.state) {
        const { round, players, categories, currentPlayerIndex, chatMessages } = progress.state;
        setRound(round);
        setPlayers(players);
        setCategories(categories);
        setCurrentPlayerIndex(currentPlayerIndex);
        setChatMessages(chatMessages || []);
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

  // Generate all 25 questions in one request
  const startRoundQuestions = async () => {
    setGeneratingRound(true);
    setGenerationTimer(100);
    const timer = setInterval(() => setGenerationTimer(prev => Math.max(0, prev - 1)), 1000);
    
    try {
      const values = ROUND_CONFIGS[round - 1].baseValues.map(v => v * round);
      
      // Try unified generation first
      let allQuestionsData: { categoryName: string; questions: any[] }[];
      try {
        allQuestionsData = await protalkService.generateAllJeopardyQuestions(
          categories.map(c => ({ name: c.name, description: c.description })),
          round,
          values
        );
      } catch {
        // Fallback: generate per category
        allQuestionsData = await Promise.all(categories.map(async (cat) => {
          const questionsData = await protalkService.generateJeopardyQuestions(cat.name, cat.description, values);
          return { categoryName: cat.name, questions: questionsData };
        }));
      }

      const updatedCategories = categories.map((cat, catIdx) => {
        const catData = allQuestionsData.find(d => d.categoryName === cat.name) || allQuestionsData[catIdx];
        if (!catData) return cat;

        // Randomly assign special types (1 cat and 1 auction per round)
        const catInBagIdx = Math.floor(Math.random() * 5);
        const auctionIdx = (catInBagIdx + Math.floor(Math.random() * 4) + 1) % 5;

        return {
          ...cat,
          questions: cat.questions.map((q, idx) => {
            const data = catData.questions?.find((qd: any) => qd.value === q.value) || catData.questions?.[idx];
            let type: 'normal' | 'cat' | 'auction' = 'normal';
            if (round < 3) {
              if (idx === catInBagIdx && Math.random() < 0.2) type = 'cat';
              else if (idx === auctionIdx && Math.random() < 0.2) type = 'auction';
            }

            return {
              ...q,
              question: data?.text || '',
              answer: data?.answer || '',
              hint: data?.hint || '',
              explanation: data?.explanation || '',
              type
            };
          })
        };
      });
      
      setCategories(updatedCategories);
      setGameState('playing');
    } catch (error) {
      console.error('Error generating jeopardy questions:', error);
      setErrorMessage('Не удалось сгенерировать вопросы. Попробуйте еще раз.');
      setGameState('error');
    } finally {
      clearInterval(timer);
      setGeneratingRound(false);
    }
  };

  const startLevel = async () => {
    if (!user || !profile) return;
    
    const cost = options.price || 40; 
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      setGameState('lobby');
      return;
    }

    setGameState('loading');
    setLoading(true);
    try {
      await generateRoundCategories(1);
    } catch (error: any) {
      console.error('Error starting jeopardy:', error);
      setErrorMessage(error?.message || String(error));
      setGameState('error');
    } finally {
      setLoading(false);
    }
  };

  // Store all 15 topics for 3 rounds
  const [allTopics, setAllTopics] = useState<{name: string, description: string}[]>([]);
  const [topicRevealIndex, setTopicRevealIndex] = useState(0);
  const [showTopicReveal, setShowTopicReveal] = useState(false);

  const generateRoundCategories = useCallback(async (roundNum: number) => {
    if (roundNum > 3) return;
    setGeneratingRound(true);
    setGenerationTimer(100);
    const timer = setInterval(() => setGenerationTimer(prev => Math.max(0, prev - 1)), 1000);
    
    try {
      const topic = options.topic || 'Разные темы';
      
      if (allTopics.length === 0) {
        // First round: generate all 15 topics at once
        const prompt = `Сгенерируй 15 уникальных и интересных категорий для игры "Своя Икра" на тему "${topic}". 
          Для каждой категории придумай название и краткое описание (1 предложение).
          Названия должны быть краткими (1-3 слова). Все 15 тем должны быть РАЗНЫМИ.
          Верни JSON массив из 15 объектов с полями: name, description.`;
        const allCats = await protalkService.generateJeopardyCategories(topic, 'auto');
        // If AI returned less than 15, pad with generated ones
        let cats = allCats;
        if (cats.length < 15) {
          const extra = await protalkService.generateJeopardyCategories(topic, 'auto');
          cats = [...cats, ...extra].slice(0, 15);
        }
        // Take first 15
        cats = cats.slice(0, 15);
        setAllTopics(cats);
        
        // Show animated topic reveal
        setTopicRevealIndex(0);
        setShowTopicReveal(true);
        clearInterval(timer);
        setGeneratingRound(false);
        
        // Start the reveal animation - topics appear one by one
        return;
      }
      
      // Rounds 2-3: pick unused topics
      const usedNames = categories.map(c => c.name);
      const unusedTopics = allTopics.filter(t => !usedNames.includes(t.name));
      const roundTopics = unusedTopics.slice(0, 5);
      
      const newCategories = roundTopics.map((cat, catIdx) => {
        const questions = [100, 200, 300, 400, 500].map((val, qIdx) => ({
          id: `${roundNum}-${catIdx}-${qIdx}`,
          category: cat.name,
          value: val * roundNum,
          question: '',
          answer: '',
          isAnswered: false,
          type: 'normal' as const
        }));
        return { name: cat.name, description: cat.description, questions };
      });
      setCategories(newCategories);
      setGameState('category_reveal');
    } catch (error) {
      console.error('Error generating jeopardy categories:', error);
      throw error;
    } finally {
      clearInterval(timer);
      setGeneratingRound(false);
    }
  }, [options.topic, allTopics, categories]);

  useEffect(() => {
    if (gameState === 'loading' && !loading && !generatingRound && categories.length === 0) {
      startLevel();
    }
  }, [gameState, loading, generatingRound, categories.length]);

  useEffect(() => {
    if (
      gameState === 'category_reveal' &&
      !generatingRound &&
      categories.length > 0 &&
      categories.every((cat) => cat.questions.every((q) => !q.question))
    ) {
      startRoundQuestions();
    }
  }, [gameState, generatingRound, categories]);

  // Timer for answering - with proper guards
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedQuestion && !showResult && timeLeft > 0 && gameState !== 'special' && gameState !== 'feedback' && !checking && !feedback) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && selectedQuestion && !showResult && !checking && !feedback && gameState !== 'feedback') {
      // Time expired: show correct answer, no points change (unless cat/auction which can't be skipped)
      handleTimeExpired();
    }
    return () => clearInterval(timer);
  }, [selectedQuestion, showResult, timeLeft, gameState, checking, feedback]);

  const handleTimeExpired = () => {
    if (!selectedQuestion || feedback || checking || gameState === 'feedback') return;
    
    // Mark question as answered
    setCategories(prev => prev.map(cat => ({
      ...cat,
      questions: cat.questions.map(q => q.id === selectedQuestion.id ? { ...q, isAnswered: true } : q)
    })));

    // Cat-in-bag or auction: deduct points on time expiry
    const isCatOrAuction = selectedQuestion.type === 'cat' || selectedQuestion.type === 'auction';
    const deductPoints = isCatOrAuction ? selectedQuestion.value : 0;

    if (isCatOrAuction && answeringPlayerIndex !== null) {
      setPlayers(prev => prev.map((p, idx) => 
        idx === answeringPlayerIndex ? { ...p, score: p.score - deductPoints } : p
      ));
    }

    setFeedback({
      isCorrect: false,
      explanation: `Время вышло! Правильный ответ: ${selectedQuestion.answer}${selectedQuestion.explanation ? '. ' + selectedQuestion.explanation : ''}`,
      points: isCatOrAuction ? -deductPoints : 0
    });
    setGameState('feedback');
  };

  const handleSkipQuestion = () => {
    if (!selectedQuestion) return;
    if (selectedQuestion.type === 'cat' || selectedQuestion.type === 'auction') return;
    if (checking || feedback || gameState === 'feedback') return;
    handleTimeExpired();
  };

  const handleDontKnow = () => {
    // For cat-in-bag: "Не знаю" = deduct points
    if (!selectedQuestion || checking || feedback || gameState === 'feedback') return;
    
    setCategories(prev => prev.map(cat => ({
      ...cat,
      questions: cat.questions.map(q => q.id === selectedQuestion.id ? { ...q, isAnswered: true } : q)
    })));

    const deductPoints = selectedQuestion.value;
    if (answeringPlayerIndex !== null) {
      setPlayers(prev => prev.map((p, idx) => 
        idx === answeringPlayerIndex ? { ...p, score: p.score - deductPoints } : p
      ));
    }

    setFeedback({
      isCorrect: false,
      explanation: `Правильный ответ: ${selectedQuestion.answer}${selectedQuestion.explanation ? '. ' + selectedQuestion.explanation : ''}`,
      points: -deductPoints
    });
    setGameState('feedback');
  };

  const handleQuestionSelect = async (q: Question) => {
    if (q.isAnswered || generatingQuestion) return;
    playCroak();
    setSelectedQuestion(q);
    setUserAnswer('');
    setFeedback(null);
    setShowResult(null);
    setShowHint(false);
    
    setTimeLeft(40);
    
    if (q.type === 'normal') {
      setAnsweringPlayerIndex(currentPlayerIndex);
      setGameState('playing');
    } else {
      setSpecialType(q.type);
      setGameState('special');
      if (q.type === 'auction') {
        setAuctionBet(q.value);
        setAuctionHighBidder(currentPlayerIndex);
      }
    }
  };

  const handleCatTransfer = (targetIdx: number) => {
    playCroak();
    setAnsweringPlayerIndex(targetIdx);
    setGameState('playing');
    const randomValue = [100, 200, 300, 400, 500][Math.floor(Math.random() * 5)] * round;
    setSelectedQuestion(prev => prev ? { ...prev, value: randomValue, type: 'normal' } : null);
  };

  const handleAuctionBid = (amount: number) => {
    playCroak();
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;
    
    if (amount > currentPlayer.score + 1000) return;
    setAuctionBet(amount);
    setAuctionHighBidder(currentPlayerIndex);
    setTimeout(() => {}, 500);
  };

  const handleSendMessage = (text: string) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: '1',
      senderName: profile?.display_name || 'Игрок 1',
      text,
      isBot: false,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const addBotMessage = useCallback(async (botPlayer: Player, event: string, isCorrect: boolean) => {
    if (!botPlayer.personality) return;
    
    try {
      const comment = await protalkService.generateAIComment(
        botPlayer.personality,
        event,
        selectedQuestion?.question || '',
        selectedQuestion?.answer || '',
        isCorrect
      );
      
      const newMessage: ChatMessage = {
        id: `bot-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
  }, [selectedQuestion]);

  const submitAnswer = async (overrideAnswer?: string) => {
    const answerToSubmit = overrideAnswer || userAnswer;
    if (!selectedQuestion || checkingRef.current || !answerToSubmit || answeringPlayerIndex === null) return;
    
    // Prevent duplicate submissions
    checkingRef.current = true;
    setChecking(true);
    startCheckTimer();
    
    // Deduct 1 ruble per answer check
    const questionCost = options.isPurchased ? 0 : 1;
    try {
      if (!overrideAnswer && questionCost > 0) {
        await balanceService.deductBalance(profile?.uid ?? "", questionCost);
        setShowCoinAnimation(true);
        setTimeout(() => setShowCoinAnimation(false), 1500);
        if (profile) (profile as any).balance = (profile.balance || 0) - 1;
      }

      const result = await protalkService.checkAnswer(selectedQuestion.question, answerToSubmit, selectedQuestion.answer);
      const isCorrect = result.isCorrect;
      const q = selectedQuestion;
      const playerIdx = answeringPlayerIndex!;
      const currentPlayer = players[playerIdx];
      if (!currentPlayer) return;

      if (currentPlayer.isBot) {
        addBotMessage(currentPlayer, isCorrect ? 'ответил правильно' : 'ошибся в ответе', isCorrect);
      }
      
      if (gameState === 'final_question') {
        const player = players[playerIdx];
        const bet = finalBets[player.id] || 0;
        const newScore = isCorrect ? player.score + bet : player.score - bet;
        
        setPlayers(prev => prev.map((p, idx) => {
          if (idx === playerIdx) {
            return { ...p, score: newScore };
          }
          return p;
        }));

        setFeedback({
          isCorrect,
          explanation: result.explanation || q.explanation || `Правильный ответ: ${q.answer}`,
          points: isCorrect ? bet : -bet
        });
        setGameState('feedback');
        stopCheckTimer();
        return;
      }

      const value = q.type === 'auction' ? auctionBet : q.value;
      
      setPlayers(prev => prev.map((p, idx) => {
        if (idx === playerIdx) {
          return { ...p, score: isCorrect ? p.score + value : p.score - value };
        }
        return p;
      }));

      setCategories(prev => prev.map(cat => ({
        ...cat,
        questions: cat.questions.map(question => question.id === q.id ? { ...question, isAnswered: true } : question)
      })));

      setFeedback({
        isCorrect,
        explanation: result.explanation || q.explanation || `Правильный ответ: ${q.answer}`,
        points: isCorrect ? value : -value
      });
      setGameState('feedback');
      stopCheckTimer();
    } catch (error) {
      console.error('Error checking answer:', error);
      if (!overrideAnswer && questionCost > 0) {
        await balanceService.addBalance(profile?.uid ?? "", questionCost);
      }
      stopCheckTimer();
    } finally {
      setChecking(false);
      checkingRef.current = false;
    }
  };

  // AI Logic Effect
  useEffect(() => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isBot || loading || generatingQuestion || checking || feedback) return;

    if (gameState === 'playing' && !selectedQuestion) {
      const timer = setTimeout(() => {
        const unasked = categories.flatMap(c => c.questions).filter(q => !q.isAnswered);
        if (unasked.length > 0) {
          const randomQ = unasked[Math.floor(Math.random() * unasked.length)];
          handleQuestionSelect(randomQ);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (gameState === 'playing' && selectedQuestion && answeringPlayerIndex === currentPlayerIndex && !showResult) {
      const timer = setTimeout(() => {
        const difficulty = currentPlayer.difficulty || 'people';
        let successProbability = 0.5;
        switch(difficulty) {
          case 'dummy': successProbability = 0.3; break;
          case 'people': successProbability = 0.5; break;
          case 'genius': successProbability = 0.75; break;
          case 'god': successProbability = 0.9; break;
        }

        const shouldSucceed = Math.random() < successProbability;
        if (shouldSucceed) {
          submitAnswer(selectedQuestion.answer);
        } else {
          submitAnswer('Я не знаю, наверное это лягушка');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (gameState === 'special') {
      const timer = setTimeout(() => {
        if (specialType === 'cat') {
          const others = players.map((_, i) => i).filter(i => i !== currentPlayerIndex);
          const target = others.includes(0) ? 0 : others[Math.floor(Math.random() * others.length)];
          handleCatTransfer(target);
        } else if (specialType === 'auction') {
          const maxPossible = currentPlayer.score;
          if (auctionBet < maxPossible * 0.7 && Math.random() > 0.3) {
            handleAuctionBid(auctionBet + 100);
          }
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (gameState === 'final_elimination') {
      const timer = setTimeout(() => {
        if (finalCategories.length > 1) {
          eliminateCategory(finalCategories[Math.floor(Math.random() * finalCategories.length)]);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (gameState === 'final_bet' && !finalBets[currentPlayer.id]) {
      const timer = setTimeout(() => {
        const bet = Math.floor(currentPlayer.score * 0.5);
        handleFinalBet(currentPlayer.id, Math.max(0, bet));
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (gameState === 'final_question' && answeringPlayerIndex === currentPlayerIndex) {
      const timer = setTimeout(() => {
        const difficulty = currentPlayer.difficulty || 'people';
        let successProbability = 0.5;
        switch(difficulty) {
          case 'dummy': successProbability = 0.2; break;
          case 'people': successProbability = 0.4; break;
          case 'genius': successProbability = 0.7; break;
          case 'god': successProbability = 0.9; break;
        }
        const shouldSucceed = Math.random() < successProbability;
        if (shouldSucceed) {
          submitAnswer(selectedQuestion?.answer || 'финал');
        } else {
          submitAnswer('Слишком сложно для жабы');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

  }, [currentPlayerIndex, gameState, selectedQuestion, answeringPlayerIndex, loading, generatingQuestion, checking, feedback, categories, specialType, auctionBet, finalCategories, finalBets]);

  const handleGameSubmission = async (data: any) => {
    console.log('Submitting game to shop:', data);
    setSubmitted(true);
    setShowSubmission(false);
  };

  const handleCloseSubmission = () => {
    setShowSubmission(false);
  };

  const handleContinue = async () => {
    if (gameState === 'feedback') {
      const wasCorrect = feedback?.isCorrect;
      const playerIdx = answeringPlayerIndex!;
      const isFinal = selectedQuestion?.id === 'final';
      
      if (isFinal) {
        setFeedback(null);
        if (playerIdx + 1 < players.length) {
          setAnsweringPlayerIndex(playerIdx + 1);
          setGameState('final_question');
          setUserAnswer('');
        } else {
          if (user) {
            const userPlayer = players.find(p => p.id === '1');
            const finalUserScore = userPlayer?.score || 0;
            
            await saveGameSession({
              userId: profile?.uid ?? "",
              gameId: 'jeopardy',
              score: finalUserScore,
              totalQuestions: 75,
              correctAnswers: 0,
              mode: options.mode,
              difficulty: 'auto',
              topic: options.topic || 'Разные',
              pricePaid: options.price,
              isWin: finalUserScore > (players.find(p => p.id === '2')?.score || 0)
            });
            if (options.packId) {
              await deleteGameProgress(profile?.uid ?? "", options.packId, 'jeopardy');
            }
          }
          setGameState('game_over');
          setSelectedQuestion(null);
          setShowSubmission(true);
        }
        return;
      }

      setSelectedQuestion(null);
      setGameState('playing');
      setSpecialType(null);
      setAnsweringPlayerIndex(null);
      setUserAnswer('');
      setFeedback(null);
      
      if (!wasCorrect) {
        setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
      } else {
        setCurrentPlayerIndex(playerIdx);
      }

      const allAnswered = categories.every(c => c.questions.every(q => q.isAnswered));
      if (allAnswered) {
        if (round < 3) {
          setRound(r => r + 1);
          generateRoundCategories(round + 1);
        } else {
          startFinalRound();
        }
      }
    }
  };

  const startFinalRound = () => {
    setGameState('final_elimination');
    const FINAL_NAMES = ['Финальная Тема 1', 'Финальная Тема 2', 'Финальная Тема 3', 'Финальная Тема 4', 'Финальная Тема 5'];
    setFinalCategories(FINAL_NAMES);
  };

  const eliminateCategory = (name: string) => {
    playCroak();
    setFinalCategories(prev => prev.filter(c => c !== name));
    setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
    
    if (finalCategories.length === 2) {
      setGameState('final_bet');
    }
  };

  const handleFinalBet = (playerId: string, bet: number) => {
    setFinalBets(prev => ({ ...prev, [playerId]: bet }));
    if (Object.keys(finalBets).length + 1 === players.length) {
      setGameState('final_question');
      setAnsweringPlayerIndex(0);
      setSelectedQuestion({
        id: 'final',
        category: finalCategories[0],
        value: 0,
        question: `Финальный вопрос по теме: ${finalCategories[0]}`,
        answer: 'финал',
        isAnswered: false,
        type: 'normal'
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-4 gap-8 px-2 md:px-0 pb-20">
      <CoinAnimation show={showCoinAnimation} />
      <div className="lg:col-span-3 space-y-4 md:space-y-8">
        <AnimatePresence>
        {checking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md"
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
                src="/file/13/logo.png" 
                alt="Logo" 
                className="relative h-32 w-32 rounded-3xl border-4 border-primary/50 object-cover shadow-2xl select-none pointer-events-none"
                referrerPolicy="no-referrer"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
            </motion.div>
            <p className="mt-8 text-2xl font-black uppercase tracking-tighter text-primary animate-pulse">
              ИИ проверяет ваш ответ... ({checkTimer}с)
            </p>
            {checkTimer === 0 && (
              <div className="mt-8 text-center space-y-4">
                <p className="text-sm text-destructive font-bold uppercase tracking-widest">ИИ Немного тупит, надо повторить</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => { checkingRef.current = false; setChecking(false); submitAnswer(); }}
                    className="px-8 py-3 bg-primary text-background rounded-full font-black uppercase tracking-tighter hover:scale-105 transition-transform"
                  >
                    Еще раз
                  </button>
                  <button 
                    onClick={() => {
                      checkingRef.current = false;
                      setChecking(false);
                      // Time out = no penalty
                      setFeedback({ isCorrect: false, explanation: 'Проверка пропущена.', points: 0 });
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
            className="fixed inset-0 z-[300] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
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
                  {feedback.isCorrect ? 'Правильно!' : feedback.points === 0 ? 'Время вышло!' : 'Неверно!'}
                </h3>
                
                <div className="mt-6 max-h-48 overflow-y-auto pr-2 text-sm leading-relaxed text-foreground/80">
                  {feedback.explanation}
                </div>

                {feedback.points !== undefined && feedback.points !== 0 && (
                  <p className={`mt-2 text-2xl font-black ${feedback.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {feedback.points > 0 ? '+' : ''}{feedback.points} очков
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

      {/* Header */}
      <div className="flex items-center justify-between border-glow bg-background/60 p-3 md:p-6 backdrop-blur-md">
        <div className="flex items-center gap-2 md:gap-4">
          <Star className="text-primary h-5 w-5 md:h-8 md:w-8" />
          <div>
            <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-primary title-glow">Своя Икра</h1>
            <p className="text-[8px] md:text-sm text-foreground/40 uppercase tracking-widest">Тур {round} • {ROUND_CONFIGS[round-1]?.description || 'Финал'}</p>
          </div>
        </div>
        <div className="flex gap-2 md:gap-6">
          {players.map((p, idx) => (
            <div key={`${p.id}-${idx}`} className={`text-right p-2 rounded-xl transition-all ${idx === currentPlayerIndex ? 'bg-primary/20 ring-1 ring-primary' : ''}`}>
              <p className="text-[8px] md:text-xs text-foreground/40 uppercase">{p.name}</p>
              <p className={`text-sm md:text-2xl font-black ${p.score < 0 ? 'text-red-500' : 'text-primary'}`}>{p.score}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="text-primary" size={20} />
          <span className="text-sm font-bold uppercase tracking-wider text-primary/60">Тема:</span>
          <span className="text-sm font-black uppercase tracking-wider text-primary">{options.topic || 'Разные'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="text-primary" size={20} />
          <span className="text-sm font-bold uppercase tracking-wider text-primary/60">Сложность:</span>
          <span className="text-sm font-black uppercase tracking-wider text-primary">По номиналу</span>
        </div>
      </div>

      {gameState === 'lobby' && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-8">
          <Trophy size={100} className="text-primary animate-pulse" />
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Готовы к игре?</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            {hasProgress && (
              <button 
                onClick={handleResume} 
                disabled={loading}
                className="bg-foreground/10 text-foreground hover:bg-foreground/20 px-12 py-4 text-xl rounded-full font-black uppercase transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <RotateCcw size={24} />}
                Продолжить
              </button>
            )}
            <button 
              onClick={startLevel} 
              disabled={loading}
              className="btn-primary px-12 py-4 text-xl flex items-center gap-2"
            >
              {loading && !hasProgress && <Loader2 className="animate-spin" />}
              Начать Матч
            </button>
          </div>
        </div>
      )}

      {gameState === 'error' && (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <GameError 
            message={errorMessage}
            onRetry={startLevel} 
            onReturn={() => navigate('/')} 
          />
        </div>
      )}

      {/* Loading Overlay */}
      {(gameState === 'loading' || loading || generatingRound) && (
        <GenerationLoadingScreen
          title="Своя Икра"
          messages={generatingRound
            ? [
                'Формируем 25 вопросов одним пакетом...',
                'Распределяем сложность по номиналам...',
                'Проверяем уникальность ответов...',
                'Собираем игровое поле...',
                'Почти готово...',
              ]
            : [
                'Придумываем категории...',
                'Готовим описания тем...',
                'Запускаем генерацию вопросов...',
                'Настраиваем икряное поле...',
                'Почти готово...',
              ]}
        />
      )}

      {/* Topic Reveal Animation (all 15 topics) */}
      {showTopicReveal && (
        <TopicRevealScreen 
          topics={allTopics}
          onComplete={() => {
            setShowTopicReveal(false);
            const roundTopics = allTopics.slice(0, 5);
            const newCategories = roundTopics.map((cat, catIdx) => {
              const questions = [100, 200, 300, 400, 500].map((val, qIdx) => ({
                id: `1-${catIdx}-${qIdx}`,
                category: cat.name,
                value: val,
                question: '',
                answer: '',
                isAnswered: false,
                type: 'normal' as const
              }));
              return { name: cat.name, description: cat.description, questions };
            });
            setCategories(newCategories);
            setGameState('category_reveal');
          }}
        />
      )}

      {gameState === 'category_reveal' && !showTopicReveal && (
        <div className="space-y-8 py-10">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Тур {round}: Категории</h2>
            <p className="text-foreground/60 uppercase tracking-widest">{ROUND_CONFIGS[round-1]?.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 p-8 transition-all hover:border-primary/40 hover:bg-primary/10"
              >
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
                <h3 className="relative z-10 text-2xl font-black uppercase tracking-tighter text-primary">{cat.name}</h3>
                <p className="relative z-10 mt-4 text-sm leading-relaxed text-foreground/70">{cat.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center pt-8">
            <button 
              onClick={startRoundQuestions}
              className="btn-primary px-16 py-5 text-2xl group relative overflow-hidden"
            >
              <span className="relative z-10">Начать Раунд</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="grid grid-cols-1 gap-2 md:gap-4">
          {categories.map((category, catIdx) => (
            <div key={`${category.name}-${catIdx}`} className="grid grid-cols-1 md:grid-cols-6 items-center gap-2 md:gap-4">
              <div 
                onClick={() => setShowCategoryInfo(category.name)}
                className="col-span-1 border-glow bg-primary/10 p-2 md:p-4 text-center h-full flex flex-col items-center justify-center relative group cursor-pointer hover:bg-primary/20 transition-all rounded-2xl"
              >
                <h3 className="text-xs md:text-sm font-black uppercase tracking-tighter text-primary leading-tight">{category.name}</h3>
                <p className="text-[8px] md:text-[10px] text-foreground/50 mt-1 leading-tight hidden group-hover:block">{category.description}</p>
              </div>
              <div className="col-span-1 md:col-span-5 grid grid-cols-5 gap-2 md:gap-4">
                {category.questions.map((q, qIdx) => (
                  <button
                    key={q.id}
                    disabled={q.isAnswered || generatingQuestion}
                    onClick={() => handleQuestionSelect(q)}
                    className={`aspect-square md:h-20 text-lg md:text-3xl font-black transition-all rounded-full border-2 ${
                      q.isAnswered 
                        ? 'bg-foreground/5 text-foreground/10 border-foreground/5' 
                        : 'bg-gradient-to-br from-primary/30 to-primary/10 text-primary border-primary/40 hover:from-primary/50 hover:to-primary/20 hover:scale-110 shadow-lg hover:shadow-primary/30 hover:border-primary/60'
                    } flex items-center justify-center relative overflow-hidden group`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_60%)]" />
                    {!q.isAnswered && <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_60%_60%,rgba(0,0,0,0.08),transparent_50%)]" />}
                    {q.isAnswered ? '✓' : q.value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Special Question Overlay */}
      <AnimatePresence>
        {gameState === 'special' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl">
            <div className="max-w-2xl w-full text-center space-y-8">
              {specialType === 'cat' ? (
                <>
                  <Gift size={80} className="mx-auto text-primary animate-bounce" />
                  <h2 className="text-4xl font-black uppercase text-primary">Кот в мешке!</h2>
                  <p className="text-xl">Выберите, кому отдать этот вопрос:</p>
                  <div className="flex justify-center gap-4">
                    {players.map((p, idx) => (
                      <button key={`${p.id}-${idx}`} onClick={() => handleCatTransfer(idx)} className="btn-primary px-6 py-3">
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Gavel size={80} className="mx-auto text-primary" />
                  <h2 className="text-4xl font-black uppercase text-primary">Аукцион!</h2>
                  <p className="text-xl">Текущая ставка: <span className="text-primary font-bold">{auctionBet}</span> от {auctionHighBidder !== null ? players[auctionHighBidder]?.name : '...'}</p>
                  <div className="flex flex-col gap-4 max-w-xs mx-auto">
                    <button onClick={() => handleAuctionBid(auctionBet + 100)} className="btn-primary">Повысить (+100)</button>
                    <button onClick={() => { setAnsweringPlayerIndex(auctionHighBidder); setGameState('playing'); setSelectedQuestion(prev => prev ? {...prev, type: 'auction'} : null); }} className="bg-foreground/10 text-foreground px-6 py-3 rounded-full font-bold">Иду на риск!</button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final Round Elimination */}
      {gameState === 'final_elimination' && (
        <div className="space-y-8 text-center py-10">
          <h2 className="text-3xl md:text-5xl font-black uppercase text-primary">Финал: Уберите лишнее</h2>
          <p className="text-xl">Очередь: {players[currentPlayerIndex].name}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {finalCategories.map((cat, idx) => (
              <button key={`${cat}-${idx}`} onClick={() => eliminateCategory(cat)} className="border-glow bg-background/40 p-6 text-xl font-bold hover:bg-destructive/20 hover:text-destructive transition-all flex items-center justify-between group">
                {cat}
                <Trash2 className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Final Round Betting */}
      {gameState === 'final_bet' && (
        <div className="max-w-md mx-auto space-y-8 text-center py-10">
          <h2 className="text-3xl font-black uppercase text-primary">Ваши Ставки</h2>
          <p className="text-lg">Тема: {finalCategories[0]}</p>
          {players.map((p, idx) => (
            <div key={`${p.id}-${idx}`} className="space-y-2">
              <p className="font-bold">{p.name} (Макс: {Math.max(0, p.score)})</p>
              <input 
                type="number" 
                placeholder="Ставка..." 
                className="w-full bg-background/40 border-b-2 border-primary p-2 text-center text-xl"
                onBlur={(e) => handleFinalBet(p.id, parseInt(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Question Overlay */}
      <AnimatePresence>
        {selectedQuestion && gameState !== 'special' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[250] flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl">
            <div className="w-full max-w-2xl space-y-8 text-center">
              <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-2 text-primary">
                  <Timer size={24} className={timeLeft < 10 ? 'animate-pulse text-destructive' : ''} />
                  <span className={`text-2xl font-black ${timeLeft < 10 ? 'text-destructive' : ''}`}>{timeLeft}с</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Skip or Don't Know button depending on question type */}
                  {selectedQuestion.type === 'cat' || selectedQuestion.type === 'auction' ? (
                    !checking && !feedback && (
                      <button 
                        onClick={handleDontKnow}
                        className="flex items-center gap-1 text-destructive/60 hover:text-destructive transition-colors"
                      >
                        <XCircle size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Не знаю</span>
                      </button>
                    )
                  ) : (
                    !checking && !feedback && (
                      <button 
                        onClick={handleSkipQuestion}
                        className="flex items-center gap-1 text-foreground/40 hover:text-foreground/70 transition-colors"
                      >
                        <SkipForward size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Пропустить</span>
                      </button>
                    )
                  )}
                  <button 
                    onClick={() => setShowHint(true)}
                    disabled={showHint}
                    className="flex items-center gap-2 text-primary/60 hover:text-primary disabled:opacity-30"
                  >
                    <Lightbulb size={24} />
                    <span className="text-xs font-bold uppercase tracking-widest">Подсказка</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-primary">{selectedQuestion.category} — {selectedQuestion.type === 'auction' ? auctionBet : selectedQuestion.value}</p>
                <h2 className="text-xl md:text-3xl font-bold leading-tight">{selectedQuestion.question}</h2>
              </div>

              {showHint && selectedQuestion.hint && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
                  <p className="text-sm italic text-primary/80">Подсказка: {selectedQuestion.hint}</p>
                </motion.div>
              )}

              {!showResult ? (
                <div className="space-y-6">
                  <input
                    autoFocus
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder={answeringPlayerIndex !== null && players[answeringPlayerIndex]?.isBot ? "ИИ думает..." : "Ваш ответ..."}
                    disabled={checking || gameState === 'feedback' || (answeringPlayerIndex !== null && players[answeringPlayerIndex]?.isBot)}
                    className="w-full border-b-2 border-primary bg-transparent py-4 text-center text-xl md:text-4xl font-bold focus:outline-none disabled:opacity-50"
                    onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                  />
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => submitAnswer()} 
                      disabled={checking || !userAnswer || (answeringPlayerIndex !== null && players[answeringPlayerIndex]?.isBot)}
                      className="btn-primary px-12 py-4 text-xl disabled:opacity-50"
                    >
                      Ответить
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-8 rounded-3xl ${showResult === 'correct' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  <p className="text-2xl font-black uppercase tracking-widest">{showResult === 'correct' ? 'Правильно!' : 'Неверно!'}</p>
                  <p className="mt-2 text-lg opacity-80">Правильный ответ: {selectedQuestion.answer}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === 'game_over' && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-8">
          <Trophy size={100} className="text-primary animate-bounce" />
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Игра Окончена!</h2>
          <div className="space-y-4">
            {[...players].sort((a, b) => b.score - a.score).map((p, idx) => (
              <div key={`${p.id}-${idx}`} className={`p-6 rounded-3xl border-glow ${idx === 0 ? 'bg-primary/20 scale-110' : 'bg-background/40'}`}>
                <p className="text-xl font-bold">{idx === 0 ? '🏆 ' : ''}{p.name}: {p.score}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={async () => {
                if (user && options.packId) await deleteGameProgress(profile?.uid ?? "", options.packId, 'jeopardy');
                window.location.reload();
              }} 
              className="btn-primary px-12 py-4 text-xl"
            >
              Сыграть Еще
            </button>
            <button 
              onClick={async () => {
                if (user && options.packId) await deleteGameProgress(profile?.uid ?? "", options.packId, 'jeopardy');
                navigate('/');
              }} 
              className="bg-foreground/10 text-foreground hover:bg-foreground/20 px-12 py-4 text-xl rounded-full font-black uppercase transition-all flex items-center gap-2"
            >
              <Home size={24} />
              В Меню
            </button>
          </div>

          {showSubmission && !submitted && (
            <GameSubmissionModal 
              gameType="Своя Икра"
              onClose={handleCloseSubmission}
              onSubmit={handleGameSubmission}
              userRole={profile?.role || 'player'}
            />
          )}
        </div>
      )}
      </div>

      <div className="lg:col-span-1 space-y-8">
        {/* Game Info Sidebar */}
        <div className="rounded-3xl border border-primary/20 bg-background/40 p-6 space-y-6 sticky top-8">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Тема</p>
            <p className="text-sm font-bold text-primary">{options.topic || 'Разные'}</p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Сложность</p>
            <p className="text-sm font-bold text-primary">По номиналу (100→1500)</p>
          </div>
          <div className="pt-4 border-t border-primary/10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Ваш счет</p>
            <p className="text-3xl font-black text-primary">{players.find(p => p.id === '1')?.score || 0} ₽</p>
          </div>
        </div>

        {(options.playMode === 'ai' || options.playMode === 'multi') && (
          <div className="h-[600px] sticky top-[300px]">
            <GameChat 
              messages={chatMessages} 
              onSendMessage={handleSendMessage} 
              currentUser={{ id: '1', name: profile?.display_name || 'Игрок 1' }} 
            />
          </div>
        )}
      </div>

      {/* Category Info Modal */}
      <AnimatePresence>
        {showCategoryInfo && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setShowCategoryInfo(null)}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-background border border-primary/20 p-8 rounded-3xl shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase text-primary">{showCategoryInfo}</h3>
                <button onClick={() => setShowCategoryInfo(null)} className="text-foreground/40 hover:text-foreground">
                  <X size={24} />
                </button>
              </div>
              <p className="text-lg text-foreground/80 leading-relaxed">
                {categories.find(c => c.name === showCategoryInfo)?.description}
              </p>
              <button onClick={() => setShowCategoryInfo(null)} className="btn-primary w-full py-3">Понятно</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
