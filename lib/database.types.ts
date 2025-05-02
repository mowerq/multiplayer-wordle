export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string
          nickname: string
          session_id: string
          created_at: string
        }
        Insert: {
          id?: string
          nickname: string
          session_id: string
          created_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          session_id?: string
          created_at?: string
        }
      }
      games: {
        Row: {
          id: string
          creator_id: string | null
          word: string
          max_attempts: number
          status: string
          winner_id: string | null
          is_multiplayer: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id?: string | null
          word: string
          max_attempts?: number
          status?: string
          winner_id?: string | null
          is_multiplayer?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string | null
          word?: string
          max_attempts?: number
          status?: string
          winner_id?: string | null
          is_multiplayer?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          joined_at?: string
        }
      }
      guesses: {
        Row: {
          id: string
          game_id: string
          player_id: string
          guess: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          guess: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          guess?: string
          created_at?: string
        }
      }
    }
  }
}
