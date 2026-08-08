import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, 
  History, 
  User as UserIcon, 
  Share2, 
  ChevronRight,
  Trophy,
  Gamepad2,
  Settings,
  UserPlus,
  Loader2,
  Users,
  ExternalLink,
  Mail,
  LogOut
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SHOP_ITEMS } from '../constants';
import { UserAvatar } from '../components/UserAvatar';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

interface ReferralEntry {
  uid: string;
  display_name: string | null;
  telegram_id: string | null;
  username: string | null;
}

interface ReferrerInfo {
  display_name: string | null;
  telegram_id: string | null;
  username: string | null;
  telegram_profile_url: string | null;
  email: string | null;
}

const REFERRAL_BONUS = 100;
const WEB_BASE_URL = 'https://qaiz.ru';

export function ProfilePage() {
  const { profile, entryMode } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'settings' | 'author' | 'games'>('stats');
  const [authorGames, setAuthorGames] = useState<any[]>([]);
  const [authorPurchases, setAuthorPurchases] = useState<any[]>([]);
  const [authorGameSessions, setAuthorGameSessions] = useState<any[]>([]);
  const [loadingAuthor, setLoadingAuthor] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate('/');
    window.location.reload();
  };
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [gameStats, setGameStats] = useState<{ totalGames: number; wins: number; byType: Record<string, { played: number; wins: number }> }>({ totalGames: 0, wins: 0, byType: {} });
  // Telegram referrals: users who used Telegram invite link (referred_by = my telegram_id)
  const [tgReferrals, setTgReferrals] = useState<ReferralEntry[]>([]);
  // Web referrals: users who used web invite link (referred_code = my referral_code)
  const [webReferrals, setWebReferrals] = useState<ReferralEntry[]>([]);
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchHistory();
      fetchReferralData();
      if (profile.role === 'author' || profile.role === 'admin' || profile.role === 'superadmin') {
        fetchAuthorData();
      }
    }
  }, [profile]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    if (!supabase || !profile) {
      setLoadingHistory(false);
      return;
    }
    try {
      let sessions: any[] = [];
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', profile.uid);

      if (!error && data) {
        sessions = data;
      } else {
        const { data: fallbackData } = await supabase
          .from('game_sessions')
          .select('*');
        if (fallbackData) {
          sessions = fallbackData.filter((s: any) => s.user_id === profile.uid || (profile.telegram_id && String(s.user_id) === String(profile.telegram_id)));
        }
      }

      sessions.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.completed_at || 0).getTime();
        const dateB = new Date(b.created_at || b.completed_at || 0).getTime();
        return dateB - dateA;
      });

      setGameHistory(sessions);
      const wins = sessions.filter((s: any) => s.is_win).length;
      const byType: Record<string, { played: number; wins: number }> = {};
      sessions.forEach((s: any) => {
        const t = s.game_id || 'unknown';
        if (!byType[t]) byType[t] = { played: 0, wins: 0 };
        byType[t].played++;
        if (s.is_win) byType[t].wins++;
      });
      setGameStats({ totalGames: sessions.length, wins, byType });
    } catch (err) {
      console.error('Error in fetchHistory:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchAuthorData = async () => {
    if (!profile) return;
    setLoadingAuthor(true);
    try {
      // Get author's games from shop_items
      const { data: items } = await supabase
        .from('shop_items')
        .select('*')
        .eq('author_id', profile.uid);
      setAuthorGames(items || []);

      // Get game IDs from shop items
      const gameIds = (items || []).flatMap((item: any) => item.game_ids || []);
      
      if (gameIds.length > 0) {
        // Get purchases of author's items
        const itemIds = (items || []).map((item: any) => item.id);
        const { data: purchases } = await supabase
          .from('purchases')
          .select('*')
          .in('item_id', itemIds);
        setAuthorPurchases(purchases || []);

        // Get game sessions for author's games
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('*')
          .in('game_id', gameIds)
          .limit(50);
        
        const sortedSessions = (sessions || []).sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || a.completed_at || 0).getTime();
          const dateB = new Date(b.created_at || b.completed_at || 0).getTime();
          return dateB - dateA;
        });
        setAuthorGameSessions(sortedSessions);
      }
    } catch (error) {
      console.error('Error fetching author data:', error);
    }
    setLoadingAuthor(false);
  };

  const fetchReferralData = async () => {
    if (!supabase || !profile) return;
    setLoadingReferrals(true);

    const [tgResult, webResult] = await Promise.all([
      // Telegram referrals: invited via Telegram link
      profile.telegram_id
        ? supabase.from('profiles').select('uid, display_name, telegram_id, username').eq('referred_by', profile.telegram_id)
        : Promise.resolve({ data: [] }),
      // Web referrals: invited via web link (?ref=code)
      profile.referral_code
        ? supabase.from('profiles').select('uid, display_name, telegram_id, username').eq('referred_code', profile.referral_code)
        : Promise.resolve({ data: [] }),
    ]);

    setTgReferrals((tgResult.data as ReferralEntry[]) || []);
    setWebReferrals((webResult.data as ReferralEntry[]) || []);

    // Fetch who invited this user
    const referredBy = (profile as any).referred_by;
    const referredCode = (profile as any).referred_code;
    if (referredBy) {
      const { data: ref } = await supabase
        .from('profiles')
        .select('display_name, telegram_id, username, telegram_profile_url, email')
        .eq('telegram_id', referredBy)
        .maybeSingle();
      setReferrer(ref as ReferrerInfo | null);
    } else if (referredCode) {
      const { data: ref } = await supabase
        .from('profiles')
        .select('display_name, telegram_id, username, telegram_profile_url, email')
        .eq('referral_code', referredCode)
        .maybeSingle();
      setReferrer(ref as ReferrerInfo | null);
    } else {
      setReferrer(null);
    }

    setLoadingReferrals(false);
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <UserIcon size={64} className="text-primary/20" />
        <h2 className="mt-4 text-2xl font-bold">Вы не вошли в аккаунт</h2>
        <p className="mt-2 text-foreground/60">Откройте приложение через Telegram Mini App</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center gap-6 rounded-[2rem] border border-primary/10 bg-card/40 backdrop-blur-md p-6 text-center sm:flex-row sm:text-left relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/40 transition-colors" />
          <UserAvatar
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            size="xl"
            className="relative border-4 border-background shadow-2xl"
          />
        </div>

        <div className="flex-1 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-2xl font-black uppercase tracking-tighter title-glow">{profile.display_name}</h2>
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
            
            {profile.telegram_id && (
              <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 backdrop-blur-md border border-blue-500/20 px-4 py-2 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Telegram</span>
                <span className="text-xs font-bold">ID: {profile.telegram_id}</span>
              </div>
            )}

            {((profile as any).referred_by || (profile as any).referred_code) && (
              <div className="flex items-center gap-3 rounded-xl bg-green-500/10 backdrop-blur-md border border-green-500/20 px-4 py-2 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Приглашён</span>
                <span className="text-xs font-bold">
                  {(profile as any).referred_by ? `TG: ${(profile as any).referred_by}` : `Код: ${(profile as any).referred_code}`}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {(profile.role === 'admin' || profile.role === 'superadmin') && (
              <Link 
                to="/admin" 
                className="btn-primary px-8 py-3 text-sm font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform"
              >
                <Settings size={18} className="mr-2" />
                Панель админа
              </Link>
            )}
            {profile.role === 'author' && (
              <button
                onClick={() => setActiveTab('author')}
                className="btn-primary px-8 py-3 text-sm font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform"
              >
                <Settings size={18} className="mr-2" />
                Кабинет автора
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/billing" className="block transition-transform hover:scale-105">
          <StatCard icon={<Wallet className="text-primary" />} label="Баланс" value={`${profile.balance} ₽`} />
        </Link>
        <StatCard icon={<Trophy className="text-primary" />} label="Побед" value={gameStats.wins.toString()} />
        <StatCard icon={<Gamepad2 className="text-primary" />} label="Игр" value={gameStats.totalGames.toString()} />
        <StatCard icon={<Share2 className="text-primary" />} label="Рефералов" value={`${profile.referral_count || 0}`} />
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
                  <p className="text-lg font-bold">{profile.referral_earnings || 0} ₽</p>
                </div>
                <div className="rounded-2xl border border-primary/10 p-4">
                  <p className="text-sm text-foreground/60">Рефералов приглашено</p>
                  <p className="text-lg font-bold">{profile.referral_count || 0}</p>
                </div>
              </div>

              {/* Game stats by type */}
              {Object.keys(gameStats.byType).length > 0 && (
                <div className="rounded-2xl border border-primary/10 p-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Статистика по играм</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(gameStats.byType).map(([type, stats]) => {
                      const gameNames: Record<string, string> = {
                        blitz: 'КвИИЗ',
                        millionaire: 'Квиллионер',
                        '100to1': 'Сто Квадному',
                        whatwherewhen: 'Что Где Квак',
                        jeopardy: 'Своя Икра',
                        melody: 'КваКвоту'
                      };
                      return (
                        <div key={type} className="flex items-center justify-between rounded-xl border border-primary/10 bg-primary/5 p-3">
                          <div>
                            <p className="text-sm font-bold text-primary">{gameNames[type] || type}</p>
                            <p className="text-xs text-foreground/50">Сыграно: {stats.played}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-primary">{stats.wins}</p>
                            <p className="text-[10px] uppercase tracking-widest text-foreground/40">побед</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Who invited ME */}
              {((profile as any).referred_by || (profile as any).referred_code) && (
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Вас пригласил</p>
                  {loadingReferrals ? (
                    <Loader2 className="animate-spin text-primary" size={20} />
                  ) : referrer ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-black text-lg shrink-0">
                        {(referrer.display_name || '?')[0]}
                      </div>
                      <div>
                        <p className="font-bold">{referrer.display_name || 'Пользователь'}</p>
                        {(referrer.telegram_profile_url || referrer.username || referrer.telegram_id) ? (
                          <a
                            href={
                              referrer.telegram_profile_url ||
                              (referrer.username
                                ? `https://t.me/${referrer.username.replace(/^@/, '')}`
                                : `tg://user?id=${referrer.telegram_id}`)
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink size={11} />
                            Telegram
                          </a>
                        ) : referrer.email ? (
                          <span className="inline-flex items-center gap-1 text-xs text-foreground/60">
                            <Mail size={11} />
                            {referrer.email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/40">
                      {(profile as any).referred_by ? `TG: ${(profile as any).referred_by}` : `Код: ${(profile as any).referred_code}`}
                    </p>
                  )}
                </div>
              )}

              {/* Telegram referrals list */}
              {profile.telegram_id && (
                <div className="rounded-2xl border border-primary/10 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
                      📱 Рефералы через Telegram ({tgReferrals.length})
                    </p>
                  </div>
                  {loadingReferrals ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary" size={24} /></div>
                  ) : tgReferrals.length > 0 ? (
                    <div className="divide-y divide-primary/10">
                      {tgReferrals.map((r: ReferralEntry) => (
                        <div key={r.uid} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-black shrink-0">
                              {(r.display_name || '?')[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{r.display_name || 'Пользователь'}</p>
                              {r.telegram_id && (
                                <a href={`https://t.me/${r.username || r.telegram_id}`} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                  <ExternalLink size={11} />Telegram
                                </a>
                              )}
                            </div>
                          </div>
                          <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-black text-primary">+{REFERRAL_BONUS} ₽</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/40 text-center py-4">Нет рефералов через Telegram</p>
                  )}
                </div>
              )}

              {/* Web referrals list */}
              {profile.referral_code && (
                <div className="rounded-2xl border border-primary/10 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
                      🌐 Рефералы через сайт ({webReferrals.length})
                    </p>
                  </div>
                  {loadingReferrals ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary" size={24} /></div>
                  ) : webReferrals.length > 0 ? (
                    <div className="divide-y divide-primary/10">
                      {webReferrals.map((r: ReferralEntry) => (
                        <div key={r.uid} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-black shrink-0">
                              {(r.display_name || '?')[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{r.display_name || 'Пользователь'}</p>
                              {r.telegram_id && (
                                <a href={`https://t.me/${r.username || r.telegram_id}`} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                  <ExternalLink size={11} />Telegram
                                </a>
                              )}
                            </div>
                          </div>
                          <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-black text-primary">+{REFERRAL_BONUS} ₽</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/40 text-center py-4">Нет рефералов через сайт</p>
                  )}
                </div>
              )}

              {/* Referral links */}
              <div className="rounded-2xl border border-primary/10 p-6 space-y-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Реферальные ссылки</p>

                {profile.telegram_id && (
                  <div>
                    <p className="text-sm text-foreground/60 mb-2">📱 Ссылка для Telegram</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg bg-primary/5 border border-primary/10 p-2 text-xs break-all">
                        https://t.me/qaiz_AIbot/app?startapp={profile.telegram_id}
                      </code>
                      <button onClick={() => { navigator.clipboard.writeText(`https://t.me/qaiz_AIbot/app?startapp=${profile.telegram_id}`); alert('Ссылка скопирована!'); }}
                        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-background">Копировать</button>
                    </div>
                  </div>
                )}

                {profile.referral_code && (
                  <div>
                    <p className="text-sm text-foreground/60 mb-2">🌐 Веб-ссылка</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg bg-primary/5 border border-primary/10 p-2 text-xs break-all">
                        {WEB_BASE_URL}/?ref={profile.referral_code}
                      </code>
                      <button onClick={() => { navigator.clipboard.writeText(`${WEB_BASE_URL}/?ref=${profile.referral_code}`); alert('Ссылка скопирована!'); }}
                        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-background">Копировать</button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-foreground/60 mb-2">Текст приглашения</p>
                  <div className="relative">
                    <textarea
                      className="w-full rounded-xl border border-primary/10 bg-primary/5 p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={profile.telegram_id && profile.referral_code ? 7 : 6}
                      readOnly
                      value={[
                        `Привет! Я играю в Квайз, присоединяйся ко мне.`,
                        `Тут на баланс сразу 100р дают при регистрации (это 10 игр халявных).`,
                        `Можно играть со мной или с ИИ в Квиз, Свояк, ЧГК, 100к1 и другие игры. Ты же такое любишь?`,
                        ...(profile.telegram_id ? [`📱 Telegram: https://t.me/qaiz_AIbot/app?startapp=${profile.telegram_id}`] : []),
                        ...(profile.referral_code ? [`🌐 Браузер: ${WEB_BASE_URL}/?ref=${profile.referral_code}`] : []),
                      ].join('\n')}
                    />
                    <button
                      onClick={() => {
                        const text = [
                          `Привет! Я играю в Квайз, присоединяйся ко мне.`,
                          `Тут на баланс сразу 100р дают при регистрации (это 10 игр халявных).`,
                          `Можно играть со мной или с ИИ в Квиз, Свояк, ЧГК, 100к1 и другие игры. Ты же такое любишь?`,
                          ...(profile.telegram_id ? [`📱 Telegram: https://t.me/qaiz_AIbot/app?startapp=${profile.telegram_id}`] : []),
                          ...(profile.referral_code ? [`🌐 Браузер: ${WEB_BASE_URL}/?ref=${profile.referral_code}`] : []),
                        ].join('\n');
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

              {/* Telegram not connected — browser mode */}
              {!profile.telegram_id && entryMode === 'browser' && (
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6">
                  <h4 className="text-lg font-bold text-primary">Telegram не подключён</h4>
                  <p className="mt-2 text-sm text-foreground/60">
                    Откройте Квайз в Telegram — ваш профиль привяжется автоматически.
                  </p>
                  <a
                    href={`https://t.me/qaiz_AIbot/app?startapp=link_${profile.uid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-background transition-transform hover:scale-105"
                  >
                    Открыть в Telegram
                  </a>
                </div>
              )}

              {/* Google not connected — TMA mode */}
              {!profile.email && entryMode === 'telegram' && (
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🎁</div>
                    <div>
                      <h4 className="text-lg font-bold text-primary">Привяжите Google — +100 ₽</h4>
                      <p className="text-sm text-foreground/60">
                        Войдите через браузер и привяжите Google-аккаунт, чтобы получить бонус
                      </p>
                    </div>
                  </div>
                  
                  <div className="rounded-xl bg-background/30 border border-primary/10 p-4 space-y-2">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Инструкция</p>
                    <ol className="text-sm text-foreground/70 space-y-1.5 list-decimal list-inside">
                      <li>Переходите по кнопке ниже в браузер.</li>
                      <li>Регистрируетесь через Гугл-аккаунт.</li>
                      <li>После регистрации заходите в свой Профиль (иконка в правом верхнем углу).</li>
                      <li>Нажимаете кнопку «Открыть в Телеграм».</li>
                    </ol>
                    <p className="text-xs text-primary font-bold mt-2">
                      Готово. Теперь вы можете играть в браузере и в Телеграм одновременно.
                    </p>
                  </div>

                  <a
                    href={`${window.location.origin}/?link_tma=${profile.uid}`}
                    onClick={(e) => {
                      if ((window as any).Telegram?.WebApp?.openLink) {
                        e.preventDefault();
                        (window as any).Telegram.WebApp.openLink(`${window.location.origin}/?link_tma=${profile.uid}`);
                      }
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-wider text-background shadow-lg hover:scale-[1.02] transition-transform"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Войти через Google
                  </a>
                </div>
              )}

              {profile.author_status === 'none' && profile.role !== 'author' && profile.role !== 'admin' && profile.role !== 'superadmin' && (
                <AuthorApplicationBlock profileUid={profile.uid} onSuccess={() => window.location.reload()} />
              )}
            </div>
          )}
          
          {activeTab === 'author' && profile.role === 'author' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Кабинет автора</h3>
              
              {loadingAuthor ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={32} /></div>
              ) : (
                <>
                  {/* Author earnings summary */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-primary/10 p-4">
                      <p className="text-sm text-foreground/60">Общий доход</p>
                      <p className="text-lg font-bold">{profile.author_earnings || 0} ₽</p>
                    </div>
                    <div className="rounded-2xl border border-primary/10 p-4">
                      <p className="text-sm text-foreground/60">Игр в магазине</p>
                      <p className="text-lg font-bold">{authorGames.length}</p>
                    </div>
                    <div className="rounded-2xl border border-primary/10 p-4">
                      <p className="text-sm text-foreground/60">Покупок</p>
                      <p className="text-lg font-bold">{authorPurchases.length}</p>
                    </div>
                  </div>

                  {/* Author's games */}
                  <div className="rounded-2xl border border-primary/10 p-5 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Мои игры в магазине</p>
                    {authorGames.length > 0 ? (
                      <div className="divide-y divide-primary/10">
                        {authorGames.map((game: any) => {
                          const gamePurchases = authorPurchases.filter((p: any) => p.item_id === game.id);
                          const gameSessions = authorGameSessions.filter((s: any) => (game.game_ids || []).includes(s.game_id));
                          return (
                            <div key={game.id} className="py-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-primary">{game.title}</p>
                                  <p className="text-xs text-foreground/50">{game.description || 'Без описания'}</p>
                                </div>
                                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-black text-primary">
                                  {game.price || 0} ₽
                                </span>
                              </div>
                              <div className="flex gap-4 text-xs text-foreground/50">
                                <span>Покупок: {gamePurchases.length}</span>
                                <span>Сессий: {gameSessions.length}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/40 text-center py-4">Вы ещё не создали игр для магазина</p>
                    )}
                  </div>

                  {/* Purchases of author's games */}
                  {authorPurchases.length > 0 && (
                    <div className="rounded-2xl border border-primary/10 p-5 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Последние покупки ваших игр</p>
                      <div className="divide-y divide-primary/10">
                        {authorPurchases.slice(0, 20).map((purchase: any) => (
                          <div key={purchase.id} className="flex items-center justify-between py-3">
                            <div>
                              <p className="text-sm font-semibold">{authorGames.find((g: any) => g.id === purchase.item_id)?.title || purchase.item_id}</p>
                              <p className="text-xs text-foreground/40">{new Date(purchase.purchased_at).toLocaleString()}</p>
                            </div>
                            <span className="rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-black text-green-600">
                              +{purchase.price_paid} ₽
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link to="/game-creation" className="block w-full rounded-full bg-primary py-3 text-center text-sm font-black uppercase tracking-tighter text-background transition-transform hover:scale-105">
                    Создать новую игру
                  </Link>
                </>
              )}
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
              {(profile as any)?.purchasedGames && (profile as any)?.purchasedGames.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(profile as any)?.purchasedGames.map((gameId: string) => {
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

              {/* Google account linking */}
              <div className="rounded-2xl border border-primary/10 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={16} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Аккаунт Google</span>
                </div>
                {profile.email ? (
                  <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <div>
                      <p className="text-xs font-black text-primary">Привязан</p>
                      <p className="text-xs text-foreground/60">{profile.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-foreground/60">Привяжи Google-аккаунт для входа через браузер</p>
                    <GoogleAuthButton mode="link" linkUid={profile.uid} />
                  </div>
                )}
              </div>

              {/* Sign out — browser mode only */}
              {entryMode === 'browser' && (
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 p-4 hover:bg-destructive/10 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={18} className="text-destructive" />
                    <span className="font-bold text-destructive">Выйти из аккаунта</span>
                  </div>
                  {signingOut && <Loader2 size={18} className="animate-spin text-destructive" />}
                </button>
              )}
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

function AuthorApplicationBlock({ profileUid, onSuccess }: { profileUid: string; onSuccess: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'checking' | 'done'>('idle');
  const [seconds, setSeconds] = useState(10);
  const [msgIndex, setMsgIndex] = useState(0);

  const messages = [
    'Анализируем ваш профиль...',
    'Проверяем активность в играх...',
    'Оцениваем эрудицию...',
    'Сверяем с базой авторов...',
    'Формируем заключение...',
  ];

  useEffect(() => {
    if (phase !== 'checking') return;
    if (seconds <= 0) {
      // Update DB
      (async () => {
        await supabase.from('profiles').update({ role: 'author', author_status: 'approved' }).eq('uid', profileUid);
        setPhase('done');
        setTimeout(onSuccess, 2000);
      })();
      return;
    }
    const t = setTimeout(() => {
      setSeconds(s => s - 1);
      setMsgIndex(i => Math.min(i + 1, messages.length - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, seconds]);

  if (phase === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <h4 className="text-lg font-bold text-emerald-500">Вы стали автором!</h4>
        <p className="text-sm text-foreground/60">Теперь вы можете создавать и продавать свои игры.</p>
      </div>
    );
  }

  if (phase === 'checking') {
    const progress = ((10 - seconds) / 10) * 100;
    return (
      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6 text-center space-y-4">
        <div className="text-4xl animate-pulse">🤖</div>
        <h4 className="text-lg font-bold text-primary">ИИ проверяет заявку</h4>
        <p className="text-sm text-foreground/60 min-h-[1.5rem]">{messages[msgIndex]}</p>
        <div className="w-full h-2 rounded-full bg-primary/20 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-foreground/40">~{seconds} сек</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6 text-center">
      <h4 className="text-lg font-bold">Станьте автором!</h4>
      <p className="mt-2 text-sm text-foreground/60">
        Получайте 50% от стоимости каждой покупки ваших вопросов.
      </p>
      <button onClick={() => setPhase('checking')} className="btn-primary mt-4 px-8 py-2 text-sm">Подать заявку</button>
    </div>
  );
}
