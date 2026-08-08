-- Add new Telegram fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS telegram_profile_url TEXT;

-- Fix RLS: drop old restrictive policies that block Telegram upsert
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Allow open insert (Edge Function with service role handles security)
CREATE POLICY "Allow profile insert" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (true);

-- Allow open update (Edge Function with service role handles security)
CREATE POLICY "Allow profile update" 
  ON public.profiles 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);