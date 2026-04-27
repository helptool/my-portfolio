"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useArcade, type GameId, type ScoreRow } from "./arcade-context"

export function LeaderboardPanel({ game, gameName }: { game: GameId; gameName: string }) {
  const { boards, refresh, lastSubmission, lastGame } = useArcade()
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const rows = boards[game] ?? []

  useEffect(() => {
    void refresh(game)
  }, [game, refresh])

  useEffect(() => {
    if (lastGame !== game) return
    if (!lastSubmission || !("ok" in lastSubmission) || !lastSubmission.ok) return
    const top = lastSubmission.top
    // Find the most recent entry (highest createdAt)
    if (!top.length) return
    const latest = [...top].sort((a, b) => b.createdAt - a.createdAt)[0]
    if (!latest) return
    setHighlightId(latest.id)
    const t = setTimeout(() => setHighlightId(null), 5000)
    return () => clearTimeout(t)
  }, [lastSubmission, lastGame, game])

  return (
    <div className="frame-hairline relative bg-background/40">
      <span aria-hidden className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t border-l border-primary/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-primary/60" />
      <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
        <div className="font-hud text-foreground/70">Leaderboard // Top 10</div>
        <div className="font-hud text-foreground/75">{gameName}</div>
      </div>

      <div className="px-2 py-2">
        {rows.length === 0 ? (
          <div className="px-3 py-5 font-hud text-foreground/45">
            No scores yet. First entry sets the pace.
          </div>
        ) : (
          <ul className="divide-y divide-foreground/8">
            <AnimatePresence initial={false}>
              {rows.slice(0, 10).map((r, i) => (
                <LeaderRow key={r.id} row={r} rank={i + 1} isMine={r.id === highlightId} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="border-t border-foreground/10 px-4 py-2 font-hud text-foreground/45">
        Scores server-verified // rate-capped per game
      </div>
    </div>
  )
}

function LeaderRow({ row, rank, isMine }: { row: ScoreRow; rank: number; isMine: boolean }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, backgroundColor: isMine ? "oklch(0.74 0.15 52 / 0.1)" : "transparent" }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 px-3 py-2.5"
    >
      <span className="font-hud w-6 text-foreground/70 tabular-nums">
        {String(rank).padStart(2, "0")}
      </span>
      <span className="flex-1 truncate font-wordmark-tight text-[15px] text-foreground">
        {row.name}
        {isMine ? (
          <span className="ml-2 align-middle border border-primary/50 bg-primary/10 px-1.5 py-[1px] font-hud text-primary">
            You
          </span>
        ) : null}
      </span>
      <span className="font-hud tabular-nums text-foreground/85">
        {String(row.score).padStart(3, "0")}
      </span>
    </motion.li>
  )
}

export function PlayerTag() {
  const { playerName, setPlayerName } = useArcade()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(playerName)

  useEffect(() => {
    setDraft(playerName)
  }, [playerName])

  return (
    <div className="frame-hairline relative flex items-center justify-between gap-3 bg-background/40 px-4 py-3">
      <span aria-hidden className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t border-l border-primary/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-primary/60" />
      <div className="min-w-0 flex-1">
        <div className="font-hud text-foreground/70">Player Tag</div>
        {editing ? (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 20))}
            onBlur={() => {
              setPlayerName(draft.trim())
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                setPlayerName(draft.trim())
                setEditing(false)
              } else if (e.key === "Escape") {
                setDraft(playerName)
                setEditing(false)
              }
            }}
            placeholder="Name yourself"
            className="mt-0.5 w-full bg-transparent font-wordmark-tight text-xl text-foreground placeholder:text-foreground/25 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            data-cursor="hover"
            data-cursor-label={playerName ? "Rename" : "Name"}
            className="mt-0.5 block truncate font-wordmark-tight text-xl text-foreground"
          >
            {playerName || <span className="text-foreground/35">Click to set name</span>}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setEditing((e) => !e)}
        data-cursor="hover"
        className="font-hud text-primary transition-colors hover:text-foreground"
      >
        {editing ? "Save" : playerName ? "Edit" : "Set"}
      </button>
    </div>
  )
}
