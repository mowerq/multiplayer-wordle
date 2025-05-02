"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseClient } from "@/lib/supabase/client"
import { getRandomWord } from "@/lib/words"
import { LogOut } from "lucide-react"
import type { Database } from "@/lib/database.types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type Game = Database["public"]["Tables"]["games"]["Row"] & {
  game_players: { player_id: string }[]
}

interface DashboardProps {
  user: Profile
  activeGames: Game[]
}

export default function Dashboard({ user, activeGames }: DashboardProps) {
  const router = useRouter()
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const [gameCode, setGameCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSignOut = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push("/")
  }

  const handleCreateGame = async () => {
    setIsCreatingGame(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()
      const word = getRandomWord()

      // Create a new game
      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert([
          {
            creator_id: user.id,
            word,
            status: "waiting",
          },
        ])
        .select()
        .single()

      if (gameError) throw gameError

      // Add creator as a player
      const { error: playerError } = await supabase.from("game_players").insert([
        {
          game_id: game.id,
          player_id: user.id,
        },
      ])

      if (playerError) throw playerError

      router.push(`/game/${game.id}`)
    } catch (err: any) {
      setError(err.message || "Failed to create game")
    } finally {
      setIsCreatingGame(false)
    }
  }

  const handleJoinGame = async () => {
    setError(null)

    if (!gameCode.trim()) {
      setError("Please enter a game code")
      return
    }

    try {
      const supabase = getSupabaseClient()

      // Check if game exists
      const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameCode).single()

      if (gameError) throw new Error("Game not found")

      if (game.status === "completed") {
        throw new Error("This game has already ended")
      }

      // Check if already joined
      const { data: existingPlayer } = await supabase
        .from("game_players")
        .select("*")
        .eq("game_id", gameCode)
        .eq("player_id", user.id)
        .maybeSingle()

      if (!existingPlayer) {
        // Join the game
        const { error: joinError } = await supabase.from("game_players").insert([
          {
            game_id: gameCode,
            player_id: user.id,
          },
        ])

        if (joinError) throw joinError
      }

      router.push(`/game/${gameCode}`)
    } catch (err: any) {
      setError(err.message || "Failed to join game")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Multiplayer Wordle</h1>
            <p className="text-slate-300">Welcome, {user.username}!</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Start a New Game</CardTitle>
              <CardDescription>Create a new Wordle game and invite friends</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCreateGame} disabled={isCreatingGame} className="w-full">
                {isCreatingGame ? "Creating..." : "Create New Game"}
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
              <Button onClick={handleJoinGame} className="w-full">
                Join Game
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Your Active Games</h2>
          {activeGames.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-slate-500">You don't have any active games</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGames.map((game) => (
                <Card
                  key={game.id}
                  className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => router.push(`/game/${game.id}`)}
                >
                  <CardHeader>
                    <CardTitle>Game #{game.id.substring(0, 8)}</CardTitle>
                    <CardDescription>
                      Status: {game.status === "waiting" ? "Waiting for players" : "In progress"}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      Continue Game
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
