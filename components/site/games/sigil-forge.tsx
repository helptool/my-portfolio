"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Magnetic } from "../magnetic"
import { useArcade } from "../arcade/arcade-context"
import { cn } from "@/lib/utils"

/**
 * Sigil Forge :: a Lights-Out-style puzzle game.
 * - 4x4 grid, each cell can be Dim or Lit.
 * - Tapping a cell toggles it AND its orthogonal neighbors.
 * - Goal: light every cell in the grid (forge the sigil).
 * - 90 second round, unlimited puzzles, difficulty grows with each solve.
 *
 * Score per solve = 40 (base) + max(0, 40 - extraMoves*4) + remaining_ticks(2/sec).
 * Totally distinct mechanic from the other six reflex/memory/timing games.
 */

const STORAGE_KEY = "vaish.sigilforge.best"
const SIZE = 4
const TIME_LIMIT = 90

type Cell = { lit: boolean; just: boolean }

function makeBoard(): Cell[][] {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({ lit: true, just: false })),
  )
}

function applyToggle(board: Cell[][], r: number, c: number) {
  const next = board.map((row) => row.map((cell) => ({ ...cell, just: false })))
  const flips: [number, number][] = [
    [r, c],
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ]
  for (const [rr, cc] of flips) {
    if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) continue
    next[rr][cc] = { lit: !next[rr][cc].lit, just: true }
  }
  return next
}

// Generate a solvable puzzle by starting from "all lit" and applying N random toggles.
// With SIZE=4, Lights-Out toggles are their own inverse, so the solution exists
// and optimal moves ≈ shuffleCount.
function generate(shuffleCount: number): { board: Cell[][]; optimal: number } {
  let board = makeBoard()
  const used = new Set<string>()
  let count = 0
  while (count < shuffleCount) {
    const r = Math.floor(Math.random() * SIZE)
    const c = Math.floor(Math.random() * SIZE)
    const k = `${r},${c}`
    if (used.has(k)) continue
    used.add(k)
    board = applyToggle(board, r, c)
    count++
  }
  // Strip "just" flags from generation
  return {
    board: board.map((row) => row.map((cell) => ({ lit: cell.lit, just: false }))),
    optimal: shuffleCount,
  }
}

function allLit(board: Cell[][]) {
  for (const row of board) for (const cell of row) if (!cell.lit) return false
  return true
}

function litCount(board: Cell[][]) {
  let n = 0
  for (const row of board) for (const cell of row) if (cell.lit) n++
  return n
}

// Small vector icon per cell, rune-themed.
function RuneMark({ id, className }: { id: number; className?: string }) {
  const paths = [
    <path key="0" d="M12 2v20M4 8h16M4 16h16" />,
    <path key="1" d="M12 2l10 10-10 10L2 12z" />,
    <path key="2" d="M3 6l9 16 9-16M3 6h18" />,
    <path key="3" d="M5 5h14v14H5zM5 12h14M12 5v14" />,
    <path key="4" d="M12 3a9 9 0 100 18 9 9 0 000-18zM7 12h10" />,
    <path key="5" d="M12 3l4 18M8 21L12 3M4 12h16" />,
    <path key="6" d="M4 20L12 4l8 16M7 15h10" />,
    <path key="7" d="M6 6l12 12M18 6L6 18M12 3v18" />,
  ]
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {paths[id % paths.length]}
    </svg>
  )
}

export function SigilForgeGame() {
  const arcadeCtx = useArcade()
  const sessionRef = useRef<Awaited<ReturnType<typeof arcadeCtx.open>> | null>(null)

  const [phase, setPhase] = useState<"idle" | "playing" | "ended">("idle")
  const [board, setBoard] = useState<Cell[][]>(() => generate(4).board)
  const [optimal, setOptimal] = useState(4)
  const [moves, setMoves] = useState(0)
  const [solved, setSolved] = useState(0)
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(TIME_LIMIT)
  const [best, setBest] = useState(0)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [runeIds] = useState<number[][]>(() =>
    Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => Math.floor(Math.random() * 8))),
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const v = Number(localStorage.getItem(STORAGE_KEY) || "0")
    if (!Number.isNaN(v)) setBest(v)
  }, [])

  useEffect(() => {
    if (phase !== "playing") return
    if (time <= 0) {
      endGame()
      return
    }
    const id = setTimeout(() => setTime((t) => t - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, time])

  const startGame = useCallback(() => {
    const { board: b, optimal: o } = generate(4)
    setBoard(b)
    setOptimal(o)
    setMoves(0)
    setSolved(0)
    setScore(0)
    setTime(TIME_LIMIT)
    setSubmitMsg(null)
    setPhase("playing")
    arcadeCtx.open("sigil-forge").then((s) => { sessionRef.current = s }).catch(() => {})
  }, [arcadeCtx])

  const endGame = useCallback(() => {
    setPhase("ended")
    setBest((b) => {
      const next = Math.max(b, score)
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
    const sess = sessionRef.current
    if (sess && score > 0) {
      arcadeCtx
        .submit({ session: sess, score, stats: { solved, moves } })
        .then((res) => {
          if (res.ok) setSubmitMsg(res.rank ? `Entered leaderboard #${res.rank}.` : "Score recorded.")
          else setSubmitMsg(`Not recorded // ${res.reason}`)
        })
        .catch(() => setSubmitMsg("Not recorded."))
    }
    sessionRef.current = null
  }, [score, solved, moves, arcadeCtx])

  const onTap = useCallback(
    (r: number, c: number) => {
      if (phase !== "playing") return
      setBoard((prev) => {
        const next = applyToggle(prev, r, c)
        const newMoves = moves + 1
        setMoves(newMoves)
        if (allLit(next)) {
          // Solve bonus
          const extra = Math.max(0, newMoves - optimal)
          const efficiency = Math.max(0, 40 - extra * 4)
          const timeBonus = Math.min(40, time * 2)
          const delta = 40 + efficiency + timeBonus
          setScore((s) => s + delta)
          setSolved((s) => s + 1)
          setFlash(true)
          setTimeout(() => setFlash(false), 480)
          // Next puzzle, shuffle depth grows slowly
          setTimeout(() => {
            const depth = Math.min(12, 4 + Math.floor((solved + 1) / 1.5))
            const { board: nb, optimal: no } = generate(depth)
            setBoard(nb)
            setOptimal(no)
            setMoves(0)
          }, 520)
        }
        return next
      })
    },
    [phase, moves, optimal, time, solved],
  )

  const lit = litCount(board)
  const total = SIZE * SIZE

  return (
    <div className="relative frame-corners frame-hairline aspect-[16/10] sm:aspect-[16/9] bg-background/50 overflow-hidden">
      <div className="corner-tl" /><div className="corner-br" />
      <div className="absolute inset-0 grid-lines opacity-25" />
      <div
        aria-hidden
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%,oklch(0.74 0.15 52 / 0.08),transparent 70%)",
        }}
      />

      {/* HUD */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between font-hud text-foreground/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-primary animate-pulse-soft" />
            <span>Score</span>
          </div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">
            {String(score).padStart(3, "0")}
          </div>
        </div>
        <div className="text-center space-y-1">
          <div>Sigils</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none text-primary">
            {String(solved).padStart(2, "0")}
          </div>
        </div>
        <div className="text-right space-y-1">
          <div>Time</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">
            {String(time).padStart(2, "0")}s
          </div>
        </div>
      </div>

      {/* Progress toward "all lit" */}
      <div className="pointer-events-none absolute left-3 right-3 top-[72px] sm:top-[84px] h-px bg-foreground/10 overflow-hidden">
        <motion.span
          animate={{ scaleX: lit / total }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="block h-full origin-left bg-primary"
        />
      </div>

      {/* Board */}
      <div className="absolute inset-0 flex items-center justify-center px-4 py-24">
        <div className="relative">
          {/* Flash pulse on solve */}
          <AnimatePresence>
            {flash && (
              <motion.span
                aria-hidden
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1.4 }}
                exit={{ opacity: 0, scale: 1.9 }}
                transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute inset-0 rounded-md bg-primary/18"
              />
            )}
          </AnimatePresence>

          <div
            className="grid gap-1.5 sm:gap-2 p-2 border border-foreground/10 bg-background/40"
            style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isLit = cell.lit
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => onTap(r, c)}
                    disabled={phase !== "playing"}
                    data-cursor="play"
                    data-cursor-label={isLit ? "Lit" : "Dim"}
                    className={cn(
                      "relative h-[58px] w-[58px] sm:h-[68px] sm:w-[68px] overflow-hidden border transition-colors duration-200",
                      isLit
                        ? "border-primary/70 bg-primary/15"
                        : "border-foreground/15 bg-background/70 hover:border-foreground/35",
                    )}
                  >
                    <motion.span
                      animate={{
                        opacity: isLit ? 1 : 0.22,
                        scale: cell.just ? [1.18, 1] : 1,
                      }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        isLit ? "text-primary" : "text-foreground/70",
                      )}
                    >
                      <RuneMark id={runeIds[r][c]} className="h-[45%] w-[45%]" />
                    </motion.span>
                    {isLit && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(circle at 50% 50%, oklch(0.74 0.15 52 / 0.25), transparent 70%)",
                        }}
                      />
                    )}
                  </button>
                )
              }),
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between font-hud text-foreground/70">
        <span>Best // {String(best).padStart(3, "0")}</span>
        <span className="hidden sm:inline">Tap a rune to flip it and its neighbors</span>
        <span>Moves // {String(moves).padStart(2, "0")}/{String(optimal).padStart(2, "0")}</span>
      </div>

      <AnimatePresence>
        {phase !== "playing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/65 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-center px-6"
            >
              <div className="font-hud text-foreground/70 mb-3">
                {phase === "ended" ? "Forge Complete" : "Toggle Trial"}
              </div>
              <div className="font-wordmark-tight font-semibold text-5xl sm:text-6xl">
                {phase === "ended" ? (
                  <>You scored <span className="text-primary">{score}</span></>
                ) : (
                  <>Sigil <span className="text-primary">/Forge</span></>
                )}
              </div>
              <div className="mt-3 max-w-md mx-auto text-foreground/65 italic-serif text-lg">
                {phase === "ended"
                  ? `${solved} sigil${solved === 1 ? "" : "s"} forged, ${moves} moves on the final. Best ever // ${best}.`
                  : "Tap a rune to toggle it and its four neighbors. Light every cell to forge the sigil. Ninety seconds, infinite attempts. Fewer moves score higher."}
              </div>
              {phase === "ended" && submitMsg && (
                <div className="mt-3 font-hud text-primary">{submitMsg}</div>
              )}
            </motion.div>
            <Magnetic strength={0.4}>
              <button
                type="button"
                onClick={startGame}
                data-cursor="play"
                data-cursor-label={phase === "ended" ? "Again" : "Start"}
                className="group relative inline-flex h-[58px] items-center gap-4 rounded-full bg-primary pl-6 pr-3 text-primary-foreground overflow-hidden"
              >
                <span className="relative z-10 font-hud text-[11px]">{phase === "ended" ? "Play Again" : "Light the First"}</span>
                <span className="relative z-10 flex h-[42px] w-[42px] items-center justify-center rounded-full bg-primary-foreground/15">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 5l12 7-12 7V5z" fill="currentColor" />
                  </svg>
                </span>
                <span aria-hidden className="absolute inset-0 -translate-x-full bg-foreground/10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0" />
              </button>
            </Magnetic>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
