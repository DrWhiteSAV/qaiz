import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFrogSound } from '../hooks/useSound';
import { Trophy, Star, User, Zap, Gift, Gavel, Trash2, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveGameSession } from '../supabase';

interface Question {
  id: string;
  category: string;
  value: number;
  question: string;
  answer: string;
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
}

const ROUND_CONFIGS = [
  { multiplier: 1, baseValues: [100, 200, 300, 400, 500], description: 'Первый раунд: Разминка. Стандартные вопросы.' },
  { multiplier: 2, baseValues: [100, 200, 300, 400, 500], description: 'Второй раунд: Ставки растут. Вопросы становятся сложнее.' },
  { multiplier: 3, baseValues: [100, 200, 300, 400, 500], description: 'Третий раунд: Финишная прямая. Максимальные баллы.' },
];

const CATEGORY_DATA: Record<string, { name: string, description: string }> = {
  'История Лягушек': { name: 'История Лягушек', description: 'Все о происхождении и эволюции наших зеленых друзей.' },
  'Кибер-Мир': { name: 'Кибер-Мир', description: 'Технологии, интернет и будущее цифровой реальности.' },
  'География': { name: 'География', description: 'Страны, города, реки и горы нашей планеты.' },
  'Наука': { name: 'Наука', description: 'От атомов до галактик: фундаментальные знания о мире.' },
  'Искусство': { name: 'Искусство', description: 'Живопись, скульптура, архитектура и великие мастера.' },
  'Космос': { name: 'Космос', description: 'Звезды, планеты и тайны вселенной.' },
  'Технологии': { name: 'Технологии', description: 'Гаджеты, софт и инженерные достижения.' },
  'Кино': { name: 'Кино', description: 'Шедевры кинематографа и история большого экрана.' },
  'Музыка': { name: 'Музыка', description: 'Ритмы, мелодии и великие композиторы.' },
  'Спорт': { name: 'Спорт', description: 'Достижения, рекорды и история олимпийских игр.' },
  'Мифология': { name: 'Мифология', description: 'Боги, герои и легенды древних народов.' },
  'Литература': { name: 'Литература', description: 'Книги, авторы и литературные направления.' },
  'Биология': { name: 'Биология', description: 'Жизнь во всех ее проявлениях.' },
  'Химия': { name: 'Химия', description: 'Элементы, реакции и строение вещества.' },
  'Физика': { name: 'Физика', description: 'Законы природы и физические явления.' },
  'Финальная Тема 1': { name: 'Финальная Тема 1', description: 'Сложная тема для решающего раунда.' },
  'Финальная Тема 2': { name: 'Финальная Тема 2', description: 'Сложная тема для решающего раунда.' },
  'Финальная Тема 3': { name: 'Финальная Тема 3', description: 'Сложная тема для решающего раунда.' },
  'Финальная Тема 4': { name: 'Финальная Тема 4', description: 'Сложная тема для решающего раунда.' },
  'Финальная Тема 5': { name: 'Финальная Тема 5', description: 'Сложная тема для решающего раунда.' },
};

const CATEGORY_NAMES = [
  ['История Лягушек', 'Кибер-Мир', 'География', 'Наука', 'Искусство'],
  ['Космос', 'Технологии', 'Кино', 'Музыка', 'Спорт'],
  ['Мифология', 'Литература', 'Биология', 'Химия', 'Физика'],
  ['Финальная Тема 1', 'Финальная Тема 2', 'Финальная Тема 3', 'Финальная Тема 4', 'Финальная Тема 5']
];

export const JeopardyGame: React.FC = () => {
  const { profile, user } = useAuth();
  const { playCroak } = useFrogSound();
  const location = useLocation();
  const navigate = useNavigate();
  const options = location.state || { mode: 'lite', difficulty: 'people', price: 40 };
  
  const [round, setRound] = useState(1);
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: profile?.displayName || 'Игрок 1', score: 0, isBot: false },
    { id: '2', name: 'Кибер-Жаба', score: 0, isBot: true },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [answeringPlayerIndex, setAnsweringPlayerIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'special' | 'final_bet' | 'final_elimination' | 'final_question' | 'game_over' | 'finished'>('lobby');
  
  // Special Question States
  const [specialType, setSpecialType] = useState<'cat' | 'auction' | null>(null);
  const [auctionBet, setAuctionBet] = useState(0);
  const [auctionHighBidder, setAuctionHighBidder] = useState<number | null>(null);

  // Final Round States
  const [finalCategories, setFinalCategories] = useState<string[]>([]);
  const [finalBets, setFinalBets] = useState<Record<string, number>>({});

  const [showCategoryInfo, setShowCategoryInfo] = useState<string | null>(null);

  const generateRound = useCallback((roundNum: number) => {
    if (roundNum > 3) return;
    const config = ROUND_CONFIGS[roundNum - 1];
    const names = CATEGORY_NAMES[roundNum - 1];
    
    const specialIndices = new Set<string>();
    while (specialIndices.size < 3) {
      const catIdx = Math.floor(Math.random() * 5);
      const qIdx = Math.floor(Math.random() * 5);
      specialIndices.add(`${catIdx}-${qIdx}`);
    }

    const newCategories = names.map((name, catIdx) => ({
      name,
      description: CATEGORY_DATA[name]?.description || 'Описание отсутствует',
      questions: config.baseValues.map((val, qIdx) => {
        const isSpecial = specialIndices.has(`${catIdx}-${qIdx}`);
        let type: 'normal' | 'cat' | 'auction' = 'normal';
        if (isSpecial) {
          type = Math.random() > 0.5 ? 'cat' : 'auction';
        }
        return {
          id: `${roundNum}-${catIdx}-${qIdx}`,
          category: name,
          value: val * config.multiplier,
          question: `Вопрос из категории ${name} за ${val * config.multiplier}. (Демо-вопрос)`,
          answer: 'ответ',
          isAnswered: false,
          type
        };
      })
    }));
    setCategories(newCategories);
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && categories.length === 0) {
      generateRound(1);
    }
  }, [gameState, categories.length, generateRound]);

  const handleQuestionSelect = (q: Question) => {
    if (q.isAnswered) return;
    playCroak();
    
    if (q.type === 'normal') {
      setSelectedQuestion(q);
      setAnsweringPlayerIndex(currentPlayerIndex);
      setGameState('playing');
    } else {
      setSelectedQuestion(q);
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
    // Randomize value for cat in a bag
    const randomValue = [100, 200, 300, 400, 500][Math.floor(Math.random() * 5)] * round;
    setSelectedQuestion(prev => prev ? { ...prev, value: randomValue, type: 'normal' } : null);
  };

  const handleAuctionBid = (amount: number) => {
    playCroak();
    setAuctionBet(amount);
    setAuctionHighBidder(currentPlayerIndex);
    // Simulate other player passing or bidding
    setTimeout(() => {
      // For demo, we just accept the user's bid
    }, 500);
  };

  const submitAnswer = async () => {
    if (!selectedQuestion) return;
    const isCorrect = userAnswer.toLowerCase().trim() === selectedQuestion.answer.toLowerCase().trim();
    const q = selectedQuestion;
    const playerIdx = answeringPlayerIndex!;
    
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

      setShowResult(isCorrect ? 'correct' : 'wrong');
      
      setTimeout(async () => {
        setShowResult(null);
        setUserAnswer('');
        if (playerIdx + 1 < players.length) {
          setAnsweringPlayerIndex(playerIdx + 1);
        } else {
          // Game Over - Save session
          if (user) {
            const userPlayer = players.find(p => p.id === '1');
            const finalUserScore = userPlayer ? (playerIdx === 0 ? newScore : userPlayer.score) : 0;
            
            await saveGameSession({
              userId: user.uid,
              gameId: 'jeopardy',
              score: finalUserScore,
              totalQuestions: 75, // 3 rounds * 25 questions
              correctAnswers: 0, // Complex to track in this game
              mode: options.mode,
              difficulty: options.difficulty,
              topic: options.topic || 'Разные',
              pricePaid: options.price,
              isWin: finalUserScore > (players.find(p => p.id === '2')?.score || 0)
            });
          }
          setGameState('game_over');
          setSelectedQuestion(null);
        }
      }, 2000);
      return;
    }

    const value = q.type === 'auction' ? auctionBet : q.value;
    
    setPlayers(prev => prev.map((p, idx) => {
      if (idx === playerIdx) {
        return { ...p, score: isCorrect ? p.score + value : p.score - value };
      }
      return p;
    }));

    setShowResult(isCorrect ? 'correct' : 'wrong');
    
    setCategories(prev => prev.map(cat => ({
      ...cat,
      questions: cat.questions.map(question => question.id === q.id ? { ...question, isAnswered: true } : question)
    })));

    setTimeout(() => {
      setSelectedQuestion(null);
      setShowResult(null);
      setGameState('playing');
      setSpecialType(null);
      setAnsweringPlayerIndex(null);
      
      // Next player's turn to pick
      setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);

      const allAnswered = categories.every(c => c.questions.every(q => q.isAnswered));
      if (allAnswered) {
        if (round < 3) {
          setRound(r => r + 1);
          generateRound(round + 1);
        } else {
          startFinalRound();
        }
      }
    }, 2000);
  };

  const startFinalRound = () => {
    setGameState('final_elimination');
    setFinalCategories(CATEGORY_NAMES[3]);
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
        value: 0, // Value is determined by bets
        question: `Финальный вопрос по теме: ${finalCategories[0]}`,
        answer: 'финал',
        isAnswered: false,
        type: 'normal'
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-8 px-2 md:px-0 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-glow bg-background/60 p-3 md:p-6 backdrop-blur-md">
        <div className="flex items-center gap-2 md:gap-4">
          <Star className="text-primary h-5 w-5 md:h-8 md:w-8" />
          <div>
            <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-primary title-glow">Своя Игра</h1>
            <p className="text-[8px] md:text-sm text-foreground/40 uppercase tracking-widest">Тур {round} • {ROUND_CONFIGS[round-1]?.description || 'Финал'}</p>
          </div>
        </div>
        <div className="flex gap-2 md:gap-6">
          {players.map((p, idx) => (
            <div key={p.id} className={`text-right p-2 rounded-xl transition-all ${idx === currentPlayerIndex ? 'bg-primary/20 ring-1 ring-primary' : ''}`}>
              <p className="text-[8px] md:text-xs text-foreground/40 uppercase">{p.name}</p>
              <p className={`text-sm md:text-2xl font-black ${p.score < 0 ? 'text-red-500' : 'text-primary'}`}>{p.score}</p>
            </div>
          ))}
        </div>
      </div>

      {gameState === 'lobby' && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-8">
          <Trophy size={100} className="text-primary animate-pulse" />
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Готовы к игре?</h2>
          <button onClick={() => setGameState('playing')} className="btn-primary px-12 py-4 text-xl">Начать Матч</button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="grid grid-cols-1 gap-2 md:gap-4">
          {categories.map((category, catIdx) => (
            <div key={category.name} className="grid grid-cols-6 items-center gap-1 md:gap-4">
              <div className="col-span-1 border-glow bg-primary/10 p-1 md:p-4 text-center h-full flex flex-col items-center justify-center relative group">
                <h3 className="text-[7px] md:text-sm font-bold uppercase tracking-tighter text-primary leading-tight">{category.name}</h3>
                <button 
                  onClick={() => setShowCategoryInfo(category.name)}
                  className="mt-1 text-primary/40 hover:text-primary transition-colors"
                >
                  <Info size={12} className="md:w-4 md:h-4" />
                </button>
              </div>
              {category.questions.map((q, qIdx) => (
                <button
                  key={q.id}
                  disabled={q.isAnswered}
                  onClick={() => handleQuestionSelect(q)}
                  className={`h-10 md:h-20 border-glow text-xs md:text-3xl font-black transition-all ${
                    q.isAnswered 
                      ? 'bg-foreground/5 text-foreground/10 border-transparent' 
                      : 'bg-background/40 text-primary hover:bg-primary/20 hover:scale-105'
                  }`}
                >
                  {q.isAnswered ? '✓' : q.value}
                </button>
              ))}
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
                      <button key={p.id} onClick={() => handleCatTransfer(idx)} className="btn-primary px-6 py-3">
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Gavel size={80} className="mx-auto text-primary animate-spin-slow" />
                  <h2 className="text-4xl font-black uppercase text-primary">Аукцион!</h2>
                  <p className="text-xl">Текущая ставка: <span className="text-primary font-bold">{auctionBet}</span> от {players[auctionHighBidder!].name}</p>
                  <div className="flex flex-col gap-4 max-w-xs mx-auto">
                    <button onClick={() => handleAuctionBid(auctionBet + 100)} className="btn-primary">Повысить (+100)</button>
                    <button onClick={() => { setAnsweringPlayerIndex(auctionHighBidder); setGameState('playing'); setSelectedQuestion({...selectedQuestion!, type: 'auction'}); }} className="bg-foreground/10 text-foreground px-6 py-3 rounded-full font-bold">Иду на риск!</button>
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
            {finalCategories.map(cat => (
              <button key={cat} onClick={() => eliminateCategory(cat)} className="border-glow bg-background/40 p-6 text-xl font-bold hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center justify-between group">
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
          {players.map(p => (
            <div key={p.id} className="space-y-2">
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

      {/* Question Modal (Shared for all modes) */}
      <AnimatePresence>
        {selectedQuestion && gameState !== 'special' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[250] flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl">
            <div className="w-full max-w-2xl space-y-8 text-center">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-primary">{selectedQuestion.category} — {selectedQuestion.type === 'auction' ? auctionBet : selectedQuestion.value}</p>
                <h2 className="text-2xl md:text-5xl font-bold leading-tight">{selectedQuestion.question}</h2>
              </div>

              {!showResult ? (
                <div className="space-y-6">
                  <input
                    autoFocus
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Ваш ответ..."
                    className="w-full border-b-2 border-primary bg-transparent py-4 text-center text-xl md:text-4xl font-bold focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                  />
                  <div className="flex justify-center gap-4">
                    <button onClick={() => submitAnswer()} className="btn-primary px-12 py-4 text-xl">
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
            {players.sort((a, b) => b.score - a.score).map((p, idx) => (
              <div key={p.id} className={`p-6 rounded-3xl border-glow ${idx === 0 ? 'bg-primary/20 scale-110' : 'bg-background/40'}`}>
                <p className="text-xl font-bold">{idx === 0 ? '🏆 ' : ''}{p.name}: {p.score}</p>
              </div>
            ))}
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary px-12 py-4 text-xl">Сыграть Еще</button>
        </div>
      )}
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
                {CATEGORY_DATA[showCategoryInfo]?.description}
              </p>
              <button onClick={() => setShowCategoryInfo(null)} className="btn-primary w-full py-3">Понятно</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
