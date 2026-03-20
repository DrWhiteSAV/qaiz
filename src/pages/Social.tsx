import React, { useState } from 'react';
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
  User
} from 'lucide-react';

export function SocialPage() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'chats' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users size={64} className="text-primary/20" />
        <h2 className="mt-4 text-2xl font-bold">Вы не вошли в аккаунт</h2>
        <p className="mt-2 text-foreground/60">Войдите, чтобы общаться с друзьями</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-6">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-primary">Социальная сеть</h2>
          <div className="mt-6 flex flex-col gap-2">
            <TabButton active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} icon={<Users size={20} />} label="Друзья" count={0} />
            <TabButton active={activeTab === 'chats'} onClick={() => setActiveTab('chats')} icon={<MessageSquare size={20} />} label="Чаты" count={0} />
            <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={<UserPlus size={20} />} label="Заявки" count={0} />
          </div>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-background p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Найти друзей</h3>
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ID, Email или Имя..."
                className="w-full rounded-xl border border-primary/10 bg-primary/5 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button className="rounded-xl bg-primary p-2 text-background">
              <UserPlus size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="h-[600px] rounded-3xl border border-primary/20 bg-background overflow-hidden flex flex-col">
          {activeTab === 'friends' && (
            <div className="flex-1 p-6">
              <h3 className="text-xl font-bold">Ваши друзья</h3>
              <div className="mt-6 flex flex-col items-center justify-center py-20 text-foreground/40">
                <Users size={48} />
                <p className="mt-4">У вас пока нет друзей</p>
              </div>
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
            <div className="flex-1 p-6">
              <h3 className="text-xl font-bold">Входящие заявки</h3>
              <div className="mt-6 space-y-4">
                <div className="text-center py-20 text-foreground/40 italic">Новых заявок нет</div>
              </div>
            </div>
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
      className={`flex items-center justify-between rounded-2xl p-4 transition-all ${
        active ? 'bg-primary text-background shadow-lg shadow-primary/20' : 'hover:bg-primary/10'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-bold uppercase tracking-widest text-sm">{label}</span>
      </div>
      {count > 0 && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-background text-primary' : 'bg-primary text-background'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
