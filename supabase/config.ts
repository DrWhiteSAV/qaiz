// Supabase Configuration and Constants
export const SUPABASE_CONFIG = {
  PROJECT_ID: import.meta.env.VITE_SUPABASE_URL?.split('.')[0].split('//')[1] || '',
  API_URL: import.meta.env.VITE_SUPABASE_URL || '',
  ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  TABLES: {
    PROFILES: 'profiles',
    GAMES: 'games',
    GAME_SESSIONS: 'game_sessions',
    PROMPTS: 'prompts',
    NEWS: 'news'
  },
  FUNCTIONS: {
    TELEGRAM_WEBHOOK: 'telegram-webhook'
  }
};

export const MIGRATIONS_VERSION = '20260321_01';
