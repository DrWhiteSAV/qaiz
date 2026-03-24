import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

// For backward compatibility if needed, but getSupabase() is preferred
export const supabase = getSupabase();

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
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
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
    return data;
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
}) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
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
    return data;
  } catch (err) {
    console.error('Failed to save game progress:', err);
    return null;
  }
};

export const getGameProgress = async (userId: string, packId: string, gameType: string) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('game_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('pack_id', packId)
      .eq('game_type', gameType)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to get game progress:', err);
    return null;
  }
};

export const deleteGameProgress = async (userId: string, packId: string, gameType: string) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { error } = await supabase
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
