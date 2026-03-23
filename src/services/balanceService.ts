import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getSupabase } from '../supabase';

export const balanceService = {
  async checkBalance(userId: string, requiredAmount: number) {
    if (!db) return false;
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return false;
      return userSnap.data().balance >= requiredAmount;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      return false;
    }
  },

  async deductBalance(userId: string, amount: number) {
    if (!db) return false;
    try {
      // Update Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: increment(-amount)
      });

      // Update Supabase
      const supabase = getSupabase();
      if (supabase) {
        // Get current balance first to be safe, or just use increment logic if Supabase supports it
        // For simplicity and consistency with current profile sync, we'll fetch and update
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const newBalance = userSnap.data().balance;
          await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);
        }
      }
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return false;
    }
  },

  async addBalance(userId: string, amount: number) {
    if (!db) return false;
    try {
      // Update Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: increment(amount)
      });

      // Update Supabase
      const supabase = getSupabase();
      if (supabase) {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const newBalance = userSnap.data().balance;
          await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);
        }
      }
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return false;
    }
  }
};
