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
  RefreshCcw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabase } from '../supabase';

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
    const supabase = getSupabase();
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.uid)
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white drop-shadow-sm">Биллинг</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Balance Card */}
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold uppercase tracking-widest text-white/80">Текущий баланс</p>
            <h2 className="mt-2 text-5xl font-black text-white drop-shadow-md">{profile.balance} ₽</h2>
            <div className="mt-8 flex gap-3">
              <Link 
                to="/games" 
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-background hover:scale-105 transition-transform shadow-lg"
              >
                <Plus size={20} />
                Пополнить
              </Link>
              <a 
                href="https://t.me/shishkarnem" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-background px-6 py-4 font-bold text-primary hover:bg-primary/5 transition-colors"
              >
                <RefreshCcw size={20} />
                Возврат
              </a>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-3xl border border-primary/20 bg-background p-8 flex flex-col justify-center">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
              <MessageCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Нужна помощь?</h3>
              <p className="mt-1 text-sm text-foreground/60">
                Если у вас возникли проблемы с оплатой или вы хотите запросить возврат средств, напишите нам в Telegram.
              </p>
              <a 
                href="https://t.me/shishkarnem" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
              >
                Связаться с поддержкой →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History size={20} className="text-white" />
          <h3 className="text-xl font-bold text-white">История покупок</h3>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-background overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-sm text-foreground/60">Загрузка истории...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="divide-y divide-primary/10">
              {history.map((item) => (
                <div key={item.id} className="p-6 flex items-center justify-between hover:bg-primary/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="font-bold">{item.item_name || 'Пополнение баланса'}</p>
                      <p className="text-xs text-foreground/60">
                        {new Date(item.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-primary">+{item.amount} ₽</p>
                    <p className="text-[10px] uppercase tracking-widest text-foreground/40">Успешно</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
              <History size={48} />
              <p className="mt-4">История покупок пуста</p>
              <Link to="/games" className="mt-4 text-sm font-bold text-primary hover:underline">
                Сделать первую покупку
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
