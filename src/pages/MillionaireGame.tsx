import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { geminiService } from '../services/gemini';
import { balanceService } from '../services/balanceService';
import { Timer, HelpCircle, Zap, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIZES = [
  100, 200, 300, 500, 1000, // 5: Safety net
  2000, 4000, 8000, 16000, 32000, // 10: Safety net
  64000, 125000, 250000, 500000, 1000000
];

export function MillionaireGame() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'result'>('setup');
  const [topic, setTopic] = useState('Общие знания');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean, explanation: string } | null>(null);
  const [hints, setHints] = useState({ fiftyFifty: true, aiHint: true });
  const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
  const [aiHintText, setAiHintText] = useState<string | null>(null);

  const startLevel = async () => {
    if (!user || !profile) return;
    
    const cost = 15 * 2; // 15 questions, assume 'true' mode (2 RUB per question)
    if (profile.balance < cost) {
      alert('Недостаточно средств на балансе!');
      return;
    }

    setGameState('loading');
    try {
      // Generate questions with increasing difficulty
      const generated = await geminiService.generateQuestions(topic, 'people', 15);
      setQuestions(generated);
      setGameState('playing');
    } catch (error) {
      console.error('Error generating questions:', error);
      setGameState('setup');
    }
  };

  const handleOptionClick = async (option: string) => {
    if (feedback || selectedOption) return;
    setSelectedOption(option);
    
    const currentQuestion = questions[currentIndex];
    const isCorrect = option === currentQuestion.correctAnswer;
    
    setFeedback({ 
      isCorrect, 
      explanation: isCorrect ? 'Правильный ответ!' : `Неверно. Правильный ответ: ${currentQuestion.correctAnswer}` 
    });

    // Deduct balance
    await balanceService.deductBalance(user!.uid, 2);

    setTimeout(() => {
      if (isCorrect) {
        setScore(PRIZES[currentIndex]);
        if (currentIndex < 14) {
          setCurrentIndex(i => i + 1);
          setSelectedOption(null);
          setFeedback(null);
          setDisabledOptions([]);
          setAiHintText(null);
        } else {
          setGameState('result');
        }
      } else {
        // Calculate safety net score
        let finalScore = 0;
        if (currentIndex >= 10) finalScore = PRIZES[9];
        else if (currentIndex >= 5) finalScore = PRIZES[4];
        setScore(finalScore);
        setGameState('result');
      }
    }, 3000);
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
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Кто хочет стать миллионером</h2>
          <p className="mt-2 text-foreground/60">15 вопросов с 4 вариантами ответов. Несгораемые суммы.</p>
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
          Начать игру (30 ₽)
        </button>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-8 text-xl font-bold text-primary animate-pulse">Подготовка вопросов...</p>
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
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
              <p className="text-2xl font-black text-primary">{PRIZES[currentIndex]} ₽</p>
            </div>
          </div>

          <div className="relative min-h-[200px] rounded-3xl border border-primary/20 bg-background p-8 shadow-xl">
            <h3 className="text-2xl font-bold leading-tight">{currentQuestion.text}</h3>
            {aiHintText && (
              <div className="mt-4 rounded-xl bg-primary/5 p-4 text-sm italic text-primary">
                Подсказка ИИ: {aiHintText}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                  className={`relative flex items-center gap-4 rounded-2xl border p-6 text-left transition-all ${
                    isDisabled ? 'opacity-0 pointer-events-none' :
                    isCorrect ? 'border-green-500 bg-green-500/10 text-green-500' :
                    isWrong ? 'border-red-500 bg-red-500/10 text-red-500' :
                    isSelected ? 'border-primary bg-primary/20' :
                    'border-primary/20 bg-background hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <span className="text-xl font-black text-primary">{String.fromCharCode(65 + idx)}:</span>
                  <span className="font-bold">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:block space-y-1 rounded-3xl border border-primary/20 bg-primary/5 p-4">
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
    </div>
  );
}
