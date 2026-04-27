"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Magnetic } from "../magnetic"
import { useArcade } from "../arcade/arcade-context"
import { cn } from "@/lib/utils"

type Card = { id: number; rune: number; matched: boolean; flipped: boolean }

const STORAGE_KEY = "vaish.runematch.best"
const SYMBOL_COUNT = 8
const PAIRS = 8
const TIME_LIMIT = 90

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function RuneSymbol({ id, className }: { id: number; className?: string }) {
  const variants = [
    <svg key={0} viewBox="0 0 40 40" className={className}>
      <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4" fill="currentColor" />
    </svg>,
    <svg key={1} viewBox="0 0 40 40" className={className}>
      <polygon points="20,4 36,20 20,36 4,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="20,12 28,20 20,28 12,20" fill="currentColor" />
    </svg>,
    <svg key={2} viewBox="0 0 40 40" className={className}>
      <polygon points="20,4 36,32 4,32" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="24" r="4" fill="currentColor" />
    </svg>,
    <svg key={3} viewBox="0 0 40 40" className={className}>
      <rect x="7" y="7" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="7" x2="33" y2="33" stroke="currentColor" strokeWidth="1.5" />
      <line x1="33" y1="7" x2="7" y2="33" stroke="currentColor" strokeWidth="1.5" />
    </svg>,
    <svg key={4} viewBox="0 0 40 40" className={className}>
      <polygon points="20,4 38,36 2,36" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11" y1="36" x2="29" y2="36" stroke="currentColor" strokeWidth="1.5" />
    </svg>,
    <svg key={5} viewBox="0 0 40 40" className={className}>
      <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="20" x2="35" y2="20" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1="5" x2="20" y2="35" stroke="currentColor" strokeWidth="1.5" />
    </svg>,
    <svg key={6} viewBox="0 0 40 40" className={className}>
      <polygon points="8,10 32,10 28,30 12,30" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1="10" x2="20" y2="30" stroke="currentColor" strokeWidth="1.5" />
    </svg>,
    <svg key={7} viewBox="0 0 40 40" className={className}>
      <path d="M6 20 L14 8 L26 8 L34 20 L26 32 L14 32 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="3.5" fill="currentColor" />
    </svg>,
  ]
  return variants[id % SYMBOL_COUNT]
}

export function RuneMatchGame() {
  const arcadeCtx = useArcade()
  const sessionRef = useRef<Awaited<ReturnType<typeof arcadeCtx.open>> | null>(null)

  const [phase, setPhase] = useState<"idle" | "playing" | "won" | "lost">("idle")
  const [cards, setCards] = useState<Card[]>([])
  const [firstId, setFirstId] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [time, setTime] = useState(TIME_LIMIT)
  const [best, setBest] = useState(0)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  // Refs used to avoid stale closures and prevent duplicate pair resolution.
  const resolvingRef = useRef(false)
  const cardsRef = useRef<Card[]>([])
  const pendingRef = useRef<number | null>(null)

  useEffect(() => { cardsRef.current = cards }, [cards])

  useEffect(() => {
    if (typeof window === "undefined") return
    const v = Number(localStorage.getItem(STORAGE_KEY) || "0")
    if (!Number.isNaN(v)) setBest(v)
  }, [])

  useEffect(() => {
    if (phase !== "playing") return
    if (time <= 0) {
      endGame(false)
      return
    }
    const id = setTimeout(() => setTime((t) => t - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, time])

  const buildDeck = useCallback(() => {
    const pool: Card[] = []
    let id = 0
    for (let i = 0; i < PAIRS; i++) {
      pool.push({ id: id++, rune: i, matched: false, flipped: false })
      pool.push({ id: id++, rune: i, matched: false, flipped: false })
    }
    return shuffle(pool)
  }, [])

  const startGame = useCallback(() => {
    const deck = buildDeck()
    setCards(deck)
    cardsRef.current = deck
    setFirstId(null)
    pendingRef.current = null
    resolvingRef.current = false
    setMoves(0)
    setMatches(0)
    setTime(TIME_LIMIT)
    setSubmitMsg(null)
    setPhase("playing")
    arcadeCtx.open("rune-match").then((s) => { sessionRef.current = s }).catch(() => {})
  }, [buildDeck, arcadeCtx])

  // endGame uses refs/locals that are captured per-call, so no stale state.
  const endGameRef = useRef<(won: boolean) => void>(() => {})
  useEffect(() => {
    endGameRef.current = (won: boolean) => {
      setPhase(won ? "won" : "lost")
      const timeBonus = won ? time : 0
      const extraMoves = Math.max(0, moves - PAIRS)
      const efficiency = Math.max(0, 40 - extraMoves * 2)
      const score = matches * 10 + timeBonus + efficiency
      setBest((b) => {
        const next = Math.max(b, score)
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(next))
        return next
      })
      const sess = sessionRef.current
      if (sess && score > 0) {
        arcadeCtx
          .submit({
            session: sess,
            score,
            stats: { matches, moves, time_left: timeBonus, won: won ? 1 : 0 },
          })
          .then((res) => {
            if (res.ok) setSubmitMsg(res.rank ? `Entered leaderboard #${res.rank}.` : "Score recorded.")
            else setSubmitMsg(`Not recorded // ${res.reason}`)
          })
          .catch(() => setSubmitMsg("Not recorded."))
      }
      sessionRef.current = null
    }
  }, [matches, moves, time, arcadeCtx])

  const endGame = useCallback((won: boolean) => endGameRef.current(won), [])

  // Direct resolution inside flip() instead of a useEffect watching [flipped, cards],
  // which previously re-ran on card state changes and double-scheduled the reset
  // timeout, producing the glitchy flicker.
  const flip = useCallback(
    (id: number) => {
      if (phase !== "playing") return
      if (resolvingRef.current) return
      if (pendingRef.current === id) return

      const current = cardsRef.current
      const c = current.find((x) => x.id === id)
      if (!c || c.matched || c.flipped) return

      if (firstId === null) {
        // First pick
        const next = current.map((cc) => (cc.id === id ? { ...cc, flipped: true } : cc))
        cardsRef.current = next
        setCards(next)
        setFirstId(id)
        pendingRef.current = id
        // clear the "double-click same card" guard after a beat
        setTimeout(() => { pendingRef.current = null }, 120)
        return
      }

      // Second pick
      resolvingRef.current = true
      pendingRef.current = id
      const first = current.find((x) => x.id === firstId)
      const next = current.map((cc) => (cc.id === id ? { ...cc, flipped: true } : cc))
      cardsRef.current = next
      setCards(next)
      setMoves((m) => m + 1)

      const isMatch = !!first && first.rune === c.rune

      setTimeout(
        () => {
          if (isMatch) {
            const updated = cardsRef.current.map((cc) =>
              cc.id === id || cc.id === firstId ? { ...cc, matched: true, flipped: true } : cc,
            )
            cardsRef.current = updated
            setCards(updated)
            setMatches((mm) => {
              const nn = mm + 1
              if (nn === PAIRS) {
                setTimeout(() => endGame(true), 280)
              }
              return nn
            })
          } else {
            const updated = cardsRef.current.map((cc) =>
              cc.id === id || cc.id === firstId ? { ...cc, flipped: false } : cc,
            )
            cardsRef.current = updated
            setCards(updated)
          }
          setFirstId(null)
          pendingRef.current = null
          resolvingRef.current = false
        },
        isMatch ? 420 : 780,
      )
    },
    [phase, firstId, endGame],
  )

  return (
    <div className="relative frame-corners frame-hairline aspect-[16/10] sm:aspect-[16/9] bg-background/50 overflow-hidden">
      <div className="corner-tl" /><div className="corner-br" />
      <div className="absolute inset-0 grid-lines opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,oklch(0.74_0.15_52/0.08),transparent_70%)]" />

      {/* HUD */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between font-hud text-foreground/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-primary animate-pulse-soft" />
            <span>Pairs</span>
          </div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">
            {String(matches).padStart(2, "0")}/{String(PAIRS).padStart(2, "0")}
          </div>
        </div>
        <div className="text-center space-y-1">
          <div>Moves</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none text-primary">
            {String(moves).padStart(2, "0")}
          </div>
        </div>
        <div className="text-right space-y-1">
          <div>Time</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">
            {String(time).padStart(2, "0")}s
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="absolute inset-0 flex items-center justify-center px-4 py-20">
        <div className="grid w-full max-w-[560px] grid-cols-4 gap-2 sm:gap-3">
          {cards.map((c) => {
            const show = c.flipped || c.matched
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => flip(c.id)}
                disabled={phase !== "playing" || show || resolvingRef.current}
                data-cursor="play"
                data-cursor-label={show ? "Flipped" : "Flip"}
                className={cn(
                  "relative aspect-square overflow-hidden border transition-colors",
                  c.matched
                    ? "border-primary/70 bg-primary/5"
                    : show
                      ? "border-foreground/25 bg-background/75"
                      : "border-foreground/10 bg-background/55 hover:border-foreground/30",
                )}
                style={{ perspective: "800px" }}
              >
                <motion.span
                  aria-hidden
                  animate={{ rotateY: show ? 180 : 0 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Back */}
                  <span
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <span className="absolute inset-1 border border-foreground/10" />
                    <span className="font-hud text-foreground/35">V</span>
                  </span>
                  {/* Front */}
                  <span
                    className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      c.matched ? "text-primary" : "text-foreground/80",
                    )}
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <RuneSymbol id={c.rune} className="h-1/2 w-1/2" />
                  </span>
                </motion.span>
                {c.matched && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pointer-events-none absolute inset-0 bg-primary/10"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between font-hud text-foreground/70">
        <span>Best // {String(best).padStart(3, "0")}</span>
        <span className="hidden sm:inline">Find all 8 pairs before the veil closes</span>
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
                {phase === "won" ? "All Pairs Found" : phase === "lost" ? "Veil Closed" : "Pair Trial"}
              </div>
              <div className="font-wordmark-tight font-semibold text-5xl sm:text-6xl">
                {phase === "idle" ? (
                  <>Rune <span className="text-primary">/Match</span></>
                ) : (
                  <>{phase === "won" ? "You remembered" : "Try again"}</>
                )}
              </div>
              <div className="mt-3 max-w-md mx-auto text-foreground/65 italic-serif text-lg">
                {phase === "idle"
                  ? "Eight pairs hide beneath the deck. Flip two at a time and pair every rune before the minute passes."
                  : phase === "won"
                    ? `Pairs ${matches}/${PAIRS} in ${moves} moves. ${time}s left on the veil.`
                    : `Pairs ${matches}/${PAIRS} found. The veil folded.`}
              </div>
              {phase !== "idle" && submitMsg && (
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
                  {phase === "idle" ? "Deal the Deck" : "Play Again"}
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
