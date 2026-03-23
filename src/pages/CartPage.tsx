import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, Zap, CreditCard, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export const CartPage = () => {
  const { user, profile, updateBalance, purchaseGames } = useAuth();
  const { cart, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [paymentStep, setPaymentStep] = useState<'calculator' | 'processing' | 'success'>('calculator');

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);
  const balanceNeeded = Math.max(0, totalPrice - (profile?.balance || 0));

  const handlePayment = async () => {
    if (!user || !profile) return;
    
    setPaymentStep('processing');
    
    // Simulate bank processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Add the top up amount to balance
      await updateBalance(profile.balance + topUpAmount);
      setPaymentStep('success');
      setTopUpAmount(0);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Ошибка при оплате');
      setPaymentStep('calculator');
    }
  };

  const finalizePurchase = async () => {
    if (!user || !profile) return;
    if (profile.balance < totalPrice) {
      setShowPayment(true);
      setTopUpAmount(balanceNeeded);
      return;
    }

    try {
      const gameIds = cart.map(item => item.id);
      await purchaseGames(gameIds, totalPrice);
      clearCart();
      alert('Покупка успешно завершена!');
      navigate('/games');
    } catch (error) {
      console.error('Finalize purchase error:', error);
      alert('Ошибка при завершении покупки');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter md:text-3xl">Корзина</h1>
          <p className="text-foreground/60">Ваши выбранные игры и наборы</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShoppingCart size={32} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-20 rounded-3xl border-2 border-dashed border-primary/10 bg-card/50 backdrop-blur-md">
              <ShoppingCart size={48} className="mx-auto text-primary/20 mb-4" />
              <p className="text-foreground/40 font-bold uppercase tracking-widest">Корзина пуста</p>
              <button 
                onClick={() => navigate('/games')}
                className="mt-4 text-primary font-bold hover:underline"
              >
                Перейти в магазин
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-4 rounded-2xl border border-primary/10 bg-card p-4 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Zap size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-primary uppercase">{item.title}</h3>
                  <p className="text-xs text-foreground/40 uppercase tracking-widest">Автор: {item.author}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-primary">{item.price} ₽</p>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-foreground/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-primary/20 bg-background/40 p-6 space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-primary">Итого</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/40 uppercase tracking-widest font-bold">Товары ({cart.length})</span>
                <span className="font-bold">{totalPrice} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/40 uppercase tracking-widest font-bold">Ваш баланс</span>
                <span className="font-bold">{profile?.balance || 0} ₽</span>
              </div>
              <div className="h-px bg-primary/10 my-4" />
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold uppercase tracking-widest text-foreground/40">К оплате</span>
                <span className="text-3xl font-black text-primary">{totalPrice} ₽</span>
              </div>
            </div>

            {balanceNeeded > 0 && (
              <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">Недостаточно средств</p>
                <p className="text-xs text-red-500/80">Вам нужно пополнить баланс на {balanceNeeded} ₽</p>
              </div>
            )}

            <button 
              onClick={finalizePurchase}
              disabled={cart.length === 0}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {balanceNeeded > 0 ? 'Пополнить и купить' : 'Оплатить'}
              <ArrowRight size={20} />
            </button>
          </div>

          <button 
            onClick={() => setShowPayment(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-emerald-600 transition-all"
          >
            <CreditCard size={18} />
            Пополнить баланс
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md space-y-6 rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase text-primary">Онлайн Банк</h3>
                <button onClick={() => setShowPayment(false)} className="rounded-full p-2 hover:bg-primary/10">
                  <X size={24} />
                </button>
              </div>

              {paymentStep === 'calculator' && (
                <div className="space-y-6">
                  <div className="rounded-2xl bg-primary/5 p-6 border border-primary/10 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">Курс обмена 1:1</p>
                    <p className="text-3xl font-black text-primary">{topUpAmount} ₽ = {topUpAmount} 🐸</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/40">Сумма пополнения (₽)</label>
                    <input 
                      type="number" 
                      value={topUpAmount || ''}
                      onChange={(e) => setTopUpAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-primary/20 bg-background px-4 py-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <CreditCard className="text-primary" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest">Банковская карта</p>
                        <p className="text-[10px] text-foreground/40">**** **** **** 4422</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handlePayment}
                    className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                  >
                    <Zap size={20} />
                    Оплатить {topUpAmount} ₽
                  </button>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="py-12 text-center space-y-6">
                  <div className="relative mx-auto h-20 w-20">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black uppercase text-primary">Обработка...</h4>
                    <p className="text-sm text-foreground/40">Связываемся с вашим банком</p>
                  </div>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="py-8 text-center space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                    <CheckCircle2 size={48} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black uppercase text-emerald-500">Оплата прошла!</h4>
                    <p className="text-sm text-foreground/40">Ваш баланс успешно пополнен</p>
                  </div>
                  <button 
                    onClick={() => { setShowPayment(false); setPaymentStep('calculator'); }}
                    className="btn-primary w-full py-4"
                  >
                    Вернуться в корзину
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
