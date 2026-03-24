import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Zap, Coins, Info, CheckCircle2 } from 'lucide-react';

interface GameSubmissionModalProps {
  gameType: string;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; costPerQuestion: number; isFree: boolean; isAI: boolean }) => void;
}

export function GameSubmissionModal({ gameType, onClose, onSubmit }: GameSubmissionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [costPerQuestion, setCostPerQuestion] = useState<number>(1);
  const [isFree, setIsFree] = useState(false);

  const canBeFree = gameType === 'Квиллионер' || gameType === '100 квадному';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If it's Millionaire or 100to1, it's always free (auto-added)
    const finalIsFree = canBeFree ? true : isFree;
    const finalCost = finalIsFree ? 0 : Math.max(1, Math.floor(costPerQuestion));

    onSubmit({
      title: title || `Пак от игрока (${gameType})`,
      description: description || `Увлекательная игра в формате ${gameType}`,
      costPerQuestion: finalCost,
      isFree: finalIsFree,
      isAI: true
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md space-y-6 rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        
        <div className="flex items-center justify-between relative z-10">
          <h3 className="text-2xl font-black uppercase text-white drop-shadow-sm">Опубликовать игру?</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 text-white">
            <X size={24} />
          </button>
        </div>

        <p className="text-sm text-foreground/60 relative z-10">
          {canBeFree 
            ? `Вы прошли игру! Этот набор вопросов будет автоматически добавлен в магазин как бесплатный.`
            : `Вы прошли игру! Хотите добавить этот набор вопросов в магазин и стать его автором?`
          }
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Название пака</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Моя супер викторина"
              className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Описание</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="О чем эта игра?"
              className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
            />
          </div>

          {!canBeFree && (
            <div className="space-y-4 rounded-2xl bg-primary/5 p-4 border border-primary/10">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Стоимость за вопрос</label>
                <button 
                  type="button"
                  onClick={() => setIsFree(!isFree)}
                  className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all ${
                    isFree ? 'bg-primary text-background' : 'bg-white/5 text-white/40'
                  }`}
                >
                  Бесплатно
                </button>
              </div>

              {!isFree && (
                <div className="space-y-2">
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1"
                      step="1"
                      value={costPerQuestion}
                      onChange={(e) => setCostPerQuestion(Number(e.target.value))}
                      className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-primary">₽</span>
                  </div>
                  <p className="text-[9px] text-foreground/40 italic">
                    * Минимальная стоимость — 1 ₽. Только целые числа.
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-white/5 p-3">
                <Info size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-white/60">
                  Вы будете получать <span className="text-primary font-bold">50% от каждой покупки</span> этого пака на свой баланс. Вывод доступен от 2000 ₽.
                </p>
              </div>
            </div>
          )}

          {canBeFree && (
            <div className="flex items-start gap-2 rounded-xl bg-primary/10 p-4 border border-primary/20">
              <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-primary/80">
                Этот тип игры (Квиллионер / 100 к 1) автоматически публикуется бесплатно для всех пользователей.
              </p>
            </div>
          )}

          <button 
            type="submit"
            className="btn-primary w-full py-4 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            Опубликовать в магазине
          </button>
        </form>
      </motion.div>
    </div>
  );
}
