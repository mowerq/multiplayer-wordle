import { notFound } from "next/navigation"
import { getSupabaseServer } from "@/lib/supabase/server"
import GameBoard from "@/components/game-board"

export default async function GamePage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServer()

  // Get game data
  const { data: game, error } = await supabase.from("games").select("*").eq("id", params.id).single()

  if (error || !game) {
    notFound()
  }

  // Get players in the game
  const { data: gamePlayers } = await supabase
    .from("game_players")
    .select(`
      *,
      player:player_id(id, nickname)
    `)
    .eq("game_id", params.id)

  // Get guesses for this game
  const { data: guesses } = await supabase
    .from("guesses")
    .select(`
      *,
      player:player_id(id, nickname)
    `)
    .eq("game_id", params.id)
    .order("created_at", { ascending: true })

  return <GameBoard game={game} gamePlayers={gamePlayers || []} initialGuesses={guesses || []} />
}
