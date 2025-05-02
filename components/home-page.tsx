"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseClient } from "@/lib/supabase/client"
import { getRandomWord } from "@/lib/words"
import { getOrCreatePlayer, updatePlayerNickname } from "@/lib/player"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [nickname, setNickname] = useState("")
  const [gameCode, setGameCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const [isJoiningGame, setIsJoiningGame] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerInitialized, setPlayerInitialized] = useState(false)

  useEffect(() => {
    if (playerInitialized) return

    let isMounted = true

    const initPlayer = async () => {
      try {
        const player = await getOrCreatePlayer()
        if (!isMounted) return

        setNickname(player.nickname)
        setPlayerId(player.id)
        setPlayerInitialized(true)
      } catch (err) {
        console.error("Failed to initialize player:", err)
        if (isMounted) {
          setError("Failed to initialize player. Please try refreshing the page.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initPlayer()

    return () => {
      isMounted = false
    }
  }, [playerInitialized])

  const handleUpdateNickname = useCallback(async () => {
    if (!playerId || !nickname.trim()) return

    try {
      await updatePlayerNickname(playerId, nickname)
    } catch (err) {
      console.error("Failed to update nickname:", err)
      setError("Failed to update nickname. Please try again.")
    }
  }, [playerId, nickname])

  const handleCreateSinglePlayerGame = useCallback(async () => {
    setIsCreatingGame(true)
    setError(null)

    try {
      if (!playerId) throw new Error("Player not initialized")

      const supabase = getSupabaseClient()
      const word = getRandomWord()

      // Create a new game
      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert([
          {
            creator_id: playerId,
            word,
            status: "active",
            is_multiplayer: false,
          },
        ])
        .select()
        .single()

      if (gameError) throw gameError

      // Add creator as a player
      const { error: playerError } = await supabase.from("game_players").insert([
        {
          game_id: game.id,
          player_id: playerId,
        },
      ])

      if (playerError) throw playerError

      router.push(`/game/${game.id}`)
    } catch (err: any) {
      console.error("Failed to create game:", err)
      setError(err.message || "Failed to create game")
    } finally {
      setIsCreatingGame(false)
    }
  }, [playerId, router])

  const handleCreateMultiplayerGame = useCallback(async () => {
    setIsCreatingGame(true)
    setError(null)

    try {
      if (!playerId) throw new Error("Player not initialized")

      const supabase = getSupabaseClient()
      const word = getRandomWord()

      // Create a new game
      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert([
          {
            creator_id: playerId,
            word,
            status: "active",
            is_multiplayer: true,
          },
        ])
        .select()
        .single()

      if (gameError) throw gameError

      // Add creator as a player
      const { error: playerError } = await supabase.from("game_players").insert([
        {
          game_id: game.id,
          player_id: playerId,
        },
      ])

      if (playerError) throw playerError

      router.push(`/game/${game.id}`)
    } catch (err: any) {
      console.error("Failed to create game:", err)
      setError(err.message || "Failed to create game")
    } finally {
      setIsCreatingGame(false)
    }
  }, [playerId, router])

  const handleJoinGame = useCallback(async () => {
    setIsJoiningGame(true)
    setError(null)

    if (!gameCode.trim()) {
      setError("Please enter a game code")
      setIsJoiningGame(false)
      return
    }

    try {
      if (!playerId) throw new Error("Player not initialized")

      const supabase = getSupabaseClient()

      // Check if game exists
      const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameCode).single()

      if (gameError) throw new Error("Game not found")

      if (game.status === "completed") {
        throw new Error("This game has already ended")
      }

      if (!game.is_multiplayer) {
        throw new Error("This is not a multiplayer game")
      }

      // Check if already joined
      const { data: existingPlayer } = await supabase
        .from("game_players")
        .select("*")
        .eq("game_id", gameCode)
        .eq("player_id", playerId)
        .maybeSingle()

      if (!existingPlayer) {
        // Join the game
        const { error: joinError } = await supabase.from("game_players").insert([
          {
            game_id: gameCode,
            player_id: playerId,
          },
        ])

        if (joinError) throw joinError
      }

      router.push(`/game/${gameCode}`)
    } catch (err: any) {
      console.error("Failed to join game:", err)
      setError(err.message || "Failed to join game")
    } finally {
      setIsJoiningGame(false)
    }
  }, [gameCode, playerId, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Multiplayer Wordle</h1>
        <p className="text-slate-300">Play alone or with friends in real-time</p>
      </div>

      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Set your nickname for multiplayer games</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpdateNickname} className="w-full">
              Update Nickname
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Play Wordle</CardTitle>
            <CardDescription>Choose how you want to play</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleCreateSinglePlayerGame} disabled={isCreatingGame} className="w-full">
              {isCreatingGame ? "Creating..." : "Play Solo"}
            </Button>

            <Button
              onClick={handleCreateMultiplayerGame}
              disabled={isCreatingGame}
              className="w-full"
              variant="outline"
            >
              {isCreatingGame ? "Creating..." : "Create Multiplayer Game"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join a Game</CardTitle>
            <CardDescription>Enter a game code to join an existing game</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gameCode">Game Code</Label>
              <Input
                id="gameCode"
                placeholder="Enter game code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button onClick={handleJoinGame} disabled={isJoiningGame} className="w-full">
              {isJoiningGame ? "Joining..." : "Join Game"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
