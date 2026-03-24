import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Search, 
  Check, 
  X, 
  Send,
  MoreVertical,
  User,
  Loader2
} from 'lucide-react';
import { getSupabase } from '../supabase';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  friend_profile: {
    display_name: string;
    avatar_url: string;
    level: number;
  };
}

export function SocialPage() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'chats' | 'requests' | 'channels'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const fetchFriends = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase || !user) return;

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        friend_profile:profiles!friends_friend_id_fkey (
          display_name,
          avatar_url,
          level
        ),
        user_profile:profiles!friends_user_id_fkey (
          display_name,
          avatar_url,
          level
        )
      `)
      .or(`user_id.eq.${user.uid},friend_id.eq.${user.uid}`);

    if (error) {
      console.error('Error fetching friends:', error);
    } else {
      setFriends(data as any);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const supabase = getSupabase();
    if (!supabase || !user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('uid, display_name, avatar_url, level')
      .or(`display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .neq('uid', user.uid)
      .limit(5);

    if (error) {
      console.error('Error searching users:', error);
    } else {
      setSearchResults(data || []);
    }
    setSearching(false);
  };

  const sendRequest = async (friendId: string) => {
    const supabase = getSupabase();
    if (!supabase || !user) return;

    // Check if already friends or request pending
    const { data: existing } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.uid)
      .eq('friend_id', friendId)
      .single();

    if (existing) {
      alert('Запрос уже отправлен или вы уже друзья');
      return;
    }

    const { error } = await supabase
      .from('friends')
      .insert([
        { user_id: user.uid, friend_id: friendId, status: 'pending' },
        { user_id: friendId, friend_id: user.uid, status: 'pending' } // Symmetric for simplicity in this demo
      ]);

    if (error) {
      console.error('Error sending request:', error);
    } else {
      alert('Запрос отправлен!');
      setSearchResults([]);
      setSearchQuery('');
      fetchFriends();
    }
  };

  const handleRequest = async (friendshipId: string, status: 'accepted' | 'declined') => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('friends')
      .update({ status })
      .eq('id', friendshipId);

    if (error) {
      console.error('Error updating friendship:', error);
    } else {
      fetchFriends();
    }
  };

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users size={64} className="text-primary/20" />
        <h2 className="mt-4 text-2xl font-bold">Вы не вошли в аккаунт</h2>
        <p className="mt-2 text-foreground/60">Войдите, чтобы общаться с друзьями</p>
      </div>
    );
  }

  const acceptedFriends = friends.filter(f => f.status === 'accepted').map(f => {
    // If I am user_id, friend is friend_id. If I am friend_id, friend is user_id
    if (f.user_id === user.uid) {
      return {
        id: f.id,
        friend_id: f.friend_id,
        profile: f.friend_profile
      };
    } else {
      return {
        id: f.id,
        friend_id: f.user_id,
        profile: (f as any).user_profile
      };
    }
  });

  const pendingRequests = friends.filter(f => f.status === 'pending' && f.friend_id === user.uid);
  const outgoingRequests = friends.filter(f => f.status === 'pending' && f.user_id === user.uid);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1 flex flex-col gap-6">
        {/* Find Friends - Top on mobile */}
        <div className="order-1 lg:order-2 rounded-3xl border border-primary/20 bg-background p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest">Найти друзей</h3>
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="ID, Email или Имя..."
                className="w-full rounded-xl border border-primary/10 bg-primary/5 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button 
              onClick={handleSearch}
              disabled={searching}
              className="rounded-xl bg-primary p-2 text-background disabled:opacity-50"
            >
              {searching ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-primary/10 pt-4">
              {searchResults.map(u => (
                <div key={u.uid} className="flex items-center justify-between rounded-xl bg-primary/5 p-2">
                  <div className="flex items-center gap-2">
                    <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} alt="" className="h-8 w-8 rounded-full" />
                    <div>
                      <p className="text-xs font-bold">{u.display_name}</p>
                      <p className="text-[10px] text-foreground/60">Ур. {u.level}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => sendRequest(u.uid)}
                    className="rounded-full bg-primary p-1.5 text-background hover:scale-110 transition-transform"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Tabs - Below search on mobile, horizontal row */}
        <div className="order-2 lg:order-1 rounded-3xl border border-primary/20 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-black uppercase tracking-tighter">Социальная сеть</h2>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-1 gap-2">
            <TabButton active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} icon={<Users size={20} />} label="Друзья" count={acceptedFriends.length} />
            <TabButton active={activeTab === 'chats'} onClick={() => setActiveTab('chats')} icon={<MessageSquare size={20} />} label="Чаты" count={0} />
            <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={<UserPlus size={20} />} label="Заявки" count={pendingRequests.length} />
            <TabButton active={activeTab === 'channels'} onClick={() => setActiveTab('channels')} icon={<Send size={20} />} label="Каналы" count={0} />
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="h-[600px] rounded-3xl border border-primary/20 bg-background overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={48} />
            </div>
          ) : (
            <>
              {activeTab === 'friends' && (
                <div className="flex-1 p-6 overflow-y-auto">
                  <h3 className="text-xl font-bold">Ваши друзья</h3>
                  {acceptedFriends.length > 0 ? (
                    <div className="mt-6 grid gap-4">
                      {acceptedFriends.map(friend => (
                        <div key={friend.id} className="flex items-center justify-between rounded-2xl border border-primary/10 bg-card p-4 shadow-sm">
                          <div className="flex items-center gap-4">
                            <img src={friend.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.friend_id}`} alt="" className="h-12 w-12 rounded-full border-2 border-primary/20" />
                            <div>
                              <p className="font-bold">{friend.profile.display_name}</p>
                              <p className="text-xs text-foreground/60">Уровень {friend.profile.level}</p>
                            </div>
                          </div>
                          <button className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary hover:text-background transition-all">
                            <MessageSquare size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col items-center justify-center py-20 text-foreground/40">
                      <Users size={48} />
                      <p className="mt-4">У вас пока нет друзей</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chats' && (
                <div className="flex flex-1 overflow-hidden">
                  <div className="w-1/3 border-r border-primary/10 p-4 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-foreground/40">Последние чаты</p>
                    <div className="text-center py-10 text-xs text-foreground/40 italic">Нет активных чатов</div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center bg-primary/5 p-6 text-center">
                    <MessageSquare size={48} className="text-primary/20" />
                    <h4 className="mt-4 font-bold">Выберите чат</h4>
                    <p className="text-sm text-foreground/60">Начните общение с друзьями прямо сейчас</p>
                  </div>
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-bold">Входящие заявки</h3>
                      {pendingRequests.length > 0 ? (
                        <div className="mt-6 grid gap-4">
                          {pendingRequests.map(request => (
                            <div key={request.id} className="flex items-center justify-between rounded-2xl border border-primary/10 bg-card p-4 shadow-sm">
                              <div className="flex items-center gap-4">
                                <img src={(request as any).user_profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.user_id}`} alt="" className="h-12 w-12 rounded-full border-2 border-primary/20" />
                                <div>
                                  <p className="font-bold">{(request as any).user_profile.display_name}</p>
                                  <p className="text-xs text-foreground/60">Хочет добавить вас в друзья</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleRequest(request.id, 'accepted')} className="rounded-full bg-green-500 p-2 text-white hover:scale-110 transition-all">
                                  <Check size={18} />
                                </button>
                                <button onClick={() => handleRequest(request.id, 'declined')} className="rounded-full bg-red-500 p-2 text-white hover:scale-110 transition-all">
                                  <X size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-6 flex flex-col items-center justify-center py-10 text-foreground/40">
                          <UserPlus size={48} />
                          <p className="mt-4">Новых заявок нет</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold">Исходящие заявки</h3>
                      {outgoingRequests.length > 0 ? (
                        <div className="mt-6 grid gap-4">
                          {outgoingRequests.map(request => (
                            <div key={request.id} className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/5 p-4">
                              <div className="flex items-center gap-4">
                                <img src={request.friend_profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.friend_id}`} alt="" className="h-12 w-12 rounded-full border-2 border-primary/20" />
                                <div>
                                  <p className="font-bold">{request.friend_profile.display_name}</p>
                                  <p className="text-xs text-foreground/60">Ожидание подтверждения</p>
                                </div>
                              </div>
                              <button onClick={() => handleRequest(request.id, 'declined')} className="rounded-full bg-red-500/10 p-2 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                <X size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-6 flex flex-col items-center justify-center py-10 text-foreground/40">
                          <Send size={48} />
                          <p className="mt-4">Нет исходящих заявок</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'channels' && (
                <div className="flex-1 p-6 space-y-6">
                  <h3 className="text-xl font-bold">Наши социальные сети</h3>
                  <div className="grid gap-4">
                    <a href="https://t.me/qaiz_AIbot" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/5 p-4 hover:bg-primary/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-sky-500/20 p-3 text-sky-500">
                          <Send size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-primary">Telegram Бот</p>
                          <p className="text-xs text-foreground/60">Играйте прямо в Telegram</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase text-primary">Перейти</span>
                    </a>
                    
                    <a href="https://vk.com/qaiz_game" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/5 p-4 hover:bg-primary/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-blue-500/20 p-3 text-blue-500">
                          <Users size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-primary">ВКонтакте</p>
                          <p className="text-xs text-foreground/60">Сообщество игроков и обсуждения</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase text-primary">Вступить</span>
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count: number }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-shrink-0 lg:w-full items-center justify-between rounded-2xl p-3 md:p-4 transition-all ${
        active ? 'bg-primary text-background shadow-lg shadow-primary/20' : 'bg-primary/5 text-primary hover:bg-primary/10'
      }`}
    >
      <div className="flex items-center gap-2 md:gap-3">
        {icon}
        <span className="text-[10px] md:text-sm font-bold uppercase tracking-widest whitespace-nowrap">{label}</span>
      </div>
      {count > 0 && (
        <span className={`ml-2 rounded-full px-2 py-0.5 text-[8px] md:text-[10px] font-black ${active ? 'bg-background text-primary' : 'bg-primary text-background'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
