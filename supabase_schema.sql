-- Supabase Schema for KwaiZ App

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'player',
  balance NUMERIC DEFAULT 100,
  referral_code TEXT UNIQUE,
  referral_count INTEGER DEFAULT 0,
  referral_earnings NUMERIC DEFAULT 0,
  author_status TEXT DEFAULT 'none',
  author_earnings NUMERIC DEFAULT 0,
  telegram_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Games Definition
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  question_count INTEGER,
  path TEXT,
  color TEXT,
  rules TEXT,
  is_multiplayer BOOLEAN DEFAULT FALSE,
  only_human BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Game Sessions (Results)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_id TEXT REFERENCES games(id),
  score INTEGER DEFAULT 0,
  total_questions INTEGER,
  correct_answers INTEGER,
  mode TEXT,
  difficulty TEXT,
  topic TEXT,
  price_paid NUMERIC DEFAULT 0,
  is_win BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'finished',
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Shop Items (Game Packs)
CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  price NUMERIC DEFAULT 0,
  description TEXT,
  format TEXT,
  games TEXT[], -- Array of game IDs included in the pack
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES shop_items(id),
  price_paid NUMERIC,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Friends and Social
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- 7. Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Offline Registrations
CREATE TABLE IF NOT EXISTS offline_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  participants_count INTEGER DEFAULT 1,
  comment TEXT,
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'reserve', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. News and Posts
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  author_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. AI Prompts
CREATE TABLE IF NOT EXISTS prompts (
  game_id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "Users can view own sessions" ON game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shop items are viewable by everyone" ON shop_items FOR SELECT USING (true);
CREATE POLICY "Users can view own purchases" ON purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own friends" ON friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can manage own friends" ON friends FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can view own offline regs" ON offline_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can register offline" ON offline_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "News is viewable by everyone" ON news FOR SELECT USING (true);
CREATE POLICY "Prompts are viewable by everyone" ON prompts FOR SELECT USING (true);
CREATE POLICY "Only admins can manage prompts" ON prompts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
  )
);
