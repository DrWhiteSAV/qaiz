import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vqcxhdcsmkvleadrsrki.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxY3hoZGNzbWt2bGVhZHJzcmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDUyNzcsImV4cCI6MjA4OTYyMTI3N30.g3JpC1LhgzQPzDXnk9p7aT7gV-qPEmZ44vRvvlGgzzY';

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

  // 3. Preview/dev hostnames (but NOT localhost — that's browser mode for Google OAuth testing)
  if (
    href.includes('id-preview--') ||
    hostname.includes('run.app') ||
    hostname.includes('preview')
  ) {
    return 'preview';
  }

  // localhost / 127.0.0.1 = browser mode so Google OAuth works on dev
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
 * Reads Telegram WebApp initData, registers/updates the user in Supabase profiles,
 * and returns the stored profile. In Dev / Preview mode returns a super-admin mock profile.
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

      // Plain browser → check for active Supabase session (Google OAuth)
      if (mode === 'browser') {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const u = sessionData.session.user;
          const browserDisplayName =
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split('@')[0] ||
            'Игрок';
          const browserUserId = Array.from(u.id).reduce<number>(
            (acc, char) => (acc * 31 + (char as string).charCodeAt(0)) % 2147483647,
            7,
          );

          setTelegramUser({
            id: browserUserId,
            first_name: browserDisplayName,
            username: u.email?.split('@')[0],
            photo_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || undefined,
          });

          const { data: browserProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('uid', u.id)
            .maybeSingle();
          if (browserProfile) {
            setProfile(browserProfile as unknown as UserProfile);

            // ── Process pending web referral (survives OAuth redirect via localStorage) ──
            const pendingRef = localStorage.getItem('pending_ref');
            if (pendingRef && !browserProfile.referred_by && !browserProfile.referred_code) {
              localStorage.removeItem('pending_ref');
              sessionStorage.removeItem('pending_ref');
              try {
                const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-referral`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({ user_uid: u.id, referrer_referral_code: pendingRef }),
                });
                const result = await res.json();
                console.log('[BrowserAuth] referral result:', result);
                // Refetch profile to get updated balance
                if (result.success) {
                  const { data: refreshed } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('uid', u.id)
                    .maybeSingle();
                  if (refreshed) setProfile(refreshed as unknown as UserProfile);
                }
              } catch (e) {
                console.error('[BrowserAuth] referral error:', e);
              }
            }
          } else {
            // New Google user — create profile
            const displayName =
              u.user_metadata?.full_name ||
              u.user_metadata?.name ||
              u.email?.split('@')[0] ||
              'Игрок';
            const avatarUrl = u.user_metadata?.avatar_url || u.user_metadata?.picture || null;
            const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data: created } = await supabase
              .from('profiles')
              .upsert({
                uid: u.id,
                email: u.email || null,
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
              }, { onConflict: 'uid' })
              .select()
              .single();
            if (created) setProfile(created as unknown as UserProfile);
          }
          setIsLoading(false);
          return;
        }
        // No session → no profile, show login page
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
        // No user data — stay on loading with no profile
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

      // Check if profile already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', telegramIdStr)
        .maybeSingle();

      let resultData: any = null;
      let resultError: any = null;

      if (existing) {
        // Profile exists — update display fields only, NEVER touch role or balance
        const { data: updated, error: updateErr } = await supabase
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
        resultData = updated;
        resultError = updateErr;
      } else {
        // New user — insert with starting balance 100
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const isSuperAdmin = user.id === 169262990;

        const { data: inserted, error: insertErr } = await supabase
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
        resultError = insertErr;
      }

      if (resultError) {
        console.error('[TgAuth] Supabase error:', resultError.message, resultError.code);
      } else if (resultData) {
        setProfile(resultData as unknown as UserProfile);

        // ── start_param handling ──
        const startParam: string | null =
          tg?.initDataUnsafe?.start_param ??
          (() => {
            try {
              const params = new URLSearchParams(tg?.initData || '');
              return params.get('start_param') ?? null;
            } catch (_) { return null; }
          })();

        console.log('[TgAuth] start_param:', startParam);

        // ── Account linking: link_{uid} — bind Telegram to an existing Google profile ──
        if (startParam && startParam.startsWith('link_')) {
          const targetUid = startParam.replace('link_', '');
          console.log('[TgAuth] Account linking for uid:', targetUid);
          try {
            // Check: does a standalone Telegram profile already exist for this telegram_id?
            // resultData.uid = current Telegram profile (may be newly created or existing)
            // targetUid = Google browser profile to merge Telegram data into
            if (resultData.uid !== targetUid) {
              // Merge: primary = Google profile (targetUid), secondary = Telegram profile (resultData.uid)
              // Telegram data (name, avatar, telegram_id) will overwrite empty fields in primary
              // Balances will be summed
              const mergeRes = await fetch(
                `${SUPABASE_URL}/functions/v1/merge-accounts`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    mode: 'telegram_linking_in_browser',
                    primary_uid: targetUid,
                    secondary_uid: resultData.uid,
                  }),
                }
              );
              const mergeResult = await mergeRes.json();
              console.log('[TgAuth] merge-accounts result:', mergeResult);

              // Update local state with the merged profile (primary = Google profile, now with Telegram data)
              if (mergeResult.profile) {
                setProfile(mergeResult.profile as unknown as UserProfile);
              }
            } else {
              // Same uid — just update Telegram fields directly
              const { error: linkErr } = await supabase
                .from('profiles')
                .update({
                  telegram_id: telegramIdStr,
                  display_name: displayName,
                  avatar_url: user.photo_url ?? null,
                  username: usernameFormatted,
                  telegram_profile_url: profileUrl,
                })
                .eq('uid', targetUid);
              if (linkErr) console.error('[TgAuth] Link error:', linkErr);
            }
          } catch (e) {
            console.error('[TgAuth] Link exception:', e);
          }
        }

        // ── Referral handling: numeric start_param ──
        if (startParam && /^\d+$/.test(startParam) && startParam !== String(user.id)) {
          // Call handle-referral edge function
          try {
            const resp = await fetch(
              `${SUPABASE_URL}/functions/v1/handle-referral`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  user_uid: resultData.uid,
                  referrer_telegram_id: startParam,
                }),
              }
            );
            const result = await resp.json();
            console.log('[TgAuth] handle-referral result:', result);

            // If bonus was granted, re-fetch profile to get updated balance
            if (result.success) {
              const { data: fresh } = await supabase
                .from('profiles')
                .select('*')
                .eq('uid', resultData.uid)
                .maybeSingle();
              if (fresh) setProfile(fresh as unknown as UserProfile);
            }
          } catch (refErr) {
            console.error('[TgAuth] handle-referral error:', refErr);
          }
        }
      }

      setIsLoading(false);
    };

    init();
  }, []);

  return { telegramUser, profile, isLoading, entryMode, refetchProfile };
}
