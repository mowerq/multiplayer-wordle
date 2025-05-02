"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase/client"
import { evaluateGuess, type LetterState } from "@/lib/words"
import { getOrCreatePlayer, type PlayerInfo } from "@/lib/player"
import { ArrowLeft, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import WordleKeyboard from "./wordle-keyboard"
import PlayerList from "./player-list"
import type { Database } from "@/lib/database.types"

type Game = Database["public"]["Tables"]["games"]["Row"]
type GamePlayer = Database["public"]["Tables"]["game_players"]["Row"] & {
  player: {
    id: string
    nickname: string
  }
}
type Guess = Database["public"]["Tables"]["guesses"]["Row"] & {
  player: {
    id: string
    nickname: string
  }
}

interface GameBoardProps {
  game: Game
  gamePlayers: GamePlayer[]
  initialGuesses: Guess[]
}

export default function GameBoard({ game, gamePlayers: initialGamePlayers, initialGuesses }: GameBoardProps) {
  // Refs to prevent re-renders
  const mountedRef = useRef(true)
  const playerRef = useRef<PlayerInfo | null>(null)
  const channelRef = useRef<any>(null)
  const guessesRef = useRef<Guess[]>(initialGuesses)
  const gamePlayersRef = useRef<GamePlayer[]>(initialGamePlayers)
  const gameStatusRef = useRef(game.status)
  const keyboardStatesRef = useRef<Record<string, LetterState>>({})

  // UI state that needs to trigger re-renders
  const [isLoading, setIsLoading] = useState(true)
  const [currentGuess, setCurrentGuess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, forceUpdate] = useState({})

  // Router and toast
  const router = useRouter()
  const { toast } = useToast()

  // Force a re-render
  const triggerRender = useCallback(() => {
    forceUpdate({})
  }, [])

  // Submit guess - define this before handleKeyPress
  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== 5 || isSubmitting || !playerRef.current) return

    setIsSubmitting(true)

    try {
      const supabase = getSupabaseClient()

      // Submit the guess
      const { error } = await supabase.from("guesses").insert([
        {
          game_id: game.id,
          player_id: playerRef.current.id,
          guess: currentGuess,
        },
      ])

      if (error) throw error

      // Check if this is a winning guess
      if (currentGuess === game.word) {
        // Update game status
        await supabase
          .from("games")
          .update({
            status: "completed",
            winner_id: playerRef.current.id,
          })
          .eq("id", game.id)
      }

      setCurrentGuess("")
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to submit guess",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [currentGuess, game.id, game.word, isSubmitting, toast])

  // Handle keyboard input - now submitGuess is defined before this
  const handleKeyPress = useCallback(
    (key: string) => {
      if (!playerRef.current) return

      const userGuesses = guessesRef.current.filter((guess) => guess.player_id === playerRef.current?.id)

      const isGameOver = gameStatusRef.current === "completed" || userGuesses.length >= game.max_attempts

      if (isGameOver || isSubmitting) return

      if (key === "ENTER") {
        if (currentGuess.length === 5) {
          submitGuess()
        }
      } else if (key === "BACKSPACE") {
        setCurrentGuess((prev) => prev.slice(0, -1))
      } else if (currentGuess.length < 5 && /^[A-Z]$/.test(key)) {
        setCurrentGuess((prev) => prev + key)
      }
    },
    [currentGuess, isSubmitting, game.max_attempts, submitGuess],
  )

  // Initialize everything in a single effect with no dependencies
  useEffect(() => {
    // Set mounted ref
    mountedRef.current = true

    // Initialize player and game
    const initialize = async () => {
      try {
        // Get or create player
        const playerInfo = await getOrCreatePlayer()
        if (!mountedRef.current) return

        // Store in ref
        playerRef.current = playerInfo

        // Join game if needed
        const isInGame = initialGamePlayers.some((gp) => gp.player_id === playerInfo.id)
        if (!isInGame) {
          const supabase = getSupabaseClient()
          await supabase.from("game_players").insert({
            game_id: game.id,
            player_id: playerInfo.id,
          })
        }

        // Set up Supabase channel
        setupChannel()

        // Update keyboard states
        updateKeyboardStates()

        // Done loading
        if (mountedRef.current) {
          setIsLoading(false)
          triggerRender()
        }
      } catch (error) {
        console.error("Initialization error:", error)
        if (mountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    initialize()

    // Cleanup function
    return () => {
      mountedRef.current = false

      // Clean up Supabase channel
      if (channelRef.current) {
        const supabase = getSupabaseClient()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, []) // Empty dependency array - run once only

  // Set up Supabase channel
  const setupChannel = useCallback(() => {
    const supabase = getSupabaseClient()

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create a new channel with a unique name
    const channel = supabase.channel(`game-${game.id}-${Date.now()}`)

    // Listen for new guesses
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "guesses",
        filter: `game_id=eq.${game.id}`,
      },
      async (payload) => {
        if (!mountedRef.current) return

        try {
          // Fetch the complete guess with player info
          const { data } = await supabase
            .from("guesses")
            .select(`*, player:player_id(id, nickname)`)
            .eq("id", payload.new.id)
            .single()

          if (data && mountedRef.current) {
            // Check if we already have this guess
            if (!guessesRef.current.some((g) => g.id === data.id)) {
              guessesRef.current = [...guessesRef.current, data as Guess]
              updateKeyboardStates()
              triggerRender()
            }
          }
        } catch (error) {
          console.error("Error fetching new guess:", error)
        }
      },
    )

    // Listen for game status changes
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${game.id}`,
      },
      (payload) => {
        if (!mountedRef.current) return
        gameStatusRef.current = payload.new.status
        triggerRender()
      },
    )

    // Listen for new players
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_players",
        filter: `game_id=eq.${game.id}`,
      },
      async (payload) => {
        if (!mountedRef.current) return

        try {
          // Fetch the complete player with profile
          const { data } = await supabase
            .from("game_players")
            .select(`*, player:player_id(id, nickname)`)
            .eq("id", payload.new.id)
            .single()

          if (data && mountedRef.current) {
            // Check if we already have this player
            if (!gamePlayersRef.current.some((p) => p.id === data.id)) {
              gamePlayersRef.current = [...gamePlayersRef.current, data as GamePlayer]
              triggerRender()
            }
          }
        } catch (error) {
          console.error("Error fetching new player:", error)
        }
      },
    )

    // Subscribe to all changes
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        console.error("Failed to subscribe to channel:", status)
      }
    })

    // Store the channel for cleanup
    channelRef.current = channel
  }, [game.id, triggerRender])

  // Update keyboard states
  const updateKeyboardStates = useCallback(() => {
    if (!playerRef.current) return

    const userGuesses = guessesRef.current.filter((guess) => guess.player_id === playerRef.current?.id)

    const newKeyboardStates: Record<string, LetterState> = {}

    userGuesses.forEach((guess) => {
      const evaluation = evaluateGuess(guess.guess, game.word)

      for (let i = 0; i < guess.guess.length; i++) {
        const letter = guess.guess[i]
        const currentState = newKeyboardStates[letter]
        const newState = evaluation[i]

        // Only override if the new state is better
        if (
          !currentState ||
          (currentState === "absent" && (newState === "present" || newState === "correct")) ||
          (currentState === "present" && newState === "correct")
        ) {
          newKeyboardStates[letter] = newState
        }
      }
    })

    keyboardStatesRef.current = newKeyboardStates
  }, [game.word])

  // Copy game link
  const copyGameLink = useCallback(() => {
    const url = `${window.location.origin}/game/${game.id}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Link copied!",
      description: "Share this link with your friends to invite them to the game",
    })
  }, [game.id, toast])

  // Compute derived state for rendering
  const player = playerRef.current
  const guesses = guessesRef.current
  const gamePlayers = gamePlayersRef.current
  const gameStatus = gameStatusRef.current
  const keyboardStates = keyboardStatesRef.current

  const userGuesses = player ? guesses.filter((guess) => guess.player_id === player.id) : []

  const isGameOver = gameStatus === "completed" || userGuesses.length >= game.max_attempts

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Wordle</h1>
              <p className="text-slate-300">Game ID: {game.id.substring(0, 8)}...</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyGameLink}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6 bg-slate-800 border-slate-700">
              <div className="grid grid-cols-5 gap-2 mb-4">
                {Array.from({ length: game.max_attempts }).flatMap((_, attemptIndex) => {
                  const guess = userGuesses[attemptIndex]
                  const isCurrentRow = attemptIndex === userGuesses.length && !isGameOver

                  return Array.from({ length: 5 }).map((_, letterIndex) => {
                    let letter = ""
                    let state: LetterState | "" = ""

                    if (guess) {
                      letter = guess.guess[letterIndex]
                      state = evaluateGuess(guess.guess, game.word)[letterIndex]
                    } else if (isCurrentRow && letterIndex < currentGuess.length) {
                      letter = currentGuess[letterIndex]
                    }

                    return (
                      <div
                        key={`${attemptIndex}-${letterIndex}`}
                        className={`
                          w-full aspect-square flex items-center justify-center text-2xl font-bold border-2 
                          ${
                            state === "correct"
                              ? "bg-green-600 border-green-600 text-white"
                              : state === "present"
                                ? "bg-yellow-600 border-yellow-600 text-white"
                                : state === "absent"
                                  ? "bg-gray-700 border-gray-700 text-white"
                                  : letter
                                    ? "border-gray-500"
                                    : "border-gray-700"
                          }
                        `}
                      >
                        {letter}
                      </div>
                    )
                  })
                })}
              </div>

              <WordleKeyboard
                onKeyPress={handleKeyPress}
                keyStates={keyboardStates}
                disabled={isGameOver || isSubmitting}
              />

              {isGameOver && (
                <div className="mt-6 p-4 bg-slate-700 rounded-md text-center">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {userGuesses.some((g) => g.guess === game.word) ? "You won!" : "Game Over"}
                  </h3>
                  <p className="text-slate-300">
                    The word was: <span className="font-bold">{game.word}</span>
                  </p>
                  <Button className="mt-4" onClick={() => router.push("/")}>
                    Back to Home
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <div>
            {game.is_multiplayer && <PlayerList players={gamePlayers} currentPlayerId={player?.id || ""} />}

            <Card className="mt-6 bg-slate-800 border-slate-700">
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-4">Recent Guesses</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {guesses.length === 0 ? (
                    <p className="text-slate-400 text-sm">No guesses yet</p>
                  ) : (
                    guesses.map((guess) => (
                      <div key={guess.id} className="flex items-center justify-between p-2 rounded bg-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {player && guess.player_id === player.id ? "You" : guess.player.nickname}:
                          </span>
                          <div className="flex gap-1">
                            {guess.guess.split("").map((letter, i) => (
                              <span
                                key={i}
                                className={`
                                  w-6 h-6 flex items-center justify-center text-xs font-bold
                                  ${
                                    player && guess.player_id === player.id
                                      ? evaluateGuess(guess.guess, game.word)[i] === "correct"
                                        ? "bg-green-600 text-white"
                                        : evaluateGuess(guess.guess, game.word)[i] === "present"
                                          ? "bg-yellow-600 text-white"
                                          : "bg-gray-700 text-white"
                                      : "bg-slate-600 text-white"
                                  }
                                `}
                              >
                                {letter}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
