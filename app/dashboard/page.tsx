import { redirect } from "next/navigation"
import { getSupabaseServer } from "@/lib/supabase/server"
import Dashboard from "@/components/dashboard"

export default async function DashboardPage() {
  const supabase = getSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  // Get active games
  const { data: activeGames } = await supabase
    .from("games")
    .select(`
      *,
      game_players!inner(player_id)
    `)
    .eq("game_players.player_id", session.user.id)
    .neq("status", "completed")
    .order("created_at", { ascending: false })

  return <Dashboard user={profile} activeGames={activeGames || []} />
}
