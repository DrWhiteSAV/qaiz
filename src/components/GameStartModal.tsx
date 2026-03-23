import React, { useState, useEffect } from 'react';
import { X, Info, HelpCircle } from 'lucide-react';
import { TopicCloud } from './TopicCloud';
import { TOPICS, DIFFICULTIES } from '../constants';
import { getSupabase } from '../supabase';

interface GameStartModalProps {
  game: any;
  onClose: () => void;
  onStart: (options: any) => void;
}

export const GameStartModal = ({ game, onClose, onStart }: GameStartModalProps) => {
  const [playMode, setPlayMode] = useState<'single' | 'multi'>('single');
  const [difficulty, setDifficulty] = useState('people');
  const [selectedTopic, setSelectedTopic] = useState('Общие вопросы');
  const [customTopic, setCustomTopic] = useState('');
  const [authorTopics, setAuthorTopics] = useState<string[]>([]);

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

  const totalPrice = game.questionCount || 10;
  const showTopicSelection = ['blitz', 'millionaire', '100to1', 'whatwherewhen', 'melody', 'jeopardy'].includes(game.id);

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
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPlayMode('single')}
                className={`rounded-xl p-3 text-center transition-all border-2 ${
                  playMode === 'single' ? 'bg-[#83c42e] text-[#f4f1ee] shadow-lg border-[#f4f1ee]' : 'bg-[#d1d9d5] text-[#0b1c1c] hover:bg-[#d1d9d5]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                }`}
              >
                <span className="text-xs font-black uppercase">Одиночная игра</span>
              </button>
              <button
                onClick={() => setPlayMode('multi')}
                className={`rounded-xl p-3 text-center transition-all border-2 ${
                  playMode === 'multi' ? 'bg-[#83c42e] text-[#f4f1ee] shadow-lg border-[#f4f1ee]' : 'bg-[#d1d9d5] text-[#0b1c1c] hover:bg-[#d1d9d5]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                }`}
              >
                <span className="text-xs font-black uppercase">Мультиплеер</span>
              </button>
            </div>
          </div>

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
                    className="w-full rounded-xl border-2 border-[#f4f1ee] bg-[#d1d9d5] dark:bg-white/10 p-4 pr-12 text-sm text-[#0b1c1c] dark:text-white placeholder:text-[#0b1c1c]/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#f4f1ee] transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0b1c1c]/40 dark:text-white/40">
                    <HelpCircle size={18} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#0b1c1c] dark:text-white/60">Сложность</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-xl p-2 text-[10px] font-bold uppercase tracking-widest transition-all border-2 ${
                    difficulty === d.id ? 'bg-[#83c42e] text-[#f4f1ee] border-[#f4f1ee]' : 'bg-[#d1d9d5] text-[#0b1c1c] hover:bg-[#d1d9d5]/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border-transparent'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            if (game.id === 'melody' && authorTopics.length === 0) {
              alert('Игра "Уквадай Мелодию" временно недоступна (нет авторских игр).');
              return;
            }
            onStart({ mode: 'lite', difficulty, price: totalPrice, topic: customTopic || selectedTopic, playMode });
          }}
          className="w-full py-4 text-xl rounded-2xl bg-[#83c42e] text-[#f4f1ee] font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_#0b1c1c] border-2 border-[#f4f1ee] hover:scale-105 transition-all"
        >
          {game.id === 'melody' && authorTopics.length === 0 ? 'Скоро' : 'Начать игру'}
        </button>
      </div>
    </div>
  );
};
