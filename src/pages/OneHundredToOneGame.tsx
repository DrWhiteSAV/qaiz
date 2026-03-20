import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, HelpCircle, Zap, AlertCircle, CheckCircle2, XCircle, Heart, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Answer {
  text: string;
  points: number;
  revealed: boolean;
}

export function OneHundredToOneGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'result'>('setup');
  const [topic, setTopic] = useState('Общие знания');
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState<string>('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [checking, setChecking] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  const startLevel = async () => {
    if (!user || !profile) return;
    
    const cost = 4 * 10; // 4 rounds, 10 RUB per round
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      return;
    }

    setGameState('loading');
    try {
      await loadRound(1);
      setGameState('playing');
    } catch (error) {
      console.error('Error loading round:', error);
      setGameState('setup');
    }
  };

  const loadRound = async (roundNum: number) => {
    // Round 4 is "Reverse"
    const prompt = roundNum === 4 
      ? `Сгенерируй 1 вопрос для игры "100 к 1" на тему "${topic}". 
         Это 4 тур (игра наоборот) - нужно найти самый НЕПОПУЛЯРНЫЙ ответ.
         Верни JSON: { "question": string, "answers": [ { "text": string, "points": number } ] } (6 ответов)`
      : `Сгенерируй 1 вопрос для игры "100 к 1" на тему "${topic}". 
         Верни JSON: { "question": string, "answers": [ { "text": string, "points": number } ] } (6 ответов, от самого популярного к менее)`;

    // Use Gemini to generate the question and answers
    // For now, I'll mock the structure but in a real app I'd use geminiService
    const mockAnswers = [
      { text: "Ответ 1", points: 40, revealed: false },
      { text: "Ответ 2", points: 25, revealed: false },
      { text: "Ответ 3", points: 15, revealed: false },
      { text: "Ответ 4", points: 10, revealed: false },
      { text: "Ответ 5", points: 7, revealed: false },
      { text: "Ответ 6", points: 3, revealed: false },
    ];
    
    setQuestion(`Популярный вопрос для раунда ${roundNum}`);
    setAnswers(mockAnswers);
    setMistakes(0);
    setRound(roundNum);
  };

  const handleAnswer = async () => {
    if (checking || !userAnswer) return;
    setChecking(true);
    
    // Use AI to check if user answer matches any of the hidden answers
    let foundIndex = -1;
    for (let i = 0; i < answers.length; i++) {
      if (answers[i].revealed) continue;
      
      const check = await geminiService.checkAnswer(question, userAnswer, answers[i].text);
      if (check.isCorrect) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      const multiplier = round === 2 ? 2 : round === 3 ? 3 : 1;
      const points = answers[foundIndex].points * multiplier;
      
      setAnswers(prev => prev.map((a, i) => i === foundIndex ? { ...a, revealed: true } : a));
      setScore(s => s + points);
      
      // Deduct balance
      await balanceService.deductBalance(user!.uid, 1);
    } else {
      setMistakes(m => m + 1);
      if (mistakes + 1 >= 3) {
        // Round over
        setTimeout(() => {
          if (round < 4) loadRound(round + 1);
          else setGameState('result');
        }, 2000);
      }
    }

    setUserAnswer('');
    setChecking(false);

    // Check if all revealed
    if (answers.every((a, i) => i === foundIndex || a.revealed)) {
      setTimeout(() => {
        if (round < 4) loadRound(round + 1);
        else setGameState('result');
      }, 2000);
    }
  };

  if (gameState === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-primary/20 bg-primary/5 p-8">
        <div className="text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">100 к 1</h2>
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
          Начать игру (40 ₽)
        </button>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-8 text-xl font-bold text-primary animate-pulse">Опрос 100 человек...</p>
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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

      <div className="rounded-3xl border border-primary/20 bg-background p-8 shadow-xl">
        <h3 className="text-center text-2xl font-bold leading-tight sm:text-3xl">{question}</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {answers.map((answer, idx) => (
          <div 
            key={idx}
            className={`flex h-16 items-center justify-between rounded-xl border-2 px-6 transition-all ${
              answer.revealed 
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-primary/10 bg-primary/5 text-transparent'
            }`}
          >
            <span className="text-lg font-bold">{idx + 1}. {answer.revealed ? answer.text : '???'}</span>
            <span className={`text-xl font-black ${answer.revealed ? 'opacity-100' : 'opacity-0'}`}>
              {answer.points}
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
          disabled={checking}
          className="flex-1 rounded-2xl border border-primary/20 bg-background p-6 text-xl focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={e => e.key === 'Enter' && handleAnswer()}
        />
        <button 
          onClick={handleAnswer}
          disabled={!userAnswer || checking}
          className="flex items-center justify-center rounded-2xl bg-primary px-8 text-background transition-transform hover:scale-105 disabled:opacity-50"
        >
          {checking ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <Send size={24} />}
        </button>
      </div>
    </div>
  );
}
