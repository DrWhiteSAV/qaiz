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
import { SHOP_ITEMS } from '../constants';

export function ProfilePage() {
  const { profile, user, logout, linkTelegram, unlinkTelegram, changeGoogleAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'settings' | 'author' | 'games'>('stats');
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tgCode, setTgCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [changingAccount, setChangingAccount] = useState(false);

  useEffect(() => {
    if (activeTab === 'history' && user) {
      fetchHistory();
    }
  }, [activeTab, user]);

  const handleLinkTelegram = async () => {
    if (!tgCode) return;
    setLinking(true);
    try {
      await linkTelegram(tgCode);
      alert('Telegram успешно привязан!');
      setTgCode('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при привязке');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    setUnlinking(true);
    try {
      await unlinkTelegram();
      alert('Telegram успешно отвязан!');
      setShowUnlinkConfirm(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при отвязке');
    } finally {
      setUnlinking(false);
    }
  };

  const handleChangeAccount = async () => {
    if (!window.confirm('Вы будете перенаправлены на страницу выбора Google аккаунта. Продолжить?')) return;
    setChangingAccount(true);
    try {
      await changeGoogleAccount();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка при смене аккаунта');
    } finally {
      setChangingAccount(false);
    }
  };

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
        {user && (
          <button 
            onClick={() => logout()}
            className="mt-6 flex items-center gap-2 rounded-full bg-red-500 px-6 py-2 font-medium text-white hover:bg-red-600 transition-colors"
          >
            <LogOut size={18} />
            Выйти из аккаунта
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center gap-6 rounded-[2rem] border border-primary/10 bg-card/40 backdrop-blur-md p-6 text-center sm:flex-row sm:text-left relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/40 transition-colors" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary text-5xl font-black text-background overflow-hidden border-4 border-background shadow-2xl">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              profile.displayName[0]
            )}
          </div>
        </div>

        <div className="flex-1 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-2xl font-black uppercase tracking-tighter title-glow">{profile.displayName}</h2>
            <span className="w-fit rounded-full bg-primary/10 border border-primary/20 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-primary backdrop-blur-md">
              {profile.role === 'superadmin' ? 'Супер-Админ' : profile.role === 'admin' ? 'Администратор' : profile.role === 'author' ? 'Автор' : 'Игрок'}
            </span>
          </div>
          <p className="text-foreground/50 font-medium mt-1">{profile.email}</p>
          
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-background/50 backdrop-blur-md border border-primary/10 px-4 py-2 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">UID</span>
              <span className="text-xs font-bold font-mono">{profile.uid.slice(0, 8)}</span>
            </div>
            
            {profile.telegramId && (
              <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 backdrop-blur-md border border-blue-500/20 px-4 py-2 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Telegram</span>
                <span className="text-xs font-bold">@{profile.telegramId}</span>
                <button 
                  onClick={() => setShowUnlinkConfirm(true)}
                  disabled={unlinking}
                  className="ml-2 text-[10px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                >
                  {unlinking ? '...' : 'Отвязать'}
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {(profile.role === 'admin' || profile.role === 'superadmin' || profile.role === 'author') ? (
              <Link 
                to={profile.role === 'author' ? '/profile?tab=author' : '/admin'} 
                className="btn-primary px-8 py-3 text-sm font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform"
              >
                <Settings size={18} className="mr-2" />
                Личный кабинет
              </Link>
            ) : (
              <button 
                onClick={() => alert('Заявка на роль автора подана! Мы свяжемся с вами.')}
                className="rounded-full bg-primary/10 border border-primary/20 px-8 py-3 text-sm font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-all shadow-sm"
              >
                <UserPlus size={18} className="mr-2" />
                Стать автором
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/billing" className="block transition-transform hover:scale-105">
          <StatCard icon={<Wallet className="text-primary" />} label="Баланс" value={`${profile.balance} ₽`} />
        </Link>
        <StatCard icon={<Trophy className="text-primary" />} label="Побед" value="0" />
        <StatCard icon={<Gamepad2 className="text-primary" />} label="Игр" value={gameHistory.length.toString()} />
        <StatCard icon={<Share2 className="text-primary" />} label="Рефералов" value={`${profile.referralCount || 0}`} />
      </div>

      <div className="rounded-[2rem] border border-primary/10 bg-card/40 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="flex border-b border-primary/10 bg-primary/5 p-2 gap-2 overflow-x-auto">
          <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="Статистика" />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="История" />
          <TabButton active={activeTab === 'games'} onClick={() => setActiveTab('games')} label="Мои игры" />
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
                  <p className="text-sm text-foreground/60">Партнёрская ссылка (Telegram)</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-primary/5 p-2 text-sm break-all">
                      https://t.me/qaiz_AIbot/app?startapp={profile.telegramId || profile.referralCode}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://t.me/qaiz_AIbot/app?startapp=${profile.telegramId || profile.referralCode}`);
                        alert('Ссылка скопирована!');
                      }}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-background"
                    >
                      Копировать
                    </button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-foreground/60">Текст приглашения</p>
                  <div className="relative mt-2">
                    <textarea 
                      id="referral-text"
                      className="w-full rounded-xl border border-primary/10 bg-primary/5 p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={6}
                      readOnly
                      value={`Привет! Я играю в Квайз, присоединяйся ко мне. 
Тут на баланс сразу 100р дают при регистрации (это 10 игр халявных).
Можно играть со мной или с ИИ в Квиз, Свояк, ЧГК, 100к1 и другие игры. Ты же такое любишь?
Вот ссылка на приложение https://t.me/qaiz_AIbot/app?startapp=${profile.telegramId || profile.referralCode}`}
                    />
                    <button 
                      onClick={() => {
                        const text = `Привет! Я играю в Квайз, присоединяйся ко мне. 
Тут на баланс сразу 100р дают при регистрации (это 10 игр халявных).
Можно играть со мной или с ИИ в Квиз, Свояк, ЧГК, 100к1 и другие игры. Ты же такое любишь?
Вот ссылка на приложение https://t.me/qaiz_AIbot/app?startapp=${profile.telegramId || profile.referralCode}`;
                        navigator.clipboard.writeText(text);
                        alert('Текст скопирован!');
                      }}
                      className="absolute right-2 top-2 rounded-lg bg-primary p-2 text-background hover:scale-105 transition-transform"
                      title="Копировать текст"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {!profile.telegramId && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
                  <h4 className="text-lg font-bold text-blue-500">Привяжите Telegram</h4>
                  <p className="mt-2 text-sm text-foreground/60">
                    Привяжите аккаунт Telegram, чтобы получать уведомления и использовать реферальную программу в боте.
                  </p>
                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <a 
                      href="https://t.me/qaiz_AIbot?start=link" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-105"
                    >
                      Перейти в бота
                    </a>
                    <div className="flex flex-1 items-center gap-2">
                      <input 
                        type="text" 
                        value={tgCode}
                        onChange={(e) => setTgCode(e.target.value)}
                        placeholder="Введите код из бота..." 
                        className="flex-1 rounded-xl border border-primary/10 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button 
                        onClick={handleLinkTelegram}
                        disabled={linking || !tgCode}
                        className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-background disabled:opacity-50"
                      >
                        {linking ? '...' : 'ОК'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
          
          {activeTab === 'games' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Купленные игры</h3>
              {profile.purchasedGames && profile.purchasedGames.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {profile.purchasedGames.map(gameId => {
                    const game = SHOP_ITEMS.find(i => i.id === gameId);
                    return (
                      <div key={gameId} className="flex items-center justify-between rounded-2xl border border-primary/10 bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-primary/10 p-2 text-primary">
                            <Gamepad2 size={20} />
                          </div>
                          <div>
                            <p className="font-bold uppercase tracking-tighter">{game?.title || gameId}</p>
                            <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Автор: {game?.author || 'Неизвестен'}</p>
                          </div>
                        </div>
                        <Link to="/games" className="rounded-full bg-primary px-4 py-1.5 text-[10px] font-black uppercase text-background shadow-lg hover:scale-105 transition-transform">Играть</Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-foreground/40 italic">У вас пока нет купленных игр</div>
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
    <div className="rounded-2xl border border-primary/10 bg-card/40 backdrop-blur-md p-4 transition-all hover:bg-card/60 group shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/5 shadow-sm group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{label}</span>
      </div>
      <p className="mt-4 text-2xl font-black text-primary title-glow">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-2xl ${
        active ? 'bg-primary text-background shadow-lg scale-[1.02]' : 'text-foreground/40 hover:bg-primary/10 hover:text-primary'
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
