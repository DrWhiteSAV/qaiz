import React, { useState, useEffect } from 'react';
import { X, Info, User, Bot, Users, Monitor, Globe, Search, Sparkles, RotateCcw } from 'lucide-react';
import { TopicCloud } from './TopicCloud';
import { DIFFICULTIES, getGameModes, formatPricePerQuestion } from '../lib/gameHelpers';
import { LeafButton } from './ui/LeafButton';
import { BubbleElement } from './ui/BubbleElement';

interface GameStartModalProps {
  game: any;
  onClose: () => void;
  onStart: (options: any) => void;
}

export const GameStartModal: React.FC<GameStartModalProps> = ({ game: initialGame, onClose, onStart }) => {
  const [game, setGame] = useState(initialGame);
  const [playMode, setPlayMode] = useState<'single' | 'multi' | 'ai'>('single');
  const [multiMode, setMultiMode] = useState<'offline' | 'online'>('offline');
  const [difficulty, setDifficulty] = useState('people');
  
  // Topic state - support multi-selection
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['Общие знания']);
  const [searchTopic, setSearchTopic] = useState('');
  const [dbTopics, setDbTopics] = useState<string[]>([]);
  const [totalTopicsCount, setTotalTopicsCount] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);

  const supportedModes = getGameModes(game.id);

  // Auto-set valid mode when game changes (default 'single')
  useEffect(() => {
    if (!supportedModes.includes(playMode)) {
      setPlayMode('single');
    }
  }, [game.id]);

  // Fetch complete game details from DB
  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        if (!initialGame?.id) return;
        const res = await fetch(`/api/games/${initialGame.id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setGame(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching game details from DB:', err);
      }
    };
    fetchGameDetails();
  }, [initialGame?.id]);

  // Fetch topics with search filter from server DB
  useEffect(() => {
    const fetchTopics = async () => {
      setIsSearching(true);
      try {
        const query = searchTopic.trim();
        const url = `/api/topics?limit=100${query ? `&q=${encodeURIComponent(query)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            const topicNames = json.data.map((t: any) => t.name);
            setDbTopics(topicNames);
            setTotalTopicsCount(json.totalCount || topicNames.length);
          }
        }
      } catch (error) {
        console.error('Error fetching topics from API:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchTopics, 150);
    return () => clearTimeout(timer);
  }, [searchTopic]);

  // Toggle topic selection
  const handleToggleTopic = (topic: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  const handleResetTopics = () => {
    setSelectedTopics([]);
    setSearchTopic('');
  };

  // Calculations from DB game object
  const questionCount = game.question_count || game.questionCount || 10;
  const timeLimit = game.time_limit || 60;
  const pricePerQuestion = game.price_per_question ?? (game.id === 'whatwherewhen' ? 2 : game.id === 'melody' ? 10 : 1);
  const totalPrice = questionCount * pricePerQuestion;
  const showTopicSelection = ['blitz', 'millionaire', '100to1', 'whatwherewhen', 'melody', 'jeopardy'].includes(game.id);

  const handleStartGame = async () => {
    let topicsList = [...selectedTopics];
    const custom = searchTopic.trim();
    if (custom && !topicsList.includes(custom)) {
      topicsList.push(custom);
    }
    const finalTopic = topicsList.length > 0 ? topicsList.join(', ') : 'Общие знания';

    if (custom) {
      try {
        await fetch('/api/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: custom, category: 'Пользовательские' }),
        });
      } catch (e) {
        console.error('Error saving custom topic:', e);
      }
    }

    if (game.id === 'melody' && dbTopics.length === 0) {
      alert('Игра "Уквакай Мелодию" временно недоступна.');
      return;
    }

    onStart({ 
      mode: 'lite', 
      difficulty, 
      price: totalPrice, 
      topic: finalTopic, 
      playMode,
      multiMode: playMode === 'multi' ? multiMode : undefined
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4">
        <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-background/50 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden text-foreground transition-all flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="w-full bg-transparent backdrop-blur-md border-b border-primary/20 px-5 md:px-7 py-3.5 relative flex items-center justify-center shrink-0 min-h-[52px]">
            <h2 className="text-base md:text-lg font-black tracking-tight text-center text-foreground drop-shadow-[0_0_10px_rgba(131,196,46,0.3)]">
              {game.title}
            </h2>

            <button
              onClick={onClose}
              className="absolute right-5 md:right-7 rounded-xl p-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all text-foreground/80 hover:text-foreground"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="overflow-y-auto p-5 md:p-7 space-y-5 custom-scrollbar">
            {/* Rules Box */}
            <div className="rounded-2xl bg-primary/10 backdrop-blur-md border border-primary/20 p-4 space-y-3">
              
              {game.tag && (
                <div className="pb-1">
                  <span className="text-sm font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 inline-block">
                    {game.tag}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-primary font-bold">
                <div className="flex items-center gap-2">
                  <Info size={18} />
                  <span className="text-base font-bold">Правила</span>
                </div>
                
                <BubbleElement isBadge size="sm">
                  <span className="text-sm font-bold">{questionCount} вопросов</span>
                </BubbleElement>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed">
                {game.rules || game.description || 'Классическая ИИ-викторина с генерацией уникальных вопросов.'}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-primary/15 text-sm">
                <div className="flex items-center gap-1.5 text-foreground/80">
                  <span>⏱️ Время на ответ:</span>
                  <span className="font-bold text-primary">{timeLimit} сек/вопр</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-foreground/80">Стоимость:</span>
                  <span className="text-primary font-bold bg-primary/15 border border-primary/35 px-2.5 py-0.5 rounded-full text-sm">
                    {formatPricePerQuestion(pricePerQuestion)}
                  </span>
                </div>
              </div>
            </div>

            {/* Play Mode Selector */}
            <div className="space-y-2">
              <label className="block text-base font-bold text-foreground/80 text-center">Режим игры</label>
              <div className="grid grid-cols-2 gap-2.5">
                {supportedModes.includes('single') && (
                  <LeafButton
                    type="button"
                    active={playMode === 'single'}
                    variant={playMode === 'single' ? 'primary' : 'dark'}
                    size="sm"
                    onClick={() => setPlayMode('single')}
                    icon={<User size={16} />}
                    className="w-full text-sm py-2.5"
                  >
                    Одиночная
                  </LeafButton>
                )}
                {supportedModes.includes('ai') && (
                  <LeafButton
                    type="button"
                    active={playMode === 'ai'}
                    variant={playMode === 'ai' ? 'primary' : 'dark'}
                    size="sm"
                    onClick={() => setPlayMode('ai')}
                    icon={<Bot size={16} />}
                    className="w-full text-sm py-2.5"
                  >
                    Против ИИ
                  </LeafButton>
                )}
                {supportedModes.includes('multi') && (
                  <div className={supportedModes.includes('single') && supportedModes.includes('ai') ? "col-span-2" : "w-full"}>
                    <LeafButton
                      type="button"
                      active={playMode === 'multi'}
                      variant={playMode === 'multi' ? 'primary' : 'dark'}
                      size="sm"
                      onClick={() => setPlayMode('multi')}
                      icon={<Users size={16} />}
                      className="w-full text-sm py-2.5"
                    >
                      Мультиплеер
                    </LeafButton>
                  </div>
                )}
              </div>
            </div>

            {/* Multiplayer Submode */}
            {playMode === 'multi' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="block text-base font-bold text-foreground/80 text-center">Тип мультиплеера</label>
                <div className="grid grid-cols-2 gap-2">
                  <LeafButton
                    type="button"
                    active={multiMode === 'offline'}
                    variant={multiMode === 'offline' ? 'primary' : 'dark'}
                    size="sm"
                    onClick={() => setMultiMode('offline')}
                    icon={<Monitor size={16} />}
                    className="w-full text-sm py-2.5"
                  >
                    Оффлайн
                  </LeafButton>
                  <LeafButton
                    type="button"
                    active={multiMode === 'online'}
                    variant={multiMode === 'online' ? 'primary' : 'dark'}
                    size="sm"
                    onClick={() => setMultiMode('online')}
                    icon={<Globe size={16} />}
                    className="w-full text-sm py-2.5"
                  >
                    Онлайн
                  </LeafButton>
                </div>
              </div>
            )}

            {/* Topic Selector & Server Search */}
            {showTopicSelection && (
              <div className="space-y-3">
                {/* Centered Inactive Bubble for Topic Counter */}
                <div className="flex justify-center w-full">
                  <BubbleElement active={false} size="sm" className="pointer-events-none cursor-default font-bold text-xs py-1 px-4 border border-primary/30">
                    Всего тем в базе: {totalTopicsCount}
                  </BubbleElement>
                </div>

                {/* Selected topics displayed ABOVE the container */}
                {selectedTopics.length > 0 && (
                  <div className="space-y-1.5 p-2.5 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground/80 px-1">
                      <span>Выбранные темы ({selectedTopics.length}):</span>
                      <button
                        type="button"
                        onClick={handleResetTopics}
                        className="text-primary hover:underline text-xs flex items-center gap-1 font-bold"
                      >
                        <RotateCcw size={12} />
                        Сбросить
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedTopics.map(t => (
                        <BubbleElement
                          key={t}
                          type="button"
                          active={true}
                          size="sm"
                          onClick={() => handleToggleTopic(t)}
                          icon={<X size={12} />}
                          className="m-0.5"
                        >
                          {t}
                        </BubbleElement>
                      ))}
                    </div>
                  </div>
                )}

                {/* Initial Topic Container: Shows first rows without extra text captions, opens modal on click */}
                <div 
                  onClick={() => setIsTopicModalOpen(true)}
                  className="group relative cursor-pointer rounded-2xl border border-primary/30 bg-background/30 backdrop-blur-md p-3 transition-all hover:border-primary hover:bg-background/40"
                >
                  <div className="max-h-[110px] overflow-hidden">
                    <TopicCloud 
                      topics={dbTopics.length > 0 ? dbTopics : ['Общие знания']}
                      selectedTopics={selectedTopics}
                      onToggle={handleToggleTopic}
                      maxHeightClass="max-h-[105px]"
                      hideHeader={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Difficulty Selection */}
            <div className="space-y-2">
              <label className="block text-base font-bold text-foreground/80 text-center">Сложность игры</label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {DIFFICULTIES.map(d => (
                  <div key={d.id} className="relative group/diff">
                    <LeafButton
                      type="button"
                      active={difficulty === d.id}
                      variant={difficulty === d.id ? 'primary' : 'dark'}
                      onClick={() => setDifficulty(d.id)}
                      size="sm"
                      className="w-full text-sm py-2.5"
                    >
                      {d.name}
                    </LeafButton>

                    {/* Glass Info Tooltip on Hover */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-xl border border-primary/30 bg-background/95 p-2.5 text-center text-xs opacity-0 shadow-xl backdrop-blur-xl transition-all duration-200 group-hover/diff:opacity-100 group-hover/diff:translate-y-0 translate-y-1 z-30">
                      <p className="font-bold text-primary">{d.name} ({d.level})</p>
                      <p className="text-[11px] text-foreground/80 mt-0.5">{d.description}</p>
                      <p className="text-[10px] text-primary/80 font-mono mt-1">Множитель: x{d.multiplier}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Game Action Button */}
            <div className="pt-2">
              <LeafButton
                type="button"
                variant="primary"
                size="lg"
                onClick={handleStartGame}
                className="w-full font-black text-lg py-4"
              >
                {game.id === 'melody' && dbTopics.length === 0 ? 'Скоро' : 'Начать игру'}
              </LeafButton>
            </div>
          </div>
        </div>
      </div>

      {/* Separate Modal Window for Topic Selection with Scrolling & Sticky Close Icon */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl p-3 sm:p-5 animate-in fade-in">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border border-primary/30 bg-background/90 backdrop-blur-2xl shadow-2xl relative overflow-hidden text-foreground">
            
            {/* Sticky Header with Search & Sticky Close Icon following scroll */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-primary/20 p-4 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-primary">Выбор тем для игры</h3>
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(false)}
                  className="rounded-xl p-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary transition-all font-bold"
                  title="Закрыть выбор тем"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative">
                <input 
                  type="text"
                  value={searchTopic}
                  onChange={(e) => setSearchTopic(e.target.value)}
                  placeholder="Поиск темы или введите свою..."
                  className="w-full rounded-2xl border border-primary/30 bg-background/50 backdrop-blur-md p-3 pr-10 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary transition-all shadow-inner"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary">
                  {isSearching ? <Sparkles size={16} className="animate-spin" /> : <Search size={16} />}
                </div>
              </div>
            </div>

            {/* Scrollable Body containing all topics */}
            <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar flex-1">
              {/* Selected topics displayed ABOVE the container in modal */}
              {selectedTopics.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground/80 px-1">
                    <span>Выбранные темы ({selectedTopics.length}):</span>
                    <button
                      type="button"
                      onClick={handleResetTopics}
                      className="text-primary hover:underline text-xs flex items-center gap-1 font-bold"
                    >
                      <RotateCcw size={12} />
                      Сбросить
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                    {selectedTopics.map(t => (
                      <BubbleElement
                        key={t}
                        type="button"
                        active={true}
                        size="sm"
                        onClick={() => handleToggleTopic(t)}
                        icon={<X size={12} />}
                        className="m-0.5"
                      >
                        {t}
                      </BubbleElement>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-foreground/70 font-bold">
                <span>Выберите одну или несколько тем:</span>
              </div>

              <TopicCloud 
                topics={dbTopics.length > 0 ? dbTopics : ['Общие знания']}
                selectedTopics={selectedTopics}
                onToggle={(t) => {
                  handleToggleTopic(t);
                }}
                maxHeightClass="max-h-[45vh]"
                hideHeader={true}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-primary/20 bg-background/80 backdrop-blur-md flex justify-end">
              <LeafButton
                type="button"
                variant="primary"
                size="md"
                onClick={() => setIsTopicModalOpen(false)}
                className="px-6 py-2.5 font-bold text-sm"
              >
                Готово ({selectedTopics.length})
              </LeafButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
