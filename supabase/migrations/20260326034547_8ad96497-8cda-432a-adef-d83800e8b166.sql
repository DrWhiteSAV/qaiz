-- Drop the foreign key constraint that prevents Telegram users from being inserted
-- Telegram users are NOT created via Supabase Auth, so uid doesn't reference auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_uid_fkey;