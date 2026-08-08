import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vqcxhdcsmkvleadrsrki.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxY3hoZGNzbWt2bGVhZHJzcmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDUyNzcsImV4cCI6MjA4OTYyMTI3N30.g3JpC1LhgzQPzDXnk9p7aT7gV-qPEmZ44vRvvlGgzzY';

async function callMergeAccounts(mode: string, primaryUid: string, secondaryUid: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/merge-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ mode, primary_uid: primaryUid, secondary_uid: secondaryUid }),
  });
  return res.json();
}

async function upsertGoogleProfile(userId: string, displayName: string, avatarUrl: string | null, email: string | null) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('uid, balance, referral_code')
    .eq('uid', userId)
    .maybeSingle();

  const referralCode = existing?.referral_code || Math.random().toString(36).substring(2, 8).toUpperCase();

  if (existing) {
    await supabase.from('profiles').update({
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
      referral_code: referralCode,
    }).eq('uid', userId);
  } else {
    await supabase.from('profiles').insert({
      uid: userId,
      email,
      display_name: displayName,
      avatar_url: avatarUrl,
      balance: 100,
      role: 'player',
      level: 1,
      referral_code: referralCode,
      referral_count: 0,
      referral_earnings: 0,
      author_earnings: 0,
      author_status: 'none',
    });
  }

  return { isNew: !existing };
}

// 10-second countdown screen
function ProfileCreatingScreen({ onDone }: { onDone: () => void }) {
  const [seconds, setSeconds] = useState(10);
  const messages = [
    'Создаём ваш профиль...',
    'Настраиваем аккаунт...',
    'Начисляем бонус 100 ₽...',
    'Генерируем реферальный код...',
    'Почти готово...',
  ];
  const msgIndex = Math.min(Math.floor((10 - seconds) / 2), messages.length - 1);

  useEffect(() => {
    if (seconds <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, onDone]);

  const progress = ((10 - seconds) / 10) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-8 p-8 text-center">
      <div className="text-5xl animate-bounce">⚙️</div>

      <div className="flex flex-col items-center gap-3 max-w-xs w-full">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">
          Настраиваем аккаунт
        </h2>
        <p className="text-sm text-foreground/60 min-h-[1.5rem] transition-all duration-500">
          {messages[msgIndex]}
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-foreground/40">
          {seconds > 0 ? `Ещё ~${seconds} сек` : 'Готово!'}
        </p>
      </div>

      <div className="flex items-center gap-4 text-primary/30 text-3xl">
        <span className="animate-spin" style={{ animationDuration: '3s' }}>⚙</span>
        <span className="animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>⚙</span>
        <span className="animate-spin" style={{ animationDuration: '4s' }}>⚙</span>
      </div>
    </div>
  );
}

export function GoogleCallbackPage() {
  const [phase, setPhase] = useState<'loading' | 'countdown' | 'link_success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const processedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  const goToPostRegistration = () => {
    if (userIdRef.current) {
      sessionStorage.setItem('post_reg_uid', userIdRef.current);
    }
    window.location.replace('/post-registration');
  };

  useEffect(() => {
    const clearAuthHash = () => {
      if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    const searchParams = new URLSearchParams(window.location.search);
    const linkUid = searchParams.get('link_uid') || sessionStorage.getItem('pending_link_uid');
    const linkTma = searchParams.get('link_tma') || sessionStorage.getItem('pending_link_tma');
    const refCode = sessionStorage.getItem('pending_ref') || localStorage.getItem('pending_ref') || searchParams.get('ref');

    if (linkUid) sessionStorage.removeItem('pending_link_uid');
    if (linkTma) sessionStorage.removeItem('pending_link_tma');

    const handleLinkMode = async (googleUserId: string) => {
      try {
        const result = await callMergeAccounts('google_linking_in_tma', linkUid!, googleUserId);
        if (result.success) {
          setPhase('link_success');
        } else {
          setErrorMsg('Ошибка привязки. Попробуйте ещё раз.');
          setPhase('error');
        }
      } catch {
        setErrorMsg('Ошибка привязки. Попробуйте ещё раз.');
        setPhase('error');
      }
      await supabase.auth.signOut();
    };

    const handleLinkTmaMode = async (googleUserId: string, displayName: string, avatarUrl: string | null, email: string | null) => {
      await upsertGoogleProfile(googleUserId, displayName, avatarUrl, email);
      try {
        const result = await callMergeAccounts('google_linking_in_tma', linkTma!, googleUserId);
        if (result.success) {
          sessionStorage.setItem('post_reg_uid', linkTma!);
          await supabase.auth.signOut();
          window.location.replace('/post-registration');
        } else {
          setErrorMsg('Ошибка объединения. Попробуйте ещё раз.');
          setPhase('error');
          await supabase.auth.signOut();
        }
      } catch {
        setErrorMsg('Ошибка. Попробуйте ещё раз.');
        setPhase('error');
        await supabase.auth.signOut();
      }
    };

    const handleNormalMode = async (userId: string, displayName: string, avatarUrl: string | null, email: string | null) => {
      userIdRef.current = userId;

      // Check if telegram already linked
      const { data: existing } = await supabase
        .from('profiles')
        .select('uid, telegram_id')
        .eq('uid', userId)
        .maybeSingle();

      const hasTelegram = !!existing?.telegram_id;

      // Upsert profile and wait for it to be fully created
      const { isNew } = await upsertGoogleProfile(userId, displayName, avatarUrl, email);

      // Handle referral — wait for profile to be fully synced in DB
      if (refCode) {
        sessionStorage.removeItem('pending_ref');
        localStorage.removeItem('pending_ref');
        try {
          // Wait 3 seconds for DB trigger to complete profile creation
          await new Promise(r => setTimeout(r, 3000));
          console.log('[GoogleCallback] Processing referral code:', refCode, 'for user:', userId);
          const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-referral`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ user_uid: userId, referrer_referral_code: refCode }),
          });
          const result = await res.json();
          console.log('[GoogleCallback] referral result:', result);
        } catch (e) {
          console.error('[GoogleCallback] referral error:', e);
        }
      }

      if (hasTelegram) {
        // Already linked — go home immediately
        window.location.replace('/');
      } else {
        // No telegram — show 10-second countdown, then go to /post-registration
        sessionStorage.setItem('post_reg_uid', userId);
        setPhase('countdown');
      }
    };

    const processSession = async (userId: string, metadata: Record<string, any>, email: string | null) => {
      if (processedRef.current) return;
      processedRef.current = true;
      clearAuthHash();

      const displayName = metadata?.full_name || metadata?.name || email?.split('@')[0] || 'Игрок';
      const avatarUrl = metadata?.avatar_url || metadata?.picture || null;

      if (linkUid) {
        await handleLinkMode(userId);
      } else if (linkTma) {
        await handleLinkTmaMode(userId, displayName, avatarUrl, email);
      } else {
        await handleNormalMode(userId, displayName, avatarUrl, email);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        await processSession(session.user.id, session.user.user_metadata, session.user.email || null);
      }
    });

    // Give onAuthStateChange a moment to fire SIGNED_IN from hash tokens
    setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        subscription.unsubscribe();
        await processSession(data.session.user.id, data.session.user.user_metadata, data.session.user.email || null);
      } else if (!processedRef.current) {
        // No session after delay - error
        subscription.unsubscribe();
        setErrorMsg('Ошибка входа. Попробуйте ещё раз.');
        setPhase('error');
        if (!linkUid) setTimeout(() => { window.location.replace('/'); }, 3000);
      }
    }, 2000);

    return () => subscription.unsubscribe();
  }, []);

  if (phase === 'link_success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6 p-8 text-center">
        <div className="text-5xl">✅</div>
        <p className="text-lg font-bold text-foreground">Google привязан! Возвращайтесь в Telegram.</p>
        <p className="text-sm text-foreground/50">Теперь вы можете закрыть эту вкладку.</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6 p-8 text-center">
        <div className="text-5xl">❌</div>
        <p className="text-lg font-bold text-foreground">{errorMsg}</p>
      </div>
    );
  }

  if (phase === 'countdown') {
    return <ProfileCreatingScreen onDone={goToPostRegistration} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6 p-8 text-center">
      <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="text-lg font-bold text-foreground">Завершаем вход через Google...</p>
    </div>
  );
}
