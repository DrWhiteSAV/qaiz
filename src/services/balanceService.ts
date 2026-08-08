import { supabase } from '@/integrations/supabase/client';

export const balanceService = {
  async checkBalance(userId: string, requiredAmount: number) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('uid', userId)
        .single();

      if (error || !data) return false;
      return (data.balance || 0) >= requiredAmount;
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  },

  async deductBalance(userId: string, amount: number) {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('uid', userId)
        .single();

      if (fetchError || !profile) return false;

      const newBalance = (profile.balance || 0) - amount;
      const { error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('uid', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deducting balance:', error);
      return false;
    }
  },

  async addBalance(userId: string, amount: number) {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('uid', userId)
        .single();

      if (fetchError || !profile) return false;

      const newBalance = (profile.balance || 0) + amount;
      const { error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('uid', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding balance:', error);
      return false;
    }
  }
};
