import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFrogSound } from '../hooks/useSound';
import { Settings, Users, Database, MessageSquare, ShieldCheck, Plus } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { profile } = useAuth();
  const { playCroak } = useFrogSound();
  const [activeTab, setActiveTab] = useState<'users' | 'games' | 'prompts' | 'settings'>('users');

  if (profile?.role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <ShieldCheck size={80} className="text-red-500" />
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tighter text-red-500">Доступ запрещен</h1>
        <p className="mt-2 text-foreground/60">У вас нет прав для просмотра этой страницы</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-glow bg-background/60 p-8 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Settings className="text-primary" size={40} />
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-primary title-glow">CRM Панель</h1>
            <p className="text-sm text-foreground/40 uppercase tracking-widest">Управление платформой Квайз</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-primary">{profile.displayName}</p>
            <p className="text-xs text-foreground/40">Главный администратор</p>
          </div>
          <div className="h-12 w-12 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center">
            <ShieldCheck className="text-primary" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="space-y-2">
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => { playCroak(); setActiveTab('users'); }}
            icon={<Users size={20} />}
            label="Пользователи"
          />
          <TabButton 
            active={activeTab === 'games'} 
            onClick={() => { playCroak(); setActiveTab('games'); }}
            icon={<Database size={20} />}
            label="Игры и Квизы"
          />
          <TabButton 
            active={activeTab === 'prompts'} 
            onClick={() => { playCroak(); setActiveTab('prompts'); }}
            icon={<MessageSquare size={20} />}
            label="AI Промпты"
          />
          <TabButton 
            active={activeTab === 'settings'} 
            onClick={() => { playCroak(); setActiveTab('settings'); }}
            icon={<Settings size={20} />}
            label="Настройки"
          />
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 border-glow bg-background/40 p-8 backdrop-blur-sm min-h-[600px]">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold uppercase tracking-tight text-primary">Список пользователей</h2>
                <div className="flex gap-2">
                  <input type="text" placeholder="Поиск по email/ID..." className="rounded-full border border-primary/20 bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-primary/10 text-xs uppercase tracking-widest text-foreground/40">
                      <th className="pb-4 font-medium">Пользователь</th>
                      <th className="pb-4 font-medium">Роль</th>
                      <th className="pb-4 font-medium">Баланс</th>
                      <th className="pb-4 font-medium">Статус</th>
                      <th className="pb-4 font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    <UserRow name="shishkarnem@gmail.com" role="admin" balance="100,000" status="Active" />
                    <UserRow name="player1@test.ru" role="player" balance="500" status="Active" />
                    <UserRow name="author_test@mail.ru" role="author" balance="1,200" status="Active" />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold uppercase tracking-tight text-primary">Управление играми</h2>
                <button className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-background transition-transform hover:scale-105">
                  <Plus size={16} />
                  Создать игру
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GameItem title="Блиц-Квиз" type="blitz" questions={120} active={true} />
                <GameItem title="Миллионер" type="millionaire" questions={450} active={true} />
                <GameItem title="100 к 1" type="100to1" questions={85} active={false} />
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-primary">Настройка AI Промптов</h2>
              <div className="space-y-4">
                <PromptField label="Генерация вопросов (Блиц)" value="Ты - ведущий квиза. Создай 10 сложных вопросов на тему..." />
                <PromptField label="Проверка ответов (Light)" value="Сравни два ответа. Если они похожи по смыслу, верни true..." />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-xl px-6 py-4 font-bold transition-all ${
      active 
        ? 'bg-primary text-background shadow-[0_0_20px_rgba(131,196,46,0.3)]' 
        : 'bg-background/40 text-foreground/60 hover:bg-primary/10 hover:text-primary'
    }`}
  >
    {icon}
    {label}
  </button>
);

const UserRow = ({ name, role, balance, status }: { name: string, role: string, balance: string, status: string }) => (
  <tr className="group hover:bg-primary/5 transition-colors">
    <td className="py-4">
      <p className="font-bold">{name}</p>
      <p className="text-[10px] text-foreground/40 uppercase tracking-widest">ID: {Math.random().toString(36).substring(7)}</p>
    </td>
    <td className="py-4">
      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
        role === 'admin' ? 'bg-red-500/20 text-red-500' : role === 'author' ? 'bg-blue-500/20 text-blue-500' : 'bg-primary/20 text-primary'
      }`}>
        {role}
      </span>
    </td>
    <td className="py-4 font-mono text-primary">{balance} 🐸</td>
    <td className="py-4">
      <span className="flex items-center gap-1.5 text-xs text-green-500">
        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        {status}
      </span>
    </td>
    <td className="py-4">
      <button className="text-xs font-bold text-primary hover:underline">Изменить</button>
    </td>
  </tr>
);

const GameItem = ({ title, type, questions, active }: { title: string, type: string, questions: number, active: boolean }) => (
  <div className="border border-primary/10 bg-background/20 p-4 rounded-2xl flex items-center justify-between">
    <div>
      <p className="font-bold">{title}</p>
      <p className="text-xs text-foreground/40 uppercase tracking-widest">{type} • {questions} вопросов</p>
    </div>
    <div className={`h-3 w-3 rounded-full ${active ? 'bg-primary' : 'bg-foreground/20'}`} />
  </div>
);

const PromptField = ({ label, value }: { label: string, value: string }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">{label}</label>
    <textarea 
      defaultValue={value}
      className="w-full h-32 rounded-2xl border border-primary/20 bg-background/60 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />
  </div>
);
