-- Initial Game Schema Migration
-- WordPlay game database structure with RLS policies

-- Enable UUID extension for generating IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS for all tables by default
ALTER DATABASE postgres SET row_security = on;

-- USERS table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Game statistics
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    -- User preferences
    preferred_theme TEXT DEFAULT 'default',
    sound_enabled BOOLEAN DEFAULT true
);

-- GAMES table
CREATE TABLE IF NOT EXISTS public.games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
    game_mode TEXT DEFAULT 'multiplayer' CHECK (game_mode IN ('single_player', 'multiplayer')),
    max_players INTEGER DEFAULT 2 CHECK (max_players BETWEEN 2 AND 4),
    current_turn INTEGER DEFAULT 1,
    current_player_index INTEGER DEFAULT 0,
    -- Game configuration
    target_score INTEGER DEFAULT 100,
    turn_timeout_hours INTEGER DEFAULT 48,
    initial_word_length INTEGER DEFAULT 4 CHECK (initial_word_length BETWEEN 3 AND 8),
    theme TEXT DEFAULT 'default',
    -- Game state
    current_word TEXT DEFAULT 'PLAY',
    word_history TEXT[] DEFAULT ARRAY[]::TEXT[],
    key_letters TEXT[] DEFAULT ARRAY[]::TEXT[],
    locked_letters TEXT[] DEFAULT ARRAY[]::TEXT[],
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    winner_id UUID REFERENCES public.users(id)
);

-- GAME_PLAYERS table (junction table for users and games)
CREATE TABLE IF NOT EXISTS public.game_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    player_index INTEGER NOT NULL CHECK (player_index >= 0),
    score INTEGER DEFAULT 0,
    is_bot BOOLEAN DEFAULT false,
    bot_difficulty TEXT CHECK (bot_difficulty IN ('easy', 'medium', 'hard')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, user_id),
    UNIQUE(game_id, player_index)
);

-- TURNS table (game history and move tracking)
CREATE TABLE IF NOT EXISTS public.turns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    turn_number INTEGER NOT NULL,
    -- Turn data
    previous_word TEXT NOT NULL,
    new_word TEXT NOT NULL,
    actions_used JSONB DEFAULT '{}', -- {add: true, remove: true, move: true}
    key_letter_used TEXT,
    score_earned INTEGER DEFAULT 0,
    -- Turn metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_taken_seconds INTEGER,
    UNIQUE(game_id, turn_number)
);

-- Enable RLS on all tables AFTER creating them
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for games table
CREATE POLICY "Users can view games they participate in" ON public.games
    FOR SELECT USING (
        created_by = auth.uid() OR 
        id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create games" ON public.games
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Game participants can update game state" ON public.games
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid())
    );

-- RLS Policies for game_players table
CREATE POLICY "Users can view players in their games" ON public.game_players
    FOR SELECT USING (
        user_id = auth.uid() OR 
        game_id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can join games" ON public.game_players
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own player record" ON public.game_players
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for turns table
CREATE POLICY "Users can view turns in their games" ON public.turns
    FOR SELECT USING (
        game_id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create turns for their games" ON public.turns
    FOR INSERT WITH CHECK (
        player_id = auth.uid() AND
        game_id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid())
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_by ON public.games(created_by);
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON public.games(updated_at);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON public.game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON public.game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_turns_game_id ON public.turns(game_id);
CREATE INDEX IF NOT EXISTS idx_turns_player_id ON public.turns(player_id);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle user creation (called by auth trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email)
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
