import React, { createContext, useContext } from 'react';
import { useTelegramAuth, TelegramUser, UserProfile, EntryMode } from '../hooks/useTelegramAuth';
import { db as supabase } from '../db';

interface AuthContextType {
  user: TelegramUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  entryMode: EntryMode;
  updateBalance: (newBalance: number) => Promise<void>;
  purchaseGames: (gameIds: string[], totalPrice: number) => Promise<void>;
  markGameAsPlayed: (gameId: string) => Promise<void>;
  logout: () => void;
  refetchProfile: (telegramId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { telegramUser, profile, isLoading, entryMode, refetchProfile } = useTelegramAuth();

  const updateBalance = async (newBalance: number) => {
    if (!profile) return;
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('uid', profile.uid);
    if (error) console.error('Error updating balance:', error);
  };

  const purchaseGames = async (gameIds: string[], totalPrice: number) => {
    if (!profile) return;
    const newBalance = profile.balance - totalPrice;

    await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('uid', profile.uid);

    for (const gameId of gameIds) {
      await supabase.from('purchases').insert({
        user_id: profile.uid,
        item_id: gameId,
        price_paid: Math.round(totalPrice / gameIds.length),
      });
    }
  };

  const markGameAsPlayed = async (_gameId: string) => {
    // Tracked via game_sessions table
  };

  const logout = () => {
    localStorage.removeItem('user_session');
    localStorage.removeItem('user_email_session');
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{
      user: telegramUser,
      profile,
      loading: isLoading,
      isAuthReady: !isLoading,
      entryMode,
      updateBalance,
      purchaseGames,
      markGameAsPlayed,
      logout,
      refetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
