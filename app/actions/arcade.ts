"use server"

import { openSession, submit, getTop, getAllTop, type GameId } from "@/lib/arcade-server"

export async function startSession(game: GameId) {
  return openSession(game)
}

export async function submitScore(payload: {
  sessionId: string
  token: string
  game: GameId
  score: number
  name: string
  durationMs: number
  stats?: Record<string, unknown>
}) {
  return submit(payload)
}

export async function fetchLeaderboard(game: GameId) {
  return getTop(game)
}

export async function fetchAllLeaderboards() {
  return getAllTop()
}
