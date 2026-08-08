import React, { useState } from 'react';
import { Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { useFrogSound } from '../hooks/useSound';

interface Props {
  onSuccess?: (user: any) => void;
  className?: string;
}

export function EmailAuthForm({ onSuccess, className = '' }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { playCroak } = useFrogSound();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Заполните email и пароль');
      return;
    }

    if (isRegister && password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    setLoading(true);
    playCroak();

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister
        ? { email, password, display_name: displayName }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Ошибка авторизации');
      }

      if (json.data) {
        // Save session locally for browser access
        localStorage.setItem('user_session', JSON.stringify(json.data));
        localStorage.setItem('user_email_session', JSON.stringify(json.data));

        if (onSuccess) {
          onSuccess(json.data);
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-sm mx-auto ${className}`}>
      {/* Mode Switch Tabs */}
      <div className="flex border-b border-primary/20 mb-6">
        <button
          type="button"
          onClick={() => { setIsRegister(false); setError(null); playCroak(); }}
          className={`flex-1 pb-3 text-sm font-bold transition-all border-b-2 ${
            !isRegister
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground/50 hover:text-foreground/80'
          }`}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => { setIsRegister(true); setError(null); playCroak(); }}
          className={`flex-1 pb-3 text-sm font-bold transition-all border-b-2 ${
            isRegister
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground/50 hover:text-foreground/80'
          }`}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
              Имя или никнейм
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Иван Иванов"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-background/50 border border-primary/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
            Email адрес
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background/50 border border-primary/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
            Пароль
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background/50 border border-primary/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
          ) : isRegister ? (
            <>
              <UserPlus className="w-4 h-4" />
              Зарегистрироваться
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Войти
            </>
          )}
        </button>
      </form>
    </div>
  );
}
