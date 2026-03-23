import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useFrogSound } from '../hooks/useSound';
import { AuthModal } from '../components/AuthModal';
import { TopicCloud } from '../components/TopicCloud';
import { GameStartModal } from '../components/GameStartModal';
import { getSupabase } from '../supabase';
import { TOPICS } from '../constants';
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

const DIFFICULTIES = [
  { id: 'dummy', name: 'Для квакушек' },
  { id: 'people', name: 'Для людей' },
  { id: 'genius', name: 'Для гениев' },
  { id: 'god', name: 'Для богов' },
];

export const HomePage = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [offlineGame, setOfflineGame] = useState<any>(null);
  const { playCroak } = useFrogSound();
  const [activeCategory, setActiveCategory] = useState<'all' | 'single' | 'multi' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleModeSelect = (modeId: string) => {
    playCroak();
    if (modeId === 'human') {
      navigate('/games?filter=paid&mode=human');
    } else {
      // For AI modes, we might want to show a specific UI or just filter
      navigate(`/games?mode=${modeId}`);
    }
  };

  const handleFreeGamesClick = () => {
    playCroak();
    navigate('/games?filter=free');
  };

  const games = [
    {
      id: 'blitz',
      title: 'КвИИЗ',
      description: 'Быстрые вопросы на время. Проверь свою эрудицию и смекалку.',
      image: 'https://i.ibb.co/84X2Ry3L/kviiz.jpg',
      category: 'single',
      questionCount: 10,
      path: '/game/blitz',
      color: 'bg-yellow-500',
      rules: 'Текстовый ввод ответов. У вас есть 60 секунд на каждый вопрос. Каждый вопрос создает и проверяет ИИ.',
    },
    {
      id: 'millionaire',
      title: 'Квиллионер',
      description: 'Кто хочет стать Квиллионером? 15 вопросов на пути к квиллиону.',
      image: 'https://i.ibb.co/HpktcNw1/kvillioner.jpg',
      category: 'single',
      questionCount: 15,
      path: '/game/millionaire',
      color: 'bg-blue-600',
      rules: 'Ответьте на 15 вопросов. Используйте подсказки: 50/50 и Помощь ИИ.',
    },
    {
      id: '100to1',
      title: 'Сто Квадному',
      description: 'Угадай самые популярные ответы людей на улице.',
      image: 'https://i.ibb.co/0VZmr4Y0/100kva.jpg',
      category: 'single',
      questionCount: 24,
      path: '/game/100to1',
      color: 'bg-orange-500',
      rules: 'Ваша задача — угадать наиболее распространенные ответы на вопросы.',
    },
    {
      id: 'whatwherewhen',
      title: 'Что? Где? Квада?',
      description: 'Элитарный клуб знатоков. Логика и командная работа.',
      image: 'https://i.ibb.co/9H5whFHw/cgk.jpg',
      category: 'single',
      questionCount: 11,
      path: '/game/whatwherewhen',
      color: 'bg-red-600',
      rules: 'Минута на обсуждение. Вопросы на логику и общую эрудицию.',
    },
    {
      id: 'melody',
      title: 'Уквакай Мелодию',
      description: 'Музыкальный квиз. Угадай исполнителя по первым нотам.',
      image: 'https://i.ibb.co/5hpYsS1C/ukvakai.jpg',
      category: 'single',
      questionCount: 25,
      path: '/game/melody',
      color: 'bg-purple-600',
      rules: 'Слушайте фрагмент мелодии и выбирайте правильный вариант ответа.',
    },
    {
      id: 'jeopardy',
      title: 'Своя Икра',
      description: 'Интеллектуальное квазино.',
      image: 'https://i.ibb.co/mVttkCpT/ikra.jpg',
      category: 'multi',
      questionCount: 76,
      path: '/game/jeopardy',
      color: 'bg-indigo-600',
      rules: 'Выбирайте темы и стоимость вопросов. Списание за игру.',
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
      comingSoon: true
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
      rules: 'Оффлайн регистрация на игру в Невинномысске и Ставрополе.',
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
    <div className="space-y-4 md:space-y-8 px-2 md:px-0">
      <section className="text-center py-4 md:py-8 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: [0, -15, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative inline-block"
        >
          <div className="absolute inset-0 bg-primary/20 blur-[20px] rounded-full scale-75 opacity-50 dark:opacity-100" />
          <img src="https://i.ibb.co/m5vZ0MhJ/qaizlogo.png" alt="Logo" className="relative mx-auto h-32 w-32 md:h-64 md:w-64 drop-shadow-[0_0_15px_rgba(131,196,46,0.4)]" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <p className="mx-auto mt-2 md:mt-4 max-w-3xl text-lg md:text-3xl text-white font-black italic uppercase tracking-tighter leading-tight drop-shadow-lg">
            Онлайн платформа для проведения онлайн-квизов на разные тематики в режиме одиночных игр и мультиплеера.
          </p>
          
          {!user ? (
            <button 
              onClick={() => { playCroak(); setIsAuthModalOpen(true); }}
              className="btn-primary mt-6 md:mt-8 px-10 md:px-16 py-4 md:py-6 text-lg md:text-2xl group relative overflow-hidden"
            >
              <span className="relative z-10">Начать играть</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          ) : (
            <div className="mt-6 md:mt-8 flex flex-col items-center gap-4">
              {!profile && (
                <div className="flex items-center gap-3 text-primary animate-pulse">
                  <Zap className="animate-bounce" />
                  <span className="text-sm font-bold uppercase tracking-widest">Синхронизация профиля...</span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </section>

      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map(game => (
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
      <div className="w-full max-w-lg space-y-6 rounded-3xl border-2 border-primary bg-card p-6 md:p-10 shadow-[12px_12px_0px_0px_#0b1c1c] overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-primary">Запись на игру</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-primary/10 transition-colors text-primary">
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
                  className="flex w-full items-center justify-between rounded-2xl border-2 border-primary/10 bg-primary/5 p-4 hover:bg-primary/10 transition-all"
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
            <div className="rounded-xl bg-primary/5 p-3 border-2 border-primary/10 mb-4">
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
                className="w-full rounded-xl border-2 border-primary/10 bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
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
                className="w-full rounded-xl border-2 border-primary/10 bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                placeholder="От 1 до 10" 
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border-2 border-primary/10 p-3">
              <span className="text-xs font-bold text-foreground/60">Принимаем свободных игроков</span>
              <input 
                type="checkbox" 
                checked={formData.acceptFreePlayers}
                onChange={e => setFormData({ ...formData, acceptFreePlayers: e.target.checked })}
                className="h-5 w-5 rounded border-primary/20 bg-card text-primary focus:ring-primary" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Комментарий (праздники и т.д.)</label>
              <textarea 
                value={formData.comment}
                onChange={e => setFormData({ ...formData, comment: e.target.value })}
                className="w-full rounded-xl border-2 border-primary/10 bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
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

const GameCard = ({ title, description, onSelect, image, color, questionCount, comingSoon }: any) => {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { playCroak } = useFrogSound();

  const handlePlay = () => {
    if (comingSoon) return;
    playCroak();
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      onSelect();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      onClick={handlePlay}
      className={`group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/3 backdrop-blur-3xl transition-all hover:bg-white/10 cursor-pointer shadow-2xl ${comingSoon ? 'opacity-70 grayscale cursor-not-allowed' : ''}`}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
      </div>
      
      <div className="p-4 md:p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs md:text-sm font-black uppercase tracking-widest text-white border border-white/20 shadow-lg">
            {questionCount} вопросов
          </span>
          <span className="inline-flex rounded-full bg-[#83c42e] px-3 py-1 text-[10px] md:text-xs font-black uppercase tracking-widest text-[#0b1c1c] border border-[#0b1c1c]/20 shadow-lg">
            1 ₽ / вопрос
          </span>
        </div>

        <h3 className="text-lg md:text-xl font-black uppercase tracking-tighter text-white title-glow leading-none mb-2">{title}</h3>
        <p className="text-xs text-foreground/60 leading-relaxed line-clamp-2 font-medium">{description}</p>
        
        <div className="mt-4 md:mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white border border-white/40 rounded-full px-3 py-1 hover:bg-white/10 transition-all group-hover:translate-x-1 duration-300 shadow-sm">
            Играть <ChevronRight size={14} strokeWidth={3} />
          </div>
          <div className="h-0.5 w-8 rounded-full bg-white/20 group-hover:w-12 transition-all duration-500" />
        </div>
      </div>

      {comingSoon && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
          <div className="rounded-full bg-primary px-6 py-2 text-sm font-black uppercase tracking-widest text-background shadow-xl">
            Скоро
          </div>
        </div>
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </motion.div>
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
