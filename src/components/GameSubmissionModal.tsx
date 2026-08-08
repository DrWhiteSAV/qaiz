import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Info, CheckCircle2, UserPlus } from 'lucide-react';

interface GameSubmissionModalProps {
  gameType: string;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; costPerQuestion: number; isFree: boolean; isAI: boolean }) => void;
  userRole?: string;
}

export function GameSubmissionModal({ gameType, onClose, onSubmit, userRole = 'player' }: GameSubmissionModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [costPerQuestion, setCostPerQuestion] = useState<number>(1);
  const [isFree, setIsFree] = useState(true);

  const isAuthor = userRole === 'author' || userRole === 'admin' || userRole === 'superadmin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCost = isFree ? 0 : Math.max(1, Math.floor(costPerQuestion));

    onSubmit({
      title: title || `Пак от игрока (${gameType})`,
      description: description || `Увлекательная игра в формате ${gameType}`,
      costPerQuestion: finalCost,
      isFree,
      isAI: true
    });
  };

  // Non-author: show suggestion to become author
  if (!isAuthor) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md space-y-6 rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-2xl font-black uppercase text-foreground">Игра завершена!</h3>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-primary/10 text-foreground/60">
              <X size={24} />
            </button>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <UserPlus size={24} className="text-primary" />
                <h4 className="text-lg font-bold text-primary">Станьте автором!</h4>
              </div>
              <p className="text-sm text-foreground/60 leading-relaxed">
                Создавайте свои вопросы и зарабатывайте на каждой покупке. 
                Авторы получают <span className="text-primary font-bold">50% от стоимости</span> каждой проданной игры.
              </p>
              <p className="text-xs text-foreground/40">
                Перейдите в профиль и нажмите «Подать заявку» — ИИ проверит вашу активность за 10 секунд.
              </p>
            </div>

            <button 
              onClick={onClose}
              className="btn-primary w-full py-4"
            >
              Понятно
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md space-y-6 rounded-3xl border border-primary/20 bg-background p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        
        <div className="flex items-center justify-between relative z-10">
          <h3 className="text-2xl font-black uppercase text-foreground">Опубликовать игру?</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-primary/10 text-foreground/60">
            <X size={24} />
          </button>
        </div>

        <p className="text-sm text-foreground/60 relative z-10">
          Добавьте этот набор вопросов в магазин — бесплатно или за деньги.
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

          <div className="space-y-4 rounded-2xl bg-primary/5 p-4 border border-primary/10">
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary flex-1">Стоимость за вопрос</label>
              <button 
                type="button"
                onClick={() => setIsFree(true)}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all ${
                  isFree ? 'bg-primary text-background' : 'bg-primary/10 text-primary/60'
                }`}
              >
                Бесплатно
              </button>
              <button 
                type="button"
                onClick={() => setIsFree(false)}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full transition-all ${
                  !isFree ? 'bg-primary text-background' : 'bg-primary/10 text-primary/60'
                }`}
              >
                Платно
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
                  * Минимум 1 ₽. Только целые числа.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3">
              <Info size={14} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-foreground/60">
                Вы будете получать <span className="text-primary font-bold">50% от каждой покупки</span> этого пака на свой баланс. Вывод доступен от 2000 ₽.
              </p>
            </div>
          </div>

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