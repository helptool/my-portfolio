"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Magnetic } from "../magnetic"
import { arcade } from "@/lib/vaish"
import { useArcade } from "../arcade/arcade-context"

type Glyph = { id: number; x: number; y: number; born: number; ttl: number; dead: boolean }

const STORAGE_KEY = "vaish.glyphreflex.best"
const CFG = arcade.games[1]
const DURATION = CFG.duration ?? 30

// Four rune shapes drawn in SVG, rotated
const GlyphShape = ({ i }: { i: number }) => {
  const common = "stroke-current fill-none"
  switch (i % 4) {
    case 0:
      return (
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <circle cx="20" cy="20" r="14" className={common} strokeWidth="1.5" />
          <circle cx="20" cy="20" r="5" className="fill-current" />
        </svg>
      )
    case 1:
      return (
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <polygon points="20,4 36,20 20,36 4,20" className={common} strokeWidth="1.5" />
          <polygon points="20,12 28,20 20,28 12,20" className="fill-current" />
        </svg>
      )
    case 2:
      return (
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <polygon points="20,4 36,32 4,32" className={common} strokeWidth="1.5" />
          <circle cx="20" cy="24" r="4" className="fill-current" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <rect x="6" y="6" width="28" height="28" className={common} strokeWidth="1.5" />
          <line x1="6" y1="6" x2="34" y2="34" className={common} strokeWidth="1.5" />
          <line x1="34" y1="6" x2="6" y2="34" className={common} strokeWidth="1.5" />
        </svg>
      )
  }
}

export function GlyphReflexGame() {
  const arenaRef = useRef<HTMLDivElement>(null)
  const arcadeCtx = useArcade()
  const sessionRef = useRef<Awaited<ReturnType<typeof arcadeCtx.open>> | null>(null)
  const [phase, setPhase] = useState<"idle" | "playing" | "ended">("idle")
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(1)
  const [bestCombo, setBestCombo] = useState(1)
  const [time, setTime] = useState(DURATION)
  const [best, setBest] = useState(0)
  const [glyphs, setGlyphs] = useState<Glyph[]>([])
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const nextIdRef = useRef(1)
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sweepTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const v = Number(localStorage.getItem(STORAGE_KEY) || "0")
    if (!Number.isNaN(v)) setBest(v)
  }, [])

  const scheduleNext = useCallback((elapsed: number) => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current)
    // Spawn cadence speeds up as time passes
    const base = Math.max(420, 1200 - elapsed * 22)
    const jitter = 140 + Math.random() * 320
    spawnTimer.current = setTimeout(() => {
      spawnGlyph()
      scheduleNext(elapsed + 1)
    }, Math.min(1200, base + jitter))
  }, [])

  const spawnGlyph = useCallback(() => {
    const arena = arenaRef.current
    if (!arena) return
    const rect = arena.getBoundingClientRect()
    const pad = 46
    const x = pad + Math.random() * Math.max(0, rect.width - pad * 2)
    const y = pad + Math.random() * Math.max(0, rect.height - pad * 2)
    const id = nextIdRef.current++
    const ttl = 1500 - Math.min(700, id * 18)
    setGlyphs((g) => [...g, { id, x, y, born: performance.now(), ttl, dead: false }])
  }, [])

  // Sweep: remove expired glyphs, penalize misses
  useEffect(() => {
    if (phase !== "playing") return
    sweepTimer.current = setInterval(() => {
      setGlyphs((arr) => {
        const now = performance.now()
        const alive: Glyph[] = []
        let missed = 0
        for (const g of arr) {
          if (g.dead) continue
          if (now - g.born > g.ttl) missed++
          else alive.push(g)
        }
        if (missed > 0) {
          setCombo(1)
        }
        return alive
      })
    }, 100)
    return () => {
      if (sweepTimer.current) clearInterval(sweepTimer.current)
    }
  }, [phase])

  // Countdown
  useEffect(() => {
    if (phase !== "playing") return
    if (time <= 0) { endGame(); return }
    const id = setTimeout(() => setTime((t) => t - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, time])

  const startGame = useCallback(() => {
    setSubmitMsg(null)
    setScore(0)
    setCombo(1)
    setBestCombo(1)
    setTime(DURATION)
    setGlyphs([])
    nextIdRef.current = 1
    setPhase("playing")
    scheduleNext(0)
    arcadeCtx.open("glyph-reflex").then((s) => { sessionRef.current = s }).catch(() => {})
  }, [scheduleNext, arcadeCtx])

  const endGame = useCallback(() => {
    if (spawnTimer.current) clearTimeout(spawnTimer.current)
    setPhase("ended")
    setGlyphs([])
    setBest((b) => {
      const next = Math.max(b, score)
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
    const sess = sessionRef.current
    if (sess && score > 0) {
      arcadeCtx
        .submit({ session: sess, score, stats: { combo: bestCombo } })
        .then((res) => {
          if (res.ok) setSubmitMsg(res.rank ? `Entered leaderboard #${res.rank}.` : "Score recorded.")
          else setSubmitMsg(`Not recorded // ${res.reason}`)
        })
        .catch(() => setSubmitMsg("Not recorded."))
    }
    sessionRef.current = null
  }, [score, bestCombo, arcadeCtx])

  useEffect(() => {
    return () => {
      if (spawnTimer.current) clearTimeout(spawnTimer.current)
      if (sweepTimer.current) clearInterval(sweepTimer.current)
    }
  }, [])

  const tapGlyph = useCallback((id: number) => {
    setGlyphs((arr) => arr.map((g) => (g.id === id ? { ...g, dead: true } : g)))
    setCombo((c) => {
      const next = c + 1
      setBestCombo((b) => Math.max(b, next))
      return next
    })
    setScore((s) => s + 1 * Math.max(1, combo))
    // Remove after tap animation
    setTimeout(() => {
      setGlyphs((arr) => arr.filter((g) => g.id !== id))
    }, 360)
  }, [combo])

  return (
    <div
      ref={arenaRef}
      className="relative frame-corners frame-hairline aspect-[16/10] sm:aspect-[16/9] bg-background/50 overflow-hidden"
    >
      <div className="corner-tl" /><div className="corner-br" />
      {/* Background grid */}
      <div className="absolute inset-0 grid-lines opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,oklch(0.74_0.15_52/0.10),transparent_70%)]" />

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
          <div>Combo</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none text-primary">
            x{combo}
          </div>
        </div>
        <div className="text-right space-y-1">
          <div>Time</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">
            {String(time).padStart(2, "0")}s
          </div>
        </div>
      </div>

      {/* Glyphs */}
      <AnimatePresence>
        {phase === "playing" && glyphs.map((g) => (
          <motion.button
            key={g.id}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{
              opacity: g.dead ? 0 : 1,
              scale: g.dead ? 1.6 : 1,
              rotate: g.dead ? 90 : 0,
            }}
            exit={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: g.dead ? 0.35 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => !g.dead && tapGlyph(g.id)}
            data-cursor="play"
            data-cursor-label="Tap"
            className="absolute h-14 w-14 sm:h-16 sm:w-16 -translate-x-1/2 -translate-y-1/2 text-primary"
            style={{ left: g.x, top: g.y }}
          >
            {/* TTL ring */}
            <motion.span
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: g.ttl / 1000, ease: "linear" }}
              className="absolute inset-[-8px] rounded-full border border-primary/70"
            />
            <motion.span
              initial={{ scale: 1 }}
              animate={{ scale: 0.2 }}
              transition={{ duration: g.ttl / 1000, ease: "linear" }}
              className="absolute inset-[-14px] rounded-full border border-primary/40"
            />
            <span className="relative block h-full w-full">
              <GlyphShape i={g.id} />
              <span className="pointer-events-none absolute inset-0 rounded-full blur-[20px] bg-primary/30" />
            </span>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Bottom HUD */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between font-hud text-foreground/70">
        <span>Best // {String(best).padStart(3, "0")}</span>
        <span>Max Combo // x{bestCombo}</span>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {phase !== "playing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/55 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-center px-6"
            >
              <div className="font-hud text-foreground/70 mb-3">
                {phase === "ended" ? "Round Complete" : "Reflex Trial"}
              </div>
              <div className="font-wordmark-tight font-semibold text-5xl sm:text-6xl">
                {phase === "ended" ? (
                  <>You struck <span className="text-primary">{score}</span></>
                ) : (
                  <>Glyph <span className="text-primary">/Reflex</span></>
                )}
              </div>
              <div className="mt-3 max-w-md mx-auto text-foreground/65 italic-serif text-lg">
                {phase === "ended"
                  ? `Max combo x${bestCombo}. Best ever // ${best}.`
                  : "Tap each rune before the ring closes. Chain hits without missing to raise your combo."}
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
                <span className="relative z-10 font-hud text-[11px]">{phase === "ended" ? "Play Again" : "Begin Trial"}</span>
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
