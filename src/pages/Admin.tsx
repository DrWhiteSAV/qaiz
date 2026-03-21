import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFrogSound } from '../hooks/useSound';
import { Settings, Users, Database, MessageSquare, ShieldCheck, Plus, Loader2 } from 'lucide-react';
import { getSupabase } from '../supabase';

export const AdminPage: React.FC = () => {
  const { profile, user } = useAuth();
  const { playCroak } = useFrogSound();
  const [activeTab, setActiveTab] = useState<'users' | 'games' | 'prompts' | 'settings' | 'authors'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (activeTab === 'users' && (profile?.role === 'admin' || profile?.role === 'superadmin')) {
      fetchUsers();
    }
  }, [activeTab, profile]);

  const fetchUsers = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const seedDemoData = async () => {
    if (!confirm('Вы уверены, что хотите добавить демо-данные? Это добавит тестовые записи в таблицы.')) return;
    
    setSeeding(true);
    const supabase = getSupabase();
    if (!supabase || !user) {
      setSeeding(false);
      return;
    }

    try {
      // Seed Game Sessions
      await supabase.from('game_sessions').insert([
        {
          user_id: user.uid,
          game_id: 'blitz',
          topic: 'История мира',
          difficulty: 'people',
          mode: 'lite',
          score: 1500,
          total_questions: 20,
          correct_answers: 15,
          price_paid: 20,
          is_win: true,
          status: 'finished',
          completed_at: new Date().toISOString()
        },
        {
          user_id: user.uid,
          game_id: 'millionaire',
          topic: 'Кино',
          difficulty: 'genius',
          mode: 'true',
          score: 50000,
          total_questions: 15,
          correct_answers: 12,
          price_paid: 30,
          is_win: false,
          status: 'finished',
          completed_at: new Date().toISOString()
        }
      ]);

      // Seed Offline Registrations
      await supabase.from('offline_registrations').insert([
        {
          user_id: user.uid,
          city: 'Невинномысск',
          date: '25 Марта',
          team_name: 'Лягушки-интеллектуалы',
          participants_count: 5,
          comment: 'Нужен стол поближе к сцене',
          status: 'confirmed'
        }
      ]);

      // Seed Purchases
      await supabase.from('purchases').insert([
        {
          user_id: user.uid,
          item_id: 'pack1',
          price_paid: 15
        }
      ]);

      alert('Демо-данные успешно добавлены!');
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Ошибка при добавлении данных');
    } finally {
      setSeeding(false);
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
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
            active={activeTab === 'authors'} 
            onClick={() => { playCroak(); setActiveTab('authors'); }}
            icon={<ShieldCheck size={20} />}
            label="Заявки в авторы"
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
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin text-primary" size={48} />
                </div>
              ) : (
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
                      {users.map(u => (
                        <UserRow key={u.uid} name={u.display_name || u.email} role={u.role} balance={u.balance} status="Active" uid={u.uid} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'authors' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-primary">Заявки в авторы</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-primary/10 text-xs uppercase tracking-widest text-foreground/40">
                      <th className="pb-4 font-medium">Пользователь</th>
                      <th className="pb-4 font-medium">Дата</th>
                      <th className="pb-4 font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    <AuthorRequestRow name="test_author@mail.ru" date="20.03.2024" />
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

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-primary">Настройки системы</h2>
              
              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-primary">База данных и Тестирование</h3>
                  <p className="text-sm text-foreground/60 mt-1">Инструменты для отладки и наполнения контентом.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-primary/10 bg-background/40 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <Database size={24} />
                      <span className="font-bold">Демо-данные</span>
                    </div>
                    <p className="text-xs text-foreground/60">
                      Наполнить таблицы (сессии, покупки, регистрации) тестовыми записями для вашего аккаунта.
                    </p>
                    <button 
                      onClick={seedDemoData}
                      disabled={seeding}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-background transition-transform hover:scale-105 disabled:opacity-50"
                    >
                      {seeding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                      Заполнить таблицы
                    </button>
                  </div>

                  <div className="border border-primary/10 bg-background/40 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                      <ShieldCheck size={24} />
                      <span className="font-bold">Безопасность</span>
                    </div>
                    <p className="text-xs text-foreground/60">
                      Проверка RLS политик и прав доступа администраторов.
                    </p>
                    <button className="w-full rounded-xl border border-primary/20 py-3 text-sm font-bold text-primary hover:bg-primary/10">
                      Запустить аудит
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/20 bg-background/40 p-8">
                <h3 className="text-xl font-bold text-primary mb-6">Общие настройки</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div>
                      <p className="font-bold">Технические работы</p>
                      <p className="text-xs text-foreground/40">Отключить доступ к играм для всех пользователей</p>
                    </div>
                    <div className="h-6 w-12 rounded-full bg-foreground/10 relative cursor-pointer">
                      <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-background shadow-sm" />
                    </div>
                  </div>
                </div>
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

const AuthorRequestRow = ({ name, date }: { name: string, date: string }) => (
  <tr className="group hover:bg-primary/5 transition-colors">
    <td className="py-4">
      <p className="font-bold">{name}</p>
      <p className="text-[10px] text-foreground/40 uppercase tracking-widest">ID: {Math.random().toString(36).substring(7)}</p>
    </td>
    <td className="py-4 text-sm text-foreground/60">{date}</td>
    <td className="py-4">
      <div className="flex gap-2">
        <button className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase text-background">Одобрить</button>
        <button className="rounded-full bg-red-500/20 px-3 py-1 text-[10px] font-bold uppercase text-red-500">Отклонить</button>
      </div>
    </td>
  </tr>
);

const UserRow = ({ name, role, balance, status, uid }: { name: string, role: string, balance: number, status: string, uid: string }) => (
  <tr className="group hover:bg-primary/5 transition-colors">
    <td className="py-4">
      <p className="font-bold">{name}</p>
      <p className="text-[10px] text-foreground/40 uppercase tracking-widest">ID: {uid.slice(0, 8)}</p>
    </td>
    <td className="py-4">
      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
        role === 'admin' || role === 'superadmin' ? 'bg-red-500/20 text-red-500' : role === 'author' ? 'bg-blue-500/20 text-blue-500' : 'bg-primary/20 text-primary'
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
