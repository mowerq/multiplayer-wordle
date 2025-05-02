"use client"

import { v4 as uuidv4 } from "uuid"
import { getSupabaseClient } from "./supabase/client"

// Player management using session storage
export interface PlayerInfo {
  id: string
  nickname: string
  sessionId: string
}

const PLAYER_KEY = "wordle_player"

// Cache the player info to avoid multiple DB calls
let cachedPlayer: PlayerInfo | null = null

export const getOrCreatePlayer = async (): Promise<PlayerInfo> => {
  // Return cached player if available
  if (cachedPlayer) {
    return cachedPlayer
  }

  // Check if we already have player info in session storage
  if (typeof window !== "undefined") {
    try {
      const storedPlayer = sessionStorage.getItem(PLAYER_KEY)

      if (storedPlayer) {
        try {
          const playerInfo = JSON.parse(storedPlayer)
          // Validate the stored player info has the expected structure
          if (playerInfo && playerInfo.id && playerInfo.nickname && playerInfo.sessionId) {
            cachedPlayer = playerInfo
            return playerInfo
          }
        } catch (e) {
          console.error("Failed to parse stored player:", e)
          // Continue to create a new player if parsing fails
        }
      }
    } catch (e) {
      console.error("Error accessing sessionStorage:", e)
      // Continue execution if sessionStorage is not available
    }
  }

  // Generate a random nickname if none exists
  const randomNickname = `Player${Math.floor(Math.random() * 10000)}`

  // Create a new player
  const sessionId = uuidv4()
  const supabase = getSupabaseClient()

  try {
    const { data: player, error } = await supabase
      .from("players")
      .insert({
        nickname: randomNickname,
        session_id: sessionId,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating player:", error)
      throw error
    }

    const playerInfo: PlayerInfo = {
      id: player.id,
      nickname: player.nickname,
      sessionId: player.session_id,
    }

    // Store in session storage and cache
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(PLAYER_KEY, JSON.stringify(playerInfo))
      } catch (e) {
        console.error("Error saving to sessionStorage:", e)
      }
    }

    cachedPlayer = playerInfo
    return playerInfo
  } catch (error) {
    console.error("Failed to create player:", error)
    throw error
  }
}

export const updatePlayerNickname = async (playerId: string, nickname: string): Promise<void> => {
  if (!nickname.trim()) return

  try {
    const supabase = getSupabaseClient()

    await supabase.from("players").update({ nickname }).eq("id", playerId)

    // Update session storage and cache
    if (typeof window !== "undefined") {
      try {
        const storedPlayer = sessionStorage.getItem(PLAYER_KEY)

        if (storedPlayer) {
          const playerInfo = JSON.parse(storedPlayer)
          playerInfo.nickname = nickname
          sessionStorage.setItem(PLAYER_KEY, JSON.stringify(playerInfo))

          // Update cache
          if (cachedPlayer) {
            cachedPlayer.nickname = nickname
          }
        }
      } catch (e) {
        console.error("Error updating sessionStorage:", e)
      }
    }
  } catch (error) {
    console.error("Failed to update nickname:", error)
    throw error
  }
}
