import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, Music, Send, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession } from '../supabase';

export function MelodyGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const options = location.state || { mode: 'human', difficulty: 'people', price: 30 };
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'result'>(options ? 'loading' : 'setup');
  const [topic, setTopic] = useState(options.topic || 'Популярные хиты');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentPoints, setCurrentPoints] = useState(1000);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (options && gameState === 'loading' && questions.length === 0) {
      startLevel();
    }
  }, [gameState, questions.length]);

  const startLevel = async () => {
    if (!user || !profile) return;
    
    const cost = options.price || 30; 
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      setGameState('setup');
      return;
    }

    setGameState('loading');
    try {
      const generated = await geminiService.generateQuestions(topic, options.difficulty || 'people', 10);
      setQuestions(generated);
      setGameState('playing');
      setCurrentPoints(1000);
    } catch (error) {
      console.error('Error generating questions:', error);
      setGameState('setup');
    }
  };

  const handleAnswer = async () => {
    if (checking || feedback) return;
    setChecking(true);
    
    const currentQuestion = questions[currentIndex];
    const result = await geminiService.checkAnswer(currentQuestion.text, userAnswer, currentQuestion.correctAnswer);
    
    setFeedback(result);
    if (result.isCorrect) {
      setScore(s => s + currentPoints);
      setCorrectCount(c => c + 1);
    }
    
    // Deduct balance
    await balanceService.deductBalance(user!.uid, 3);

    setChecking(false);

    setTimeout(async () => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
        setCurrentPoints(1000);
        setUserAnswer('');
        setFeedback(null);
      } else {
        // Save session
        if (user) {
          const finalScore = score + (result.isCorrect ? currentPoints : 0);
          const finalCorrectCount = correctCount + (result.isCorrect ? 1 : 0);
          await saveGameSession({
            userId: user.uid,
            gameId: 'melody',
            score: finalScore,
            totalQuestions: 10,
            correctAnswers: finalCorrectCount,
            mode: options.mode,
            difficulty: options.difficulty,
            topic: options.topic || topic,
            pricePaid: options.price,
            isWin: finalCorrectCount >= 7 // Assuming 7/10 is a win for Melody
          });
        }
        setGameState('result');
      }
    }, 3000);
  };

  useEffect(() => {
    if (gameState === 'playing' && currentPoints > 0 && !feedback) {
      const timer = setInterval(() => {
        setCurrentPoints(p => Math.max(0, p - 1)); // 1000 points over 60s is ~16.6 per sec, but user said 13
      }, 75); // ~13 points per second
      return () => clearInterval(timer);
    } else if (currentPoints === 0 && gameState === 'playing' && !feedback) {
      handleAnswer();
    }
  }, [currentPoints, gameState, feedback, handleAnswer]);

  if (gameState === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-8 rounded-3xl border border-primary/20 bg-primary/5 p-8">
        <div className="text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Угадай мелодию</h2>
          <p className="mt-2 text-foreground/60">Угадывание 10 мелодий на время. Очки тают каждую секунду!</p>
        </div>
        <input 
          type="text" 
          value={topic} 
          onChange={e => setTopic(e.target.value)}
          placeholder="Тема (например, Хиты 90-х)..."
          className="w-full rounded-2xl border border-primary/20 bg-background p-4 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button 
          onClick={startLevel}
          className="w-full rounded-full bg-primary py-4 text-xl font-black uppercase tracking-tighter text-background transition-transform hover:scale-105"
        >
          Начать игру (30 ₽)
        </button>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-8 text-xl font-bold text-primary animate-pulse">Настраиваем инструменты...</p>
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-widest text-foreground/60">Мелодия</span>
          <span className="text-2xl font-black text-primary">{currentIndex + 1}/10</span>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-xs uppercase tracking-widest text-foreground/60">Текущие баллы</p>
          <p className="text-3xl font-black text-primary">{currentPoints}</p>
        </div>
      </div>

      <div className="relative flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-primary/20 bg-background p-10 shadow-xl">
        <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-primary/10 text-primary">
          <Music size={48} />
        </div>
        <p className="mt-6 text-center text-xl font-bold italic text-foreground/60">Играет мелодия...</p>
        
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
          placeholder="Название песни или исполнитель..."
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
