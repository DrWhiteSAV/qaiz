import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../db';

export function PostRegistrationPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [checking, setChecking] = useState(true);

  const uid = profile?.uid || sessionStorage.getItem('post_reg_uid') || '';

  useEffect(() => {
    const checkTelegram = async () => {
      if (!uid) {
        setChecking(false);
        return;
      }
      const { data } = await db
        .from('users')
        .select('telegram_id')
        .eq('uid', uid)
        .maybeSingle();

      if (data?.telegram_id) {
        navigate('/', { replace: true });
      } else {
        setChecking(false);
      }
    };

    checkTelegram();
  }, [uid, navigate]);

  const tgLink = uid
    ? `https://t.me/qaiz_AIbot/app?startapp=link_${uid}`
    : 'https://t.me/qaiz_AIbot';

  const handleSkip = () => {
    // Mark that user chose to skip telegram linking
    sessionStorage.setItem('skip_telegram_link', 'true');
    navigate('/', { replace: true });
  };

  if (checking) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 p-8 text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 max-w-sm w-full"
      >
        <div className="text-6xl">🎉</div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter title-glow">Вы вошли!</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Аккаунт Google успешно создан
          </p>
        </div>

        <div className="w-full rounded-[2rem] border border-primary/10 bg-card/40 backdrop-blur-md p-8 space-y-5 shadow-xl">
          {/* Bonus badge */}
          <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3">
            <p className="text-sm font-black text-primary">+100 ₽ бонус</p>
            <p className="text-xs text-foreground/60 mt-1">
              Привяжите Telegram — и мы начислим ещё 100 ₽ на счёт
            </p>
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
            Хотите также войти через Telegram?
          </p>

          {/* Open Telegram button */}
          <a
            href={tgLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-sm font-black uppercase tracking-wider text-background shadow-lg hover:scale-[1.02] transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
            </svg>
            Привязать Telegram
          </a>

          <p className="text-xs text-foreground/40 px-2">
            Нажмите кнопку, войдите в Telegram-бота и ваши аккаунты объединятся автоматически
          </p>

          <div className="pt-2 border-t border-primary/10">
            <motion.button
              onClick={handleSkip}
              animate={{
                boxShadow: [
                  '0 0 0px hsl(var(--primary) / 0)',
                  '0 0 20px hsl(var(--primary) / 0.4)',
                  '0 0 0px hsl(var(--primary) / 0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full rounded-xl py-3 text-sm font-bold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all"
            >
              Пропустить →
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
