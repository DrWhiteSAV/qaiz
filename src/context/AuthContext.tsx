import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole } from '../types';
import WebApp from '@twa-dev/sdk';
import { getSupabase } from '../supabase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  loginWithTelegram: () => Promise<void>;
  updateBalance: (newBalance: number) => Promise<void>;
  purchaseGames: (gameIds: string[], totalPrice: number) => Promise<void>;
  markGameAsPlayed: (gameId: string) => Promise<void>;
  linkTelegram: (code: string) => Promise<boolean>;
  unlinkTelegram: () => Promise<void>;
  changeGoogleAccount: () => Promise<void>;
  logout: () => Promise<void>;
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
            
            // Check for superadmin status
            if (data.email === 'shishkarnem@gmail.com') {
              if (data.role !== 'superadmin') {
                updateProfileRoleAndBalance(currentUser.uid, 'superadmin');
              }
            }
            
            setProfile(data);
            syncWithSupabase(data);
          } else {
            createInitialProfile(currentUser);
          }
          setLoading(false);
        }, (error) => {
          console.error('Profile snapshot error:', error);
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

  const updateProfileRoleAndBalance = async (uid: string, role: UserRole, balance?: number) => {
    try {
      const updateData: any = { role };
      if (balance !== undefined) updateData.balance = balance;
      await setDoc(doc(db, 'users', uid), updateData, { merge: true });
    } catch (err) {
      console.error('Error updating role/balance:', err);
    }
  };

  const handleTelegramLogin = async () => {
    const tgUser = WebApp.initDataUnsafe.user;
    if (!tgUser) return;

    console.log('Telegram User:', tgUser);
    
    // If we have a TG user, we should ensure the profile has their TG info
    // This is handled in createInitialProfile or via a manual link
  };

  const syncWithSupabase = async (profile: UserProfile) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.uid, // Map Firebase UID to Supabase ID
          email: profile.email,
          display_name: profile.displayName,
          photo_url: profile.photoURL,
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

  const linkTelegram = async (code: string) => {
    if (!user || !profile) return;
    
    // Strip prefix 'sdf' and suffix 'gh' as requested
    let tgId = code;
    if (code.startsWith('sdf') && code.endsWith('gh')) {
      tgId = code.substring(3, code.length - 2);
    }
    
    // Simple validation: should be numeric
    if (!/^\d+$/.test(tgId)) {
      throw new Error('Неверный формат кода');
    }
    
    const userRef = doc(db, 'users', user.uid);
    
    try {
      await setDoc(userRef, { 
        telegramId: tgId,
        telegramConfirmationCode: code
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error linking Telegram:', err);
      throw err;
    }
  };

  const unlinkTelegram = async () => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      // Update Firestore
      await setDoc(userRef, { 
        telegramId: null,
        telegramConfirmationCode: null 
      }, { merge: true });
      
      // Also update Supabase
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('profiles')
          .update({ 
            telegram_id: null,
            tg_confirmation_code: null 
          })
          .eq('id', user.uid);
      }
    } catch (err) {
      console.error('Error unlinking Telegram:', err);
      throw err;
    }
  };

  const changeGoogleAccount = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      // First sign out to be safe, then sign in with prompt
      await signOut(auth);
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Error changing Google account:', err);
      throw err;
    }
  };

  const createInitialProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const tgUser = WebApp.initDataUnsafe.user;
    
    // Referral logic
    const startParam = WebApp.initDataUnsafe.start_param;
    const referredBy = startParam || undefined;

    const referralCode = tgUser?.id?.toString() || Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const isSuperAdmin = user.email === 'shishkarnem@gmail.com' || user.uid === '2A9a923z';
    
    const newProfile: any = {
      uid: user.uid,
      email: user.email || `${user.uid}@placeholder.com`,
      displayName: tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : (user.displayName || 'Игрок'),
      role: isSuperAdmin ? 'superadmin' : 'player',
      balance: isSuperAdmin ? 999000 : 100,
      referralCode,
      referralCount: 0,
      referralEarnings: 0,
      authorStatus: 'none',
      authorEarnings: 0,
      createdAt: Date.now(),
    };

    if (tgUser?.photo_url || user.photoURL) {
      newProfile.photoURL = tgUser?.photo_url || user.photoURL;
    }
    if (tgUser?.id) {
      newProfile.telegramId = tgUser.id.toString();
    }
    if (referredBy) {
      newProfile.referredBy = referredBy;
    }

    try {
      await setDoc(userRef, newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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
      // Update Firestore
      await setDoc(userRef, { balance: newBalance }, { merge: true });
      
      // Update Supabase
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', user.uid);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const purchaseGames = async (gameIds: string[], totalPrice: number) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    const newBalance = profile.balance - totalPrice;
    const newPurchasedGames = [...(profile.purchasedGames || []), ...gameIds];
    
    try {
      await setDoc(userRef, { 
        balance: newBalance,
        purchasedGames: Array.from(new Set(newPurchasedGames))
      }, { merge: true });
      
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', user.uid);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const markGameAsPlayed = async (gameId: string) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    const newPlayedGames = [...(profile.playedGames || []), gameId];
    
    try {
      await setDoc(userRef, { 
        playedGames: Array.from(new Set(newPlayedGames))
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAuthReady, 
      loginWithTelegram, 
      updateBalance, 
      purchaseGames,
      markGameAsPlayed,
      linkTelegram,
      unlinkTelegram,
      changeGoogleAccount,
      logout
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
