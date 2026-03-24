import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFrogSound } from '../hooks/useSound';
import { Settings, Users, Database, MessageSquare, ShieldCheck, Plus, Loader2, Search, Trash2, Edit2, Globe, Image as ImageIcon, Type, FileText } from 'lucide-react';
import { getSupabase } from '../supabase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AdminSettings } from '../types';
import { TOPICS } from '../constants';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { playCroak } = useFrogSound();
  const [activeTab, setActiveTab] = useState<'users' | 'games' | 'prompts' | 'settings' | 'authors' | 'news'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showNewsConstructor, setShowNewsConstructor] = useState(false);
  const [editingNews, setEditingNews] = useState<any>(null);
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [newsFilterPlatform, setNewsFilterPlatform] = useState<'all' | 'app' | 'tg' | 'vk'>('all');
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    mediaUrls: [] as string[],
    mediaType: 'image' as 'image' | 'video' | 'album',
    platforms: [] as ('app' | 'tg' | 'vk')[],
    scheduledAt: ''
  });

  const [settings, setSettings] = useState<AdminSettings>({
    prompts: {
      jeopardy_categories: `Сгенерируй 5 уникальных и интересных названий категорий для игры "Своя Иква" на тему "{topic}". 
    Сложность: {diffDesc}. 
    Названия должны быть краткими (1-3 слова).
    Верни JSON массив строк.`,
      blitz_questions: `Сгенерируй ПАКЕТ из {count} вопросов для КвИИЗа на тему "{topic}". 
    Сложность: {diffDesc}.
    
    ТРЕБОВАНИЯ К ВОПРОСАМ:
    1. Каждый вопрос должен быть основан на интересном факте по теме "{topic}" с учетом уровня сложности.
    2. Вопрос должен представлять собой логическую цепочку или загадку, требующую эрудиции и смекалки, а не простого знания фактов.
    3. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
    4. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы, помогающие прийти к ответу.
    5. Ответ должен быть коротким (1-3 слова).
    6. Каждый вопрос должен сопровождаться подробным комментарием (explanation), который объясняет ответ и добавляет интересный факт.
    
    Верни массив объектов в формате JSON с полями: text, correctAnswer, hint, explanation.`,
      millionaire_questions: `Сгенерируй ПОЛНЫЙ ПАКЕТ из 15 вопросов для игры "Квиллионер" на тему "{topic}".
    Базовая сложность: {diffDesc}.
    
    ТРЕБОВАНИЯ:
    1. Сложность должна прогрессировать от 1 (очень легко) до 15 (невероятно сложно).
    2. Каждый вопрос должен быть основан на интересном факте по теме "{topic}".
    3. Вопрос должен представлять собой логическую цепочку или загадку, требующую эрудиции и смекалки.
    4. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
    5. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы.
    6. Для каждого вопроса предложи 4 варианта ответа (А, Б, В, Г).
    7. Для каждого вопроса напиши подробный комментарий (explanation), который будет показан после ответа.
    
    Верни массив из 15 объектов в формате JSON с полями: text, options (массив из 4 строк с префиксами А. Б. В. Г.), correctAnswer (строка, в точности совпадающая с одним из options), hint, explanation.`,
      whatwherewhen_questions: `Сгенерируй ПАКЕТ из 11 вопросов для игры "Что? Где? Квада?" на тему "{topic}".
    Сложность: {diffDesc}.
    
    ТРЕБОВАНИЯ:
    1. Вопросы должны быть в стиле элитарного клуба: на логику, догадку, "красивое" решение, а не на сухие факты. Основывайся на интересных фактах по теме "{topic}".
    2. Каждый вопрос должен начинаться с представления телезрителя в формате: "Вопрос от телезрителя [Имя Фамилия Отчество] из [Населенный пункт, Область] интересуется у знатоков:".
    3. Имена должны быть русскими, забавными, редкими и колоритными (например: Акакий Пантелеймонович Свинорылов).
    4. Населенные пункты должны иметь необычные названия и реально существующие области России (например: деревня Выдропужск, Тверская область).
    5. Сам вопрос должен строиться так: берется энциклопедичный факт и из него логичным намеком строится вопрос, чтобы даже не зная факта можно было прийти к нему смекалкой и небольшой эрудицией.
    6. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
    7. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы.
    8. Каждый вопрос должен иметь подробное объяснение (explanation) логики ответа.
    
    Верни массив из 11 объектов в формате JSON с полями: text, correctAnswer, hint, explanation.`,
      '100to1_questions': `Сгенерируй ОДИН уникальный и малопопулярный вопрос для игры "Сто Квадному" на тему "{topic}".
    Сложность: {diffDesc}.
    
    ТРЕБОВАНИЯ:
    1. Вопрос должен быть необычным, основанным на интересном факте или социальном явлении по теме "{topic}".
    2. Вопрос должен быть сформулирован как загадка или логическая задача.
    3. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к самым популярным ответам.
    4. Нужно 6 вариантов ответов с баллами (от самого популярного к самому редкому).
    5. Добавь подробный комментарий (explanation) о том, почему такие ответы могли быть даны.
    
    Верни объект JSON с полями: question, answers (массив из 6 объектов {text, points}), hint, explanation.`,
      jeopardy_questions: `Сгенерируй ОДИН уникальный и малопопулярный вопрос для "Своей Игры" на тему "{topic}".
    Сложность: {diffDesc}.
    
    ТРЕБОВАНИЯ:
    1. Вопрос должен быть развернутым, интересным и основанным на глубоком факте по теме "{topic}".
    2. Вопрос должен представлять собой логическую цепочку или загадку.
    3. В тексте вопроса КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать однокоренные слова к правильному ответу.
    4. Обязательно добавляй в текст вопроса косвенные намеки и ключевые фразы.
    5. Добавь подробный комментарий (explanation) к ответу.
    
    Верни объект JSON с полями: text, answer, hint, explanation.`,
      normal_questions: `Сгенерируй {count} вопросов на тему "{topic}". Сложность: {diffDesc}.
    ТРЕБОВАНИЯ:
    1. Основывайся на интересных фактах.
    2. Используй логические цепочки и загадки.
    3. ЗАПРЕЩЕНО использовать однокоренные слова к ответу.
    4. Добавляй намеки и ключевые фразы.
    Верни массив объектов JSON: text, options (4 шт), correctAnswer, hint, explanation.`,
      single_question: `Сгенерируй 1 вопрос для игры "{type}" на тему "{topic}". 
    Уровень сложности: {level} из 15 (где 1 - самый простой, 15 - самый сложный).
    Сложность по классификации: "{difficulty}".
    
    Верни объект JSON со следующей структурой:
    {
      "text": "Текст вопроса",
      "options": ["А. Вариант", "Б. Вариант", "В. Вариант", "Г. Вариант"],
      "correctAnswer": "Точный текст правильного варианта из массива options (вместе с буквой)",
      "hint": "Небольшая подсказка"
    }
    
    ВАЖНО: 
    1. Ответ должен быть СТРОГО в формате JSON.
    2. Поле correctAnswer должно в точности совпадать с одним из элементов массива options.
    3. Вопрос должен соответствовать уровню сложности {level}.
    4. Обязательно используй буквы А. Б. В. Г. для вариантов ответов.`,
      check_answer: `Вопрос: "{question}". Правильный ответ: "{correctAnswer}". Ответ пользователя: "{userAnswer}". 
    Проверь, является ли ответ пользователя правильным по смыслу. 
    Верни JSON: { "isCorrect": boolean, "explanation": string }
    В поле explanation напиши краткий и емкий ответ (максимум 500 символов): почему ответ пользователя правильный или почему он неправильный, 
    раскрой логику вопроса и правильного ответа.`,
      ai_comment: `Ты - ИИ-персонаж в игре-викторине. Твой характер: {personality}.
    Произошло событие: {event}. 
    Вопрос был: "{question}". 
    Правильный ответ: "{answer}".
    Был ли ответ правильным: {isCorrect}.
    Напиши короткий (1-2 предложения) комментарий в игровой чат от своего лица. 
    Комментарий должен соответствовать твоему характеру.
    Верни просто текст комментария.`
    }
  });

  const handleApproveAuthor = async (uid: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    try {
      // Update in Supabase
      await supabase.from('profiles').update({ role: 'author', author_status: 'active' }).eq('uid', uid);
      // Update in Firestore
      await setDoc(doc(db, 'users', uid), { role: 'author', authorStatus: 'active' }, { merge: true });
      alert('Автор одобрен!');
      fetchUsers();
    } catch (err) {
      console.error('Error approving author:', err);
    }
  };

  const handleRejectAuthor = async (uid: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    try {
      await supabase.from('profiles').update({ author_status: 'none' }).eq('uid', uid);
      await setDoc(doc(db, 'users', uid), { authorStatus: 'none' }, { merge: true });
      alert('Заявка отклонена');
      fetchUsers();
    } catch (err) {
      console.error('Error rejecting author:', err);
    }
  };

  const handlePublishNews = async () => {
    if (newsForm.content.length > 1000) {
      alert('Текст новости не должен превышать 1000 символов');
      return;
    }
    
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      if (editingNews) {
        // Update existing news
        const { error } = await supabase
          .from('news')
          .update({
            title: newsForm.title,
            content: newsForm.content,
            media_urls: newsForm.mediaUrls,
            media_type: newsForm.mediaType,
            platforms: newsForm.platforms,
            scheduled_at: newsForm.scheduledAt || new Date().toISOString(),
          })
          .eq('id', editingNews.id);

        if (error) throw error;
        alert('Новость обновлена!');
      } else {
        // Create new news
        const { error } = await supabase.from('news').insert({
          title: newsForm.title,
          content: newsForm.content,
          media_urls: newsForm.mediaUrls,
          media_type: newsForm.mediaType,
          platforms: newsForm.platforms,
          scheduled_at: newsForm.scheduledAt || new Date().toISOString(),
          author_id: user?.uid
        });

        if (error) throw error;
        alert('Новость опубликована!');
      }

      // Placeholder for external platforms
      if (newsForm.platforms.includes('tg')) {
        console.log('Publishing to Telegram...');
      }
      if (newsForm.platforms.includes('vk')) {
        console.log('Publishing to VK...');
      }

      setShowNewsConstructor(false);
      setEditingNews(null);
      setNewsForm({
        title: '',
        content: '',
        mediaUrls: [],
        mediaType: 'image',
        platforms: [],
        scheduledAt: ''
      });
      fetchNews();
    } catch (err) {
      console.error('Error publishing news:', err);
      alert('Ошибка при публикации новости');
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту новость?')) return;
    
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
      
      alert('Новость удалена');
      fetchNews();
    } catch (err) {
      console.error('Error deleting news:', err);
      alert('Ошибка при удалении новости');
    }
  };

  const handleEditNews = (item: any) => {
    setEditingNews(item);
    setNewsForm({
      title: item.title,
      content: item.content,
      mediaUrls: item.media_urls || [],
      mediaType: item.media_type || 'image',
      platforms: item.platforms || [],
      scheduledAt: item.scheduled_at ? new Date(item.scheduled_at).toISOString().slice(0, 16) : ''
    });
    setShowNewsConstructor(true);
  };

  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(newsSearchQuery.toLowerCase()) || 
                         item.content.toLowerCase().includes(newsSearchQuery.toLowerCase());
    const matchesPlatform = newsFilterPlatform === 'all' || item.platforms?.includes(newsFilterPlatform);
    return matchesSearch && matchesPlatform;
  });

  const handleSavePrompts = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await supabase
        .from('prompts')
        .upsert(
          Object.entries(settings.prompts).map(([game_id, content]) => ({
            game_id,
            content,
            updated_at: new Date().toISOString()
          }))
        );

      if (error) throw error;
      alert('Промпты успешно сохранены в базу данных!');
    } catch (err) {
      console.error('Error saving prompts:', err);
      alert('Ошибка при сохранении промптов');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrompts = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase.from('prompts').select('*');
    if (error) {
      console.error('Error fetching prompts:', error);
    } else if (data) {
      const newPrompts = { ...settings.prompts };
      data.forEach((p: any) => {
        (newPrompts as any)[p.game_id] = p.content;
      });
      setSettings(prev => ({ ...prev, prompts: newPrompts }));
    }
  };

  const fetchNews = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
    setNews(data || []);
  };

  useEffect(() => {
    const fetchGames = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase.from('shop_items').select('*');
      setGames(data || []);
    };

    fetchPrompts();
    fetchGames();
    fetchNews();
  }, []);

  const fetchGames = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.from('shop_items').select('*');
    setGames(data || []);
  };

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
          mode: 'lite',
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
            active={activeTab === 'news'} 
            onClick={() => { playCroak(); setActiveTab('news'); }}
            icon={<Plus size={20} />}
            label="Конструктор новостей"
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
          {activeTab === 'news' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold uppercase tracking-tight text-primary">Конструктор новостей</h2>
                <button 
                  onClick={() => {
                    setEditingNews(null);
                    setNewsForm({
                      title: '',
                      content: '',
                      mediaUrls: [],
                      mediaType: 'image',
                      platforms: [],
                      scheduledAt: ''
                    });
                    setShowNewsConstructor(true);
                  }}
                  className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-background transition-transform hover:scale-105"
                >
                  <Plus size={16} />
                  Добавить новость
                </button>
              </div>

              <div className="flex flex-wrap gap-4 items-center bg-background/20 p-4 rounded-2xl">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
                  <input 
                    type="text" 
                    placeholder="Поиск по новостям..." 
                    value={newsSearchQuery}
                    onChange={(e) => setNewsSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-primary/20 bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2">
                  {(['all', 'app', 'tg', 'vk'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setNewsFilterPlatform(p)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-all ${
                        newsFilterPlatform === p 
                          ? 'bg-primary text-background' 
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {p === 'all' ? 'Все' : p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid gap-4">
                {filteredNews.map(item => (
                  <div key={item.id} className="rounded-2xl border border-primary/10 bg-background/40 p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      {item.media_urls?.[0] && (
                        <img src={item.media_urls[0]} alt="" className="w-12 h-12 rounded-lg object-cover border border-primary/10" />
                      )}
                      <div>
                        <p className="font-bold">{item.title}</p>
                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest">
                          {new Date(item.created_at).toLocaleDateString()} • {item.platforms?.join(', ') || 'Web'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEditNews(item)}
                        className="p-2 rounded-full hover:bg-primary/10 text-primary transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteNews(item.id)}
                        className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredNews.length === 0 && (
                  <p className="text-center py-10 text-foreground/40 italic">Новостей не найдено</p>
                )}
              </div>
            </div>
          )}
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
                    {users.filter(u => u.author_status === 'pending').map(u => (
                      <AuthorRequestRow 
                        key={u.uid} 
                        name={u.display_name || u.email} 
                        date={new Date(u.created_at).toLocaleDateString()} 
                        uid={u.uid}
                        onApprove={handleApproveAuthor}
                        onReject={handleRejectAuthor}
                      />
                    ))}
                    {users.filter(u => u.author_status === 'pending').length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-foreground/40">Нет активных заявок</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold uppercase tracking-tight text-primary">Управление играми</h2>
                <button 
                  onClick={() => navigate('/game/create')}
                  className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-background transition-transform hover:scale-105"
                >
                  <Plus size={16} />
                  Создать игру
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {games.map(game => (
                  <GameItem 
                    key={game.id}
                    title={game.title} 
                    type={game.type} 
                    questions={game.questions_count || 0} 
                    active={game.is_active} 
                  />
                ))}
                {games.length === 0 && (
                  <p className="col-span-2 text-center py-10 text-foreground/40">Игры не найдены</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-primary">Настройка AI Промптов</h2>
              <div className="space-y-6">
                <PromptField 
                  label="Категории Своей Игры (jeopardy_categories)" 
                  value={settings.prompts.jeopardy_categories} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, jeopardy_categories: v } }))}
                />
                <PromptField 
                  label="Вопросы Блиц (blitz_questions)" 
                  value={settings.prompts.blitz_questions} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, blitz_questions: v } }))}
                />
                <PromptField 
                  label="Вопросы Квиллионера (millionaire_questions)" 
                  value={settings.prompts.millionaire_questions} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, millionaire_questions: v } }))}
                />
                <PromptField 
                  label="Вопросы Что? Где? Квада? (whatwherewhen_questions)" 
                  value={settings.prompts.whatwherewhen_questions} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, whatwherewhen_questions: v } }))}
                />
                <PromptField 
                  label="Вопросы Сто Квадному (100to1_questions)" 
                  value={settings.prompts['100to1_questions']} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, '100to1_questions': v } }))}
                />
                <PromptField 
                  label="Вопросы Своей Игры (jeopardy_questions)" 
                  value={settings.prompts.jeopardy_questions} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, jeopardy_questions: v } }))}
                />
                <PromptField 
                  label="Обычные вопросы (normal_questions)" 
                  value={settings.prompts.normal_questions} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, normal_questions: v } }))}
                />
                <PromptField 
                  label="Одиночный вопрос (single_question)" 
                  value={settings.prompts.single_question} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, single_question: v } }))}
                />
                <PromptField 
                  label="Проверка ответа (check_answer)" 
                  value={settings.prompts.check_answer} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, check_answer: v } }))}
                />
                <PromptField 
                  label="Комментарий ИИ (ai_comment)" 
                  value={settings.prompts.ai_comment} 
                  onChange={(v) => setSettings(prev => ({ ...prev, prompts: { ...prev.prompts, ai_comment: v } }))}
                />
                <button 
                  onClick={handleSavePrompts}
                  disabled={loading}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="animate-spin" size={20} />}
                  Сохранить все промпты
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-primary">Настройки системы</h2>
              
              {profile?.role === 'superadmin' && (
                <div className="rounded-3xl border-2 border-primary bg-primary/5 p-8 space-y-8">
                  <div className="flex items-center gap-4">
                    <ShieldCheck className="text-primary" size={32} />
                    <div>
                      <h3 className="text-2xl font-black uppercase text-primary">Панель Супер-Админа</h3>
                      <p className="text-sm text-foreground/60 uppercase tracking-widest">Прямое редактирование контента и цен</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Game Pricing Control */}
                      <div className="border border-primary/20 bg-background/40 p-6 rounded-2xl space-y-4">
                        <h4 className="font-bold flex items-center gap-2 text-primary">
                          <Database size={18} /> Управление ценами
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span>Что? Где? Квада?</span>
                            <div className="flex items-center gap-2">
                              <input type="number" defaultValue={2} className="w-16 rounded-lg border border-primary/20 bg-background px-2 py-1 text-center" />
                              <span className="text-xs text-foreground/40">₽/вопр</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Уквакай Мелодию</span>
                            <div className="flex items-center gap-2">
                              <input type="number" defaultValue={10} className="w-16 rounded-lg border border-primary/20 bg-background px-2 py-1 text-center" />
                              <span className="text-xs text-foreground/40">₽/вопр</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Остальные игры</span>
                            <div className="flex items-center gap-2">
                              <input type="number" defaultValue={1} className="w-16 rounded-lg border border-primary/20 bg-background px-2 py-1 text-center" />
                              <span className="text-xs text-foreground/40">₽/вопр</span>
                            </div>
                          </div>
                        </div>
                        <button className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-background">Применить цены</button>
                      </div>

                      {/* Content Editor */}
                      <div className="border border-primary/20 bg-background/40 p-6 rounded-2xl space-y-4">
                        <h4 className="font-bold flex items-center gap-2 text-primary">
                          <Edit2 size={18} /> Редактор контента
                        </h4>
                        <div className="space-y-4">
                          <select className="w-full rounded-xl border border-primary/20 bg-background px-4 py-2 text-sm">
                            <option>Выберите игру для редактирования...</option>
                            {games.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <button className="flex items-center justify-center gap-2 rounded-lg border border-primary/10 bg-primary/5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10">
                              <Type size={14} /> Тексты
                            </button>
                            <button className="flex items-center justify-center gap-2 rounded-lg border border-primary/10 bg-primary/5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10">
                              <Globe size={14} /> Темы
                            </button>
                            <button className="flex items-center justify-center gap-2 rounded-lg border border-primary/10 bg-primary/5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10">
                              <FileText size={14} /> Описания
                            </button>
                            <button className="flex items-center justify-center gap-2 rounded-lg border border-primary/10 bg-primary/5 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10">
                              <ImageIcon size={14} /> Картинки
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">Внимание: Режим супер-админа</p>
                      <p className="text-xs text-foreground/60">Изменения в этой панели напрямую влияют на экономику игры и отображение контента для всех пользователей. Будьте осторожны при ручном редактировании.</p>
                    </div>
                  </div>
                </div>
              )}

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
      {showNewsConstructor && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
          <div className="w-full max-w-2xl space-y-6 rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black uppercase text-primary">Конструктор новости</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Заголовок новости" 
                value={newsForm.title}
                onChange={(e) => setNewsForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3" 
              />
              <div className="space-y-1">
                <textarea 
                  placeholder="Текст новости (макс. 1000 символов)" 
                  value={newsForm.content}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, content: e.target.value.slice(0, 1000) }))}
                  className="w-full h-40 rounded-xl border border-primary/20 bg-background px-4 py-3" 
                />
                <p className="text-right text-[10px] text-foreground/40 uppercase tracking-widest">
                  {newsForm.content.length} / 1000
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-foreground/40">Медиафайлы (URLs через запятую)</p>
                <input 
                  type="text" 
                  placeholder="https://example.com/image.jpg, ..." 
                  value={newsForm.mediaUrls.join(', ')}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, mediaUrls: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3" 
                />
                <select 
                  value={newsForm.mediaType}
                  onChange={(e) => setNewsForm(prev => ({ ...prev, mediaType: e.target.value as any }))}
                  className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm"
                >
                  <option value="image">Изображение</option>
                  <option value="video">Видео</option>
                  <option value="album">Альбом</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground/40">Платформы</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newsForm.platforms.includes('tg')}
                        onChange={(e) => {
                          const platforms = (e.target.checked 
                            ? [...newsForm.platforms, 'tg'] 
                            : newsForm.platforms.filter(p => p !== 'tg')) as ('app' | 'tg' | 'vk')[];
                          setNewsForm(prev => ({ ...prev, platforms }));
                        }}
                      /> TG
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newsForm.platforms.includes('vk')}
                        onChange={(e) => {
                          const platforms = (e.target.checked 
                            ? [...newsForm.platforms, 'vk'] 
                            : newsForm.platforms.filter(p => p !== 'vk')) as ('app' | 'tg' | 'vk')[];
                          setNewsForm(prev => ({ ...prev, platforms }));
                        }}
                      /> VK
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newsForm.platforms.includes('app')}
                        onChange={(e) => {
                          const platforms = (e.target.checked 
                            ? [...newsForm.platforms, 'app'] 
                            : newsForm.platforms.filter(p => p !== 'app')) as ('app' | 'tg' | 'vk')[];
                          setNewsForm(prev => ({ ...prev, platforms }));
                        }}
                      /> App
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground/40">Дата публикации</p>
                  <input 
                    type="datetime-local" 
                    value={newsForm.scheduledAt}
                    onChange={(e) => setNewsForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                    className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3" 
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowNewsConstructor(false)} className="flex-1 rounded-xl border border-primary/20 py-3 font-bold">Отмена</button>
              <button onClick={handlePublishNews} className="flex-1 btn-primary py-3">Опубликовать</button>
            </div>
          </div>
        </div>
      )}

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

const AuthorRequestRow = ({ name, date, uid, onApprove, onReject }: { name: string, date: string, uid: string, onApprove: (uid: string) => void, onReject: (uid: string) => void }) => (
  <tr className="group hover:bg-primary/5 transition-colors">
    <td className="py-4">
      <p className="font-bold">{name}</p>
      <p className="text-[10px] text-foreground/40 uppercase tracking-widest">ID: {uid.slice(0, 8)}</p>
    </td>
    <td className="py-4 text-sm text-foreground/60">{date}</td>
    <td className="py-4">
      <div className="flex gap-2">
        <button 
          onClick={() => onApprove(uid)}
          className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase text-background"
        >
          Одобрить
        </button>
        <button 
          onClick={() => onReject(uid)}
          className="rounded-full bg-red-500/20 px-3 py-1 text-[10px] font-bold uppercase text-red-500"
        >
          Отклонить
        </button>
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

const PromptField = ({ label, value, onChange }: { label: string, value: string, onChange?: (v: string) => void }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">{label}</label>
    <textarea 
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full h-32 rounded-2xl border border-primary/20 bg-background/60 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />
  </div>
);
