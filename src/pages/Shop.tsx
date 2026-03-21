import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, ShoppingCart, Zap, Star, Trophy, Music, Users, HelpCircle, Gamepad2, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSupabase } from '../supabase';

const SHOP_ITEMS = [
  { id: 'pack1', title: 'Пак: Кино и Музыка', author: 'Ivanov', price: 15, games: ['melody', 'blitz'], description: 'Лучшие вопросы про кино и музыку от нашего топового автора.', format: 'Викторина с аудио и текстовым вводом', isPassed: true },
  { id: 'pack2', title: 'Хардкор Интеллект', author: 'Petrov', price: 25, games: ['jeopardy', 'whatwherewhen'], description: 'Для тех, кто не боится сложных вопросов.', format: 'Сложные логические вопросы и казино-ставки', isPassed: false },
  { id: 'pack3', title: 'Вечеринка', author: 'Sidorov', price: 0, games: ['100to1', 'iqbox'], description: 'Бесплатный пак для веселой компании.', format: 'Командное соревнование и интуиция', isPassed: false },
  { id: 'pack4', title: 'Миллионер Плюс', author: 'Ivanov', price: 10, games: ['millionaire'], description: 'Расширенная версия классики.', format: 'Классическая лестница вопросов с подсказками', isPassed: true },
];

export const ShopPage = () => {
  const { user, profile, updateBalance } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [showSuccess, setShowSuccess] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const filteredItems = SHOP_ITEMS.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'free' ? item.price === 0 : item.price > 0);
    return matchesSearch && matchesFilter;
  });

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

  return (
    <div className="space-y-8 pb-20 px-4 md:px-0">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-primary md:text-6xl">Магазин Игр</h1>
          <p className="text-foreground/60">Авторские паки и эксклюзивные наборы вопросов</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {(['all', 'free', 'paid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                filter === f ? 'bg-primary text-background' : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'free' ? 'Бесплатные' : 'Платные'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={20} />
        <input
          type="text"
          placeholder="Поиск по названию или автору..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-primary/10 bg-primary/5 py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedItem(item)}
            className="group relative overflow-hidden rounded-3xl border border-primary/10 bg-primary/5 p-6 transition-all hover:border-primary/30 hover:bg-primary/10 cursor-pointer"
          >
            {item.isPassed && (
              <div className="absolute right-4 top-4 text-emerald-500">
                <CheckCircle2 size={24} />
              </div>
            )}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex -space-x-2">
                {item.games.map((g, i) => (
                  <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/20 text-primary">
                    {g === 'melody' && <Music size={14} />}
                    {g === 'blitz' && <Zap size={14} />}
                    {g === 'jeopardy' && <Star size={14} />}
                    {g === 'millionaire' && <Trophy size={14} />}
                    {g === '100to1' && <Users size={14} />}
                    {g === 'whatwherewhen' && <HelpCircle size={14} />}
                    {g === 'iqbox' && <Gamepad2 size={14} />}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Автор: {item.author}</span>
            </div>

            <h3 className="mb-2 text-xl font-black uppercase tracking-tight text-primary">{item.title}</h3>
            <p className="mb-6 text-sm text-foreground/60 leading-relaxed">{item.description}</p>

            <div className="flex items-center justify-between">
              <div className="text-2xl font-black text-primary">
                {item.price === 0 ? 'FREE' : `${item.price} ₽`}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handlePurchase(item); }}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-background transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              >
                <ShoppingCart size={16} />
                Купить
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md space-y-6 rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black uppercase text-primary">{selectedItem.title}</h3>
              <button onClick={() => setSelectedItem(null)} className="rounded-full p-2 hover:bg-primary/10">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Формат игры</p>
                <p className="text-sm text-foreground/80">{selectedItem.format}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-foreground/40">Описание</p>
                <p className="text-sm text-foreground/60 leading-relaxed">{selectedItem.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-foreground/40">Игры в наборе:</p>
                <div className="flex gap-1">
                  {selectedItem.games.map((g: string) => (
                    <span key={g} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">{g}</span>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => { handlePurchase(selectedItem); setSelectedItem(null); }}
              className="btn-primary w-full py-4"
            >
              Купить за {selectedItem.price === 0 ? 'FREE' : `${selectedItem.price} ₽`}
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
            <h3 className="text-2xl font-black uppercase text-primary">Успешно!</h3>
            <p className="text-sm text-foreground/60">Пак "{purchasedItem}" теперь доступен в вашей библиотеке.</p>
            <button onClick={() => setShowSuccess(false)} className="btn-primary w-full py-4">Отлично</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
