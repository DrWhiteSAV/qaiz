import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ShoppingCart, Zap, Star, Trophy, Music, Users, HelpCircle, Gamepad2, X, CheckCircle2, Plus, CreditCard, PackageCheck, Tag, User, Hash, Coins, Bot, Filter, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getSupabase } from '../supabase';

import { SHOP_ITEMS } from '../constants';

export const ShopPage = () => {
  const { user, profile, updateBalance } = useAuth();
  const { addToCart, isInCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    types: [] as string[],
    difficulties: [] as string[],
    sources: [] as string[],
    pricing: [] as string[],
    minPrice: 0,
    maxPrice: 10
  });
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popularity'>('newest');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid' | 'purchased' | 'played'>('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterParam = params.get('filter');
    const modeParam = params.get('mode');

    if (filterParam && ['all', 'free', 'paid', 'purchased', 'played'].includes(filterParam)) {
      setFilter(filterParam as any);
    }

    if (modeParam === 'human') {
      setFilters(prev => ({ ...prev, sources: ['author'] }));
      setShowFilters(true);
    } else if (modeParam === 'ai') {
      setFilters(prev => ({ ...prev, sources: ['ai'] }));
      setShowFilters(true);
    }
  }, [location.search]);

  const gameTypes = Array.from(new Set(SHOP_ITEMS.map(item => item.type)));
  const difficultyLevels = ['dummy', 'people', 'genius', 'god'];

  const filteredItems = React.useMemo(() => {
    let items = SHOP_ITEMS.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filters.types.length === 0 || filters.types.includes(item.type);
      const matchesDifficulty = filters.difficulties.length === 0 || filters.difficulties.includes(item.difficulty);
      const matchesSource = filters.sources.length === 0 || 
                            (filters.sources.includes('ai') && item.isAI) || 
                            (filters.sources.includes('author') && !item.isAI);
      const matchesPricing = filters.pricing.length === 0 || 
                             (filters.pricing.includes('free') && item.price === 0) || 
                             (filters.pricing.includes('paid') && item.price > 0);
      const matchesPriceRange = item.costPerQuestion >= filters.minPrice && item.costPerQuestion <= filters.maxPrice;

      // Tab filter
      const matchesTab = filter === 'all' || 
                         (filter === 'free' && item.price === 0) || 
                         (filter === 'paid' && item.price > 0) || 
                         (filter === 'purchased' && profile?.purchasedGames?.includes(item.id)) || 
                         (filter === 'played' && profile?.playedGames?.includes(item.id));

      return matchesSearch && matchesType && matchesDifficulty && matchesSource && matchesPricing && matchesPriceRange && matchesTab;
    });

    // Sorting
    return items.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'popularity') return (b.purchasesCount || 0) - (a.purchasesCount || 0);
      return 0; // newest is default (order in array)
    });
  }, [searchQuery, filters, sortBy, filter, profile]);

  const toggleFilter = (category: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const current = prev[category] as string[];
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter(v => v !== value) };
      }
      return { ...prev, [category]: [...current, value] };
    });
  };

  const handleAddToCart = (item: any) => {
    if (isInCart(item.id)) {
      alert('Этот товар уже в корзине');
      return;
    }
    addToCart(item);
    setPurchasedItem(item.title);
    setShowSuccess(true);
  };

  const handlePurchase = async (item: any) => {
    if (!user || !profile) return alert('Пожалуйста, войдите в систему');
    if (profile.balance < item.price) return alert('Недостаточно средств');
    
    try {
      await updateBalance(profile.balance - item.price);
      
      // Save purchase to Supabase
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('purchases')
          .insert({
            user_id: user.uid,
            item_id: item.id,
            price_paid: item.price,
            purchased_at: new Date().toISOString()
          });
        if (error) console.error('Supabase purchase record error:', error);
      }

      setPurchasedItem(item.title);
      setShowSuccess(true);
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Ошибка при покупке');
    }
  };

  const handleTopUp = async () => {
    if (!user || !profile) return alert('Пожалуйста, войдите в систему');
    if (topUpAmount <= 0) return alert('Введите корректную сумму');
    
    try {
      await updateBalance(profile.balance + topUpAmount);
      alert(`Баланс успешно пополнен на ${topUpAmount} ₽!`);
      setShowTopUp(false);
      setTopUpAmount(0);
    } catch (error) {
      console.error('Top up error:', error);
      alert('Ошибка при пополнении баланса');
    }
  };

  return (
    <div className="space-y-8 pb-20 px-[3%] md:px-0">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between py-10">
        <div className="relative">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/20 blur-[60px] rounded-full" />
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white md:text-4xl title-glow leading-none drop-shadow-sm">Магазин Игр</h1>
          <p className="text-lg text-white/80 font-medium mt-4 max-w-md drop-shadow-sm">Авторские паки и эксклюзивные наборы вопросов от лучших мастеров квиза.</p>
        </div>
        
        <div className="flex flex-col gap-4 items-end relative z-10">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-background/50 backdrop-blur-md border border-primary/10 p-2 shadow-sm">
            {(['all', 'free', 'paid', 'purchased', 'played'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-primary text-background shadow-lg' : 'text-foreground/40 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {f === 'all' ? 'Все' : f === 'free' ? 'Бесплатные' : f === 'paid' ? 'Платные' : f === 'purchased' ? 'Купленные' : 'Пройденные'}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setShowTopUp(true)}
            className="btn-primary flex items-center gap-3 px-8 py-4 text-sm font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform"
          >
            <Plus size={20} strokeWidth={3} />
            Пополнить баланс
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-center py-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Поиск игр или авторов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border-glow bg-background/50 backdrop-blur-md py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-lg"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border ${
              showFilters ? 'bg-primary text-background border-primary' : 'bg-background/50 text-foreground/60 border-primary/10 hover:border-primary/30'
            }`}
          >
            <Filter size={18} />
            Фильтры
            {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== 0 && v !== 10) && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] text-primary">
                !
              </span>
            )}
          </button>

          <div className="relative group/sort">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-background/50 border border-primary/10 rounded-2xl px-6 py-4 pr-12 text-xs font-black uppercase tracking-widest text-foreground/60 focus:outline-none focus:border-primary/30 cursor-pointer"
            >
              <option value="newest">Новинки</option>
              <option value="price_asc">Цена: По возрастанию</option>
              <option value="price_desc">Цена: По убыванию</option>
              <option value="popularity">Популярные</option>
            </select>
            <ArrowUpDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none" />
          </div>
        </div>
      </div>

      {showFilters && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 rounded-3xl bg-primary/5 border border-primary/10 mb-8">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Тип игры</p>
              <div className="flex flex-wrap gap-2">
                {gameTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleFilter('types', type)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                      filters.types.includes(type) ? 'bg-primary text-background border-primary' : 'bg-background/40 text-foreground/60 border-primary/10 hover:border-primary/30'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Сложность</p>
              <div className="flex flex-wrap gap-2">
                {difficultyLevels.map(diff => (
                  <button
                    key={diff}
                    onClick={() => toggleFilter('difficulties', diff)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                      filters.difficulties.includes(diff) ? 'bg-primary text-background border-primary' : 'bg-background/40 text-foreground/60 border-primary/10 hover:border-primary/30'
                    }`}
                  >
                    {diff === 'dummy' ? 'ИИкра' : diff === 'people' ? 'Головастик' : diff === 'genius' ? 'Квант' : 'Ляга-омега'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Источник & Цена</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleFilter('sources', 'author')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                    filters.sources.includes('author') ? 'bg-primary text-background border-primary' : 'bg-background/40 text-foreground/60 border-primary/10 hover:border-primary/30'
                  }`}
                >
                  Авторские
                </button>
                <button
                  onClick={() => toggleFilter('sources', 'ai')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                    filters.sources.includes('ai') ? 'bg-primary text-background border-primary' : 'bg-background/40 text-foreground/60 border-primary/10 hover:border-primary/30'
                  }`}
                >
                  ИИ-Генерация
                </button>
                <button
                  onClick={() => toggleFilter('pricing', 'free')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                    filters.pricing.includes('free') ? 'bg-primary text-background border-primary' : 'bg-background/40 text-foreground/60 border-primary/10 hover:border-primary/30'
                  }`}
                >
                  Бесплатные
                </button>
                <button
                  onClick={() => toggleFilter('pricing', 'paid')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                    filters.pricing.includes('paid') ? 'bg-primary text-background border-primary' : 'bg-background/40 text-foreground/60 border-primary/10 hover:border-primary/30'
                  }`}
                >
                  Платные
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Цена за вопрос: {filters.minPrice} - {filters.maxPrice} ₽</p>
              <div className="px-2">
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <button 
                onClick={() => setFilters({ types: [], difficulties: [], sources: [], pricing: [], minPrice: 0, maxPrice: 10 })}
                className="text-[10px] font-bold text-primary/60 hover:text-primary underline underline-offset-4"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid gap-[5%] md:gap-6 grid-cols-2 lg:grid-cols-6">
        {filteredItems.map((item) => {
          const isPurchased = profile?.purchasedGames?.includes(item.id) || item.price === 0;
          const inCart = isInCart(item.id);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => setSelectedItem(item)}
              className="group relative flex flex-col overflow-hidden rounded-3xl border-glow bg-background/40 p-2.5 md:p-5 transition-all hover:bg-primary/[0.04] cursor-pointer shadow-2xl min-h-[160px] md:min-h-[320px]"
            >
              {/* Top Section */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-wrap gap-2">
                  {/* Source Icon */}
                  <div className="flex items-center gap-1 rounded-full bg-white/5 px-1 md:px-2 py-0.5 md:py-1 text-[5px] md:text-[8px] font-bold text-white/40 border border-white/10">
                    {item.isAI ? <Bot className="w-2 h-2 md:w-3 md:h-3" /> : <User className="w-2 h-2 md:w-3 md:h-3" />}
                    <span>{item.isAI ? 'ИИ' : 'Автор'}</span>
                  </div>

                  {item.isPassed && (
                    <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-1 md:px-2 py-0.5 md:py-1 text-[5px] md:text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="w-[6px] h-[6px] md:w-3 md:h-3" strokeWidth={3} />
                      <span>{item.completedQuestions}</span>
                    </div>
                  )}
                  {isPurchased ? (
                    <div className="flex items-center gap-1 rounded-full bg-primary/20 px-1 md:px-2 py-0.5 md:py-1 text-[5px] md:text-[10px] font-bold text-primary border border-primary/20">
                      <PackageCheck className="w-[6px] h-[6px] md:w-3 md:h-3" strokeWidth={3} />
                      <span>Куплено</span>
                    </div>
                  ) : inCart ? (
                    <div className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-1 md:px-2 py-0.5 md:py-1 text-[5px] md:text-[10px] font-bold text-yellow-500 border border-yellow-500/20">
                      <ShoppingCart className="w-[6px] h-[6px] md:w-3 md:h-3" strokeWidth={3} />
                      <span>В корзине</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 rounded-full bg-white/10 px-1 md:px-2 py-0.5 md:py-1 text-[5px] md:text-[10px] font-bold text-white/60 border border-white/10">
                      <ShoppingCart className="w-[6px] h-[6px] md:w-3 md:h-3" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-1 md:px-2 py-0.5 md:py-1 text-[5px] md:text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                    <Tag className="w-[5px] h-[5px] md:w-2.5 md:h-2.5" />
                    <span>{item.type}</span>
                  </div>
                  <div className={`text-[4px] md:text-[8px] font-black uppercase tracking-widest px-1 md:px-2 py-0.5 rounded-md border ${
                    item.difficulty === 'dummy' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' :
                    item.difficulty === 'people' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' :
                    item.difficulty === 'genius' ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' :
                    'text-purple-500 border-purple-500/20 bg-purple-500/5'
                  }`}>
                    {item.difficulty === 'dummy' ? 'ИИкра' : item.difficulty === 'people' ? 'Головастик' : item.difficulty === 'genius' ? 'Квант' : 'Ляга-омега'}
                  </div>
                </div>
              </div>

              {/* Body Section */}
              <div className="flex-1 space-y-1.5 md:space-y-3">
                <h3 className="text-[9px] md:text-lg font-black uppercase tracking-tighter title-glow leading-tight line-clamp-2">{item.title}</h3>
                <p className="text-[6px] md:text-xs text-foreground/60 line-clamp-3 leading-relaxed font-medium">{item.description}</p>
                
                <div className="space-y-1 md:space-y-2 pt-1 md:pt-2">
                  <div className="flex items-center gap-1 md:gap-2 text-[5px] md:text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                    <User className="w-[6px] h-[6px] md:w-3 md:h-3 text-primary" />
                    <span>Автор: {item.author}</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 text-[5px] md:text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                    <ShoppingCart className="w-[6px] h-[6px] md:w-3 md:h-3 text-primary" />
                    <span>Покупок: {item.purchasesCount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="mt-3 md:mt-6 grid grid-cols-2 gap-1.5 md:gap-3 border-t border-white/5 pt-2 md:pt-4">
                <div className="space-y-0.5 md:space-y-1">
                  <div className="flex items-center gap-0.5 md:gap-1 text-[4px] md:text-[8px] font-black uppercase tracking-widest text-foreground/30">
                    <Coins className="w-[5px] h-[5px] md:w-2.5 md:h-2.5" />
                    <span>За вопрос</span>
                  </div>
                  <p className="text-[7px] md:text-sm font-black text-primary">{item.costPerQuestion} ₽</p>
                </div>
                <div className="space-y-0.5 md:space-y-1 text-right">
                  <div className="flex items-center justify-end gap-0.5 md:gap-1 text-[4px] md:text-[8px] font-black uppercase tracking-widest text-foreground/30">
                    <Hash className="w-[5px] h-[5px] md:w-2.5 md:h-2.5" />
                    <span>Вопросов</span>
                  </div>
                  <p className="text-[7px] md:text-sm font-black text-white">{item.totalQuestions}</p>
                </div>
              </div>

              {/* Hover Overlay Button */}
              <div className="absolute inset-x-0 bottom-0 translate-y-full bg-primary py-1.5 md:py-3 text-center transition-transform group-hover:translate-y-0">
                <span className="text-[5px] md:text-[10px] font-black uppercase tracking-[0.2em] text-background">Подробнее</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md space-y-6 rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase text-white drop-shadow-sm leading-none">{selectedItem.title}</h3>
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                  <Tag size={10} />
                  <span>{selectedItem.type}</span>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="rounded-full p-2 hover:bg-white/10 text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Формат игры</p>
                    <p className="text-sm text-white/90 font-medium">{selectedItem.format}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Сложность</p>
                    <p className={`text-sm font-black uppercase tracking-tighter ${
                      selectedItem.difficulty === 'dummy' ? 'text-emerald-500' :
                      selectedItem.difficulty === 'people' ? 'text-yellow-500' :
                      selectedItem.difficulty === 'genius' ? 'text-rose-500' :
                      'text-purple-500'
                    }`}>
                      {selectedItem.difficulty === 'dummy' ? 'ИИкра' : selectedItem.difficulty === 'people' ? 'Головастик' : selectedItem.difficulty === 'genius' ? 'Квант' : 'Ляга-омега'}
                    </p>
                  </div>
                </div>
                <div className="h-px bg-white/5 w-full" />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Источник</p>
                    <div className="flex items-center gap-2 text-sm text-white/90 font-medium">
                      {selectedItem.isAI ? <Bot size={14} className="text-primary" /> : <User size={14} className="text-primary" />}
                      <span>{selectedItem.isAI ? 'ИИ-Генерация' : 'Авторский контент'}</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-white/5 w-full" />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Описание</p>
                  <p className="text-sm text-white/70 leading-relaxed italic">"{selectedItem.description}"</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                    <User size={12} className="text-primary" />
                    <span>Автор</span>
                  </div>
                  <p className="text-sm font-bold text-white">{selectedItem.author}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                    <ShoppingCart size={12} className="text-primary" />
                    <span>Покупок</span>
                  </div>
                  <p className="text-sm font-bold text-white">{selectedItem.purchasesCount?.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                    <Coins size={12} className="text-primary" />
                    <span>За вопрос</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{selectedItem.costPerQuestion} ₽</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                    <Hash size={12} className="text-primary" />
                    <span>Вопросов</span>
                  </div>
                  <p className="text-sm font-bold text-white">{selectedItem.totalQuestions}</p>
                </div>
              </div>

              {selectedItem.isPassed && (
                <div className="rounded-xl bg-emerald-500/10 p-3 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                    <CheckCircle2 size={12} />
                    <span>Пройдено</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-500">{selectedItem.completedQuestions} / {selectedItem.totalQuestions}</p>
                </div>
              )}
            </div>

            {profile?.purchasedGames?.includes(selectedItem.id) || selectedItem.price === 0 ? (
              <button 
                onClick={() => {
                  // Logic to start game
                  navigate(`/game/${selectedItem.games[0]}`, { 
                    state: { 
                      ...selectedItem,
                      isPurchased: true,
                      packId: selectedItem.id,
                      price: 0 // No entry fee for purchased/free games
                    } 
                  });
                  setSelectedItem(null);
                }}
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
              >
                <Zap size={20} className="group-hover:animate-pulse" />
                <span>{selectedItem.isPassed ? 'Пройти снова' : 'Играть сейчас'}</span>
              </button>
            ) : (
              <button 
                onClick={() => { handleAddToCart(selectedItem); setSelectedItem(null); }}
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 group"
              >
                <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
                <span>Добавить в корзину за {selectedItem.totalQuestions * selectedItem.costPerQuestion} ₽</span>
              </button>
            )}
          </motion.div>
        </div>
      )}

      {showTopUp && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md space-y-6 rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black uppercase text-primary">Пополнение баланса</h3>
              <button onClick={() => setShowTopUp(false)} className="rounded-full p-2 hover:bg-primary/10">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Сумма пополнения (₽)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={topUpAmount || ''}
                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                    placeholder="Введите сумму..."
                    className="w-full rounded-xl border border-primary/20 bg-background px-4 py-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-bold">
                    ₽
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 text-center">Выберите способ оплаты</p>
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex flex-col items-center gap-2 rounded-2xl border-2 border-primary bg-primary/5 p-4 transition-all hover:bg-primary/10">
                    <CreditCard size={24} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Онлайн Банк</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 rounded-2xl border border-primary/10 bg-background p-4 opacity-50 cursor-not-allowed">
                    <Users size={24} className="text-foreground/40" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">СБП (Скоро)</span>
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleTopUp}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2"
            >
              <Zap size={20} />
              Оплатить {topUpAmount} ₽
            </button>
          </motion.div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm space-y-6 rounded-3xl border border-primary/20 bg-background p-8 text-center shadow-2xl"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <Zap size={40} />
            </div>
            <h3 className="text-2xl font-black uppercase text-primary">Добавлено!</h3>
            <p className="text-sm text-foreground/60">Пак "{purchasedItem}" добавлен в вашу корзину.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowSuccess(false)} className="flex-1 rounded-2xl border border-primary/20 py-4 font-bold uppercase tracking-widest text-foreground/60 hover:bg-primary/5">Продолжить</button>
              <button onClick={() => navigate('/cart')} className="flex-1 btn-primary py-4">В корзину</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
