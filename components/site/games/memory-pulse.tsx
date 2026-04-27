"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Magnetic } from "../magnetic"
import { useArcade } from "../arcade/arcade-context"

const STORAGE_KEY = "vaish.memorypulse.best"

type Phase = "idle" | "watch" | "recall" | "won" | "lost"

const RUNES = [
  { id: 0, label: "I", tone: 0 },
  { id: 1, label: "II", tone: 1 },
  { id: 2, label: "III", tone: 2 },
  { id: 3, label: "IV", tone: 3 },
]

// Simple WebAudio beep for each rune
function useChime() {
  const ctxRef = useRef<AudioContext | null>(null)
  const ensure = () => {
    if (typeof window === "undefined") return null
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AC) ctxRef.current = new AC()
    }
    return ctxRef.current
  }
  const play = useCallback((tone: number, fail = false) => {
    const ctx = ensure()
    if (!ctx) return
    const freqs = [196, 261.63, 329.63, 392]
    const f = fail ? 90 : freqs[tone % 4]
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = fail ? "sawtooth" : "sine"
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(fail ? 0.18 : 0.14, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (fail ? 0.5 : 0.32))
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.6)
  }, [])
  return play
}

export function MemoryPulseGame() {
  const arcadeCtx = useArcade()
  const sessionRef = useRef<Awaited<ReturnType<typeof arcadeCtx.open>> | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [sequence, setSequence] = useState<number[]>([])
  const [playerIdx, setPlayerIdx] = useState(0)
  const [round, setRound] = useState(0)
  const [best, setBest] = useState(0)
  const [flash, setFlash] = useState<number | null>(null)
  const [errorFlash, setErrorFlash] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const chime = useChime()

  useEffect(() => {
    if (typeof window === "undefined") return
    const v = Number(localStorage.getItem(STORAGE_KEY) || "0")
    if (!Number.isNaN(v)) setBest(v)
  }, [])

  // Play sequence to user
  useEffect(() => {
    if (phase !== "watch") return
    let cancelled = false
    const step = async (i: number) => {
      if (cancelled) return
      if (i >= sequence.length) {
        await wait(260)
        if (!cancelled) {
          setFlash(null)
          setPlayerIdx(0)
          setPhase("recall")
        }
        return
      }
      const r = sequence[i]
      setFlash(r)
      chime(r)
      await wait(520)
      if (cancelled) return
      setFlash(null)
      await wait(180)
      step(i + 1)
    }
    const id = window.setTimeout(() => step(0), 420)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [phase, sequence, chime])

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const nextRound = useCallback(() => {
    setSequence((prev) => {
      const next = [...prev, Math.floor(Math.random() * 4)]
      return next
    })
    setRound((r) => r + 1)
    setPlayerIdx(0)
    setPhase("watch")
  }, [])

  const startGame = useCallback(() => {
    setSubmitMsg(null)
    setSequence([])
    setRound(0)
    setPlayerIdx(0)
    setPhase("watch")
    // Seed first step
    const first = Math.floor(Math.random() * 4)
    setSequence([first])
    setRound(1)
    arcadeCtx.open("memory-pulse").then((s) => { sessionRef.current = s }).catch(() => {})
  }, [arcadeCtx])

  const onPress = useCallback(
    async (id: number) => {
      if (phase !== "recall") return
      setFlash(id)
      chime(id)
      const expected = sequence[playerIdx]
      await wait(180)
      setFlash(null)
      if (id !== expected) {
        setErrorFlash(true)
        chime(id, true)
        await wait(550)
        setErrorFlash(false)
        const finalScore = Math.max(0, round - 1)
        setBest((b) => {
          const next = Math.max(b, finalScore)
          if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(next))
          return next
        })
        setPhase("lost")
        const sess = sessionRef.current
        if (sess && finalScore > 0) {
          arcadeCtx
            .submit({ session: sess, score: finalScore, stats: { rounds: finalScore } })
            .then((res) => {
              if (res.ok) setSubmitMsg(res.rank ? `Entered leaderboard #${res.rank}.` : "Score recorded.")
              else setSubmitMsg(`Not recorded // ${res.reason}`)
            })
            .catch(() => setSubmitMsg("Not recorded."))
        }
        sessionRef.current = null
        return
      }
      const nextIdx = playerIdx + 1
      if (nextIdx >= sequence.length) {
        // success
        await wait(320)
        setBest((b) => {
          const next = Math.max(b, round)
          if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(next))
          return next
        })
        setPlayerIdx(0)
        setSequence((s) => [...s, Math.floor(Math.random() * 4)])
        setRound((r) => r + 1)
        setPhase("watch")
      } else {
        setPlayerIdx(nextIdx)
      }
    },
    [phase, sequence, playerIdx, round, chime],
  )

  const isPlaying = phase === "watch" || phase === "recall"

  return (
    <div className="relative frame-corners frame-hairline aspect-[16/10] sm:aspect-[16/9] bg-background/50 overflow-hidden">
      <div className="corner-tl" /><div className="corner-br" />
      <div className="absolute inset-0 grid-lines opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,oklch(0.74_0.15_52/0.08),transparent_70%)]" />

      {/* HUD */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between font-hud text-foreground/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-primary animate-pulse-soft" />
            <span>Round</span>
          </div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">
            {String(round).padStart(2, "0")}
          </div>
        </div>
        <div className="text-center space-y-1">
          <div>{phase === "watch" ? "Listen" : phase === "recall" ? "Recall" : "Ready"}</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none text-primary">
            {phase === "recall" ? `${playerIdx}/${sequence.length}` : sequence.length ? String(sequence.length).padStart(2, "0") : "00"}
          </div>
        </div>
        <div className="text-right space-y-1">
          <div>Best</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">
            {String(best).padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Rune pad */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{
            scale: errorFlash ? 0.96 : 1,
            rotate: errorFlash ? [-1, 1, -0.5, 0] : 0,
          }}
          transition={{ duration: errorFlash ? 0.35 : 0.4 }}
          className="relative grid grid-cols-2 gap-3 sm:gap-4 p-4"
        >
          {RUNES.map((r) => {
            const active = flash === r.id
            return (
              <motion.button
                key={r.id}
                type="button"
                onClick={() => onPress(r.id)}
                disabled={phase !== "recall"}
                data-cursor="play"
                data-cursor-label={r.label}
                whileTap={{ scale: 0.94 }}
                className="relative flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center border border-foreground/15 bg-background/60 overflow-hidden disabled:cursor-not-allowed"
              >
                {/* Active glow */}
                <motion.span
                  aria-hidden
                  animate={{ opacity: active ? 1 : 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0 bg-primary/30"
                />
                <motion.span
                  aria-hidden
                  animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 ring-1 ring-inset ring-primary"
                  style={{ boxShadow: active ? "inset 0 0 60px oklch(0.74 0.15 52 / 0.55)" : undefined }}
                />
                {/* Rune shape */}
                <motion.div
                  animate={{ scale: active ? 1.08 : 1, color: active ? "oklch(0.98 0.01 80)" : "oklch(0.74 0.15 52)" }}
                  transition={{ duration: 0.25 }}
                  className="relative h-10 w-10 sm:h-14 sm:w-14"
                >
                  <RunePadShape id={r.id} />
                </motion.div>
                <span className="absolute bottom-1.5 right-2 font-hud text-[9px] text-foreground/45">{r.label}</span>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      {/* Bottom status */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between font-hud text-foreground/70">
        <span>Mode // Simon Pulse</span>
        <span>{isPlaying ? (phase === "watch" ? "Watching sequence..." : "Your move") : "Idle"}</span>
      </div>

      <AnimatePresence>
        {(phase === "idle" || phase === "lost") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-center px-6"
            >
              <div className="font-hud text-foreground/70 mb-3">
                {phase === "lost" ? "Pattern Broken" : "The Veil Listens"}
              </div>
              <div className="font-wordmark-tight font-semibold text-5xl sm:text-6xl">
                {phase === "lost" ? (
                  <>Round <span className="text-primary">{round}</span></>
                ) : (
                  <>Memory <span className="text-primary">/Pulse</span></>
                )}
              </div>
              <div className="mt-3 max-w-md mx-auto text-foreground/65 italic-serif text-lg">
                {phase === "lost"
                  ? `Best round so far // ${best}. Listen closer.`
                  : "Watch the sequence. Repeat it. Each round adds one more whisper."}
              </div>
              {phase === "lost" && submitMsg && (
                <div className="mt-3 font-hud text-primary">{submitMsg}</div>
              )}
            </motion.div>
            <Magnetic strength={0.4}>
              <button
                type="button"
                onClick={startGame}
                data-cursor="play"
                data-cursor-label={phase === "lost" ? "Again" : "Start"}
                className="group relative inline-flex h-[58px] items-center gap-4 rounded-full bg-primary pl-6 pr-3 text-primary-foreground overflow-hidden"
              >
                <span className="relative z-10 font-hud text-[11px]">{phase === "lost" ? "Try Again" : "Listen"}</span>
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

function RunePadShape({ id }: { id: number }) {
  switch (id % 4) {
    case 0:
      return (
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="4" fill="currentColor" />
        </svg>
      )
    case 1:
      return (
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <polygon points="20,4 36,20 20,36 4,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <polygon points="20,14 26,20 20,26 14,20" fill="currentColor" />
        </svg>
      )
    case 2:
      return (
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <polygon points="20,4 36,32 4,32" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="20" cy="24" r="3.5" fill="currentColor" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <rect x="7" y="7" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="7" y1="7" x2="33" y2="33" stroke="currentColor" strokeWidth="1.5" />
          <line x1="33" y1="7" x2="7" y2="33" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
  }
}
