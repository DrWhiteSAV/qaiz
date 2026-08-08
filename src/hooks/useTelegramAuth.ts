import { useEffect, useState } from 'react';
import { db as supabase } from '../db';

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

/**
 * Detects entry mode synchronously.
 * CRITICAL: Check window.Telegram.WebApp FIRST before iframe check,
 * because Telegram Mini App also runs inside an iframe.
 */
export function detectEntryMode(): EntryMode {
  const hostname = window.location.hostname;
  const href = window.location.href;

  // 1. FIRST: check for Telegram WebApp SDK (loaded via <script> in index.html)
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user || (tg?.initData && tg.initData.length > 0)) {
    return 'telegram';
  }

  // 2. Dev / preview iframe — only if NO Telegram SDK data
  try {
    if (window.self !== window.top) return 'preview';
  } catch (_) {
    return 'preview';
  }

  // 3. Preview/dev hostnames
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
  uid: '00000000-0000-0000-0000-000000000001',
  telegram_id: '169262991',
  display_name: 'Создатель (Dev)',
  username: null,
  telegram_profile_url: null,
  avatar_url: null,
  email: null,
  role: 'superadmin',
  balance: 999999,
  level: 99,
  referral_code: null,
  referral_count: 0,
  referral_earnings: 0,
  author_earnings: 0,
  author_status: 'none',
  referred_by: null,
  referred_code: null,
  created_at: new Date().toISOString(),
};

/**
 * Reads Telegram WebApp initData or local email session, registers/updates the user in SQLite profiles,
 * and returns the stored profile.
 */
export function useTelegramAuth() {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entryMode, setEntryMode] = useState<EntryMode>('browser');

  const refetchProfile = async (telegramId: number) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', String(telegramId))
      .maybeSingle();
    if (data) setProfile(data as unknown as UserProfile);
  };

  useEffect(() => {
    const init = async () => {
      const mode = detectEntryMode();
      setEntryMode(mode);

      // Dev / Preview mode → superadmin dev access
      if (mode === 'preview') {
        setProfile(DEV_SUPER_USER);
        setIsLoading(false);
        return;
      }

      // Plain browser → check for active Email session in localStorage
      if (mode === 'browser') {
        const storedSession = localStorage.getItem('user_session') || localStorage.getItem('user_email_session');
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            if (parsed && (parsed.uid || parsed.id)) {
              const uid = parsed.uid || parsed.id;
              // Fetch latest from SQLite
              const { data: dbProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('uid', uid)
                .maybeSingle();

              if (dbProfile) {
                setProfile(dbProfile as unknown as UserProfile);
              } else {
                setProfile(parsed as UserProfile);
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

      // ── Telegram Mini App flow ──
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

      // Check if profile already exists in SQLite
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', telegramIdStr)
        .maybeSingle();

      let resultData: any = null;

      if (existing) {
        const { data: updated } = await supabase
          .from('profiles')
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

        const { data: inserted } = await supabase
          .from('profiles')
          .insert({
            uid: crypto.randomUUID(),
            telegram_id: telegramIdStr,
            display_name: displayName,
            avatar_url: user.photo_url ?? null,
            username: usernameFormatted,
            telegram_profile_url: profileUrl,
            role: isSuperAdmin ? 'superadmin' : 'player',
            balance: 100,
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
        setProfile(resultData as unknown as UserProfile);
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
