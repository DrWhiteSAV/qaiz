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
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Game, Question, GameMode, Difficulty } from '../types';
import { TopicCloud } from '../components/TopicCloud';
import { TOPICS } from '../constants';

type GameType = 'blitz' | 'millionaire' | '100to1' | 'whatwherewhen' | 'melody' | 'jeopardy' | 'iqbox';

export const GameCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Game Basic Info
  const [gameInfo, setGameInfo] = useState({
    title: '',
    description: '',
    type: 'blitz' as GameType,
    difficulty: 'people' as Difficulty,
    topic: '',
    isMultiplayer: false,
    costPerQuestion: 1
  });

  // Questions
  const [questions, setQuestions] = useState<Partial<Question>[]>([
    { id: '1', text: '', options: ['', '', '', ''], correctAnswer: '', points: 100 }
  ]);

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
    if (!gameInfo.title || !gameInfo.topic) return alert('Заполните основные поля игры');
    
    setLoading(true);
    try {
      const gameRef = doc(collection(db, 'games'));
      const gameData: Game = {
        id: gameRef.id,
        title: gameInfo.title,
        description: gameInfo.description,
        authorId: user.uid,
        mode: 'human',
        difficulty: gameInfo.difficulty,
        type: gameInfo.type,
        topic: gameInfo.topic,
        questions: questions as Question[],
        isMultiplayer: gameInfo.isMultiplayer,
        costPerQuestion: gameInfo.costPerQuestion,
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
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Basic Info Card */}
            <div className="space-y-6 rounded-3xl border border-primary/20 bg-background/40 p-8">
              <div className="flex items-center gap-3 text-primary mb-4">
                <Layout size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight">Общая информация</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Название игры</label>
                  <input 
                    type="text" 
                    value={gameInfo.title}
                    onChange={(e) => setGameInfo(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Например: Битва Киноманов"
                    className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 focus:ring-2 focus:ring-primary outline-none" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Описание</label>
                  <textarea 
                    value={gameInfo.description}
                    onChange={(e) => setGameInfo(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="О чем эта игра?"
                    className="w-full h-32 rounded-xl border border-primary/20 bg-background px-4 py-3 focus:ring-2 focus:ring-primary outline-none resize-none" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Тема / Категория</label>
                  <TopicCloud 
                    topics={TOPICS}
                    selectedTopic={gameInfo.topic}
                    onSelect={(topic) => setGameInfo(prev => ({ ...prev, topic }))}
                  />
                  <div className="relative mt-2">
                    <input 
                      type="text" 
                      value={gameInfo.topic}
                      onChange={(e) => setGameInfo(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="Или введите свою тему..."
                      className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Settings Card */}
            <div className="space-y-6 rounded-3xl border border-primary/20 bg-background/40 p-8">
              <div className="flex items-center gap-3 text-primary mb-4">
                <SettingsIcon size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight">Настройки механики</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Тип игры</label>
                    <select 
                      value={gameInfo.type}
                      onChange={(e) => setGameInfo(prev => ({ ...prev, type: e.target.value as GameType }))}
                      className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 outline-none"
                    >
                      <option value="blitz">Блиц</option>
                      <option value="millionaire">Квиллионер</option>
                      <option value="100to1">Сто Квадному</option>
                      <option value="whatwherewhen">Что? Где? Квада?</option>
                      <option value="melody">Уквадай Мелодию</option>
                      <option value="jeopardy">Своя Иква</option>
                      <option value="iqbox">IQ Box</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Сложность</label>
                    <select 
                      value={gameInfo.difficulty}
                      onChange={(e) => setGameInfo(prev => ({ ...prev, difficulty: e.target.value as Difficulty }))}
                      className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 outline-none"
                    >
                      <option value="dummy">Для чайников</option>
                      <option value="people">Для людей</option>
                      <option value="genius">Для гениев</option>
                      <option value="god">Для богов</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Цена за вопрос (₽)</label>
                    <input 
                      type="number" 
                      value={gameInfo.costPerQuestion}
                      onChange={(e) => setGameInfo(prev => ({ ...prev, costPerQuestion: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 outline-none" 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div>
                    <p className="font-bold text-sm">Мультиплеер</p>
                    <p className="text-[10px] text-foreground/40 uppercase tracking-widest">Доступно для командной игры</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={gameInfo.isMultiplayer}
                    onChange={(e) => setGameInfo(prev => ({ ...prev, isMultiplayer: e.target.checked }))}
                    className="h-6 w-6 rounded border-primary/20 bg-background text-primary focus:ring-primary"
                  />
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 mt-8"
              >
                Далее к вопросам
                <ChevronRight size={20} />
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
              <h2 className="text-2xl font-black uppercase tracking-tight text-primary">Вопросы игры ({questions.length})</h2>
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
                  <button 
                    onClick={() => removeQuestion(index)}
                    className="absolute right-6 top-6 text-foreground/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-background font-black">
                      {gameInfo.type === 'millionaire' ? `L${index + 1}` : index + 1}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={q.text}
                        onChange={(e) => updateQuestion(index, { text: e.target.value })}
                        placeholder="Введите текст вопроса..."
                        className="w-full bg-transparent text-xl font-bold text-primary outline-none border-b border-primary/10 pb-2 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Media & Points */}
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

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Баллы за ответ</label>
                        <input 
                          type="number" 
                          value={q.points}
                          onChange={(e) => updateQuestion(index, { points: Number(e.target.value) })}
                          className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none"
                        />
                      </div>

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
                    </div>

                    {/* Specialized Fields based on Game Type */}
                    <div className="space-y-4">
                      {gameInfo.type === '100to1' ? (
                        <div className="space-y-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Популярные ответы (Сто Квадному)</label>
                          <div className="grid gap-3">
                            {(q.answers || [{ text: '', points: 0 }]).map((ans, ansIndex) => (
                              <div key={ansIndex} className="flex items-center gap-2">
                                <input 
                                  type="text" 
                                  value={ans.text}
                                  onChange={(e) => {
                                    const newAns = [...(q.answers || [{ text: '', points: 0 }])];
                                    newAns[ansIndex] = { ...newAns[ansIndex], text: e.target.value };
                                    updateQuestion(index, { answers: newAns });
                                  }}
                                  placeholder={`Ответ ${ansIndex + 1}`}
                                  className="flex-1 rounded-xl border border-primary/20 bg-background px-4 py-2 text-sm outline-none"
                                />
                                <input 
                                  type="number" 
                                  value={ans.points}
                                  onChange={(e) => {
                                    const newAns = [...(q.answers || [{ text: '', points: 0 }])];
                                    newAns[ansIndex] = { ...newAns[ansIndex], points: Number(e.target.value) };
                                    updateQuestion(index, { answers: newAns });
                                  }}
                                  className="w-20 rounded-xl border border-primary/20 bg-background px-2 py-2 text-sm outline-none"
                                />
                                <button 
                                  onClick={() => {
                                    const newAns = (q.answers || []).filter((_, i) => i !== ansIndex);
                                    updateQuestion(index, { answers: newAns });
                                  }}
                                  className="text-foreground/20 hover:text-red-500"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => {
                                const newAns = [...(q.answers || []), { text: '', points: 0 }];
                                updateQuestion(index, { answers: newAns });
                              }}
                              className="text-xs font-bold text-primary flex items-center gap-1"
                            >
                              <Plus size={14} /> Добавить ответ
                            </button>
                          </div>
                        </div>
                      ) : gameInfo.type === 'jeopardy' ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Категория (Своя Иква)</label>
                            <input 
                              type="text" 
                              value={q.category || ''}
                              onChange={(e) => updateQuestion(index, { category: e.target.value })}
                              placeholder="Название категории"
                              className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Правильный ответ</label>
                            <input 
                              type="text" 
                              value={q.correctAnswer}
                              onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                              placeholder="Текст правильного ответа"
                              className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm outline-none"
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

            <button 
              onClick={addQuestion}
              className="w-full py-8 rounded-3xl border-2 border-dashed border-primary/20 text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2"
            >
              <Plus size={32} />
              <span className="font-bold uppercase tracking-widest">Добавить вопрос</span>
            </button>

            <div className="flex gap-4 pt-8">
              <button onClick={() => setStep(1)} className="flex-1 rounded-2xl border border-primary/20 py-4 font-bold uppercase tracking-widest text-foreground/60 hover:bg-primary/5">Назад</button>
              <button onClick={handleSaveGame} className="flex-1 btn-primary py-4">Завершить и сохранить</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
