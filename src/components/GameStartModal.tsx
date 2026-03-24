import React, { useState, useEffect } from 'react';
import { X, Info, HelpCircle } from 'lucide-react';
import { TopicCloud } from './TopicCloud';
import { TOPICS, DIFFICULTIES, AI_TEMPLATES, AITemplate } from '../constants';
import { getSupabase } from '../supabase';
import { Users, Bot, User, Globe, Monitor } from 'lucide-react';

interface GameStartModalProps {
  game: any;
  onClose: () => void;
  onStart: (options: any) => void;
}

export const GameStartModal = ({ game, onClose, onStart }: GameStartModalProps) => {
  const [playMode, setPlayMode] = useState<'single' | 'multi' | 'ai'>('single');
  const [multiMode, setMultiMode] = useState<'offline' | 'online'>('offline');
  const [difficulty, setDifficulty] = useState('people');
  const [selectedTopic, setSelectedTopic] = useState('Общие вопросы');
  const [customTopic, setCustomTopic] = useState('');
  const [authorTopics, setAuthorTopics] = useState<string[]>([]);
  const [selectedAI, setSelectedAI] = useState<string[]>([AI_TEMPLATES[0].id]);

  useEffect(() => {
    const fetchAuthorTopics = async () => {
      try {
        const supabase = getSupabase();
        if (supabase) {
          const { data } = await supabase.from('games').select('topic');
          if (data) {
            const uniqueTopics = Array.from(new Set(data.map(g => g.topic)));
            setAuthorTopics(uniqueTopics);
          }
        }
      } catch (error) {
        console.error('Error fetching author topics:', error);
      }
    };
    fetchAuthorTopics();
  }, []);


  const getCostPerQuestion = () => {
    if (game.id === 'whatwherewhen') return 2;
    if (game.id === 'melody') return 10;
    return 1;
  };

  const isSpecialGame = game.id === 'whatwherewhen' || game.id === 'melody';

  const totalPrice = (game.questionCount || 10) * getCostPerQuestion();
  const showTopicSelection = ['blitz', 'millionaire', '100to1', 'whatwherewhen', 'melody', 'jeopardy'].includes(game.id);

  const toggleAI = (id: string) => {
    setSelectedAI(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(a => a !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border-2 border-[#f4f1ee] bg-[#83c42e] dark:bg-slate-900 p-6 md:p-10 shadow-[12px_12px_0px_0px_#0b1c1c] overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-[#f4f1ee] dark:text-white drop-shadow-sm">{game.title}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors text-[#f4f1ee] dark:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-[#b4beb9] dark:bg-white/10 p-4 border border-[#f4f1ee] dark:border-white/20">
            <div className="flex items-center justify-between text-[#f4f1ee] dark:text-white drop-shadow-sm mb-2">
              <div className="flex items-center gap-2">
                <Info size={18} />
                <span className="font-bold uppercase tracking-widest text-xs">Правила и списание</span>
              </div>
              <span className="text-xs font-bold">{game.questionCount} вопросов</span>
            </div>
            <p className="text-sm text-[#0b1c1c] dark:text-white/70">{game.rules || game.description}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#0b1c1c] dark:text-white/60">Режим игры</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPlayMode('single')}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all border-2 ${
                  playMode === 'single' ? 'bg-[#83c42e] text-[#f4f1ee] shadow-lg border-[#f4f1ee]' : 'bg-[#f4f1ee] text-[#0b1c1c] hover:bg-[#f4f1ee]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                }`}
              >
                <User size={20} />
                <span className="text-[10px] font-black uppercase">Одиночная</span>
              </button>
              {isSpecialGame && (
                <button
                  onClick={() => setPlayMode('ai')}
                  className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all border-2 ${
                    playMode === 'ai' ? 'bg-[#83c42e] text-[#f4f1ee] shadow-lg border-[#f4f1ee]' : 'bg-[#f4f1ee] text-[#0b1c1c] hover:bg-[#f4f1ee]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                  }`}
                >
                  <Bot size={20} />
                  <span className="text-[10px] font-black uppercase">Против ИИ</span>
                </button>
              )}
              <button
                onClick={() => setPlayMode('multi')}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 text-center transition-all border-2 ${
                  playMode === 'multi' ? 'bg-[#83c42e] text-[#f4f1ee] shadow-lg border-[#f4f1ee]' : 'bg-[#f4f1ee] text-[#0b1c1c] hover:bg-[#f4f1ee]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                }`}
              >
                <Users size={20} />
                <span className="text-[10px] font-black uppercase">Мультиплеер</span>
              </button>
            </div>
          </div>

          {playMode === 'multi' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#0b1c1c] dark:text-white/60">Тип мультиплеера</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMultiMode('offline')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-3 text-center transition-all border-2 ${
                    multiMode === 'offline' ? 'bg-[#83c42e] text-[#f4f1ee] shadow-lg border-[#f4f1ee]' : 'bg-[#f4f1ee] text-[#0b1c1c] hover:bg-[#f4f1ee]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                  }`}
                >
                  <Monitor size={16} />
                  <span className="text-[10px] font-black uppercase">Оффлайн</span>
                </button>
                <button
                  onClick={() => setMultiMode('online')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-3 text-center transition-all border-2 ${
                    multiMode === 'online' ? 'bg-[#83c42e] text-[#f4f1ee] shadow-lg border-[#f4f1ee]' : 'bg-[#f4f1ee] text-[#0b1c1c] hover:bg-[#f4f1ee]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                  }`}
                >
                  <Globe size={16} />
                  <span className="text-[10px] font-black uppercase">Онлайн</span>
                </button>
              </div>
            </div>
          )}

          {playMode === 'ai' && isSpecialGame && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#0b1c1c] dark:text-white/60">Выберите противников (до 3-х)</label>
              <div className="grid grid-cols-2 gap-2">
                {AI_TEMPLATES.map((ai) => (
                  <button
                    key={ai.id}
                    onClick={() => toggleAI(ai.id)}
                    className={`flex items-center gap-3 rounded-xl p-3 text-left transition-all border-2 ${
                      selectedAI.includes(ai.id) ? 'bg-[#83c42e] text-[#f4f1ee] border-[#f4f1ee]' : 'bg-[#f4f1ee] text-[#0b1c1c] hover:bg-[#f4f1ee]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                    }`}
                  >
                    <img src={ai.avatar} alt={ai.name} className="w-8 h-8 rounded-full bg-white/20" />
                    <div>
                      <div className="text-[10px] font-black uppercase leading-tight">{ai.name}</div>
                      <div className="text-[8px] opacity-70 leading-tight">{ai.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showTopicSelection && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-[#0b1c1c] dark:text-white/60">Выберите тему</label>
              <TopicCloud 
                topics={game.id === 'melody' ? ['Общие вопросы', ...authorTopics] : TOPICS}
                selectedTopic={selectedTopic}
                onSelect={(topic) => {
                  setSelectedTopic(topic);
                  setCustomTopic(topic);
                }}
              />
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#0b1c1c] dark:text-white/60">Или введите свою тему</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Напр: История Древнего Рима"
                    className="w-full rounded-xl border-2 border-[#f4f1ee] bg-[#f4f1ee] dark:bg-white/10 p-4 pr-12 text-sm text-[#0b1c1c] dark:text-white placeholder:text-[#0b1c1c]/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#f4f1ee] transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0b1c1c]/40 dark:text-white/40">
                    <HelpCircle size={18} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {playMode !== 'ai' && game.id !== 'millionaire' && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#0b1c1c] dark:text-white/60">Сложность</label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`rounded-xl p-2 text-[10px] font-bold uppercase tracking-widest transition-all border-2 ${
                      difficulty === d.id ? 'bg-[#83c42e] text-[#f4f1ee] border-[#f4f1ee]' : 'bg-[#f4f1ee] text-[#0b1c1c] hover:bg-[#f4f1ee]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => {
            if (game.id === 'melody' && authorTopics.length === 0) {
              alert('Игра "Уквадай Мелодию" временно недоступна (нет авторских игр).');
              return;
            }
            onStart({ 
              mode: 'lite', 
              difficulty, 
              price: totalPrice, 
              topic: customTopic || selectedTopic, 
              playMode,
              multiMode: playMode === 'multi' ? multiMode : undefined,
              aiOpponents: playMode === 'ai' ? selectedAI : undefined
            });
          }}
          className="w-full py-4 text-xl rounded-2xl bg-[#83c42e] text-[#f4f1ee] font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_#0b1c1c] border-2 border-[#f4f1ee] hover:scale-105 transition-all"
        >
          {game.id === 'melody' && authorTopics.length === 0 ? 'Скоро' : 'Начать игру'}
        </button>
      </div>
    </div>
  );
};
