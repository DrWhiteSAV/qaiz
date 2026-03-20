import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, Send, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function BlitzGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'result'>('setup');
  const [topic, setTopic] = useState('Общие знания');
  const [difficulty, setDifficulty] = useState('people');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const startLevel = async () => {
    if (!user || !profile) return;
    
    // Check balance for 10 questions (Blitz is 10 questions)
    // Blitz cost depends on mode, let's assume 'light' for now (1 RUB per question)
    const cost = 10; 
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      return;
    }

    setGameState('loading');
    try {
      const generated = await geminiService.generateQuestions(topic, difficulty, 10);
      setQuestions(generated);
      setGameState('playing');
      setTimeLeft(60);
    } catch (error) {
      console.error('Error generating questions:', error);
      setGameState('setup');
    }
  };

  const handleNext = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    
    const currentQuestion = questions[currentIndex];
    const result = await geminiService.checkAnswer(currentQuestion.text, userAnswer, currentQuestion.correctAnswer);
    
    setFeedback(result);
    if (result.isCorrect) setScore(s => s + 1);
    
    // Deduct balance for this question
    await balanceService.deductBalance(user!.uid, 1);

    setTimeout(() => {
      setFeedback(null);
      setUserAnswer('');
      setChecking(false);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
        setTimeLeft(60);
      } else {
        setGameState('result');
      }
    }, 3000);
  }, [currentIndex, questions, userAnswer, user, checking]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !feedback) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing' && !feedback) {
      handleNext();
    }
  }, [timeLeft, gameState, feedback, handleNext]);

  if (gameState === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-primary/20 bg-primary/5 p-8">
        <div className="text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Блиц-Квиз</h2>
          <p className="mt-2 text-foreground/60">10 вопросов по 60 секунд. Текстовый ввод.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold uppercase tracking-widest text-primary">Тема игры</label>
            <input 
              type="text" 
              value={topic} 
              onChange={e => setTopic(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-primary/20 bg-background p-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="text-sm font-bold uppercase tracking-widest text-primary">Сложность</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['dummy', 'people', 'genius', 'god'].map(d => (
                <button 
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`rounded-xl border border-primary/20 p-3 text-sm font-bold uppercase tracking-widest transition-all ${
                    difficulty === d ? 'bg-primary text-background' : 'hover:bg-primary/10'
                  }`}
                >
                  {d === 'dummy' ? 'Чайник' : d === 'people' ? 'Человек' : d === 'genius' ? 'Гений' : 'Бог'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={startLevel}
          className="w-full rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
        >
          Начать игру (10 ₽)
        </button>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-8 text-xl font-bold text-primary animate-pulse">ИИ генерирует вопросы...</p>
      </div>
    );
  }

  if (gameState === 'result') {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 p-12 text-center">
        <h2 className="text-5xl font-black uppercase tracking-tighter text-primary">Игра окончена!</h2>
        <div className="mt-8 flex justify-center gap-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-foreground/60">Результат</p>
            <p className="text-6xl font-black text-primary">{score}/10</p>
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-widest text-foreground/60">Вопрос</span>
          <span className="text-2xl font-black text-primary">{currentIndex + 1}/10</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
          <Timer size={20} />
          <span className="text-xl font-black">{timeLeft}с</span>
        </div>
      </div>

      <div className="relative min-h-[300px] rounded-3xl border border-primary/20 bg-background p-8 shadow-xl">
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
          placeholder="Введите ваш ответ..."
          disabled={!!feedback || checking}
          className="flex-1 rounded-2xl border border-primary/20 bg-background p-6 text-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          onKeyDown={e => e.key === 'Enter' && handleNext()}
        />
        <button 
          onClick={handleNext}
          disabled={!userAnswer || !!feedback || checking}
          className="flex items-center justify-center rounded-2xl bg-primary px-8 text-background transition-transform hover:scale-105 disabled:opacity-50"
        >
          <Send size={24} />
        </button>
      </div>
    </div>
  );
}
