import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GameStartModal } from '../components/GameStartModal';
import { useFrogSound } from '../hooks/useSound';
import { getSupabase } from '../supabase';
import { 
  Gamepad2, 
  Users, 
  Zap, 
  Trophy, 
  Music, 
  HelpCircle, 
  Search,
  Filter,
  ChevronRight,
  Star
} from 'lucide-react';

export function GamesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playCroak } = useFrogSound();
  const [activeCategory, setActiveCategory] = useState<'all' | 'single' | 'multi' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<any>(null);

  const games = [
    {
      id: 'blitz',
      title: 'КвИИЗ',
      description: '10 быстрых вопросов с текстовым вводом. Очки тают! Все вопросы и ответы создает и проверяет ИИ.',
      rules: 'У вас есть 60 секунд на каждый вопрос. Чем быстрее ответите, тем больше баллов. Все вопросы и ответы создает и проверяет ИИ.',
      icon: <Zap size={32} />,
      category: 'single',
      cost: 10,
      path: '/game/blitz',
      color: 'bg-yellow-500',
      questionCount: 10
    },
    {
      id: 'millionaire',
      title: 'Квиллионер',
      description: 'Классическая игра с 15 вопросами и подсказками.',
      icon: <Trophy size={32} />,
      category: 'single',
      cost: 15,
      path: '/game/millionaire',
      color: 'bg-blue-600'
    },
    {
      id: '100to1',
      title: 'Сто Квадному',
      description: 'Угадайте 24 самых популярных ответа людей.',
      icon: <Users size={32} />,
      category: 'single',
      cost: 20,
      path: '/game/100to1',
      color: 'bg-orange-500'
    },
    {
      id: 'whatwherewhen',
      title: 'Что? Где? Квада?',
      description: 'Игра против телезрителей. 11 вопросов до победы.',
      icon: <HelpCircle size={32} />,
      category: 'single',
      cost: 25,
      path: '/game/whatwherewhen',
      color: 'bg-red-600'
    },
    {
      id: 'melody',
      title: 'Уквадай Мелодию',
      description: 'Угадайте 10 мелодий на время.',
      icon: <Music size={32} />,
      category: 'single',
      cost: 30,
      path: '/game/melody',
      color: 'bg-purple-600'
    },
    {
      id: 'iqbox',
      title: 'IQ Box',
      description: 'Командная игра в реальном времени.',
      icon: <Gamepad2 size={32} />,
      category: 'multi',
      cost: 50,
      path: '/game/iqbox',
      color: 'bg-emerald-600',
      comingSoon: true
    }
  ];

  const filteredGames = games.filter(game => {
    const matchesCategory = activeCategory === 'all' || game.category === activeCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">Игровой зал</h2>
          <p className="mt-2 text-foreground/60">Выберите режим игры и начните побеждать</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <CategoryButton active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} label="Все" />
          <CategoryButton active={activeCategory === 'single'} onClick={() => setActiveCategory('single')} label="Одиночные" />
          <CategoryButton active={activeCategory === 'multi'} onClick={() => setActiveCategory('multi')} label="Мультиплеер" />
          <CategoryButton active={activeCategory === 'offline'} onClick={() => setActiveCategory('offline')} label="Оффлайн" />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск игр..."
          className="w-full rounded-2xl border border-primary/20 bg-background p-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGames.map(game => (
          <div 
            key={game.id}
            onClick={() => !game.comingSoon && setSelectedGame(game)}
            className={`group relative cursor-pointer overflow-hidden rounded-3xl border border-primary/20 bg-background p-8 shadow-xl transition-all hover:-translate-y-2 hover:border-primary/40 ${game.comingSoon ? 'opacity-70 grayscale' : ''}`}
          >
            <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg ${game.color}`}>
              {game.icon}
            </div>
            
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white drop-shadow-sm">{game.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/60">{game.description}</p>
            
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-1 font-black text-white drop-shadow-sm">
                <Star size={16} className="fill-current" />
                <span>{game.cost} ₽</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold uppercase tracking-widest text-white border border-white/40 rounded-full px-3 py-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10">
                Играть <ChevronRight size={16} />
              </div>
            </div>

            {game.comingSoon && (
              <div className="absolute right-4 top-4 rounded-full bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                Скоро
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedGame && (
        <GameStartModal 
          game={selectedGame} 
          onClose={() => setSelectedGame(null)} 
          onStart={async (options: any) => {
            playCroak();
            
            // Create game session in Supabase
            if (user) {
              try {
                const supabase = getSupabase();
                if (supabase) {
                  await supabase.from('game_sessions').insert({
                    user_id: user.uid,
                    game_id: selectedGame.id,
                    topic: options.topic || 'General',
                    difficulty: options.difficulty,
                    mode: options.mode,
                    score: 0,
                    status: 'started',
                    price_paid: options.price,
                    created_at: new Date().toISOString()
                  });
                }
              } catch (error) {
                console.error('Error creating game session:', error);
              }
            }

            navigate(selectedGame.path, { state: options });
          }}
        />
      )}
    </div>
  );
}

function CategoryButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`rounded-full px-6 py-2 text-sm font-bold uppercase tracking-widest transition-all ${
        active ? 'bg-primary text-background' : 'bg-primary/10 text-primary hover:bg-primary/20'
      }`}
    >
      {label}
    </button>
  );
}
