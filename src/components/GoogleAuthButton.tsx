import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  mode: 'signin' | 'link';
  /** UID of the Telegram profile to link Google to (required when mode='link') */
  linkUid?: string;
  className?: string;
  onError?: (msg: string) => void;
}

/** Returns true when running inside Telegram Mini App WebView */
function isTMA(): boolean {
  return !!(window as any).Telegram?.WebApp?.initData;
}

export function GoogleAuthButton({ mode, linkUid, className, onError }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const isLinkMode = mode === 'link' && linkUid;
      const redirectTo = isLinkMode
        ? `${window.location.origin}/auth/google/callback?link_uid=${encodeURIComponent(linkUid!)}`
        : `${window.location.origin}/auth/google/callback`;

      if (isLinkMode) {
        // Persist link_uid so callback page can find it even if query param is stripped
        sessionStorage.setItem('pending_link_uid', linkUid!);
      }

      if (isTMA()) {
        // Inside TMA the WebView cannot handle OAuth redirects — get the URL first,
        // then open it in the device's external browser via Telegram SDK.
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });
        if (error) {
          onError?.(error.message);
          setLoading(false);
          return;
        }
        if (data?.url) {
          // openLink opens an external browser; the user completes OAuth there and
          // lands on the callback page which calls merge-accounts.
          (window as any).Telegram.WebApp.openLink(data.url);
        }
        setLoading(false);
      } else {
        // Standard browser flow — let Supabase redirect the page
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (error) {
          onError?.(error.message);
          setLoading(false);
        }
      }
    } catch (err: any) {
      onError?.(err.message ?? 'Ошибка Google Auth');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={[
        'flex items-center justify-center gap-3 rounded-2xl border border-border bg-card',
        'px-6 py-3 text-sm font-bold transition-all hover:bg-card/80 hover:scale-[1.02]',
        'disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
        className ?? '',
      ].join(' ')}
    >
      {loading ? (
        <span className="h-5 w-5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      {mode === 'link' ? 'Привязать Google' : 'Войти через Google'}
    </button>
  );
}
