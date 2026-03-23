-- Verification and Schema Fix Migration
-- This script ensures the profiles table is compatible with Firebase UIDs

-- 1. Fix Profiles Table
DO $$ 
BEGIN
    -- Check if profiles table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- DROP POLICIES FIRST (to avoid dependency error)
        DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
        
        -- Remove the foreign key constraint if it exists
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
        
        -- Check if 'id' column exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id') THEN
            -- Change id column to TEXT to accommodate Firebase UIDs
            ALTER TABLE profiles ALTER COLUMN id TYPE TEXT;
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'uid') THEN
            -- If 'uid' exists instead of 'id', rename it
            ALTER TABLE profiles RENAME COLUMN uid TO id;
            ALTER TABLE profiles ALTER COLUMN id TYPE TEXT;
        ELSE
            -- If neither exists, add id
            ALTER TABLE profiles ADD COLUMN id TEXT PRIMARY KEY;
        END IF;
        
        -- Add photo_url column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'photo_url') THEN
            ALTER TABLE profiles ADD COLUMN photo_url TEXT;
        END IF;
    ELSE
        -- Create the table from scratch if it doesn't exist
        CREATE TABLE profiles (
            id TEXT PRIMARY KEY,
            email TEXT,
            display_name TEXT,
            photo_url TEXT,
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
    END IF;
END $$;

-- 2. Recreate Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (true);

-- 3. Verify other tables
-- Ensure games table exists
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

-- Ensure game_sessions table exists
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
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

-- 4. AI Prompts table
CREATE TABLE IF NOT EXISTS prompts (
    game_id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS for all
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- 6. Basic Policies for others
DROP POLICY IF EXISTS "Prompts are viewable by everyone" ON prompts;
CREATE POLICY "Prompts are viewable by everyone" ON prompts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Games are viewable by everyone" ON games;
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);

DROP POLICY IF EXISTS "Sessions are viewable by owner" ON game_sessions;
CREATE POLICY "Sessions are viewable by owner" ON game_sessions FOR SELECT USING (true);
