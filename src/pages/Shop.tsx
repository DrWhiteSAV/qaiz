import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ShoppingCart, Zap, Star, Trophy, Music, Users, HelpCircle, Gamepad2, X, CheckCircle2, Plus, CreditCard } from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'free' | 'paid' | 'purchased' | 'played'>('all');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterParam = params.get('filter');
    if (filterParam === 'free' || filterParam === 'paid') {
      setFilter(filterParam);
    }
  }, [location]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [purchasedItem, setPurchasedItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(0);

  const filteredItems = SHOP_ITEMS.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filter === 'free') matchesFilter = item.price === 0;
    else if (filter === 'paid') matchesFilter = item.price > 0;
    else if (filter === 'purchased') matchesFilter = profile?.purchasedGames?.includes(item.id) || item.price === 0;
    else if (filter === 'played') matchesFilter = item.isPassed || profile?.playedGames?.includes(item.id);

    return matchesSearch && matchesFilter;
  });

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
    <div className="space-y-8 pb-20 px-4 md:px-0">
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

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 group-focus-within:text-primary transition-colors" size={18} />
        <input
          type="text"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border-glow bg-background/50 backdrop-blur-md py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-lg"
        />
      </div>

      <div className="grid gap-4 grid-cols-3 lg:grid-cols-10">
        {filteredItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -4 }}
            onClick={() => setSelectedItem(item)}
            className="group relative overflow-hidden rounded-2xl border-glow bg-background/40 p-3 transition-all hover:bg-primary/[0.02] cursor-pointer shadow-lg"
          >
            {item.isPassed && (
              <div className="absolute right-2 top-2 text-primary drop-shadow-glow">
                <CheckCircle2 size={16} strokeWidth={3} />
              </div>
            )}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex -space-x-2">
                {item.games.map((g, i) => (
                  <div key={i} className="flex h-6 w-6 items-center justify-center rounded-lg border border-background bg-primary/10 text-primary shadow-sm backdrop-blur-md">
                    {g === 'melody' && <Music size={10} />}
                    {g === 'blitz' && <Zap size={10} />}
                    {g === 'jeopardy' && <Star size={10} />}
                    {g === 'millionaire' && <Trophy size={10} />}
                    {g === '100to1' && <Users size={10} />}
                    {g === 'whatwherewhen' && <HelpCircle size={10} />}
                    {g === 'iqbox' && <Gamepad2 size={10} />}
                  </div>
                ))}
              </div>
            </div>

            <h3 className="mb-2 text-xs font-black uppercase tracking-tighter title-glow leading-tight line-clamp-2">{item.title}</h3>
            
            <div className="mb-3 grid grid-cols-1 gap-1">
              <div className="rounded-lg bg-primary/5 p-1.5 border border-primary/10">
                <p className="text-[6px] font-black uppercase tracking-widest text-foreground/30">Цена</p>
                <p className="text-[8px] font-black text-primary uppercase">{item.price === 0 ? 'FREE' : `${item.price} ₽`}</p>
              </div>
            </div>

            <div className="flex items-center justify-center">
              {profile?.purchasedGames?.includes(item.id) || item.price === 0 ? (
                <div className="text-[8px] font-black text-white uppercase drop-shadow-sm">Куплено</div>
              ) : (
                <div className="text-[8px] font-black text-primary uppercase">В магазин</div>
              )}
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
              <h3 className="text-2xl font-black uppercase text-white drop-shadow-sm">{selectedItem.title}</h3>
              <button onClick={() => setSelectedItem(null)} className="rounded-full p-2 hover:bg-white/10 text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/10 p-4 border border-white/20">
                <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-1">Формат игры</p>
                <p className="text-sm text-white/90">{selectedItem.format}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Описание</p>
                <p className="text-sm text-white/70 leading-relaxed">{selectedItem.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Игры в наборе:</p>
                <div className="flex gap-1">
                  {selectedItem.games.map((g: string) => (
                    <span key={g} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white uppercase">{g}</span>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => { handleAddToCart(selectedItem); setSelectedItem(null); }}
              className="btn-primary w-full py-4"
            >
              Добавить в корзину за {selectedItem.price === 0 ? 'FREE' : `${selectedItem.price} ₽`}
            </button>
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
