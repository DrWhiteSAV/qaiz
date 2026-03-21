import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFrogSound } from '../hooks/useSound';
import { AuthModal } from '../components/AuthModal';
import { getSupabase } from '../supabase';
import { 
  Search, 
  Zap, 
  Trophy, 
  Users, 
  HelpCircle, 
  Music, 
  Gamepad2, 
  Star, 
  ChevronRight,
  Info,
  X,
  CheckCircle2
} from 'lucide-react';

const MODES = [
  { id: 'human', name: 'Человечный', description: 'Авторские вопросы, ИИ проверяет ответ.', pricePerQuestion: 3 },
  { id: 'true', name: 'Трушный', description: 'ИИ генерирует вопросы с фактчекингом.', pricePerQuestion: 2 },
  { id: 'lite', name: 'Лайтовый', description: 'ИИ генерирует и проверяет всё.', pricePerQuestion: 1 },
];

const TOPICS = [
  "История мира", "География", "Кинематограф", "Классическая музыка", "Современное искусство",
  "Космос и астрономия", "Биология", "Химия", "Физика", "Литература",
  "Спорт", "Видеоигры", "Технологии", "Автомобили", "Кулинария",
  "Мода", "Архитектура", "Мифология", "Религии мира", "Психология",
  "Экономика", "Политика", "Языки мира", "Животные", "Растения",
  "Океанология", "Медицина", "Математика", "Философия", "Театр",
  "Танцы", "Фотография", "Путешествия", "Знаменитости", "Мультфильмы",
  "Комиксы", "Аниме", "Рок-музыка", "Поп-музыка", "Джаз",
  "Интернет-мемы", "Криптовалюты", "Экология", "Право и законы", "Логические задачи",
  "Загадки", "Пословицы и поговорки", "Изобретения", "Первооткрыватели", "Космонавтика"
];

const DIFFICULTIES = [
  { id: 'dummy', name: 'Для чайников' },
  { id: 'people', name: 'Для людей' },
  { id: 'genius', name: 'Для гениев' },
  { id: 'god', name: 'Для богов' },
];

export const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [offlineGame, setOfflineGame] = useState<any>(null);
  const { playCroak } = useFrogSound();
  const [activeCategory, setActiveCategory] = useState<'all' | 'single' | 'multi' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const games = [
    {
      id: 'blitz',
      title: 'Блиц-Квиз',
      description: 'Быстрые вопросы на время. Проверь свою реакцию и знания.',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400',
      category: 'single',
      questionCount: 20,
      path: '/game/blitz',
      color: 'bg-yellow-500',
      rules: 'У вас есть 15 секунд на каждый вопрос. Чем быстрее ответите, тем больше баллов.',
      isCompleted: true
    },
    {
      id: 'millionaire',
      title: 'Миллионер',
      description: 'Классическая игра. 15 вопросов на пути к миллиону.',
      image: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=400',
      category: 'single',
      questionCount: 15,
      path: '/game/millionaire',
      color: 'bg-blue-600',
      rules: 'Ответьте на 15 вопросов. Используйте подсказки: 50/50, звонок другу, помощь зала.',
      isCompleted: false
    },
    {
      id: '100to1',
      title: '100 к 1',
      description: 'Угадай самые популярные ответы людей на улице.',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=400',
      category: 'single',
      questionCount: 30,
      path: '/game/100to1',
      color: 'bg-orange-500',
      rules: 'Ваша задача — угадать наиболее распространенные ответы на вопросы.',
      isCompleted: false
    },
    {
      id: 'whatwherewhen',
      title: 'Что? Где? Когда?',
      description: 'Элитарный клуб знатоков. Логика и командная работа.',
      image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=400',
      category: 'single',
      questionCount: 12,
      path: '/game/whatwherewhen',
      color: 'bg-red-600',
      rules: 'Минута на обсуждение. Вопросы на логику и общую эрудицию.',
      isCompleted: true
    },
    {
      id: 'melody',
      title: 'Угадай мелодию',
      description: 'Музыкальный квиз. Угадай исполнителя по первым нотам.',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=400',
      category: 'single',
      questionCount: 25,
      path: '/game/melody',
      color: 'bg-purple-600',
      rules: 'Слушайте фрагмент мелодии и выбирайте правильный вариант ответа.',
      isCompleted: false
    },
    {
      id: 'jeopardy',
      title: 'Своя Игра',
      description: 'Интеллектуальное казино.',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400',
      category: 'multi',
      questionCount: 76,
      path: '/game/jeopardy',
      color: 'bg-indigo-600',
      rules: 'Выбирайте темы и стоимость вопросов. Списание за игру.',
      isMultiplayer: true,
      isCompleted: false
    },
    {
      id: 'iqbox-online',
      title: 'Онлайн IQ Box',
      description: 'Командная интеллектуальная битва в реальном времени.',
      image: 'https://images.unsplash.com/photo-1558403194-611308249627?auto=format&fit=crop&q=80&w=400',
      category: 'multi',
      questionCount: 57,
      path: '/game/iqbox',
      color: 'bg-emerald-600',
      rules: 'Мультиплеерный режим. 7 раундов по 7 вопросов. Темы: текстовые, аудио, видео, картинки. Списание за игру.',
      onlyHuman: true,
      isMultiplayer: true,
      isCompleted: false
    },
    {
      id: 'iqbox-offline',
      title: 'Оффлайн IQ Box',
      description: 'Живая игра в вашем городе. Собирайте команду!',
      image: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&q=80&w=400',
      category: 'offline',
      questionCount: 57,
      path: '#',
      color: 'bg-rose-600',
      rules: 'Оффлайн регистрация на игру в Невинномысске и Ставрополе.'
    }
  ];

  const filteredGames = games.filter(game => {
    const matchesCategory = activeCategory === 'all' || game.category === activeCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 md:space-y-12 px-2 md:px-0">
      <section className="text-center">
        <div className="relative inline-block">
          <img src="https://i.ibb.co/QFr4QMLy/qaiz.png" alt="Logo" className="mx-auto h-32 w-32 md:h-64 md:w-64 animate-bounce drop-shadow-[0_0_30px_rgba(131,196,46,0.6)]" />
        </div>
        <p className="mx-auto mt-4 md:mt-8 max-w-2xl text-xs md:text-lg text-foreground/80 font-medium">
          Онлайн платформа для проведения онлайн-квизов на разные тематики в режиме одиночных игр и мультиплеера.
        </p>
        {!user && (
          <button 
            onClick={() => { playCroak(); setIsAuthModalOpen(true); }}
            className="btn-primary mt-4 md:mt-8 px-6 md:px-12 py-2 md:py-4 text-sm md:text-xl"
          >
            Начать играть
          </button>
        )}
      </section>

      <div className="space-y-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <CategoryButton active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} label="Все" />
            <CategoryButton active={activeCategory === 'single'} onClick={() => setActiveCategory('single')} label="Одиночные" />
            <CategoryButton active={activeCategory === 'multi'} onClick={() => setActiveCategory('multi')} label="Мультиплеер" />
            <CategoryButton active={activeCategory === 'offline'} onClick={() => setActiveCategory('offline')} label="Оффлайн" />
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск игр..."
              className="w-full rounded-full border border-primary/20 bg-background/40 p-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-md"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map(game => (
            <GameCard key={game.id} {...game} onSelect={() => {
              if (game.category === 'offline') {
                setOfflineGame(game);
              } else {
                setSelectedGame(game);
              }
            }} />
          ))}
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
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
      {offlineGame && (
        <OfflineRegistrationModal 
          game={offlineGame} 
          onClose={() => setOfflineGame(null)} 
        />
      )}
    </div>
  );
};

const OfflineRegistrationModal = ({ game, onClose }: any) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'schedule' | 'form' | 'success'>('schedule');
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [formData, setFormData] = useState({
    teamName: '',
    participants: '1',
    acceptFreePlayers: false,
    comment: ''
  });

  const schedule = [
    { id: '1', city: 'Невинномысск', date: '25 Марта', time: '19:00', venue: 'Ресторан "Центральный"', registrationOpen: true },
    { id: '2', city: 'Ставрополь', date: '27 Марта', time: '19:00', venue: 'Бар "Лофт"', registrationOpen: true },
    { id: '3', city: 'Невинномысск', date: '5 Апреля', time: '18:30', venue: 'ДК Химиков', registrationOpen: false },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('offline_registrations')
          .insert({
            user_id: user.uid,
            city: selectedSession.city,
            date: selectedSession.date,
            team_name: formData.teamName,
            participants_count: parseInt(formData.participants),
            comment: formData.comment,
            status: selectedSession.registrationOpen ? 'confirmed' : 'reserve',
            created_at: new Date().toISOString()
          });
        if (error) throw error;
      }
      setStep('success');
    } catch (error) {
      console.error('Registration error:', error);
      alert('Ошибка при регистрации');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-primary/20 bg-background p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-primary">Запись на игру</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-primary/10 transition-colors">
            <X size={24} />
          </button>
        </div>

        {step === 'schedule' && (
          <div className="space-y-4">
            <p className="text-sm text-foreground/60">Выберите дату и город для участия в оффлайн игре IQ Box.</p>
            <div className="space-y-2">
              {schedule.map(session => (
                <button
                  key={session.id}
                  onClick={() => {
                    setSelectedSession(session);
                    setStep('form');
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-primary/10 bg-primary/5 p-4 hover:bg-primary/10 transition-all"
                >
                  <div className="text-left">
                    <p className="font-bold text-primary">{session.city}</p>
                    <p className="text-xs text-foreground/60">{session.date} • {session.time}</p>
                    <p className="text-[10px] text-foreground/40">{session.venue}</p>
                  </div>
                  <div className="text-right">
                    {session.registrationOpen ? (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase text-emerald-500">Открыто</span>
                    ) : (
                      <span className="rounded-full bg-rose-500/20 px-3 py-1 text-[10px] font-bold uppercase text-rose-500">В резерв</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'form' && (
          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="rounded-xl bg-primary/5 p-3 border border-primary/10 mb-4">
              <p className="text-xs font-bold text-primary uppercase">{selectedSession.city} • {selectedSession.date}</p>
              {!selectedSession.registrationOpen && (
                <p className="text-[10px] text-rose-500 mt-1 font-bold">Регистрация закрыта. Вы будете записаны в резерв.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Название команды</label>
              <input 
                required 
                type="text" 
                value={formData.teamName}
                onChange={e => setFormData({ ...formData, teamName: e.target.value })}
                className="w-full rounded-xl border border-primary/10 bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                placeholder="Напр: Веселые лягушки" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Количество участников</label>
              <input 
                required 
                type="number" 
                min="1" 
                max="10" 
                value={formData.participants}
                onChange={e => setFormData({ ...formData, participants: e.target.value })}
                className="w-full rounded-xl border border-primary/10 bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                placeholder="От 1 до 10" 
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-primary/10 p-3">
              <span className="text-xs font-bold text-foreground/60">Принимаем свободных игроков</span>
              <input 
                type="checkbox" 
                checked={formData.acceptFreePlayers}
                onChange={e => setFormData({ ...formData, acceptFreePlayers: e.target.checked })}
                className="h-5 w-5 rounded border-primary/20 bg-background text-primary focus:ring-primary" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Комментарий (праздники и т.д.)</label>
              <textarea 
                value={formData.comment}
                onChange={e => setFormData({ ...formData, comment: e.target.value })}
                className="w-full rounded-xl border border-primary/10 bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                rows={2}
              />
            </div>

            <button type="submit" className="btn-primary w-full py-4 text-xl">Записаться</button>
            <button type="button" onClick={() => setStep('schedule')} className="w-full text-xs font-bold uppercase tracking-widest text-foreground/40 hover:text-primary">Назад к расписанию</button>
          </form>
        )}

        {step === 'success' && (
          <div className="py-10 text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <Zap size={40} />
            </div>
            <h3 className="text-2xl font-black uppercase text-primary">Готово!</h3>
            <p className="text-sm text-foreground/60">
              {selectedSession.registrationOpen 
                ? 'Ваша команда успешно зарегистрирована. Мы свяжемся с вами для подтверждения.' 
                : 'Вы записаны в резерв. Если места освободятся, админ сообщит вам об этом.'}
            </p>
            <button onClick={onClose} className="btn-primary w-full py-4">Отлично</button>
          </div>
        )}
      </div>
    </div>
  );
};

const GameStartModal = ({ game, onClose, onStart }: any) => {
  const [mode, setMode] = useState(game.onlyHuman ? 'human' : 'lite');
  const [difficulty, setDifficulty] = useState('people');
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);

  const currentMode = MODES.find(m => m.id === mode);
  const totalPrice = (currentMode?.pricePerQuestion || 0) * game.questionCount;

  const showTopicSelection = (mode === 'true' || mode === 'lite') && 
    ['blitz', 'millionaire', '100to1', 'whatwherewhen', 'melody', 'jeopardy'].includes(game.id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-primary/20 bg-background p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-primary">{game.title}</h2>
            {game.isCompleted && (
              <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase text-emerald-500">
                <CheckCircle2 size={12} />
                Пройдено
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-primary/10 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
            <div className="flex items-center justify-between text-primary mb-2">
              <div className="flex items-center gap-2">
                <Info size={18} />
                <span className="font-bold uppercase tracking-widest text-xs">Правила и списание</span>
              </div>
              <span className="text-xs font-bold">{game.questionCount} вопросов</span>
            </div>
            <p className="text-sm text-foreground/70">{game.rules}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Режим игры</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <button
                  key={m.id}
                  disabled={game.onlyHuman && m.id !== 'human'}
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all ${
                    mode === m.id ? 'bg-primary text-background shadow-lg' : 'bg-primary/5 text-primary hover:bg-primary/10'
                  } ${game.onlyHuman && m.id !== 'human' ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                >
                  <span className="text-[10px] font-black uppercase leading-tight">{m.name}</span>
                  <span className="mt-1 text-xs font-bold">{m.pricePerQuestion} ₽/вопр</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-foreground/40 italic">{currentMode?.description}</p>
          </div>

          {showTopicSelection && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Выберите тему</label>
              <select 
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TOPICS.map(topic => (
                  <option key={topic} value={topic} className="bg-background text-foreground">{topic}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Сложность</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-xl p-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    difficulty === d.id ? 'bg-primary text-background' : 'bg-primary/5 text-primary hover:bg-primary/10'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={() => onStart({ mode, difficulty, price: totalPrice, topic: selectedTopic })}
          className="btn-primary w-full py-4 text-xl"
        >
          Начать за {totalPrice} ₽
        </button>
      </div>
    </div>
  );
};

const GameCard = ({ title, description, onSelect, image, color, questionCount, comingSoon, isMultiplayer }: any) => {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { playCroak } = useFrogSound();

  const handlePlay = () => {
    playCroak();
    if (!user) {
      setIsAuthModalOpen(true);
    } else if (!comingSoon) {
      onSelect();
    }
  };

  return (
    <div 
      onClick={handlePlay}
      className={`group relative overflow-hidden border-glow bg-background/40 transition-all hover:bg-primary/10 backdrop-blur-sm cursor-pointer ${comingSoon ? 'opacity-70 grayscale' : ''}`}
    >
      <div className="relative h-48 w-full overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-60" />
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          {isMultiplayer && (
            <span className="w-fit rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-500/30">
              Мультиплеер
            </span>
          )}
          <span className="w-fit rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-background">
            {questionCount} вопросов
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-2xl font-black uppercase tracking-tighter text-primary title-glow leading-tight">{title}</h3>
        <p className="mt-2 text-sm text-foreground/60 leading-tight line-clamp-2">{description}</p>
        
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Играть <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {comingSoon && (
        <div className="absolute right-4 top-4 rounded-full bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          Скоро
        </div>
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

function CategoryButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`rounded-full px-4 md:px-6 py-1 md:py-2 text-[10px] md:text-sm font-bold uppercase tracking-widest transition-all ${
        active ? 'bg-primary text-background' : 'bg-primary/10 text-primary hover:bg-primary/20'
      }`}
    >
      {label}
    </button>
  );
}
