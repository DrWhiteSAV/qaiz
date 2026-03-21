import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, 
  History, 
  User as UserIcon, 
  Share2, 
  LogOut,
  ChevronRight,
  Trophy,
  Gamepad2,
  Settings,
  UserPlus,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { getSupabase } from '../supabase';

export function ProfilePage() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'settings' | 'author'>('stats');
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === 'history' && user) {
      fetchHistory();
    }
  }, [activeTab, user]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const supabase = getSupabase();
    if (!supabase || !user) return;

    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', user.uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setGameHistory(data || []);
    }
    setLoadingHistory(false);
  };

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <UserIcon size={64} className="text-primary/20" />
        <h2 className="mt-4 text-2xl font-bold">Вы не вошли в аккаунт</h2>
        <p className="mt-2 text-foreground/60">Войдите, чтобы увидеть свою статистику</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center sm:flex-row sm:text-left">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-4xl font-black text-background">
          {profile.displayName[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-primary">{profile.displayName}</h2>
          <p className="text-foreground/60">{profile.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              {profile.role === 'superadmin' ? 'Супер-Админ' : profile.role === 'admin' ? 'Администратор' : profile.role === 'author' ? 'Автор' : 'Игрок'}
            </span>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              ID: {profile.uid.slice(0, 8)}
            </span>
          </div>
          {(profile.role === 'admin' || profile.role === 'superadmin' || profile.role === 'author') ? (
            <Link 
              to={profile.role === 'author' ? '/profile?tab=author' : '/admin'} 
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-bold text-background hover:scale-105 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            >
              <Settings size={16} />
              Личный кабинет
            </Link>
          ) : (
            <button 
              onClick={() => alert('Заявка на роль автора подана! Мы свяжемся с вами.')}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-6 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition-all"
            >
              <UserPlus size={16} />
              Стать автором
            </button>
          )}
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 rounded-full border border-red-500/20 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Wallet className="text-primary" />} label="Баланс" value={`${profile.balance} ₽`} />
        <StatCard icon={<Trophy className="text-primary" />} label="Побед" value="0" />
        <StatCard icon={<Gamepad2 className="text-primary" />} label="Игр" value={gameHistory.length.toString()} />
        <StatCard icon={<Share2 className="text-primary" />} label="Рефералов" value={`${profile.referralCount || 0}`} />
      </div>

      <div className="rounded-3xl border border-primary/20 bg-background overflow-hidden">
        <div className="flex border-b border-primary/10">
          <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="Статистика" />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="История" />
          {profile.role === 'author' && (
            <TabButton active={activeTab === 'author'} onClick={() => setActiveTab('author')} label="Автор" />
          )}
          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Настройки" />
        </div>
        
        <div className="p-8">
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Ваша активность</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 p-4">
                  <p className="text-sm text-foreground/60">Заработок с рефералов</p>
                  <p className="text-lg font-bold">{profile.referralEarnings || 0} ₽</p>
                </div>
                <div className="rounded-2xl border border-primary/10 p-4">
                  <p className="text-sm text-foreground/60">Рефералов приглашено</p>
                  <p className="text-lg font-bold">{profile.referralCount || 0}</p>
                </div>
              </div>
              
              <div className="rounded-2xl border border-primary/10 p-6 space-y-4">
                <div>
                  <p className="text-sm text-foreground/60">Партнёрская ссылка</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-primary/5 p-2 text-sm">https://qaiz.ru/ref/{profile.referralCode}</code>
                    <button className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-background">Копировать</button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-foreground/60">Текст приглашения</p>
                  <textarea 
                    className="mt-2 w-full rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    defaultValue={`Привет! Давай играть в Квайз вместе. Мой реферальный код: ${profile.referralCode}`}
                  />
                </div>
              </div>

              {profile.authorStatus === 'none' && (
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6 text-center">
                  <h4 className="text-lg font-bold">Станьте автором!</h4>
                  <p className="mt-2 text-sm text-foreground/60">
                    Получайте 50% от стоимости каждой покупки ваших вопросов.
                  </p>
                  <button className="btn-primary mt-4 px-8 py-2 text-sm">Подать заявку</button>
                </div>
              )}
              
              {profile.authorStatus === 'pending' && (
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 text-center">
                  <h4 className="text-lg font-bold text-yellow-500">Заявка на рассмотрении</h4>
                  <p className="mt-2 text-sm text-foreground/60">
                    Мы проверяем вашу анкету. Это займет до 24 часов.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'author' && profile.role === 'author' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Статистика автора</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 p-4">
                  <p className="text-sm text-foreground/60">Общий доход</p>
                  <p className="text-lg font-bold">{profile.authorEarnings || 0} ₽</p>
                </div>
                <div className="rounded-2xl border border-primary/10 p-4">
                  <p className="text-sm text-foreground/60">Продано вопросов</p>
                  <p className="text-lg font-bold">0</p>
                </div>
              </div>
              <button className="btn-primary w-full py-3">Создать новую игру</button>
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">История игр</h3>
              {loadingHistory ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : gameHistory.length > 0 ? (
                <div className="grid gap-4">
                  {gameHistory.map(session => (
                    <div key={session.id} className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/5 p-4">
                      <div>
                        <p className="font-bold uppercase tracking-tighter text-primary">{session.game_id}</p>
                        <p className="text-xs text-foreground/60">{new Date(session.created_at).toLocaleString()}</p>
                        <p className="text-xs text-foreground/40">Тема: {session.topic}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-primary">{session.score}</p>
                        <p className="text-[10px] uppercase tracking-widest text-foreground/40">Очков</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-foreground/40">
                  <History size={48} />
                  <p className="mt-4">История игр пуста</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <SettingItem label="Сменить имя" />
              <SettingItem label="Привязать Telegram" />
              <SettingItem label="Сменить пароль" />
              <SettingItem label="Вывод средств" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium text-foreground/60">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-black text-primary">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
        active ? 'bg-primary text-background' : 'hover:bg-primary/5'
      }`}
    >
      {label}
    </button>
  );
}

function SettingItem({ label }: { label: string }) {
  return (
    <button className="flex w-full items-center justify-between rounded-2xl border border-primary/10 p-4 hover:bg-primary/5">
      <span className="font-medium">{label}</span>
      <ChevronRight size={20} className="text-primary" />
    </button>
  );
}
