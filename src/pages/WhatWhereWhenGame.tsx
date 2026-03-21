import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, Send, AlertCircle, CheckCircle2, XCircle, Users, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession } from '../supabase';

export function WhatWhereWhenGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const options = location.state || { mode: 'human', difficulty: 'genius', price: 33 };
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'result'>(options ? 'loading' : 'setup');
  const [topic, setTopic] = useState(options.topic || 'Логика и факты');
  const [expertScore, setExpertScore] = useState(0);
  const [viewerScore, setViewerScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (options && gameState === 'loading' && !currentQuestion) {
      startLevel();
    }
  }, [gameState, currentQuestion]);

  const startLevel = async () => {
    if (!user || !profile) return;
    
    const cost = options.price || 33; 
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      setGameState('setup');
      return;
    }

    setGameState('loading');
    await nextQuestion();
  };

  const nextQuestion = async () => {
    setGameState('loading');
    try {
      const generated = await geminiService.generateQuestions(topic, options.difficulty || 'genius', 1);
      setCurrentQuestion(generated[0]);
      setGameState('playing');
      setTimeLeft(60);
      setUserAnswer('');
      setFeedback(null);
    } catch (error) {
      console.error('Error generating question:', error);
      setGameState('setup');
    }
  };

  const handleAnswer = async () => {
    if (checking || feedback) return;
    setChecking(true);
    
    const result = await geminiService.checkAnswer(currentQuestion.text, userAnswer, currentQuestion.correctAnswer);
    setFeedback(result);
    
    // Deduct balance
    await balanceService.deductBalance(user!.uid, 3);

    const newExpertScore = result.isCorrect ? expertScore + 1 : expertScore;
    const newViewerScore = !result.isCorrect ? viewerScore + 1 : viewerScore;

    if (result.isCorrect) {
      setExpertScore(newExpertScore);
    } else {
      setViewerScore(newViewerScore);
    }

    setChecking(false);

    setTimeout(async () => {
      if (newExpertScore >= 6 || newViewerScore >= 6) {
        // Save session
        if (user) {
          await saveGameSession({
            userId: user.uid,
            gameId: 'whatwherewhen',
            score: newExpertScore * 1000,
            totalQuestions: newExpertScore + newViewerScore,
            correctAnswers: newExpertScore,
            mode: options.mode,
            difficulty: options.difficulty,
            topic: options.topic || topic,
            pricePaid: options.price,
            isWin: newExpertScore >= 6
          });
        }
        setGameState('result');
      } else {
        nextQuestion();
      }
    }, 4000);
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !feedback) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing' && !feedback) {
      handleAnswer();
    }
  }, [timeLeft, gameState, feedback]);

  if (gameState === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-primary/20 bg-primary/5 p-8">
        <div className="text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Что? Где? Когда?</h2>
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
          Начать игру (33 ₽)
        </button>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-8 text-xl font-bold text-primary animate-pulse">Крутим волчок...</p>
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
        <h3 className="text-2xl font-bold leading-tight sm:text-3xl">{currentQuestion.text}</h3>
        
        {feedback && (
          <div className={`mt-8 flex items-start gap-4 rounded-2xl p-6 ${
            feedback.isCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          }`}>
            {feedback.isCorrect ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
            <div>
              <p className="text-xl font-bold">{feedback.isCorrect ? 'Верно!' : 'Не совсем...'}</p>
              <p className="mt-1 text-sm opacity-80">{feedback.explanation}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          placeholder="Ваш ответ..."
          disabled={!!feedback || checking}
          className="flex-1 rounded-2xl border border-primary/20 bg-background p-6 text-xl focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={e => e.key === 'Enter' && handleAnswer()}
        />
        <button 
          onClick={handleAnswer}
          disabled={!userAnswer || !!feedback || checking}
          className="flex items-center justify-center rounded-2xl bg-primary px-8 text-background transition-transform hover:scale-105 disabled:opacity-50"
        >
          {checking ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <Send size={24} />}
        </button>
      </div>
    </div>
  );
}
