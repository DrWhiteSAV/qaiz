import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import WebApp from '@twa-dev/sdk';
import { getSupabase } from '../supabase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  loginWithTelegram: () => Promise<void>;
  updateBalance: (newBalance: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      setIsAuthReady(true);
      return;
    }

    // Check for Telegram Mini App user
    if (WebApp.initDataUnsafe.user) {
      handleTelegramLogin();
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        
        // Listen to profile changes
        const unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            setProfile(data);
            // Sync with Supabase if needed
            syncWithSupabase(data);
          } else {
            createInitialProfile(currentUser);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleTelegramLogin = async () => {
    const tgUser = WebApp.initDataUnsafe.user;
    if (!tgUser) return;

    // In a real app, you'd verify the initData on the server
    // For now, we'll use the TG ID as a way to link or create a user
    console.log('Telegram User:', tgUser);
    
    // We can use a custom token or just sign in anonymously and link the TG ID
    // For this demo, we'll assume the user is already handled or we'll use their ID
  };

  const syncWithSupabase = async (profile: UserProfile) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          uid: profile.uid,
          email: profile.email,
          display_name: profile.displayName,
          balance: profile.balance,
          role: profile.role,
          telegram_id: profile.telegramId,
          referral_code: profile.referralCode,
          referral_count: profile.referralCount,
          referral_earnings: profile.referralEarnings,
          author_status: profile.authorStatus,
          author_earnings: profile.authorEarnings,
          updated_at: new Date().toISOString(),
        });
      if (error) console.error('Supabase sync error:', error);
    } catch (err) {
      console.error('Supabase sync failed:', err);
    }
  };

  const createInitialProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const isSuperAdmin = user.email === 'shishkarnem@gmail.com' || user.uid === '2A9a923z';
    
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Игрок',
      role: isSuperAdmin ? 'superadmin' : 'player',
      balance: 100,
      referralCode,
      referralCount: 0,
      referralEarnings: 0,
      authorStatus: 'none',
      authorEarnings: 0,
      createdAt: Date.now(),
    };

    try {
      await setDoc(userRef, newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  const loginWithTelegram = async () => {
    // This would trigger the Telegram login flow if not already in Mini App
    WebApp.showAlert('Вход через Telegram...');
  };

  const updateBalance = async (newBalance: number) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, { balance: newBalance }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady, loginWithTelegram, updateBalance }}>
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
