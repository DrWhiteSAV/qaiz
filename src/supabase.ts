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
