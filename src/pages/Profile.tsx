import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, 
  History, 
  User as UserIcon, 
  Share2, 
  LogOut,
  ChevronRight,
  Trophy,
  Gamepad2
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export function ProfilePage() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'settings'>('stats');

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
              {profile.role === 'admin' ? 'Администратор' : profile.role === 'author' ? 'Автор' : 'Игрок'}
            </span>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              ID: {profile.uid.slice(0, 8)}
            </span>
          </div>
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
        <StatCard icon={<Gamepad2 className="text-primary" />} label="Игр" value="0" />
        <StatCard icon={<Share2 className="text-primary" />} label="Рефералов" value="0" />
      </div>

      <div className="rounded-3xl border border-primary/20 bg-background overflow-hidden">
        <div className="flex border-b border-primary/10">
          <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="Статистика" />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="История" />
          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Настройки" />
        </div>
        
        <div className="p-8">
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Ваша активность</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 p-4">
                  <p className="text-sm text-foreground/60">Любимый режим</p>
                  <p className="text-lg font-bold">Человечный</p>
                </div>
                <div className="rounded-2xl border border-primary/10 p-4">
                  <p className="text-sm text-foreground/60">Сложность</p>
                  <p className="text-lg font-bold">Для людей</p>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/10 p-6">
                <p className="text-sm text-foreground/60">Партнёрская ссылка</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-primary/5 p-2 text-sm">qaiz.ru/ref/{profile.referralCode}</code>
                  <button className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-background">Копировать</button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="flex flex-col items-center justify-center py-10 text-foreground/40">
              <History size={48} />
              <p className="mt-4">История игр пуста</p>
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
