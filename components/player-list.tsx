"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Database } from "@/lib/database.types"

type GamePlayer = Database["public"]["Tables"]["game_players"]["Row"] & {
  player: {
    id: string
    nickname: string
  }
}

interface PlayerListProps {
  players: GamePlayer[]
  currentPlayerId: string
}

export default function PlayerList({ players, currentPlayerId }: PlayerListProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-white">Players ({players.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {players.map((gamePlayer) => (
            <div key={gamePlayer.id} className="flex items-center gap-3 p-2 rounded bg-slate-700">
              <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center">
                {gamePlayer.player.nickname.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white">
                {gamePlayer.player_id === currentPlayerId
                  ? `${gamePlayer.player.nickname} (You)`
                  : gamePlayer.player.nickname}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
