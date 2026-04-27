"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  fetchAllLeaderboards,
  fetchLeaderboard,
  startSession,
  submitScore,
} from "@/app/actions/arcade"

export type GameId =
  | "rune-chase"
  | "glyph-reflex"
  | "memory-pulse"
  | "rune-match"
  | "sigil-trace"
  | "sigil-forge"

export type ScoreRow = {
  id: string
  game: GameId
  name: string
  score: number
  stats: Record<string, string | number>
  createdAt: number
}

type Session = { sessionId: string; token: string; startedAt: number; game: GameId }

type Submission =
  | { ok: true; rank: number | null; top: ScoreRow[] }
  | { ok: false; reason: string }

type Ctx = {
  playerName: string
  setPlayerName: (n: string) => void
  boards: Record<GameId, ScoreRow[]>
  refresh: (game?: GameId) => Promise<void>
  open: (game: GameId) => Promise<Session>
  submit: (p: {
    session: Session
    score: number
    stats?: Record<string, string | number>
  }) => Promise<Submission>
  lastSubmission: Submission | null
  lastGame: GameId | null
}

const ArcadeCtx = createContext<Ctx | null>(null)

const EMPTY_BOARDS: Record<GameId, ScoreRow[]> = {
  "rune-chase": [],
  "glyph-reflex": [],
  "memory-pulse": [],
  "rune-match": [],
  "sigil-trace": [],
  "sigil-forge": [],
}

const NAME_KEY = "vaish.arcade.name"

export function ArcadeProvider({ children }: { children: React.ReactNode }) {
  const [playerName, setPlayerNameState] = useState("")
  const [boards, setBoards] = useState<Record<GameId, ScoreRow[]>>(EMPTY_BOARDS)
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null)
  const [lastGame, setLastGame] = useState<GameId | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(NAME_KEY) || ""
    setPlayerNameState(saved)
  }, [])

  const setPlayerName = useCallback((n: string) => {
    setPlayerNameState(n)
    if (typeof window !== "undefined") window.localStorage.setItem(NAME_KEY, n)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAllLeaderboards()
      .then((all) => {
        if (!cancelled) setBoards(all as Record<GameId, ScoreRow[]>)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async (game?: GameId) => {
    if (game) {
      const top = await fetchLeaderboard(game)
      setBoards((prev) => ({ ...prev, [game]: top as ScoreRow[] }))
    } else {
      const all = await fetchAllLeaderboards()
      setBoards(all as Record<GameId, ScoreRow[]>)
    }
  }, [])

  const open = useCallback(async (game: GameId) => {
    setLastSubmission(null)
    setLastGame(game)
    const s = await startSession(game)
    return s as Session
  }, [])

  const submit = useCallback(
    async ({
      session,
      score,
      stats,
    }: {
      session: Session
      score: number
      stats?: Record<string, string | number>
    }) => {
      const durationMs = Date.now() - session.startedAt
      const name = playerName.trim() || "Wanderer"
      const res = await submitScore({
        sessionId: session.sessionId,
        token: session.token,
        game: session.game,
        score,
        name,
        durationMs,
        stats,
      })
      setLastSubmission(res as Submission)
      setLastGame(session.game)
      if ("ok" in res && res.ok) {
        setBoards((prev) => ({ ...prev, [session.game]: res.top as ScoreRow[] }))
      }
      return res as Submission
    },
    [playerName],
  )

  const value = useMemo<Ctx>(
    () => ({ playerName, setPlayerName, boards, refresh, open, submit, lastSubmission, lastGame }),
    [playerName, setPlayerName, boards, refresh, open, submit, lastSubmission, lastGame],
  )

  return <ArcadeCtx.Provider value={value}>{children}</ArcadeCtx.Provider>
}

export function useArcade() {
  const v = useContext(ArcadeCtx)
  if (!v) throw new Error("useArcade must be used within <ArcadeProvider>")
  return v
}
