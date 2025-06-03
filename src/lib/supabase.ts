import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// For development phase, provide fallback values to prevent deployment failures
const defaultUrl = 'https://placeholder.supabase.co'
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export const supabase = createClient(
  supabaseUrl || defaultUrl,
  supabaseAnonKey || defaultKey
)

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== defaultUrl)
}

// Database types (generated from schema)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          games_played: number
          games_won: number
          total_score: number
          preferred_theme: string
          sound_enabled: boolean
        }
        Insert: {
          id: string
          email: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          games_played?: number
          games_won?: number
          total_score?: number
          preferred_theme?: string
          sound_enabled?: boolean
        }
        Update: {
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          games_played?: number
          games_won?: number
          total_score?: number
          preferred_theme?: string
          sound_enabled?: boolean
        }
      }
      games: {
        Row: {
          id: string
          created_by: string
          status: 'waiting' | 'active' | 'completed' | 'abandoned'
          game_mode: 'single_player' | 'multiplayer'
          max_players: number
          current_turn: number
          current_player_index: number
          target_score: number
          turn_timeout_hours: number
          initial_word_length: number
          theme: string
          current_word: string
          word_history: string[]
          key_letters: string[]
          locked_letters: string[]
          created_at: string
          updated_at: string
          completed_at: string | null
          winner_id: string | null
        }
        Insert: {
          created_by: string
          status?: 'waiting' | 'active' | 'completed' | 'abandoned'
          game_mode?: 'single_player' | 'multiplayer'
          max_players?: number
          current_turn?: number
          current_player_index?: number
          target_score?: number
          turn_timeout_hours?: number
          initial_word_length?: number
          theme?: string
          current_word?: string
          word_history?: string[]
          key_letters?: string[]
          locked_letters?: string[]
          completed_at?: string | null
          winner_id?: string | null
        }
        Update: {
          status?: 'waiting' | 'active' | 'completed' | 'abandoned'
          current_turn?: number
          current_player_index?: number
          current_word?: string
          word_history?: string[]
          key_letters?: string[]
          locked_letters?: string[]
          completed_at?: string | null
          winner_id?: string | null
        }
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          user_id: string
          player_index: number
          score: number
          is_bot: boolean
          bot_difficulty: 'easy' | 'medium' | 'hard' | null
          joined_at: string
          last_active: string
        }
        Insert: {
          game_id: string
          user_id: string
          player_index: number
          score?: number
          is_bot?: boolean
          bot_difficulty?: 'easy' | 'medium' | 'hard' | null
        }
        Update: {
          score?: number
          last_active?: string
        }
      }
      turns: {
        Row: {
          id: string
          game_id: string
          player_id: string
          turn_number: number
          previous_word: string
          new_word: string
          actions_used: Record<string, unknown>
          key_letter_used: string | null
          score_earned: number
          created_at: string
          time_taken_seconds: number | null
        }
        Insert: {
          game_id: string
          player_id: string
          turn_number: number
          previous_word: string
          new_word: string
          actions_used?: Record<string, unknown>
          key_letter_used?: string | null
          score_earned?: number
          time_taken_seconds?: number | null
        }
        Update: {
          actions_used?: Record<string, unknown>
          key_letter_used?: string | null
          score_earned?: number
          time_taken_seconds?: number | null
        }
      }
    }
  }
} 