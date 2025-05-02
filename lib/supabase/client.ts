"use client"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Create a single instance of the Supabase client to be used across the client-side application
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
}
