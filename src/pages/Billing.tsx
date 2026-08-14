import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, 
  History, 
  ArrowLeft, 
  Plus, 
  MessageCircle,
  Loader2,
  CreditCard,
  RefreshCcw,
  Coins
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db';

export function BillingPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPurchaseHistory();
    }
  }, [user]);

  const fetchPurchaseHistory = async () => {
    setLoading(true);
    
    if (!db || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await db
        .from('purchases')
        .select('*')
        .eq('user_id', profile?.uid ?? "")
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 text-foreground">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-primary/10 text-foreground transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Баланс и Биллинг</h1>
          <p className="text-xs text-muted-foreground">Внутренняя валюта: 1 RR = 0.99 рубля</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Balance Card */}
        <div className="rounded-3xl border border-primary/20 bg-card/90 p-8 relative overflow-hidden shadow-xl backdrop-blur-md">
          <div className="absolute top-0 right-0 p-8 text-primary/10">
            <Wallet size={120} />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Coins size={20} />
              <span className="text-xs uppercase tracking-widest font-black">Текущий баланс</span>
            </div>
            <h2 className="text-5xl font-black text-foreground">{profile.balance_rr ?? profile.balance} <span className="text-primary text-3xl font-bold">RR</span></h2>
            <p className="text-xs text-muted-foreground">Эквивалент: {((profile.balance_rr ?? profile.balance) * 0.99).toFixed(2)} ₽</p>
            
            <div className="pt-4 flex gap-3">
              <Link 
                to="/shop" 
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl btn-primary py-3.5 text-xs font-bold uppercase tracking-wider shadow-md hover:scale-105 transition-transform"
              >
                <Plus size={18} />
                Пополнить
              </Link>
              <a 
                href="https://t.me/shishkarnem" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                <RefreshCcw size={18} />
                Поддержка
              </a>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-3xl border border-primary/20 bg-card/80 p-8 flex flex-col justify-center backdrop-blur-md shadow-lg space-y-3">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-primary/15 text-primary">
              <MessageCircle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg text-foreground">Информация о валюте RR</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                Валюта RR используется для оплаты викторин, покупки премиум пакетов и кастомизации. Курс конвертации при пополнении: <strong>1 RR = 0.99 рубля</strong>.
              </p>
              <a 
                href="https://t.me/qaiz_aibot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
              >
                Бот в Telegram →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <History size={20} className="text-primary" />
          <h3 className="text-xl font-bold">История транзакций</h3>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-card/90 overflow-hidden shadow-xl backdrop-blur-md">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-xs text-muted-foreground">Загрузка истории...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="divide-y divide-primary/10">
              {history.map((item) => (
                <div key={item.id} className="p-5 flex items-center justify-between hover:bg-primary/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{item.item_name || 'Покупка пака'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-primary">-{item.price || item.amount || 0} RR</p>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Выполнено</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <History size={48} className="text-primary/30" />
              <p className="mt-3 text-sm">История покупок пуста</p>
              <Link to="/shop" className="mt-3 text-xs font-bold text-primary hover:underline">
                Перейти в магазин
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
