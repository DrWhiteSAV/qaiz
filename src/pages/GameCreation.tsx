import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Save, 
  Type, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  Layout,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Scissors,
  MicOff,
  Wand2,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Game, Question, GameMode, Difficulty } from '../types';
import { TopicCloud } from '../components/TopicCloud';
import { TOPICS } from '../constants';
import { generateContent } from '../services/gemini';

type GameType = 'blitz' | 'millionaire' | '100to1' | 'whatwherewhen' | 'melody' | 'jeopardy' | 'iqbox';

export const GameCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Game Basic Info
  const [gameInfo, setGameInfo] = useState({
    type: 'blitz' as GameType,
    title: '',
    description: '',
    difficulty: 'people' as Difficulty,
    topic: '',
    costPerQuestion: 1
  });

  // Questions
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiTimer, setAiTimer] = useState(0);
  const [aiTimerInterval, setAiTimerInterval] = useState<any>(null);

  const startAiTimer = (seconds: number) => {
    setAiTimer(seconds);
    if (aiTimerInterval) clearInterval(aiTimerInterval);
    const interval = setInterval(() => {
      setAiTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setAiTimerInterval(interval);
  };

  const stopAiTimer = () => {
    if (aiTimerInterval) clearInterval(aiTimerInterval);
    setAiTimer(0);
  };

  // Initialize questions based on game type
  React.useEffect(() => {
    if (step === 2 && questions.length === 0) {
      let initialQuestions: any[] = [];
      
      if (gameInfo.type === 'blitz') {
        initialQuestions = Array.from({ length: 10 }, (_, i) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: '',
          correctAnswer: '',
          points: 0,
          mediaUrl: '',
          mediaType: 'image'
        }));
      } else if (gameInfo.type === 'millionaire') {
        const millionairePoints = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
        initialQuestions = Array.from({ length: 15 }, (_, i) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: '',
          correctAnswer: '',
          options: ['', '', '', ''],
          points: millionairePoints[i],
          level: i + 1,
          mediaUrl: '',
          mediaType: 'image'
        }));
      } else if (gameInfo.type === '100to1') {
        initialQuestions = Array.from({ length: 4 }, (_, i) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: '',
          round: i + 1,
          answers: i < 3 
            ? [35, 25, 15, 10, 7, 3].map(p => ({ text: '', points: p, hint: '', mediaUrl: '', mediaType: 'image' }))
            : [15, 30, 60, 90, 120, 150].map(p => ({ text: '', points: p, hint: '', mediaUrl: '', mediaType: 'image' })),
        }));
      } else if (gameInfo.type === 'whatwherewhen') {
        initialQuestions = Array.from({ length: 11 }, (_, i) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: '',
          correctAnswer: '',
          viewerName: '',
          viewerAddress: '',
          mediaUrl: '',
          mediaType: 'image'
        }));
      } else if (gameInfo.type === 'jeopardy') {
        // 3 rounds * 25 questions + 1 final
        for (let r = 1; r <= 3; r++) {
          for (let c = 1; c <= 5; c++) {
            for (let v = 1; v <= 5; v++) {
              initialQuestions.push({
                id: Math.random().toString(36).substr(2, 9),
                text: '',
                correctAnswer: '',
                category: `Категория ${c}`,
                points: v * 100 * r,
                round: r,
                questionType: 'normal',
                mediaUrl: '',
                mediaType: 'image'
              });
            }
          }
        }
        // Final
        initialQuestions.push({
          id: Math.random().toString(36).substr(2, 9),
          text: '',
          correctAnswer: '',
          category: 'ФИНАЛ',
          points: 0,
          round: 4,
          questionType: 'auction',
          mediaUrl: '',
          mediaType: 'image'
        });
      } else if (gameInfo.type === 'melody') {
        for (let c = 1; c <= 5; c++) {
          for (let q = 1; q <= 5; q++) {
            initialQuestions.push({
              id: Math.random().toString(36).substr(2, 9),
              text: 'Вопрос',
              correctAnswer: '',
              category: `Категория ${c}`,
              mediaUrl: '',
              mediaType: 'audio',
              audioStart: 0,
              audioEnd: 30
            });
          }
        }
      } else {
        initialQuestions = Array.from({ length: 10 }, (_, i) => ({
          id: Math.random().toString(36).substr(2, 9),
          text: '',
          correctAnswer: '',
          options: ['', '', '', ''],
          points: 100,
          mediaUrl: '',
          mediaType: 'image'
        }));
      }
      setQuestions(initialQuestions);
    }
  }, [step, gameInfo.type]);

  const handleAiImprove = async (index: number) => {
    const q = questions[index];
    setIsGenerating(true);
    try {
      let gameSpecificPrompt = '';
      switch (gameInfo.type) {
        case 'millionaire':
          gameSpecificPrompt = 'Это игра "Квиллионер" (аналог "Кто хочет стать миллионером"). Вопрос должен иметь 4 варианта ответа, один из которых правильный. Сложность должна расти.';
          break;
        case '100to1':
          gameSpecificPrompt = 'Это игра "Сто Квадному" (аналог "100 к 1"). Нужно 6 самых популярных ответов с баллами (100, 80, 60, 40, 20, 10).';
          break;
        case 'melody':
          gameSpecificPrompt = 'Это игра "Уквадай Мелодию". Вопрос - это название песни или исполнитель. Если есть варианты, предложи 4 похожих исполнителя/песни.';
          break;
        case 'jeopardy':
          gameSpecificPrompt = 'Это игра "Своя Иква" (аналог "Своя Игра"). Вопрос должен соответствовать категории и стоимости.';
          break;
        case 'whatwherewhen':
          gameSpecificPrompt = 'Это игра "Что? Где? Квада?" (аналог "Что? Где? Когда?"). Вопрос должен быть на логику, с интересным фактом и пояснением.';
          break;
        default:
          gameSpecificPrompt = 'Это блиц-вопрос с коротким ответом.';
      }

      const prompt = `Улучши вопрос для игры "${gameInfo.type}" на тему "${gameInfo.topic}".
      ${gameSpecificPrompt}
      Текущий вопрос: "${q.text}"
      Текущий ответ: "${q.correctAnswer}"
      Сделай его более интересным, добавь юмора в стиле "Квада" (лягушки, болото, ирония, кваканье).
      Верни JSON с полями: text, correctAnswer, options (массив строк, если нужно), explanation, hint.`;
      
      const response = await generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      const improved = JSON.parse(response.text || '{}');
      
      const newQuestions = [...questions];
      newQuestions[index] = { ...newQuestions[index], ...improved };
      setQuestions(newQuestions);
    } catch (err) {
      console.error('AI Improvement error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const [pendingAiQuestions, setPendingAiQuestions] = useState<any[] | null>(null);

  const handleAiAssistant = async () => {
    if (!aiInput.trim()) return;
    const message = aiInput;
    setAiInput('');
    setIsGenerating(true);
    setPendingAiQuestions(null);
    setAiMessage('');
    startAiTimer(100);
    try {
      const currentQuestionsContext = questions
        .filter(q => q.text !== '')
        .map((q, i) => `${i+1}. ${q.text} (Ответ: ${q.correctAnswer})`)
        .join('\n');

      const prompt = `Ты - помощник конструктора игр "Квада". 
      Пользователь создает игру типа "${gameInfo.type}" на тему "${gameInfo.topic}" со сложностью "${gameInfo.difficulty}".
      Уже заполнено вопросов: ${questions.filter(q => q.text !== '').length} из ${questions.length}.
      Текущие вопросы:\n${currentQuestionsContext}
      
      Запрос пользователя: "${message}"
      
      Помоги ему составить вопросы. Предложи варианты или заполни пустые поля.
      Учитывай стиль "Квада" (лягушачья тематика, болото, ирония).
      Верни ответ в свободном стиле, но если предлагаешь вопросы, ОБЯЗАТЕЛЬНО используй формат JSON в конце.
      JSON формат: { "suggestedQuestions": [{ "text": "...", "correctAnswer": "...", "options": [...], "explanation": "...", "points": 100 }] }
      Для "100to1" добавь поле "answers": [{"text": "...", "points": 100, "mediaUrl": "...", "mediaType": "image|video"}, ...] (6 штук).`;
      
      const response = await generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      const text = response.text || '';
      
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[0]);
          if (data.suggestedQuestions) {
            setPendingAiQuestions(data.suggestedQuestions);
          }
        } catch (e) {
          console.error('JSON parse error', e);
        }
      }
      setAiMessage(text.replace(/\{.*\}/s, '').trim());
      stopAiTimer();
    } catch (err) {
      console.error('AI Assistant error:', err);
      setAiMessage('Произошла ошибка при обращении к ИИ.');
      stopAiTimer();
    } finally {
      setIsGenerating(false);
    }
  };

  const applyAiSuggestions = () => {
    if (!pendingAiQuestions) return;
    
    const newQuestions = [...questions];
    let qIdx = 0;
    pendingAiQuestions.forEach((sq: any) => {
      // Find first empty or mostly empty question
      while (qIdx < newQuestions.length && newQuestions[qIdx].text !== '') {
        qIdx++;
      }
      if (qIdx < newQuestions.length) {
        newQuestions[qIdx] = { ...newQuestions[qIdx], ...sq };
      }
    });
    setQuestions(newQuestions);
    setPendingAiQuestions(null);
    setAiMessage(prev => prev + '\n\n✅ Вопросы добавлены в конструктор!');
  };

  const handleAudioUpload = async (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    updateQuestion(index, { mediaUrl: url, mediaType: 'audio' });
  };

  const handleRemoveVocal = async (index: number) => {
    const q = questions[index];
    if (!q.mediaUrl) return alert('Сначала загрузите аудио-файл');
    
    setIsGenerating(true);
    try {
      // In a real app, we would call an API like LALAL.AI or a RapidAPI service
      // For now, we simulate the process and explain the best free options
      const prompt = `Пользователь хочет удалить вокал из песни для игры "Уквадай Мелодию".
      Песня: "${q.text || 'Неизвестно'}".
      Посоветуй лучший бесплатный способ или API для этого (например, Spleeter, VocalRemover.org, или RapidAPI Vocal Remover).
      Ответь кратко и вежливо в стиле лягушки-помощника.`;
      
      const response = await generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      alert(response.text || 'Используйте инструментальные версии треков или сервис VocalRemover.org для подготовки файлов.');
    } catch (err) {
      console.error('Vocal removal error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { 
      id: Math.random().toString(36).substr(2, 9), 
      text: '', 
      options: ['', '', '', ''], 
      correctAnswer: '', 
      points: 100 
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };

  const handleSaveGame = async () => {
    if (!user || !profile) return;
    if (!gameInfo.topic) return alert('Заполните основные поля игры');
    
    setLoading(true);
    try {
      const gameRef = doc(collection(db, 'games'));
      const gameData: Game = {
        id: gameRef.id,
        title: gameInfo.title || gameInfo.topic,
        description: gameInfo.description || `Игра на тему ${gameInfo.topic}`,
        authorId: user.uid,
        mode: 'human',
        difficulty: gameInfo.difficulty,
        type: gameInfo.type,
        topic: gameInfo.topic,
        questions: questions as Question[],
        isMultiplayer: false,
        costPerQuestion: gameInfo.costPerQuestion,
        isAI: false,
        createdAt: Date.now()
      };

      await setDoc(gameRef, gameData);
      alert('Игра успешно создана!');
      navigate('/admin');
    } catch (error) {
      console.error('Error saving game:', error);
      alert('Ошибка при сохранении игры');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin' && profile?.role !== 'author') {
    return <div className="p-20 text-center">Доступ запрещен</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-glow bg-background/60 p-6 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 hover:bg-primary/10 text-primary">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-primary">Конструктор Игры</h1>
            <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Шаг {step} из 2: {step === 1 ? 'Основные настройки' : 'Вопросы и контент'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAiAssistant(true)}
            className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/20 transition-all"
          >
            <Sparkles size={20} />
            ИИ-Помощник
          </button>
          {step === 2 && (
            <button 
              onClick={handleSaveGame}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-background shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Plus className="animate-spin" size={20} /> : <Save size={20} />}
              Сохранить игру
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            <div className="space-y-8 rounded-3xl border border-primary/20 bg-background/40 p-8">
              {/* Game Type */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">1. Тип Игры</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'blitz', label: 'Блиц' },
                    { id: 'millionaire', label: 'Квиллионер' },
                    { id: '100to1', label: 'Сто Квадному' },
                    { id: 'whatwherewhen', label: 'Что? Где? Квада?' },
                    { id: 'melody', label: 'Уквадай Мелодию' },
                    { id: 'jeopardy', label: 'Своя Иква' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setGameInfo(prev => ({ ...prev, type: type.id as GameType }))}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${
                        gameInfo.type === type.id 
                          ? 'bg-primary text-background border-primary shadow-lg scale-105' 
                          : 'bg-primary/5 text-primary/60 border-primary/10 hover:bg-primary/10'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">2. Название Игры</label>
                  <input 
                    type="text" 
                    value={gameInfo.title}
                    onChange={(e) => setGameInfo(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Например: Ква-Квиз про лягушек"
                    className="w-full rounded-xl border border-primary/20 bg-background/60 px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all" 
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">3. Описание</label>
                  <input 
                    type="text" 
                    value={gameInfo.description}
                    onChange={(e) => setGameInfo(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Краткое описание игры..."
                    className="w-full rounded-xl border border-primary/20 bg-background/60 px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all" 
                  />
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">4. Тема</label>
                <div className="max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  <TopicCloud 
                    topics={TOPICS}
                    selectedTopic={gameInfo.topic}
                    onSelect={(topic) => setGameInfo(prev => ({ ...prev, topic }))}
                  />
                </div>
                <input 
                  type="text" 
                  value={gameInfo.topic}
                  onChange={(e) => setGameInfo(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="Или введите свою тему..."
                  className="w-full rounded-xl border border-primary/20 bg-background/60 px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all" 
                />
              </div>

              {/* Difficulty */}
              {gameInfo.type !== 'millionaire' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">5. Сложность</label>
                    <button 
                      onClick={() => alert('Уровни сложности:\n\n1. ИИкра (1/4) - Самый простой уровень.\n2. Головастик (2/4) - Средний уровень.\n3. Квант (3/4) - Высокий уровень.\n4. Ляга-омега (4/4) - Экспертный уровень.')}
                      className="text-[10px] font-bold uppercase tracking-widest text-primary/40 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <HelpCircle size={12} />
                      Что это?
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'dummy', label: 'ИИкра', level: '1/4' },
                      { id: 'people', label: 'Головастик', level: '2/4' },
                      { id: 'genius', label: 'Квант', level: '3/4' },
                      { id: 'god', label: 'Ляга-омега', level: '4/4' }
                    ].map((diff) => (
                      <button
                        key={diff.id}
                        onClick={() => setGameInfo(prev => ({ ...prev, difficulty: diff.id as Difficulty }))}
                        className={`px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex flex-col items-center gap-1 ${
                          gameInfo.difficulty === diff.id 
                            ? 'bg-primary text-background border-primary shadow-lg' 
                            : 'bg-primary/5 text-primary/60 border-primary/10 hover:bg-primary/10'
                        }`}
                      >
                        <span>{diff.label}</span>
                        <span className="opacity-60 text-[8px]">{diff.level}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-primary/60">6. Стоимость за 1 вопрос (₽)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="1"
                    step="1"
                    value={gameInfo.costPerQuestion}
                    onChange={(e) => setGameInfo(prev => ({ ...prev, costPerQuestion: Math.max(1, Math.floor(Number(e.target.value))) }))}
                    className="w-full rounded-xl border border-primary/20 bg-background/60 px-4 py-4 text-xl font-black outline-none focus:ring-2 focus:ring-primary transition-all" 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-black">₽</div>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!gameInfo.topic) return alert('Выберите или введите тему игры');
                  setStep(2);
                }}
                className="btn-primary w-full py-5 flex items-center justify-center gap-3 mt-4 group"
              >
                <span className="font-black uppercase tracking-[0.2em]">Далее к вопросам</span>
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black uppercase tracking-tight text-primary">Вопросы игры ({questions.length})</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                  <span>Тип: <span className="text-primary">{gameInfo.type}</span></span>
                  <span>Тема: <span className="text-primary">{gameInfo.topic}</span></span>
                  <span>Название: <span className="text-primary">{gameInfo.title}</span></span>
                  {gameInfo.type !== 'millionaire' && (
                    <span>Сложность: <span className="text-primary">{gameInfo.difficulty}</span></span>
                  )}
                  <span className="w-full mt-1">Описание: <span className="text-primary normal-case">{gameInfo.description}</span></span>
                </div>
              </div>
              <button onClick={() => setStep(1)} className="text-xs font-bold uppercase tracking-widest text-foreground/40 hover:text-primary flex items-center gap-1">
                <ChevronLeft size={16} />
                Назад к настройкам
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((q, index) => (
                <motion.div 
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-primary/20 bg-background/40 p-8 space-y-6 relative group"
                >
                  {gameInfo.type === 'iqbox' && (
                    <button 
                      onClick={() => removeQuestion(index)}
                      className="absolute right-6 top-6 text-foreground/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-background font-black shrink-0">
                      {gameInfo.type === 'jeopardy' ? (q.round === 4 ? 'Ф' : `Т${q.round}`) : (gameInfo.type === 'millionaire' ? `L${index + 1}` : (gameInfo.type === '100to1' ? `Т${q.round}` : index + 1))}
                    </div>
                    <div className="flex-1 flex items-center gap-4">
                      <input 
                        type="text" 
                        value={q.text}
                        onChange={(e) => updateQuestion(index, { text: e.target.value })}
                        placeholder={gameInfo.type === 'melody' ? "Введите вопрос про песню" : "Введите текст вопроса..."}
                        className="flex-1 bg-transparent text-xl font-bold text-primary outline-none border-b border-primary/10 pb-2 focus:border-primary transition-colors"
                      />
                      <button 
                        onClick={() => handleAiImprove(index)}
                        disabled={isGenerating}
                        className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[10px] font-bold uppercase text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
                      >
                        <Wand2 size={14} />
                        ИИ-Улучшение
                      </button>
                    </div>
                  </div>

                  <div className={gameInfo.type === '100to1' ? "space-y-6" : "grid grid-cols-1 md:grid-cols-2 gap-8"}>
                    {/* Media & Points */}
                    {gameInfo.type !== '100to1' && (
                      <div className="space-y-4">
                        {gameInfo.type === 'melody' ? (
                        <div className="space-y-4 p-4 rounded-2xl border border-primary/10 bg-primary/5">
                          <label className="text-xs font-bold uppercase tracking-widest text-primary/60">Монтажное окно аудио</label>
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                              <input 
                                type="file" 
                                accept="audio/*"
                                onChange={(e) => e.target.files?.[0] && handleAudioUpload(index, e.target.files[0])}
                                className="hidden"
                                id={`audio-upload-${index}`}
                              />
                              <label 
                                htmlFor={`audio-upload-${index}`}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/20 p-4 cursor-pointer hover:bg-primary/10 transition-all"
                              >
                                <Music size={20} className="text-primary" />
                                <span className="text-xs font-bold text-primary/60">
                                  {q.mediaUrl ? 'Файл выбран' : 'Загрузить аудио'}
                                </span>
                              </label>
                              <button 
                                onClick={() => handleRemoveVocal(index)}
                                className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-4 text-xs font-bold text-primary hover:bg-primary/20"
                                title="Удалить голос (ИИ)"
                              >
                                <MicOff size={18} />
                                <span className="hidden sm:inline text-[10px]">Удалить голос</span>
                              </button>
                            </div>
                            
                            {q.mediaUrl && (
                              <div className="space-y-4 bg-background/40 p-4 rounded-xl border border-primary/10">
                                <div className="flex items-center justify-between gap-4">
                                  <audio controls src={q.mediaUrl} className="flex-1 h-10" />
                                  <div className="flex items-center gap-2 text-[10px] text-primary/60 font-black uppercase">
                                    <Scissors size={14} />
                                    30 сек
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-foreground/40">Начало (сек)</label>
                                    <input 
                                      type="number" 
                                      value={q.audioStart || 0}
                                      onChange={(e) => {
                                        const start = Number(e.target.value);
                                        updateQuestion(index, { audioStart: start, audioEnd: start + 30 });
                                      }}
                                      className="w-full rounded-lg border border-primary/20 bg-background px-3 py-2 text-xs font-bold"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-foreground/40">Конец (авто +30с)</label>
                                    <input 
                                      type="number" 
                                      readOnly
                                      value={(q.audioStart || 0) + 30}
                                      className="w-full rounded-lg border border-primary/20 bg-background/20 px-3 py-2 text-xs font-bold text-foreground/40"
                                    />
                                  </div>
                                </div>
                                <div className="h-2 bg-primary/10 rounded-full relative overflow-hidden">
                                  <div 
                                    className="absolute h-full bg-primary/40 transition-all"
                                    style={{ 
                                      left: `${(q.audioStart || 0) / 3}%`, 
                                      width: '10%' // Visual representation
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Медиа-контент (URL)</label>
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <input 
                                  type="text" 
                                  value={q.mediaUrl || ''}
                                  onChange={(e) => updateQuestion(index, { mediaUrl: e.target.value })}
                                  placeholder="https://..."
                                  className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 pl-10 text-sm outline-none"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">
                                  {q.mediaType === 'image' && <ImageIcon size={16} />}
                                  {q.mediaType === 'video' && <Video size={16} />}
                                  {q.mediaType === 'audio' && <Music size={16} />}
                                  {!q.mediaType && <HelpCircle size={16} />}
                                </div>
                              </div>
                              <select 
                                value={q.mediaType || ''}
                                onChange={(e) => updateQuestion(index, { mediaType: e.target.value as any })}
                                className="rounded-xl border border-primary/20 bg-background px-2 text-xs outline-none"
                              >
                                <option value="">Нет</option>
                                <option value="image">Фото</option>
                                <option value="video">Видео</option>
                                <option value="audio">Аудио</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {gameInfo.type !== 'blitz' && gameInfo.type !== 'whatwherewhen' && gameInfo.type !== 'melody' && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Баллы за ответ</label>
                          <input 
                            type="number" 
                            value={q.points}
                            readOnly={gameInfo.type === 'millionaire' || gameInfo.type === 'jeopardy'}
                            onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })}
                            className={`w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none ${gameInfo.type === 'millionaire' || gameInfo.type === 'jeopardy' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                        </div>
                      )}

                      {gameInfo.type !== 'blitz' && gameInfo.type !== 'whatwherewhen' && gameInfo.type !== 'melody' && gameInfo.type !== 'jeopardy' && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Подсказка (необязательно)</label>
                          <input 
                            type="text" 
                            value={q.hint || ''}
                            onChange={(e) => updateQuestion(index, { hint: e.target.value })}
                            placeholder="Дайте игроку наводку..."
                            className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none"
                          />
                        </div>
                      )}
                    </div>
                    )}

                    {/* Specialized Fields based on Game Type */}
                    <div className="space-y-4">
                      {gameInfo.type === '100to1' ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Популярные ответы (Тур {q.round})</label>
                            {q.round < 4 && (
                              <div className="text-[10px] font-black text-primary uppercase">Множитель: x{q.round}</div>
                            )}
                          </div>
                          <div className="grid gap-4">
                            {(q.answers || []).map((ans: any, ansIndex: number) => (
                              <div key={ansIndex} className="space-y-2 p-4 rounded-2xl border border-primary/10 bg-primary/5">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black w-4 text-primary">{ansIndex + 1}</span>
                                  <input 
                                    type="text" 
                                    value={ans.text}
                                    onChange={(e) => {
                                      const newAns = [...(q.answers || [])];
                                      newAns[ansIndex] = { ...newAns[ansIndex], text: e.target.value };
                                      updateQuestion(index, { answers: newAns });
                                    }}
                                    placeholder={`Вариант ${ansIndex + 1}`}
                                    className="flex-1 rounded-xl border border-primary/20 bg-background px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
                                  />
                                  <input 
                                    type="text" 
                                    value={ans.hint || ''}
                                    onChange={(e) => {
                                      const newAns = [...(q.answers || [])];
                                      newAns[ansIndex] = { ...newAns[ansIndex], hint: e.target.value };
                                      updateQuestion(index, { answers: newAns });
                                    }}
                                    placeholder="Наводка"
                                    className="flex-1 rounded-xl border border-primary/20 bg-background px-4 py-2 text-xs outline-none focus:border-primary transition-colors"
                                  />
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="number" 
                                      value={ans.points}
                                      onChange={(e) => {
                                        const newAns = [...(q.answers || [])];
                                        newAns[ansIndex] = { ...newAns[ansIndex], points: Number(e.target.value) };
                                        updateQuestion(index, { answers: newAns });
                                      }}
                                      className="w-16 rounded-xl border border-primary/20 bg-background px-2 py-2 text-xs outline-none"
                                    />
                                    {q.round < 4 && (
                                      <span className="text-[10px] font-bold text-foreground/40">x{q.round} = {ans.points * q.round}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 pl-7">
                                  <div className="flex-1 relative">
                                    <input 
                                      type="text" 
                                      value={ans.mediaUrl || ''}
                                      onChange={(e) => {
                                        const newAns = [...(q.answers || [])];
                                        newAns[ansIndex] = { ...newAns[ansIndex], mediaUrl: e.target.value };
                                        updateQuestion(index, { answers: newAns });
                                      }}
                                      placeholder="Медиа URL (показывается при открытии ответа)"
                                      className="w-full rounded-xl border border-primary/20 bg-background px-4 py-2 pl-8 text-[10px] outline-none focus:border-primary transition-colors"
                                    />
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground/40">
                                      {ans.mediaType === 'video' ? <Video size={12} /> : <ImageIcon size={12} />}
                                    </div>
                                  </div>
                                  <select 
                                    value={ans.mediaType || 'image'}
                                    onChange={(e) => {
                                      const newAns = [...(q.answers || [])];
                                      newAns[ansIndex] = { ...newAns[ansIndex], mediaType: e.target.value as any };
                                      updateQuestion(index, { answers: newAns });
                                    }}
                                    className="rounded-xl border border-primary/20 bg-background px-2 py-2 text-[10px] outline-none"
                                  >
                                    <option value="image">Фото</option>
                                    <option value="video">Видео</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : gameInfo.type === 'whatwherewhen' ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">ФИО Телезрителя</label>
                              <input 
                                type="text" 
                                value={q.viewerName || ''}
                                onChange={(e) => updateQuestion(index, { viewerName: e.target.value })}
                                placeholder="Иванов И.И."
                                className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Адрес Телезрителя</label>
                              <input 
                                type="text" 
                                value={q.viewerAddress || ''}
                                onChange={(e) => updateQuestion(index, { viewerAddress: e.target.value })}
                                placeholder="г. Москва"
                                className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Правильный ответ</label>
                            <input 
                              type="text" 
                              value={q.correctAnswer}
                              onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                              placeholder="Текст правильного ответа"
                              className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                            />
                          </div>
                        </div>
                      ) : gameInfo.type === 'melody' || gameInfo.type === 'blitz' ? (
                        <div className="space-y-4">
                          {gameInfo.type === 'melody' && (
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Категория {Math.floor(index / 5) + 1}</label>
                              <input 
                                type="text" 
                                value={q.category || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const catIdx = Math.floor(index / 5);
                                  const blockStartIdx = catIdx * 5;
                                  
                                  const newQuestions = [...questions];
                                  for (let i = 0; i < 5; i++) {
                                    newQuestions[blockStartIdx + i] = { ...newQuestions[blockStartIdx + i], category: val };
                                  }
                                  setQuestions(newQuestions);
                                }}
                                placeholder="Название категории для всего блока"
                                className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                              />
                            </div>
                          )}
                          <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Правильный ответ</label>
                          <input 
                            type="text" 
                            value={q.correctAnswer}
                            onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                            placeholder={gameInfo.type === 'melody' ? "Тут правильный ответ про песню" : "Введите правильный ответ"}
                            className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      ) : gameInfo.type === 'jeopardy' ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Тур</label>
                              <div className="w-full rounded-xl border border-primary/20 bg-background/20 px-4 py-3 text-sm font-bold text-primary">
                                {q.round === 4 ? 'Финал' : `${q.round} Тур`}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Тип вопроса</label>
                              <select 
                                value={q.round === 4 ? 'auction' : (q.questionType || 'normal')}
                                disabled={q.round === 4}
                                onChange={(e) => updateQuestion(index, { questionType: e.target.value as any })}
                                className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none disabled:opacity-50"
                              >
                                <option value="normal">Обычный</option>
                                <option value="cat_in_bag">Кот в мешке</option>
                                <option value="auction">Аукцион</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">
                              {q.round === 4 ? 'Введите категорию' : `Категория ${Math.floor((index % 25) / 5) + 1}`}
                            </label>
                            {q.round < 4 ? (
                              <input 
                                type="text" 
                                value={q.category || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const roundStartIdx = (q.round - 1) * 25;
                                  const catIdx = Math.floor((index % 25) / 5);
                                  const blockStartIdx = roundStartIdx + (catIdx * 5);
                                  
                                  const newQuestions = [...questions];
                                  for (let i = 0; i < 5; i++) {
                                    newQuestions[blockStartIdx + i] = { ...newQuestions[blockStartIdx + i], category: val };
                                  }
                                  setQuestions(newQuestions);
                                }}
                                placeholder="Название категории для всего блока"
                                className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                              />
                            ) : (
                              <input 
                                type="text" 
                                value={q.category || ''}
                                onChange={(e) => updateQuestion(index, { category: e.target.value })}
                                placeholder="Название категории"
                                className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Правильный ответ</label>
                            <input 
                              type="text" 
                              value={q.correctAnswer}
                              onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                              placeholder="Текст правильного ответа"
                              className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Варианты ответов</label>
                          <div className="grid gap-3">
                            {q.options?.map((opt, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <button 
                                  onClick={() => updateQuestion(index, { correctAnswer: opt })}
                                  className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    q.correctAnswer === opt && opt !== '' ? 'bg-primary border-primary text-background' : 'border-primary/20 text-transparent'
                                  }`}
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                                <input 
                                  type="text" 
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...(q.options || [])];
                                    newOpts[optIndex] = e.target.value;
                                    updateQuestion(index, { options: newOpts });
                                  }}
                                  placeholder={`Вариант ${optIndex + 1}`}
                                  className="flex-1 rounded-xl border border-primary/20 bg-background px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-foreground/40 uppercase tracking-widest italic">* Нажмите на круг, чтобы отметить верный ответ</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {gameInfo.type === 'iqbox' && (
              <button 
                onClick={addQuestion}
                className="w-full py-8 rounded-3xl border-2 border-dashed border-primary/20 text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2"
              >
                <Plus size={32} />
                <span className="font-bold uppercase tracking-widest">Добавить вопрос</span>
              </button>
            )}

            <div className="flex gap-4 pt-8">
              <button onClick={() => setStep(1)} className="flex-1 rounded-2xl border border-primary/20 py-4 font-bold uppercase tracking-widest text-foreground/60 hover:bg-primary/5">Назад</button>
              <button onClick={handleSaveGame} className="flex-1 btn-primary py-4">Завершить и сохранить</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant Modal */}
      <AnimatePresence>
        {showAiAssistant && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-end bg-background/80 p-4 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="w-full max-w-md h-full bg-background border-l border-primary/20 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-background">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-black uppercase text-primary">ИИ-Помощник</h3>
                    <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Твой креативный напарник</p>
                  </div>
                </div>
                <button onClick={() => setShowAiAssistant(false)} className="text-foreground/40 hover:text-primary">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {aiMessage ? (
                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {aiMessage}
                    </div>
                    {pendingAiQuestions && (
                      <button 
                        onClick={applyAiSuggestions}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-background shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <Save size={18} />
                        Заполнить вопросы
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                      <MessageSquare size={32} />
                    </div>
                    <p className="text-sm text-foreground/60">
                      Привет! Я помогу тебе придумать вопросы для игры. <br/>
                      Просто напиши, о чем должна быть игра или попроси предложить варианты.
                    </p>
                  </div>
                )}
                {isGenerating && (
                  <div className="flex flex-col items-center gap-4 py-10">
                    <div className="flex items-center gap-2 text-primary text-xs font-bold animate-pulse">
                      <Sparkles size={14} className="animate-spin" />
                      Ква-ква-думаю... ({aiTimer}с)
                    </div>
                    {aiTimer === 0 && (
                      <div className="text-center space-y-4">
                        <p className="text-sm text-red-500 font-bold">ИИ Немного тупит, надо повторить</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleAiAssistant}
                            className="px-4 py-2 bg-primary text-background rounded-xl text-xs font-bold"
                          >
                            Еще раз
                          </button>
                          <button 
                            onClick={() => {
                              setIsGenerating(false);
                              setShowAiAssistant(false);
                            }}
                            className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold"
                          >
                            Пропустить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-primary/10 bg-background/40">
                <div className="relative">
                  <input 
                    type="text" 
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiAssistant()}
                    placeholder="Напиши запрос (например: 'Придумай 5 вопросов про лягушек')..."
                    className="w-full rounded-2xl border border-primary/20 bg-background px-4 py-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button 
                    onClick={handleAiAssistant}
                    disabled={isGenerating || !aiInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-primary text-background flex items-center justify-center disabled:opacity-50 transition-transform hover:scale-105"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
