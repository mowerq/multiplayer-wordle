"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseClient } from "@/lib/supabase/client"
import { getRandomWord } from "@/lib/words"
import { getOrCreatePlayer, updatePlayerNickname, refreshPlayerInfo } from "@/lib/player"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, i18n } = useTranslation()

  const [nickname, setNickname] = useState("")
  const [gameCode, setGameCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const [isJoiningGame, setIsJoiningGame] = useState(false)
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerInitialized, setPlayerInitialized] = useState(false)
  const [language, setLanguage] = useState<"en" | "tr">("en")
  const [updateSuccess, setUpdateSuccess] = useState(false)

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

        // Get language preference from localStorage if available
        if (typeof window !== "undefined") {
          const savedLanguage = localStorage.getItem("wordle_language")
          if (savedLanguage === "en" || savedLanguage === "tr") {
            setLanguage(savedLanguage)
            i18n.changeLanguage(savedLanguage)
          }
        }
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
  }, [playerInitialized, i18n])

  const handleUpdateNickname = useCallback(async () => {
    if (!playerId || !nickname.trim()) {
      toast({
        title: t("toast.error"),
        description: t("toast.enterValidNickname"),
        variant: "destructive",
      })
      return
    }

    setIsUpdatingNickname(true)
    setError(null)
    setUpdateSuccess(false)

    try {
      console.log("Updating nickname for player:", playerId, "to:", nickname)
      await updatePlayerNickname(playerId, nickname)

      // Verify the update by fetching the player directly
      const supabase = getSupabaseClient()
      const { data: player, error: fetchError } = await supabase
        .from("players")
        .select("nickname")
        .eq("id", playerId)
        .single()

      if (fetchError) {
        throw new Error("Failed to verify nickname update")
      }

      console.log("Fetched player after update:", player)

      if (player.nickname !== nickname) {
        throw new Error("Nickname was not updated in the database")
      }

      // Force refresh player info to ensure we have the latest nickname
      await refreshPlayerInfo()

      setUpdateSuccess(true)
      toast({
        title: t("toast.success"),
        description: t("toast.nicknameUpdated"),
      })
    } catch (err) {
      console.error("Failed to update nickname:", err)
      setError("Failed to update nickname. Please try again.")
      toast({
        title: t("toast.error"),
        description: t("toast.updateFailed"),
        variant: "destructive",
      })
    } finally {
      setIsUpdatingNickname(false)
    }
  }, [playerId, nickname, toast, t])

  const handleLanguageChange = useCallback(
    (value: string) => {
      const newLanguage = value as "en" | "tr"
      setLanguage(newLanguage)
      i18n.changeLanguage(newLanguage)

      // Save language preference to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("wordle_language", newLanguage)
      }
    },
    [i18n],
  )

  const handleCreateSinglePlayerGame = useCallback(async () => {

    setIsCreatingGame(true)

    setError(null)



    try {

      if (!playerId) throw new Error("Player not initialized")



      // Refresh player info to ensure we have the latest nickname

      await refreshPlayerInfo()



      const supabase = getSupabaseClient()

      const word = getRandomWord(language)



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



      router.push(`/game/${game.id}?lang=${language}`)

    } catch (err: any) {

      console.error("Failed to create game:", err)

      setError(err.message || "Failed to create game")

    } finally {

      setIsCreatingGame(false)

    }

  }, [playerId, router, language])

  const handleCreateMultiplayerGame = useCallback(async () => {
    setIsCreatingGame(true)
    setError(null)

    try {
      if (!playerId) throw new Error("Player not initialized")

      // Refresh player info to ensure we have the latest nickname
      await refreshPlayerInfo()

      const supabase = getSupabaseClient()
      const word = getRandomWord(language)

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

      router.push(`/game/${game.id}?lang=${language}`)
    } catch (err: any) {
      console.error("Failed to create game:", err)
      setError(err.message || "Failed to create game")
    } finally {
      setIsCreatingGame(false)
    }
  }, [playerId, router, language])

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

      // Refresh player info to ensure we have the latest nickname
      await refreshPlayerInfo()

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

      router.push(`/game/${gameCode}?lang=${language}`)
    } catch (err: any) {
      console.error("Failed to join game:", err)
      setError(err.message || "Failed to join game")
    } finally {
      setIsJoiningGame(false)
    }
  }, [gameCode, playerId, router, language])

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
        <h1 className="text-4xl font-bold text-white mb-2">{t("app.title")}</h1>
        <p className="text-slate-300">{t("app.subtitle")}</p>
      </div>

      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.title")}</CardTitle>
            <CardDescription>{t("profile.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">{t("profile.nickname")}</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t("profile.nickname")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t("profile.language")}</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language">
                  <SelectValue placeholder={t("profile.language")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tr">Türkçe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {updateSuccess && <p className="text-sm text-green-500">{t("profile.updated")}</p>}
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpdateNickname} className="w-full" disabled={isUpdatingNickname}>
              {isUpdatingNickname ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("profile.updating")}
                </>
              ) : (
                t("profile.updateProfile")
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("play.title")}</CardTitle>
            <CardDescription>{t("play.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleCreateSinglePlayerGame} disabled={isCreatingGame} className="w-full">
              {isCreatingGame ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("play.creating")}
                </>
              ) : (
                t("play.solo")
              )}
            </Button>

            <Button
              onClick={handleCreateMultiplayerGame}
              disabled={isCreatingGame}
              className="w-full"
              variant="outline"
            >
              {isCreatingGame ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("play.creating")}
                </>
              ) : (
                t("play.multiplayer")
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("join.title")}</CardTitle>
            <CardDescription>{t("join.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gameCode">{t("join.gameCode")}</Label>
              <Input
                id="gameCode"
                placeholder={t("join.gameCode")}
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button onClick={handleJoinGame} disabled={isJoiningGame} className="w-full">
              {isJoiningGame ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("join.joining")}
                </>
              ) : (
                t("join.joinGame")
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
