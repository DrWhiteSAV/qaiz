import { supabase } from '@/integrations/supabase/client';

export { supabase };
export const getSupabase = () => supabase;

type StoredGameProgress = {
  id?: string;
  user_id: string;
  pack_id: string;
  game_type: string;
  current_step: number;
  total_steps: number;
  state: any;
  created_at?: string;
  updated_at?: string;
};

const db = supabase as any;

export const saveGameSession = async (session: {
  userId: string;
  gameId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  mode: string;
  difficulty: string;
  topic?: string;
  pricePaid: number;
  isWin?: boolean;
}) => {
  try {
    const { data, error } = await db
      .from('game_sessions')
      .insert({
        user_id: session.userId,
        game_id: session.gameId,
        score: session.score,
        total_questions: session.totalQuestions,
        correct_answers: session.correctAnswers,
        mode: session.mode,
        difficulty: session.difficulty,
        topic: session.topic,
        price_paid: session.pricePaid,
        is_win: session.isWin,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as any;
  } catch (err) {
    console.error('Failed to save game session:', err);
    return null;
  }
};

export const saveGameProgress = async (progress: {
  userId: string;
  packId: string;
  gameType: string;
  currentStep: number;
  totalSteps: number;
  state: any;
}): Promise<StoredGameProgress | null> => {
  try {
    const { data, error } = await db
      .from('game_progress')
      .upsert({
        user_id: progress.userId,
        pack_id: progress.packId,
        game_type: progress.gameType,
        current_step: progress.currentStep,
        total_steps: progress.totalSteps,
        state: progress.state,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,pack_id,game_type'
      })
      .select()
      .single();

    if (error) throw error;
    return (data as StoredGameProgress) || null;
  } catch (err) {
    console.error('Failed to save game progress:', err);
    return null;
  }
};

export const getGameProgress = async (userId: string, packId: string, gameType: string): Promise<StoredGameProgress | null> => {
  try {
    const { data, error } = await db
      .from('game_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('pack_id', packId)
      .eq('game_type', gameType)
      .maybeSingle();

    if (error) throw error;
    return (data as StoredGameProgress | null) || null;
  } catch (err) {
    console.error('Failed to get game progress:', err);
    return null;
  }
};

export const deleteGameProgress = async (userId: string, packId: string, gameType: string) => {
  try {
    const { error } = await db
      .from('game_progress')
      .delete()
      .eq('user_id', userId)
      .eq('pack_id', packId)
      .eq('game_type', gameType);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to delete game progress:', err);
    return false;
  }
};
