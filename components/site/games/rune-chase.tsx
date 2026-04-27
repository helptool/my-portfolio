"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Magnetic } from "../magnetic"
import { arcade } from "@/lib/vaish"
import { useArcade } from "../arcade/arcade-context"

type Rune = { id: number; x: number; y: number; r: number; born: number; kind: "good" | "bad"; vx: number; vy: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number }

const STORAGE_KEY = "vaish.runechase.best"
const CFG = arcade.games[0]
const DURATION = CFG.duration ?? 60

export function RuneChaseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const arcadeCtx = useArcade()
  const sessionRef = useRef<Awaited<ReturnType<typeof arcadeCtx.open>> | null>(null)

  const [phase, setPhase] = useState<"idle" | "playing" | "ended">("idle")
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(DURATION)
  const [best, setBest] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const unlockedRef = useRef<Set<string>>(new Set())

  const stateRef = useRef({
    player: { x: 0, y: 0, tx: 0, ty: 0, r: 14 },
    runes: [] as Rune[],
    particles: [] as Particle[],
    lastSpawn: 0,
    keys: { up: false, down: false, left: false, right: false },
    score: 0,
    running: false,
    nextId: 1,
    ripples: [] as { x: number; y: number; r: number; max: number; alpha: number; color: string }[],
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const v = Number(localStorage.getItem(STORAGE_KEY) || "0")
    if (!Number.isNaN(v)) setBest(v)
  }, [])

  useEffect(() => {
    const cvs = canvasRef.current
    const wrap = wrapRef.current
    if (!cvs || !wrap) return
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = wrap.getBoundingClientRect()
      cvs.width = Math.floor(rect.width * dpr)
      cvs.height = Math.floor(rect.height * dpr)
      cvs.style.width = `${rect.width}px`
      cvs.style.height = `${rect.height}px`
      const ctx = cvs.getContext("2d")
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stateRef.current.player.x = rect.width / 2
      stateRef.current.player.y = rect.height / 2
      stateRef.current.player.tx = rect.width / 2
      stateRef.current.player.ty = rect.height / 2
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const s = stateRef.current
      if (k === "arrowup" || k === "w") s.keys.up = true
      if (k === "arrowdown" || k === "s") s.keys.down = true
      if (k === "arrowleft" || k === "a") s.keys.left = true
      if (k === "arrowright" || k === "d") s.keys.right = true
      if (k === " " && phase !== "playing") {
        e.preventDefault()
        startGame()
      }
    }
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const s = stateRef.current
      if (k === "arrowup" || k === "w") s.keys.up = false
      if (k === "arrowdown" || k === "s") s.keys.down = false
      if (k === "arrowleft" || k === "a") s.keys.left = false
      if (k === "arrowright" || k === "d") s.keys.right = false
    }
    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const move = (cx: number, cy: number) => {
      const rect = cvs.getBoundingClientRect()
      stateRef.current.player.tx = cx - rect.left
      stateRef.current.player.ty = cy - rect.top
    }
    const onMouse = (e: MouseEvent) => move(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        move(e.touches[0].clientX, e.touches[0].clientY)
        e.preventDefault()
      }
    }
    cvs.addEventListener("mousemove", onMouse)
    cvs.addEventListener("touchmove", onTouch, { passive: false })
    cvs.addEventListener("touchstart", onTouch, { passive: false })
    return () => {
      cvs.removeEventListener("mousemove", onMouse)
      cvs.removeEventListener("touchmove", onTouch)
      cvs.removeEventListener("touchstart", onTouch)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext("2d")
    if (!ctx) return

    const loop = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      void dt
      const w = cvs.clientWidth
      const h = cvs.clientHeight
      const s = stateRef.current

      ctx.fillStyle = "oklch(0.10 0.008 40 / 0.28)"
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.globalAlpha = 0.06
      ctx.strokeStyle = "#e9ddc8"
      ctx.lineWidth = 1
      const gs = 28
      for (let x = 0; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
      ctx.restore()

      if (s.keys.up) s.player.ty -= 6
      if (s.keys.down) s.player.ty += 6
      if (s.keys.left) s.player.tx -= 6
      if (s.keys.right) s.player.tx += 6
      s.player.tx = Math.max(s.player.r, Math.min(w - s.player.r, s.player.tx))
      s.player.ty = Math.max(s.player.r, Math.min(h - s.player.r, s.player.ty))
      s.player.x += (s.player.tx - s.player.x) * 0.18
      s.player.y += (s.player.ty - s.player.y) * 0.18

      if (s.running && Math.random() < 0.6) {
        s.particles.push({
          x: s.player.x + (Math.random() - 0.5) * 4,
          y: s.player.y + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          life: 0,
          max: 60 + Math.random() * 40,
        })
      }

      if (s.running && now - s.lastSpawn > 700) {
        s.lastSpawn = now
        const isBad = Math.random() < 0.22
        const margin = 30
        s.runes.push({
          id: s.nextId++,
          x: margin + Math.random() * (w - margin * 2),
          y: margin + Math.random() * (h - margin * 2),
          r: isBad ? 10 + Math.random() * 6 : 8 + Math.random() * 5,
          born: now,
          kind: isBad ? "bad" : "good",
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
        })
        if (s.runes.length > 24) s.runes.shift()
      }

      for (let i = s.runes.length - 1; i >= 0; i--) {
        const r = s.runes[i]
        r.x += r.vx
        r.y += r.vy
        if (r.x < r.r || r.x > w - r.r) r.vx *= -1
        if (r.y < r.r || r.y > h - r.r) r.vy *= -1
        const age = now - r.born
        const ttl = r.kind === "good" ? 4500 : 5500
        if (age > ttl) { s.runes.splice(i, 1); continue }
        const fade = Math.min(1, (ttl - age) / 800)

        const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r * 4)
        if (r.kind === "good") {
          grad.addColorStop(0, `rgba(232, 168, 90, ${0.5 * fade})`)
          grad.addColorStop(1, "rgba(232, 168, 90, 0)")
        } else {
          grad.addColorStop(0, `rgba(180, 60, 60, ${0.45 * fade})`)
          grad.addColorStop(1, "rgba(180, 60, 60, 0)")
        }
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 4, 0, Math.PI * 2); ctx.fill()

        ctx.save()
        ctx.translate(r.x, r.y)
        ctx.rotate((now / (r.kind === "good" ? 600 : 400)) % (Math.PI * 2))
        ctx.strokeStyle = r.kind === "good" ? "rgba(245, 200, 130, 1)" : "rgba(220, 110, 110, 1)"
        ctx.lineWidth = 1.5
        ctx.globalAlpha = fade
        ctx.beginPath()
        const k = r.r
        ctx.moveTo(-k, 0); ctx.lineTo(0, -k); ctx.lineTo(k, 0); ctx.lineTo(0, k); ctx.closePath(); ctx.stroke()
        ctx.beginPath(); ctx.arc(0, 0, k * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = r.kind === "good" ? "rgba(245, 200, 130, 0.9)" : "rgba(220, 110, 110, 0.9)"
        ctx.fill()
        ctx.restore()

        const dx = r.x - s.player.x
        const dy = r.y - s.player.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (s.running && dist < r.r + s.player.r) {
          if (r.kind === "good") {
            s.score += 1
            setScore(s.score)
            for (let p = 0; p < 14; p++) {
              const ang = (p / 14) * Math.PI * 2
              s.particles.push({
                x: r.x, y: r.y,
                vx: Math.cos(ang) * (1 + Math.random() * 1.6),
                vy: Math.sin(ang) * (1 + Math.random() * 1.6),
                life: 0, max: 50,
              })
            }
            s.ripples.push({ x: r.x, y: r.y, r: 4, max: 70, alpha: 1, color: "rgba(245, 200, 130," })
          } else {
            s.score = Math.max(0, s.score - 3)
            setScore(s.score)
            s.ripples.push({ x: r.x, y: r.y, r: 4, max: 90, alpha: 1, color: "rgba(220, 110, 110," })
          }
          s.runes.splice(i, 1)
        }
      }

      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i]
        p.x += p.vx; p.y += p.vy; p.life++
        const t = 1 - p.life / p.max
        if (t <= 0) { s.particles.splice(i, 1); continue }
        ctx.fillStyle = `rgba(232, 168, 90, ${t * 0.6})`
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill()
      }

      for (let i = s.ripples.length - 1; i >= 0; i--) {
        const r = s.ripples[i]
        r.r += 2.4
        r.alpha = Math.max(0, 1 - r.r / r.max)
        if (r.alpha <= 0) { s.ripples.splice(i, 1); continue }
        ctx.strokeStyle = `${r.color}${r.alpha.toFixed(3)})`
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke()
      }

      ctx.save()
      ctx.translate(s.player.x, s.player.y)
      const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, 50)
      pg.addColorStop(0, "rgba(245, 200, 130, 0.55)")
      pg.addColorStop(1, "rgba(245, 200, 130, 0)")
      ctx.fillStyle = pg
      ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill()
      ctx.rotate((now / 800) % (Math.PI * 2))
      ctx.strokeStyle = "rgba(245, 215, 170, 1)"
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(0, 0, s.player.r, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.arc(0, 0, s.player.r - 4, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(245, 215, 170, 0.95)"
      ctx.fill()
      ctx.strokeStyle = "rgba(245, 215, 170, 0.5)"
      ctx.beginPath()
      ctx.moveTo(-s.player.r - 6, 0); ctx.lineTo(-s.player.r - 2, 0)
      ctx.moveTo(s.player.r + 2, 0); ctx.lineTo(s.player.r + 6, 0)
      ctx.moveTo(0, -s.player.r - 6); ctx.lineTo(0, -s.player.r - 2)
      ctx.moveTo(0, s.player.r + 2); ctx.lineTo(0, s.player.r + 6)
      ctx.stroke()
      ctx.restore()

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (phase !== "playing") return
    if (time <= 0) { endGame(); return }
    const id = setTimeout(() => setTime((t) => t - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, time])

  useEffect(() => {
    if (phase !== "playing") return
    for (const a of arcade.achievements) {
      if (score >= a.score && !unlockedRef.current.has(a.label)) {
        unlockedRef.current.add(a.label)
        setToast(`Achievement // ${a.label}`)
        setTimeout(() => setToast(null), 1800)
      }
    }
  }, [score, phase])

  const startGame = useCallback(() => {
    stateRef.current.score = 0
    stateRef.current.runes = []
    stateRef.current.particles = []
    stateRef.current.ripples = []
    stateRef.current.running = true
    unlockedRef.current.clear()
    setSubmitMsg(null)
    setScore(0)
    setTime(DURATION)
    setPhase("playing")
    arcadeCtx.open("rune-chase").then((s) => { sessionRef.current = s }).catch(() => {})
  }, [arcadeCtx])

  const endGame = useCallback(() => {
    stateRef.current.running = false
    setPhase("ended")
    const finalScore = stateRef.current.score
    setBest((b) => {
      const next = Math.max(b, finalScore)
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
    const sess = sessionRef.current
    if (sess && finalScore > 0) {
      arcadeCtx
        .submit({ session: sess, score: finalScore, stats: { duration: DURATION } })
        .then((res) => {
          if (res.ok) setSubmitMsg(res.rank ? `Entered leaderboard #${res.rank}.` : "Score recorded.")
          else setSubmitMsg(`Not recorded // ${res.reason}`)
        })
        .catch(() => setSubmitMsg("Not recorded."))
    }
    sessionRef.current = null
  }, [arcadeCtx])

  return (
    <div
      ref={wrapRef}
      className="relative frame-corners frame-hairline aspect-[16/10] sm:aspect-[16/9] bg-background/50 overflow-hidden"
    >
      <div className="corner-tl" /><div className="corner-br" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between font-hud text-foreground/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 bg-primary animate-pulse-soft" />
            <span>Score</span>
          </div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">{String(score).padStart(3, "0")}</div>
        </div>
        <div className="text-right space-y-1">
          <div>Time</div>
          <div className="font-wordmark-tight text-3xl sm:text-4xl tabular-nums leading-none">{String(time).padStart(2, "0")}s</div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between font-hud text-foreground/70">
        <span>Best // {String(best).padStart(3, "0")}</span>
        <span className="hidden sm:inline">Move // Mouse + Arrows + WASD</span>
        <span className="sm:hidden">Drag to move</span>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-3 frame-hairline bg-background/85 backdrop-blur"
          >
            <span className="font-hud text-primary">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-center px-6"
            >
              <div className="font-hud text-foreground/70 mb-3">{phase === "ended" ? "Round Complete" : "Ritual Awaits"}</div>
              <div className="font-wordmark-tight font-semibold text-5xl sm:text-6xl">
                {phase === "ended" ? (
                  <>You scored <span className="text-primary">{score}</span></>
                ) : (
                  <>Rune <span className="text-primary">/Chase</span></>
                )}
              </div>
              <div className="mt-3 max-w-md mx-auto text-foreground/65 italic-serif text-lg">
                {phase === "ended"
                  ? `Best so far // ${best}. The veil opens again whenever you ask.`
                  : "Touch the amber glyphs. Avoid the red wounds. Sixty seconds."}
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
                <span className="relative z-10 font-hud text-[11px]">{phase === "ended" ? "Play Again" : "Begin Ritual"}</span>
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
