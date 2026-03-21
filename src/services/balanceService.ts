import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

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
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: increment(-amount)
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return false;
    }
  },

  async addBalance(userId: string, amount: number) {
    if (!db) return false;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: increment(amount)
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      return false;
    }
  }
};
