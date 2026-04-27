"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Magnetic } from "../magnetic"
import { useArcade } from "../arcade/arcade-context"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "vaish.sigiltrace.best"

// Paths defined in 0..1 normalized coords
type Shape = { name: string; points: [number, number][]; closed: boolean }

const SHAPES: Shape[] = [
  {
    name: "Diamond",
    closed: true,
    points: [
      [0.5, 0.08],
      [0.9, 0.5],
      [0.5, 0.92],
      [0.1, 0.5],
      [0.5, 0.08],
    ],
  },
  {
    name: "Star",
    closed: true,
    points: [
      [0.5, 0.06],
      [0.62, 0.38],
      [0.96, 0.38],
      [0.68, 0.58],
      [0.8, 0.92],
      [0.5, 0.72],
      [0.2, 0.92],
      [0.32, 0.58],
      [0.04, 0.38],
      [0.38, 0.38],
      [0.5, 0.06],
    ],
  },
  {
    name: "Triskele",
    closed: false,
    points: [
      [0.5, 0.5],
      [0.5, 0.1],
      [0.84, 0.3],
      [0.5, 0.5],
      [0.84, 0.7],
      [0.5, 0.9],
      [0.5, 0.5],
      [0.16, 0.7],
      [0.16, 0.3],
      [0.5, 0.5],
    ],
  },
  {
    name: "Ouroboros",
    closed: true,
    points: (() => {
      const pts: [number, number][] = []
      const segs = 24
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2 - Math.PI / 2
        pts.push([0.5 + Math.cos(a) * 0.38, 0.5 + Math.sin(a) * 0.38])
      }
      return pts
    })(),
  },
]

function buildPath(points: [number, number][], w: number, h: number) {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${(x * w).toFixed(1)},${(y * h).toFixed(1)}`)
    .join(" ")
}

function distPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

function distToPolyline(px: number, py: number, pts: [number, number][]) {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distPointToSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
    if (d < best) best = d
  }
  return best
}

type Phase = "idle" | "playing" | "scored"

export function SigilTraceGame() {
  const arcadeCtx = useArcade()
  const sessionRef = useRef<Awaited<ReturnType<typeof arcadeCtx.open>> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)

  const [phase, setPhase] = useState<Phase>("idle")
  const [shapeIndex, setShapeIndex] = useState(0)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [lastScore, setLastScore] = useState(0)
  const [roundScore, setRoundScore] = useState(0)
  const [best, setBest] = useState(0)
  const [drawing, setDrawing] = useState(false)
  const [stroke, setStroke] = useState<[number, number][]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [timeLeft, setTimeLeft] = useState(10)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  const shape = SHAPES[shapeIndex]

  useEffect(() => {
    if (typeof window === "undefined") return
    const v = Number(localStorage.getItem(STORAGE_KEY) || "0")
    if (!Number.isNaN(v)) setBest(v)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (phase !== "playing") return
    if (timeLeft <= 0) {
      scoreRound()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 0.1), 100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  const startNewRound = useCallback(
    (roundNum: number) => {
      setShapeIndex(roundNum % SHAPES.length)
      setStroke([])
      setTimeLeft(11 - Math.min(6, roundNum))
      setRoundScore(0)
      setLastScore(0)
      setDrawing(false)
    },
    [],
  )

  const startGame = useCallback(() => {
    setSubmitMsg(null)
    setScore(0)
    setRound(1)
    setPhase("playing")
    startNewRound(0)
    arcadeCtx.open("sigil-trace").then((s) => { sessionRef.current = s }).catch(() => {})
  }, [arcadeCtx, startNewRound])

  const stopSession = useCallback(
    async (finalScore: number) => {
      setPhase("scored")
      setBest((b) => {
        const next = Math.max(b, finalScore)
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(next))
        return next
      })
      const sess = sessionRef.current
      if (sess && finalScore > 0) {
        try {
          const res = await arcadeCtx.submit({
            session: sess,
            score: finalScore,
            stats: { rounds: round },
          })
          if (res.ok) setSubmitMsg(res.rank ? `Entered leaderboard #${res.rank}.` : "Score recorded.")
          else setSubmitMsg(`Not recorded // ${res.reason}`)
        } catch {
          setSubmitMsg("Not recorded.")
        }
      }
      sessionRef.current = null
    },
    [arcadeCtx, round],
  )

  const scoreRound = useCallback(() => {
    // Score by average distance + coverage
    const w = size.w
    const h = size.h
    if (!w || !h) return
    const targetPts = shape.points.map(([x, y]) => [x * w, y * h]) as [number, number][]
    if (stroke.length < 8) {
      const rs = 0
      setRoundScore(rs)
      setLastScore(rs)
      // Decide continue
      const newTotal = score + rs
      setScore(newTotal)
      if (round >= 5) {
        void stopSession(newTotal)
      } else {
        setTimeout(() => {
          setRound((r) => r + 1)
          startNewRound(round)
        }, 650)
      }
      return
    }
    let sum = 0
    for (const [px, py] of stroke) sum += distToPolyline(px, py, targetPts)
    const avg = sum / stroke.length
    const maxRef = Math.min(w, h) * 0.2
    const accuracy = Math.max(0, 1 - avg / maxRef)
    // Coverage: how much of target path points were approached by stroke
    let reached = 0
    for (const t of targetPts) {
      let closest = Infinity
      for (const s of stroke) {
        const d = Math.hypot(s[0] - t[0], s[1] - t[1])
        if (d < closest) closest = d
      }
      if (closest < maxRef * 0.7) reached++
    }
    const coverage = reached / targetPts.length
    const rs = Math.round(accuracy * 60 + coverage * 40)
    setRoundScore(rs)
    setLastScore(rs)
    const newTotal = score + rs
    setScore(newTotal)
    setPhase("playing")
    if (round >= 5) {
      void stopSession(newTotal)
    } else {
      setTimeout(() => {
        setRound((r) => r + 1)
        startNewRound(round)
      }, 900)
    }
  }, [shape, stroke, size, score, round, startNewRound, stopSession])

  const getLocal = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as [number, number]
  }

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "playing") return
    const p = getLocal(e)
    if (!p) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setDrawing(true)
    setStroke([p])
  }
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawing || phase !== "playing") return
    const p = getLocal(e)
    if (!p) return
    setStroke((s) => {
      if (s.length === 0) return [p]
      const last = s[s.length - 1]
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 3) return s
      return [...s, p]
    })
  }
  const onUp = () => {
    if (!drawing || phase !== "playing") return
    setDrawing(false)
    scoreRound()
  }

  const targetD = size.w > 0 ? buildPath(shape.points, size.w, size.h) : ""
  const strokeD =
    stroke.length > 1
      ? stroke.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
      : ""

  return (
    <div
      ref={wrapRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="relative frame-corners frame-hairline aspect-[16/10] sm:aspect-[16/9] bg-background/50 overflow-hidden touch-none"
    >
      <div className="corner-tl" /><div className="corner-br" />
      <div className="absolute inset-0 grid-lines opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,oklch(0.74_0.15_52/0.08),transparent_70%)]" />

      {/* HUD */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between font-hud text-foreground/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-primary animate-pulse-soft" />
            <span>Shape</span>
          </div>
          <div className="font-wordmark-tight text-2xl sm:text-3xl leading-none">{shape.name}</div>
        </div>
        <div className="text-center space-y-1">
          <div>Round</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none text-primary">
            {String(round).padStart(2, "0")}/05
          </div>
        </div>
        <div className="text-right space-y-1">
          <div>Total</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">
            {String(score).padStart(3, "0")}
          </div>
        </div>
      </div>

      {/* SVG overlay */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <path ref={pathRef} d={targetD} fill="none" stroke="rgba(232,168,90,0.28)" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" strokeLinejoin="round" />
        {strokeD && (
          <path
            d={strokeD}
            fill="none"
            stroke="rgba(245,200,130,0.85)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 8px rgba(232,168,90,0.55))" }}
          />
        )}
      </svg>

      {/* Last score float */}
      <AnimatePresence>
        {phase === "playing" && lastScore > 0 && (
          <motion.div
            key={round}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-wordmark-tight text-4xl text-primary"
          >
            +{lastScore}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timer bar */}
      {phase === "playing" && (
        <div className="pointer-events-none absolute bottom-10 left-3 right-3 h-1 bg-foreground/15">
          <motion.span
            animate={{ scaleX: timeLeft / 11 }}
            transition={{ ease: "linear", duration: 0.1 }}
            className="block h-full origin-left bg-primary"
          />
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between font-hud text-foreground/70">
        <span>Best // {String(best).padStart(3, "0")}</span>
        <span>
          {phase === "playing"
            ? "Trace the dashed sigil in one stroke"
            : "Best this run // " + lastScore}
        </span>
      </div>

      <AnimatePresence>
        {phase !== "playing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/65 backdrop-blur-sm",
            )}
          >
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-center px-6"
            >
              <div className="font-hud text-foreground/70 mb-3">
                {phase === "scored" ? "Run Complete" : "Trace Trial"}
              </div>
              <div className="font-wordmark-tight font-semibold text-5xl sm:text-6xl">
                {phase === "idle" ? (
                  <>Sigil <span className="text-primary">/Trace</span></>
                ) : (
                  <>You scored <span className="text-primary">{score}</span></>
                )}
              </div>
              <div className="mt-3 max-w-md mx-auto text-foreground/65 italic-serif text-lg">
                {phase === "idle"
                  ? "Five sigils. One stroke each. Follow the dashed lines. Speed and accuracy both matter."
                  : `Best so far // ${best}. Every shape scored on accuracy and coverage.`}
              </div>
              {phase === "scored" && submitMsg && (
                <div className="mt-3 font-hud text-primary">{submitMsg}</div>
              )}
            </motion.div>
            <Magnetic strength={0.4}>
              <button
                type="button"
                onClick={startGame}
                data-cursor="play"
                data-cursor-label={phase === "idle" ? "Start" : "Again"}
                className="group relative inline-flex h-[58px] items-center gap-4 rounded-full bg-primary pl-6 pr-3 text-primary-foreground overflow-hidden"
              >
                <span className="relative z-10 font-hud text-[11px]">
                  {phase === "idle" ? "Begin Tracing" : "Trace Again"}
                </span>
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
