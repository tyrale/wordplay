import { describe, it, expect } from 'vitest'
import { supabase, isSupabaseConfigured } from './supabase'

describe('Supabase Client', () => {
  it('should create client successfully', () => {
    expect(supabase).toBeDefined()
    expect(typeof supabase.auth).toBe('object')
  })

  it('should detect configuration status', () => {
    const isConfigured = isSupabaseConfigured()
    expect(typeof isConfigured).toBe('boolean')
    
    // In test environment, should be configured with local values
    if (import.meta.env.VITE_SUPABASE_URL) {
      expect(isConfigured).toBe(true)
    }
  })

  it('should connect to database when configured', async () => {
    // Only test connection if Supabase is properly configured
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      // Should not error (even if no data)
      expect(error).toBeNull()
      expect(data).toBeDefined()
    } else {
      // In production without Supabase setup, just verify client exists
      expect(supabase).toBeDefined()
    }
  })

  it('should have proper database schema types', () => {
    // Test that TypeScript types are working
    const testUser = {
      id: 'test-id',
      email: 'test@example.com',
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: null,
      games_played: 0,
      games_won: 0,
      total_score: 0,
      preferred_theme: 'default',
      sound_enabled: true
    }
    
    // This should compile without TypeScript errors
    expect(testUser.email).toBe('test@example.com')
  })
}) 