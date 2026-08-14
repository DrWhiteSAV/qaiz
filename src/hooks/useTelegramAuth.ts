import { useEffect, useState } from 'react';
import { db } from '../db';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface UserProfile {
  uid: string;
  telegram_id: string | null;
  display_name: string;
  username: string | null;
  telegram_profile_url: string | null;
  avatar_url: string | null;
  email: string | null;
  role: string;
  balance_rr: number;
  balance: number;
  level: number;
  referral_code: string | null;
  referral_count: number;
  referral_earnings: number;
  author_earnings: number;
  author_status: string;
  referred_by: string | null;
  referred_code: string | null;
  created_at: string;
}

export type EntryMode = 'preview' | 'telegram' | 'browser';

export function detectEntryMode(): EntryMode {
  const hostname = window.location.hostname;
  const href = window.location.href;

  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user || (tg?.initData && tg.initData.length > 0)) {
    return 'telegram';
  }

  try {
    if (window.self !== window.top) return 'preview';
  } catch (_) {
    return 'preview';
  }

  if (
    href.includes('id-preview--') ||
    hostname.includes('run.app') ||
    hostname.includes('preview')
  ) {
    return 'preview';
  }

  return 'browser';
}

export const DEV_SUPER_USER: UserProfile = {
  uid: 'usr_169262990',
  telegram_id: '169262990',
  display_name: 'Тимошенко Денис',
  username: 'shishkarnem',
  telegram_profile_url: 'https://t.me/qaiz_aibot',
  avatar_url: null,
  email: 'shishkarnem@gmail.com',
  role: 'admin',
  balance_rr: 50000,
  balance: 50000,
  level: 99,
  referral_code: 'REF169',
  referral_count: 5,
  referral_earnings: 250,
  author_earnings: 1200,
  author_status: 'verified',
  referred_by: null,
  referred_code: null,
  created_at: new Date().toISOString(),
};

function normalizeProfile(data: any): UserProfile {
  const bal = data.balance_rr ?? data.balance ?? 0;
  return {
    ...data,
    balance_rr: bal,
    balance: bal
  };
}

export function useTelegramAuth() {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entryMode, setEntryMode] = useState<EntryMode>('browser');

  const refetchProfile = async (telegramId: number) => {
    const { data } = await db
      .from('users')
      .select('*')
      .eq('telegram_id', String(telegramId))
      .maybeSingle();
    if (data) setProfile(normalizeProfile(data));
  };

  useEffect(() => {
    const init = async () => {
      const mode = detectEntryMode();
      setEntryMode(mode);

      if (mode === 'preview') {
        setProfile(DEV_SUPER_USER);
        setIsLoading(false);
        return;
      }

      if (mode === 'browser') {
        const storedSession = localStorage.getItem('user_session') || localStorage.getItem('user_email_session');
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            if (parsed && (parsed.uid || parsed.id)) {
              const uid = parsed.uid || parsed.id;
              const { data: dbProfile } = await db
                .from('users')
                .select('*')
                .eq('uid', uid)
                .maybeSingle();

              if (dbProfile) {
                setProfile(normalizeProfile(dbProfile));
              } else {
                setProfile(normalizeProfile(parsed));
              }

              setTelegramUser({
                id: 1000,
                first_name: parsed.display_name || parsed.email?.split('@')[0] || 'Игрок',
                username: parsed.email?.split('@')[0],
              });
            }
          } catch (e) {
            console.error('[BrowserAuth] Failed to parse stored session:', e);
          }
        }
        setIsLoading(false);
        return;
      }

      const tg = (window as any).Telegram?.WebApp;
      let user: TelegramUser | null = null;

      if (tg?.initDataUnsafe?.user) {
        user = tg.initDataUnsafe.user as TelegramUser;
        try { tg.expand(); } catch (_) {}
      } else {
        try {
          const raw = tg?.initData || '';
          if (raw) {
            const params = new URLSearchParams(raw);
            const userStr = params.get('user');
            if (userStr) user = JSON.parse(decodeURIComponent(userStr));
          }
        } catch (_) {}
      }

      if (!user) {
        setIsLoading(false);
        return;
      }

      setTelegramUser(user);

      const telegramIdStr = String(user.id);
      const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ');
      const usernameFormatted = user.username ? `@${user.username}` : null;
      const profileUrl = user.username
        ? `https://t.me/${user.username}`
        : `tg://user?id=${user.id}`;

      const { data: existing } = await db
        .from('users')
        .select('*')
        .eq('telegram_id', telegramIdStr)
        .maybeSingle();

      let resultData: any = null;

      if (existing) {
        const { data: updated } = await db
          .from('users')
          .update({
            display_name: displayName,
            avatar_url: user.photo_url ?? null,
            username: usernameFormatted,
            telegram_profile_url: profileUrl,
          })
          .eq('telegram_id', telegramIdStr)
          .select()
          .single();
        resultData = updated || existing;
      } else {
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const isSuperAdmin = user.id === 169262990;

        const { data: inserted } = await db
          .from('users')
          .insert({
            id: isSuperAdmin ? '10016926299' : String(Date.now()),
            uid: isSuperAdmin ? 'usr_169262990' : `usr_${user.id}`,
            telegram_id: telegramIdStr,
            display_name: isSuperAdmin ? 'Тимошенко Денис' : displayName,
            avatar_url: user.photo_url ?? null,
            username: usernameFormatted,
            telegram_profile_url: profileUrl,
            role: isSuperAdmin ? 'admin' : 'player',
            balance_rr: isSuperAdmin ? 50000 : 100,
            level: 1,
            referral_code: referralCode,
            referral_count: 0,
            referral_earnings: 0,
            author_earnings: 0,
            author_status: 'none',
          })
          .select()
          .single();
        resultData = inserted;
      }

      if (resultData) {
        setProfile(normalizeProfile(resultData));
      }

      setIsLoading(false);
    };

    init();
  }, []);

  return {
    telegramUser,
    profile,
    isLoading,
    entryMode,
    refetchProfile,
  };
}
