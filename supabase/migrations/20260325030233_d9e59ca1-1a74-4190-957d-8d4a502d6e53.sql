
-- Create news table
CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  media_type TEXT DEFAULT 'image',
  platforms TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  author_id UUID REFERENCES public.profiles(uid) ON DELETE SET NULL,
  author_name TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "News viewable by everyone" ON public.news FOR SELECT USING (true);
CREATE POLICY "Admins can manage news" ON public.news FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE uid = auth.uid() AND role IN ('admin','superadmin'))
);

-- Create prompts table
CREATE TABLE IF NOT EXISTS public.prompts (
  game_id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prompts viewable by everyone" ON public.prompts FOR SELECT USING (true);
CREATE POLICY "Admins can manage prompts" ON public.prompts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE uid = auth.uid() AND role IN ('admin','superadmin'))
);

-- Create games table (author-created game packs)
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT,
  game_type TEXT,
  author_id UUID REFERENCES public.profiles(uid) ON DELETE SET NULL,
  price NUMERIC DEFAULT 0,
  question_count INTEGER DEFAULT 10,
  questions JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published games viewable" ON public.games FOR SELECT USING (is_published = true OR author_id = auth.uid());
CREATE POLICY "Authors can manage own games" ON public.games FOR ALL TO authenticated USING (author_id = auth.uid());

-- Create shop_items table
CREATE TABLE IF NOT EXISTS public.shop_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(uid),
  price NUMERIC DEFAULT 0,
  description TEXT,
  format TEXT,
  game_ids TEXT[] DEFAULT '{}',
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop items viewable" ON public.shop_items FOR SELECT USING (true);
CREATE POLICY "Authors can manage own items" ON public.shop_items FOR ALL TO authenticated USING (author_id = auth.uid());

-- Create game_progress table
CREATE TABLE IF NOT EXISTS public.game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  state JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, pack_id, game_type)
);

ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON public.game_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.game_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.game_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.game_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Add missing columns to profiles if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'telegram_id') THEN
    ALTER TABLE public.profiles ADD COLUMN telegram_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
    ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_count') THEN
    ALTER TABLE public.profiles ADD COLUMN referral_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_earnings') THEN
    ALTER TABLE public.profiles ADD COLUMN referral_earnings NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'author_status') THEN
    ALTER TABLE public.profiles ADD COLUMN author_status TEXT DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'author_earnings') THEN
    ALTER TABLE public.profiles ADD COLUMN author_earnings NUMERIC DEFAULT 0;
  END IF;
END
$$;

-- Create trigger for handle_new_user if not exists
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
