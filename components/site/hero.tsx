"use client"

import Image from "next/image"
import { SHIMMER } from "@/lib/shimmer"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion"
import dynamic from "next/dynamic"
import { brand } from "@/lib/vaish"
import { Magnetic } from "./magnetic"
import { LetterTilt } from "./letter-tilt"
import { ScrollWeight } from "./scroll-weight"
import { useI18n, useT } from "./i18n-context"
import { useRunes } from "./runes-context"

// Lazy-loaded WebGL ember field. Excluded from SSR + the hero's initial
// client bundle; the GPU work only kicks off after hydration. Falls back
// to nothing during SSR (the page already has the legacy CSS particle
// layer below as a paint-time placeholder while the chunk loads).
/* HeroAura is dynamically imported because the WebGL context, fragment
   shader compile + the rAF loop are pure post-hydration concerns; the
   component already gates itself on `(hover: hover) and (pointer: fine)`
   but lazy-loading also keeps the module out of the SSR bundle. The
   hero already paints completely without it (aether plate + particles)
   so deferring HeroAura by one frame doesn't leave a visible gap. */
const HeroAura = dynamic(() => import("./hero-aura").then((m) => m.HeroAura), {
  ssr: false,
})

const ParticleFieldGL = dynamic(
  () => import("./particle-field-gl").then((m) => m.ParticleFieldGL),
  { ssr: false }
)

const easeOut = [0.16, 1, 0.3, 1] as const

/* ---------------------------------------------------------------------------
 * VAISH Hero :: a multi-act cinematic intro, fully composed for both phone
 * and desktop. Every layer is responsive, no element is desktop-only.
 *
 * Mobile composition
 *   - Vista photograph fills the section as a backdrop (clipped behind a
 *     copper bloom so it blends into the page)
 *   - Avatar sits centered with a rotating sigil ring around it
 *   - Compact HUD chip at the top-right with player + clock
 *   - Top ticker strip + bottom marquee make the page feel "alive"
 *   - World-load meter and edge column glyphs are scaled-down but visible
 *
 * Desktop composition
 *   - Vista pushed to the right as a tall plate
 *   - Avatar pushed to the left, smaller
 *   - HUD card expanded with operator details
 *   - Floating relic in the bottom-right
 * ------------------------------------------------------------------------- */

function useUtcTime() {
  const [t, setT] = useState("")
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, "0")
      setT(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

function ScrambleWord({ word, delay = 0 }: { word: string; delay?: number }) {
  const [text, setText] = useState(word)
  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#*+/."
    let frame = 0
    const total = 24
    let raf = 0
    const start = setTimeout(() => {
      const run = () => {
        frame++
        const reveal = (frame / total) * word.length
        const out = word
          .split("")
          .map((c, i) => {
            if (c === " " || c === "/") return c
            if (i < reveal) return word[i]
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join("")
        setText(out)
        if (frame < total) raf = requestAnimationFrame(run)
        else setText(word)
      }
      raf = requestAnimationFrame(run)
    }, delay)
    return () => {
      clearTimeout(start)
      cancelAnimationFrame(raf)
    }
  }, [word, delay])
  return <span>{text}</span>
}

/**
 * A small drifting particle field, deterministic so SSR/CSR match.
 * Used only on mobile to add ambient density that desktop gets from the
 * extra plates and HUD readouts.
 *
 * Implementation note :: this used to drive each particle off framer's
 * `repeat: Infinity` (one rAF subscriber per particle). On a phone with
 * 16 particles + the hero's WebGL ember layer + the scroll-driven hero
 * transforms it was non-trivial extra compositor work for what is just
 * ambient sparkle. The new version is plain `<span>` + a single shared
 * `@keyframes drift-y` + `@keyframes star-twinkle` triggered via tiny
 * per-particle CSS variables. Identical motion, zero JS-side ticks.
 */
function ParticleField({ count = 16 }: { count?: number }) {
  const particles = Array.from({ length: count }).map((_, i) => {
    const seed = (i * 47.13) % 100
    return {
      id: i,
      left: `${(seed * 1.7) % 100}%`,
      top: `${(seed * 2.3) % 100}%`,
      size: 1 + ((seed * 0.13) % 2),
      delay: (seed * 0.08) % 4,
      dur: 4 + ((seed * 0.11) % 5),
    }
  })
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {particles.map((p) => (
        /* Two dedicated keyframes stacked on a wrapper + inner span,
           replicating the old framer values exactly :: outer span runs
           `particle-drift` (translateY 0 -> -28px -> 0) and inner span
           runs `particle-twinkle` (opacity 0 -> 0.85 -> 0). Both are
           composited so there's no JS-side ticking. The generic
           `drift-y` / `star-twinkle` keyframes nearby are tuned for
           different elements and don't match these particles. */
        <span
          key={p.id}
          className="absolute animate-particle-drift"
          style={
            {
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              "--particle-dur": `${p.dur}s`,
              "--particle-delay": `${p.delay}s`,
            } as React.CSSProperties
          }
        >
          <span
            className="block h-full w-full rounded-full bg-primary/55 animate-particle-twinkle"
            style={
              {
                "--particle-dur": `${p.dur}s`,
                "--particle-delay": `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        </span>
      ))}
    </div>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion() ?? false
  const t = useT()
  const { lang, meta } = useI18n()
  const time = useUtcTime()
  const { addRune, hasRune } = useRunes()

  // Tide rune trigger :: five clicks on the wordmark within 3s. The ref
  // pattern (instead of state) keeps clicks out of the React render path —
  // the H1 has heavy framer transforms attached and re-rendering on every
  // click would drop frames. Resets on the first click of a fresh window.
  const tideRef = useRef<{ count: number; firstAt: number }>({ count: 0, firstAt: 0 })
  const onWordmarkClick = () => {
    if (hasRune("tide")) return
    const now = performance.now()
    const ledger = tideRef.current
    if (ledger.count === 0 || now - ledger.firstAt > 3000) {
      ledger.count = 1
      ledger.firstAt = now
    } else {
      ledger.count++
      if (ledger.count >= 5) {
        addRune("tide")
        ledger.count = 0
      }
    }
  }

  // Scroll progress through the hero, smoothed via spring for buttery output.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const sp = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.4 })

  // ----- Title choreography
  const titleY = useTransform(sp, [0, 1], [0, 60])
  const titleOpacity = useTransform(sp, [0, 0.78, 0.95], [1, 0.6, 0])
  const titleScale = useTransform(sp, [0, 0.55, 1], [1, 1.04, 1.18])

  // Letter split :: V/A drift left, S/H drift right around mid-scroll.
  const splitLeft = useTransform(sp, [0.18, 0.62], [0, -120])
  const splitRight = useTransform(sp, [0.18, 0.62], [0, 120])
  const splitMidScale = useTransform(sp, [0.18, 0.62], [1, 1.16])
  const splitOpacity = useTransform(sp, [0.18, 0.45], [0, 1])

  // ----- Plates
  const vistaY = useTransform(sp, [0, 1], [0, -160])
  const vistaScale = useTransform(sp, [0, 0.6, 1], [1, 1.06, 1.16])
  const vistaOpacity = useTransform(sp, [0, 0.85, 1], [0.85, 0.5, 0])
  const vistaClipR = useTransform(sp, [0, 0.5, 1], ["0%", "12%", "40%"])

  const avatarY = useTransform(sp, [0, 1], [0, -220])
  const avatarScale = useTransform(sp, [0, 1], [1, 0.78])
  const avatarRotate = useTransform(sp, [0, 1], [0, -3])
  const avatarOpacity = useTransform(sp, [0, 0.85, 1], [1, 0.55, 0])

  const orbY = useTransform(sp, [0, 1], [0, -80])
  const orbScale = useTransform(sp, [0, 1], [1, 0.55])
  const orbOpacity = useTransform(sp, [0, 0.7, 1], [1, 0.5, 0])

  // Mobile seal scroll-driven choreography. The seal's rings are spun and
  // scaled by the page scroll progress so the section feels alive even on
  // a phone where there's no mouse parallax.
  const sealScrollRotate = useTransform(sp, [0, 1], [0, 90])
  const sealScrollScale = useTransform(sp, [0, 0.6], [1, 1.08])
  const sealHaloOpacity = useTransform(sp, [0, 0.5, 1], [0.9, 1, 0])

  // Mist + scan-line
  const mistY = useTransform(sp, [0, 1], [0, -120])
  const mistOpacity = useTransform(sp, [0, 0.8, 1], [0.55, 0.4, 0])
  const scanY = useTransform(sp, [0, 1], ["-30%", "130%"])

  // HUD ribbon descend
  const hudY = useTransform(sp, [0, 0.6, 1], [0, 0, 80])
  const hudOpacity = useTransform(sp, [0, 0.85, 1], [1, 1, 0])

  // Mouse parallax (desktop only effectively, but harmless on touch)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const tiltX = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 80, damping: 14 })
  const tiltY = useSpring(useTransform(mx, [-1, 1], [-6, 6]), { stiffness: 80, damping: 14 })
  const driftAvatarX = useSpring(useTransform(mx, [-1, 1], [-12, 12]), { stiffness: 70, damping: 18 })
  const driftAvatarY = useSpring(useTransform(my, [-1, 1], [-10, 10]), { stiffness: 70, damping: 18 })
  const driftVistaX = useSpring(useTransform(mx, [-1, 1], [10, -10]), { stiffness: 60, damping: 18 })
  const driftVistaY = useSpring(useTransform(my, [-1, 1], [8, -8]), { stiffness: 60, damping: 18 })

  // Pre-derive transforms so we never call hooks inside JSX
  const vistaClipPath = useTransform(vistaClipR, (v) => `inset(0% ${v} 0% 0%)`)

  useEffect(() => {
    if (reduce) return
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      mx.set((e.clientX - cx) / cx)
      my.set((e.clientY - cy) / cy)
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [mx, my, reduce])

  // World-loaded counter
  const [count, setCount] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (n: number) => {
      const p = Math.min(1, (n - start) / 1400)
      setCount(Math.floor(p * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section
      ref={ref}
      id="index"
      className="relative isolate min-h-[100svh] w-full overflow-hidden bg-noise"
      style={{ perspective: 1200 }}
    >
      {/* Grid + scanline ambience */}
      <div className="absolute inset-0 grid-lines opacity-50" />
      <div className="pointer-events-none absolute inset-0 scanlines opacity-30 animate-flicker" />

      {/* Drifting mist for depth */}
      <motion.div
        aria-hidden
        style={{ y: mistY, opacity: mistOpacity }}
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-x-0 top-0 h-[42vh] bg-gradient-to-b from-foreground/[0.04] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[42vh] bg-gradient-to-t from-foreground/[0.05] to-transparent" />
      </motion.div>

      {/* Section-spanning scan-line :: signature motif */}
      <motion.div
        aria-hidden
        style={{ y: scanY }}
        className="pointer-events-none absolute -left-[10%] -right-[10%] h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
      />

      {/* Ambient ember field. WebGL points layer (lazy-loaded post-hydration);
          falls back to the deterministic CSS particles during SSR + chunk
          load so there's no empty frame. Mobile gets a lower point count
          and the loop self-suspends if frames blow the 32ms budget — see
          ParticleFieldGL's frame-budget gate. */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <ParticleField count={12} />
        <ParticleFieldGL className="pointer-events-none absolute inset-0" />
      </div>

      {/* WebGL atmospheric layer :: copper + teal nebula on a 3-octave
          FBM noise field, with a cursor-tracked bloom that softens
          toward the pointer and chromatic aberration that ramps with
          scroll velocity. Mounted only on fine pointers; self-pauses
          when the hero scrolls off-screen. Sits BEHIND the aether
          plate so the geometric structure stays clean. */}
      <HeroAura className="pointer-events-none absolute inset-0 mix-blend-screen" />

      {/* ============================================================ *
       * AETHER BACKDROP :: replaces the silhouette photograph with    *
       * a fully composed, theme-based abstract painting in pure CSS / *
       * SVG. No people, no photos. Just copper light + grid geometry. *
       * Desktop: same plate slides to the right as a tall card.       *
       * ============================================================ */}
      <motion.div
        style={{ y: vistaY, scale: vistaScale, opacity: vistaOpacity, clipPath: vistaClipPath }}
        className="pointer-events-none absolute inset-0 md:inset-auto md:right-[-6%] md:top-[8%] md:w-[58vw] md:max-w-[780px] md:aspect-[3/4] md:h-auto"
      >
        <motion.div
          style={{ x: driftVistaX, y: driftVistaY }}
          className="relative h-full w-full overflow-hidden md:frame-hairline"
        >
          {/* Layer 1 :: deep aether gradient. Cool copper-warmed dark. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 70% 25%, oklch(0.20 0.04 50 / 0.85) 0%, transparent 60%), radial-gradient(80% 80% at 30% 100%, oklch(0.13 0.02 40 / 0.95) 0%, transparent 70%), linear-gradient(180deg, oklch(0.10 0.01 40), oklch(0.07 0.005 40))",
            }}
          />

          {/* Layer 2 :: distant constellation grid, slowly drifting */}
          <motion.div
            aria-hidden
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(oklch(1 0 0 / 0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.06) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent 80%)",
            }}
            animate={reduce ? undefined : { backgroundPositionX: ["0px", "44px"], backgroundPositionY: ["0px", "44px"] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          />

          {/* Layer 3 :: stylised horizon line + geometric mountain ridge.
              Three nested polygon ridges give a sense of misty depth, all
              rendered as flat shapes so nothing reads as photographic. */}
          <svg
            viewBox="0 0 600 800"
            preserveAspectRatio="xMidYMax slice"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="ridgeFar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.22 0.04 50)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="oklch(0.10 0.01 40)" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="ridgeMid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.15 0.02 45)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="oklch(0.08 0.01 40)" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="ridgeNear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.10 0.01 40)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="oklch(0.06 0.005 40)" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Faint horizon line */}
            <line x1="0" y1="430" x2="600" y2="430" stroke="oklch(0.74 0.18 52)" strokeOpacity="0.4" strokeWidth="0.5" />

            {/* Far ridge (geometric, jagged) */}
            <polygon
              fill="url(#ridgeFar)"
              points="0,540 60,470 120,500 200,440 280,490 360,450 440,500 520,460 600,500 600,800 0,800"
            />
            {/* Mid ridge */}
            <polygon
              fill="url(#ridgeMid)"
              points="0,640 80,580 160,620 240,570 320,610 400,580 480,620 560,590 600,610 600,800 0,800"
            />
            {/* Near ridge */}
            <polygon
              fill="url(#ridgeNear)"
              points="0,720 100,680 200,710 300,690 400,720 500,690 600,710 600,800 0,800"
            />

            {/* Subtle copper tracer that follows the mid horizon */}
            <path
              d="M0,640 L80,580 L160,620 L240,570 L320,610 L400,580 L480,620 L560,590 L600,610"
              stroke="oklch(0.74 0.18 52)"
              strokeOpacity="0.35"
              strokeWidth="0.8"
              fill="none"
            />
          </svg>

          {/* Layer 4 :: Solar / runic seal :: a copper sphere haloed by
              concentric runic rings, drifting subtly. This is the focal
              point that REPLACES the original photographic vista. */}
          <motion.div
            aria-hidden
            className="absolute"
            style={{ left: "60%", top: "32%", width: "42%", aspectRatio: "1 / 1" }}
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Outer rotating runic ring */}
            <motion.svg
              viewBox="0 0 200 200"
              className="absolute inset-0 h-full w-full text-primary/55"
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            >
              <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.6" />
              <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeOpacity="0.85" strokeWidth="0.6" strokeDasharray="2 6" />
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i / 24) * Math.PI * 2
                const x1 = 100 + Math.cos(a) * 88
                const y1 = 100 + Math.sin(a) * 88
                const x2 = 100 + Math.cos(a) * 96
                const y2 = 100 + Math.sin(a) * 96
                const heavy = i % 6 === 0
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeOpacity={heavy ? 0.85 : 0.35}
                    strokeWidth={heavy ? 0.9 : 0.5}
                  />
                )
              })}
            </motion.svg>

            {/* Counter-rotating inner ring */}
            <motion.svg
              viewBox="0 0 200 200"
              className="absolute inset-[12%] h-auto w-auto text-primary/70"
              animate={reduce ? undefined : { rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
              <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="0.6" />
              <polygon
                points="100,32 158,66 158,134 100,168 42,134 42,66"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.65"
                strokeWidth="0.6"
              />
            </motion.svg>

            {/* Copper aether disc :: glowing core */}
            <span
              className="absolute inset-[28%] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.86 0.16 60) 0%, oklch(0.74 0.18 52) 45%, oklch(0.55 0.16 50) 70%, transparent 100%)",
                boxShadow: "0 0 60px 10px oklch(0.74 0.18 52 / 0.55)",
              }}
            />

            {/* Crisp central pip */}
            <span
              className="absolute"
              style={{
                left: "calc(50% - 4px)",
                top: "calc(50% - 4px)",
                width: 8,
                height: 8,
                borderRadius: 9999,
                background: "oklch(0.96 0.05 90)",
                boxShadow: "0 0 16px 4px oklch(0.86 0.16 60 / 0.85)",
              }}
            />
          </motion.div>

          {/* Layer 5 :: drifting "stars" — deterministic dots seeded so SSR
              and CSR match. No randomness on the client.

              Previously each of the 28 stars mounted a framer-motion
              `<motion.span>` with its own `repeat: Infinity` animation
              driver — i.e. 28 simultaneous JS rAF subscribers ticking
              every frame just to lerp a single opacity number. That
              showed up on slower devices as compositor backpressure
              during the hero scroll sequence (which already ticks
              another ~10 useTransform subscribers off the scroll
              spring). Swapping to plain `<span>` + a single shared
              `@keyframes star-twinkle` rule with per-element
              `--star-dur` / `--star-delay` custom properties moves
              the entire loop onto the compositor thread; React never
              re-renders these spans and framer never subscribes them. */}
          <div aria-hidden className="absolute inset-0">
            {Array.from({ length: 28 }).map((_, i) => {
              const seed = i * 41.7
              const x = (seed * 1.3) % 100
              const y = ((seed * 2.1) % 60) + 5
              const size = (i % 3) + 1
              const dur = 5 + (i % 4)
              const delay = (i * 0.18) % 4
              return (
                <span
                  key={i}
                  className={
                    reduce
                      ? "absolute rounded-full bg-foreground/70"
                      : "absolute rounded-full bg-foreground/70 animate-star-twinkle"
                  }
                  style={
                    {
                      left: `${x}%`,
                      top: `${y}%`,
                      width: size,
                      height: size,
                      "--star-dur": `${dur}s`,
                      "--star-delay": `${delay}s`,
                    } as React.CSSProperties
                  }
                />
              )
            })}
          </div>

          {/* Layer 6 :: legibility scrim so the title reads cleanly */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/45 to-background md:bg-gradient-to-l md:via-background/20 md:to-background" />
          <div className="absolute inset-0 mix-blend-soft-light bg-gradient-to-br from-primary/15 via-transparent to-transparent" />

          {/* Corner ticks (desktop only) */}
          <span className="pointer-events-none absolute left-3 top-3 hidden h-3 w-3 border-l border-t border-foreground/40 md:block" />
          <span className="pointer-events-none absolute right-3 top-3 hidden h-3 w-3 border-r border-t border-foreground/40 md:block" />
          <span className="pointer-events-none absolute left-3 bottom-3 hidden h-3 w-3 border-l border-b border-foreground/40 md:block" />
          <span className="pointer-events-none absolute right-3 bottom-3 hidden h-3 w-3 border-r border-b border-foreground/40 md:block" />
        </motion.div>
      </motion.div>

      {/* ================================================================ *
       * Mobile-only top ticker :: gives the section a "live signal" feel  *
       * ================================================================ */}
      <div className="pointer-events-none absolute inset-x-0 top-[68px] z-20 md:hidden">
        <div className="relative overflow-hidden border-y border-foreground/10 bg-background/40 backdrop-blur-sm">
          <motion.div
            initial={{ x: "0%" }}
            animate={{ x: "-50%" }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            className="flex w-max items-center gap-6 py-2 font-hud text-foreground/70"
          >
            {Array.from({ length: 2 }).map((_, group) => (
              <div key={group} className="flex shrink-0 items-center gap-6">
                <span className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {t("hud.player")} // {brand.name}
                </span>
                <span>{t("hud.operator")} // {brand.creator}</span>
                <span className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {t(`location.${brand.locationKey}`)}
                </span>
                <span>{time || "00:00:00 UTC"}</span>
                <span className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  {t("hero.vesselActive")}
                </span>
                <span>{t("hero.lvl")}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ============================== *
       * Compact HUD chip (mobile only)  *
       * ============================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1.2, ease: easeOut }}
        style={{ opacity: hudOpacity }}
        className="absolute right-5 top-[110px] z-20 flex md:hidden"
      >
        <div className="flex items-center gap-2 border border-foreground/15 bg-background/55 backdrop-blur-md px-2.5 py-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
          <span className="font-hud text-primary">LV.06</span>
          <span className="font-hud text-foreground/40">/</span>
          <span className="font-hud text-foreground/85 tabular-nums">{count}%</span>
        </div>
      </motion.div>

      {/* =========================== *
       * Player HUD card (desktop)    *
       * =========================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1.4, ease: easeOut }}
        style={{ y: hudY, opacity: hudOpacity }}
        className="absolute right-5 sm:right-8 top-[88px] sm:top-[100px] z-20 hidden md:flex items-stretch gap-3"
      >
        <div className="frame-corners relative px-4 py-3 min-w-[260px] bg-background/40 backdrop-blur-sm">
          <div className="corner-tl" />
          <div className="corner-br" />
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-hud text-foreground/45">{t("hud.player")}</span>
            <span className="font-hud text-primary">LV.06</span>
          </div>
          <div className="font-wordmark-tight text-xl leading-tight mt-1 text-foreground">{brand.name}</div>
          <div className="mt-0.5 font-hud text-foreground/70">{t("hud.operator")} // {brand.creator}</div>
          <div className="mt-2 flex items-center gap-2 font-hud text-foreground/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
            <span>{time || "00:00:00 UTC"}</span>
          </div>
          <div className="mt-1 font-hud text-foreground/45">{t(`location.${brand.locationKey}`)}</div>
        </div>
      </motion.div>

      {/* ====================================================== *
       * Avatar plate :: the centerpiece on mobile, side on desk *
       * ====================================================== */}
      <motion.div
        style={{
          y: avatarY,
          scale: avatarScale,
          rotate: avatarRotate,
          opacity: avatarOpacity,
          x: driftAvatarX,
          translateY: driftAvatarY,
        }}
        className="pointer-events-none absolute z-10
                   left-1/2 top-[150px] aspect-square w-[68vw] max-w-[300px] -translate-x-1/2
                   md:left-[6%] md:top-[22%] md:aspect-[3/4] md:w-[30vw] md:max-w-[380px] md:translate-x-0"
      >
        {/* Mobile-only outer atmosphere :: a soft copper halo whose
            opacity is driven by scroll, plus a scroll-tied counter-rotating
            runic ring. This keeps the section dynamic during scroll without
            any glitching, and gives the seal a clear sense of presence. */}
        <motion.div
          aria-hidden
          style={{ opacity: sealHaloOpacity }}
          className="pointer-events-none absolute -inset-[24%] md:hidden"
        >
          {/* Copper aura behind the seal */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, oklch(0.74 0.18 52 / 0.22) 0%, oklch(0.74 0.18 52 / 0.06) 40%, transparent 70%)",
              filter: "blur(6px)",
            }}
          />

          {/* Scroll-driven runic ring (rotates as you scroll) */}
          <motion.div
            style={{ rotate: sealScrollRotate, scale: sealScrollScale }}
            className="absolute inset-[10%]"
          >
            <svg viewBox="0 0 240 240" className="h-full w-full text-foreground/35">
              <circle cx="120" cy="120" r="116" fill="none" stroke="currentColor" strokeWidth="0.6" />
              {Array.from({ length: 36 }).map((_, i) => {
                const a = (i / 36) * Math.PI * 2
                const x1 = 120 + Math.cos(a) * 108
                const y1 = 120 + Math.sin(a) * 108
                const x2 = 120 + Math.cos(a) * 116
                const y2 = 120 + Math.sin(a) * 116
                const heavy = i % 6 === 0
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeOpacity={heavy ? 0.95 : 0.4}
                    strokeWidth={heavy ? 1.4 : 0.9}
                  />
                )
              })}
            </svg>
          </motion.div>

          {/* Continuous slow rotation, decoupled from scroll, so the
              seal still breathes when at rest. */}
          <motion.div
            animate={reduce ? undefined : { rotate: -360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[18%] text-primary/55"
          >
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeDasharray="3 5" strokeWidth="0.8" />
            </svg>
          </motion.div>

          {/* Cardinal copper ticks at the four corners of the halo */}
          {[0, 90, 180, 270].map((deg) => (
            <span
              key={deg}
              className="pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-3 origin-left bg-primary"
              style={{ transform: `translateY(-50%) rotate(${deg}deg) translateX(48%)` }}
            />
          ))}
        </motion.div>

        {/* SIGIL SEAL :: replaces the photographic avatar with a wholly
            composed alchemical seal. Concentric runic rings, a copper
            aether core, drifting glyphs, and HUD chrome - no photo, no
            person silhouette anywhere. Stays on theme. */}
        <div className="relative h-full w-full frame-hairline overflow-hidden">
          {/* Backplate :: deep aether gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, oklch(0.18 0.04 50 / 0.95) 0%, oklch(0.10 0.01 40 / 1) 70%), linear-gradient(180deg, oklch(0.10 0.01 40), oklch(0.06 0.005 40))",
            }}
          />

          {/* Subtle grid, masked to a soft circle */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(oklch(1 0 0 / 0.07) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.07) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(circle at 50% 45%, black 30%, transparent 75%)",
            }}
          />

          {/* Outer rotating runic ring */}
          <motion.svg
            viewBox="0 0 200 200"
            className="absolute inset-[6%] text-primary/65"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
            aria-hidden
          >
            <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.7" />
            <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeOpacity="0.85" strokeWidth="0.6" strokeDasharray="2 6" />
            {Array.from({ length: 36 }).map((_, i) => {
              const a = (i / 36) * Math.PI * 2
              const x1 = 100 + Math.cos(a) * 86
              const y1 = 100 + Math.sin(a) * 86
              const x2 = 100 + Math.cos(a) * 96
              const y2 = 100 + Math.sin(a) * 96
              const heavy = i % 6 === 0
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeOpacity={heavy ? 0.85 : 0.3}
                  strokeWidth={heavy ? 1.2 : 0.5}
                />
              )
            })}
          </motion.svg>

          {/* Counter-rotating inner hex */}
          <motion.svg
            viewBox="0 0 200 200"
            className="absolute inset-[20%] text-primary/85"
            animate={reduce ? undefined : { rotate: -360 }}
            transition={{ duration: 56, repeat: Infinity, ease: "linear" }}
            aria-hidden
          >
            <polygon
              points="100,18 168,58 168,142 100,182 32,142 32,58"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.7"
              strokeWidth="0.8"
            />
            <circle cx="100" cy="100" r="56" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.5" />
          </motion.svg>

          {/* Aether core */}
          <span
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "26%",
              aspectRatio: "1 / 1",
              borderRadius: 9999,
              background:
                "radial-gradient(circle, oklch(0.96 0.05 90) 0%, oklch(0.86 0.16 60) 25%, oklch(0.74 0.18 52) 55%, oklch(0.45 0.14 50 / 0.4) 80%, transparent 100%)",
              boxShadow: "0 0 80px 14px oklch(0.74 0.18 52 / 0.5)",
            }}
          />

          {/* Crisp pip */}
          <span
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: "oklch(0.99 0.02 90)",
              boxShadow: "0 0 12px 3px oklch(0.96 0.05 90)",
            }}
          />

          {/* Drifting glyphs around the seal */}
          {!reduce && (
            <>
              <motion.span
                aria-hidden
                className="font-display absolute text-foreground/70"
                style={{ left: "16%", top: "22%", fontSize: "1.35rem" }}
                animate={{ y: [0, -8, 0], rotate: [0, 6, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              >
                ᚦ
              </motion.span>
              <motion.span
                aria-hidden
                className="font-display absolute text-primary/85"
                style={{ right: "14%", top: "30%", fontSize: "1.5rem" }}
                animate={{ y: [0, 6, 0], rotate: [0, -6, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                ᚱ
              </motion.span>
              <motion.span
                aria-hidden
                className="font-display absolute text-foreground/40"
                style={{ left: "22%", bottom: "26%", fontSize: "1.2rem" }}
                animate={{ y: [0, -6, 0], rotate: [0, 4, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              >
                ᚹ
              </motion.span>
              <motion.span
                aria-hidden
                className="font-display absolute text-foreground/70"
                style={{ right: "20%", bottom: "22%", fontSize: "1.4rem" }}
                animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                ᛟ
              </motion.span>
            </>
          )}

          {/* Scan-line streaking down the seal continuously */}
          {!reduce && (
            <motion.span
              aria-hidden
              animate={{ y: ["-10%", "110%"] }}
              transition={{ duration: 5.4, repeat: Infinity, ease: "linear" }}
              className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent"
            />
          )}

          {/* Soft bottom fade so HUD chrome reads cleanly */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent" />
          <div className="absolute inset-0 ring-1 ring-foreground/10" />

          {/* HUD chrome */}
          <div className="absolute left-3 top-3 flex items-center gap-2 font-hud text-foreground/85">
            <span className="inline-block h-1.5 w-1.5 bg-primary" />
            <span>{t("hero.vesselActive")}</span>
          </div>
          <div className="absolute right-3 bottom-3 font-hud text-foreground/85">{t("hero.lvl")}</div>
        </div>
      </motion.div>

      {/* ===================== *
       * Floating relic         *
       * Desktop-only :: on a   *
       * phone the seal alone   *
       * carries the composition *
       * ===================== */}
      <motion.div
        style={{ y: orbY, scale: orbScale, opacity: orbOpacity }}
        className="pointer-events-none absolute z-10 hidden aspect-square
                   md:right-[10%] md:bottom-[14%] md:top-auto md:block md:w-[14vw] md:max-w-[200px]"
      >
        <div className="relative h-full w-full frame-hairline overflow-hidden glow-ember">
          <Image
            src="/works/orbital.jpg"
            alt=""
            fill
            sizes="(max-width: 768px) 26vw, 14vw"
            className="object-cover"
            placeholder="blur"
            blurDataURL={SHIMMER}
            priority
          />
          {!reduce && (
            <motion.span
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <svg viewBox="0 0 100 100" className="h-full w-full text-primary/45">
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeDasharray="2 4" />
              </svg>
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* ============================================================ *
       * Title block :: bottom of the section, always centered+legible *
       * ============================================================ */}
      <motion.div
        style={{
          y: titleY,
          scale: titleScale,
          opacity: titleOpacity,
          rotateX: tiltX,
          rotateY: tiltY,
        }}
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1600px] flex-col justify-end px-5 pb-20 sm:px-8 sm:pb-24"
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.0, ease: easeOut }}
          className="mb-6 flex items-center gap-3 font-hud text-foreground/70"
        >
          <span className="inline-block h-px w-10 bg-foreground/30" />
          <span className="truncate">
            {t("hero.indexLabel")}
            <span className="hidden sm:inline"> // {t(`role.${brand.roleKey}`)}</span>
          </span>
        </motion.div>

        <h1
          onClick={onWordmarkClick}
          className="font-wordmark-tight text-[clamp(86px,22vw,340px)] font-semibold leading-[0.82] text-foreground"
          style={{
            letterSpacing: "-0.035em",
            fontFeatureSettings: "'kern' 1, 'liga' 1",
            // Per-locale font swap :: Bodoni for Latin, Noto Serif JP for
            // katakana, Noto Serif Devanagari for हिन्दी. The fallback
            // chain keeps the engraved/serif feel before the woff2 chunk
            // for non-Latin scripts arrives.
            fontFamily: meta.wordmarkFont,
            /* Hint the browser to lift the entire wordmark to its own
               compositor layer. Combined with the per-letter
               `will-change-transform` + `backface-visibility: hidden`
               below, this stops scroll-bound x/scale transforms from
               re-painting paint-heavy glyphs at clamp(86px,22vw,340px).
               Fixes the user-reported "struggles to maintain animation
               on scroll" lag on slower laptops.

               NB :: do NOT add `contain: paint` here — the per-letter
               `splitLeft` / `splitRight` transforms move letters up to
               ±120px outside the H1's natural box. `contain: paint`
               would hard-clip those translations exactly like
               `overflow: hidden` and the signature wordmark split would
               cut off mid-animation. `will-change` alone gives us the
               compositor layer without the clipping side-effect. */
            willChange: "transform",
          }}
        >
          <span className="flex items-baseline">
            {meta.wordmark.map((l, i) => {
              /* Split logic adapts to wordmark.length so the morph
                 stays meaningful for locales like Hindi that only
                 honestly support 2 aksharas. For an even-length
                 wordmark there is no middle glyph; left = first half,
                 right = second half. For odd-length there's a single
                 mid glyph that scales rather than splits. */
              const len = meta.wordmark.length
              const halfFloor = Math.floor(len / 2)
              const halfCeil = Math.ceil(len / 2)
              const isMid = len % 2 === 1 && i === halfFloor
              const isLeft = !isMid && i < halfCeil
              const isRight = !isMid && i >= halfCeil
              /* Per-locale kern :: Bodoni's V/A pair has aggressive
                 negative kern that other scripts don't need. Katakana
                 and Devanagari render with their own optical spacing,
                 so we just give them a thin air gap. */
              const isLatin = lang === "en" || lang === "fr" || lang === "es"
              const marginRight = isLatin
                ? l === "V"
                  ? "-0.09em"
                  : l === "A" || l === "Â"
                    ? "-0.01em"
                    : "0em"
                : i < len - 1
                  ? "0.02em"
                  : "0em"
              return (
                <span
                  key={i}
                  className="relative inline-block overflow-hidden [line-height:0.82]"
                  style={{ marginRight }}
                >
                  {/* Outer motion.span carries the scroll-driven split
                      (left/mid/right) which is independent of locale.
                      The inner AnimatePresence cross-fades the actual
                      glyph when `lang` changes — flip + blur reads as
                      a morph without dishonest path interpolation.
                      `perspective` sits here (rather than on the H1)
                      because the per-letter `overflow-hidden` parent is
                      a CSS grouping boundary that doesn't propagate
                      `preserve-3d` from the H1 down to the rotateX. A
                      per-letter perspective gives each glyph its own
                      vanishing point, which at this glyph size is
                      visually indistinguishable from a shared one. */}
                  <motion.span
                    style={{
                      x: isLeft ? splitLeft : isRight ? splitRight : 0,
                      scale: isMid ? splitMidScale : 1,
                      perspective: 800,
                      transformStyle: "preserve-3d",
                    }}
                    initial={{ y: "115%", rotateZ: 6 }}
                    animate={{ y: "0%", rotateZ: 0 }}
                    transition={{ duration: 1.2, delay: 1.05 + i * 0.08, ease: easeOut }}
                    /* `will-change-transform` + `backface-visibility:hidden`
                       force each letter into its own compositor layer so
                       the scroll-bound `x` transform never repaints the
                       glyph itself — the browser just translates the
                       layer. At clamp(86px,22vw,340px) glyph sizes this
                       is the difference between buttery and choppy on
                       slower laptops; the user reported the wordmark
                       "struggles to maintain animation on scroll" before
                       this change. */
                    className="inline-block will-change-transform [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={`${lang}-${l}`}
                        initial={
                          reduce
                            ? { opacity: 0 }
                            : { opacity: 0, rotateX: -55, filter: "blur(6px)", y: "0.4em" }
                        }
                        animate={
                          reduce
                            ? { opacity: 1 }
                            : { opacity: 1, rotateX: 0, filter: "blur(0px)", y: "0em" }
                        }
                        exit={
                          reduce
                            ? { opacity: 0 }
                            : { opacity: 0, rotateX: 55, filter: "blur(6px)", y: "-0.4em" }
                        }
                        transition={{
                          duration: reduce ? 0.18 : 0.55,
                          delay: reduce ? 0 : i * 0.045,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="inline-block"
                      >
                        {l}
                      </motion.span>
                    </AnimatePresence>
                  </motion.span>
                </span>
              )
            })}
            <motion.span
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.55 }}
              className="ml-[0.1em] inline-block translate-y-[-0.4em] text-[0.35em] text-primary italic-serif"
            >
              ·
            </motion.span>
          </span>
        </h1>

        {/* Sigil that appears as the title splits :: desktop only,
            mobile already has the sigil ring around the avatar */}
        <motion.div
          aria-hidden
          style={{ opacity: splitOpacity, scale: splitMidScale }}
          className="pointer-events-none absolute inset-x-0 top-[40%] -translate-y-1/2 mx-auto justify-center hidden md:flex"
        >
          <div className="relative h-[18vw] w-[18vw] max-h-[260px] max-w-[260px]">
            <span className="absolute inset-0 rounded-full border border-primary/40" />
            <span className="absolute inset-[14%] rounded-full border border-primary/30" />
            <span className="absolute inset-[34%] rounded-full bg-primary/80 blur-[1px]" />
            <span className="absolute inset-[42%] rounded-full bg-primary" />
          </div>
        </motion.div>

        <div className="mt-4 flex flex-col-reverse md:flex-row md:items-end md:justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.5, ease: easeOut }}
            className="max-w-[460px] text-pretty"
          >
            {/* Mobile-only inline tag strip :: keeps the discipline tags
                visible WITHOUT absolute positioning that would overlap the
                seal. Lives in the natural flow of the title block. */}
            <div className="-mx-1 mb-3 flex flex-wrap items-center gap-1.5 text-[10px] md:hidden">
              <span className="font-hud border border-foreground/15 bg-background/55 px-2 py-1 text-foreground/85 backdrop-blur-md">
                {t("hero.scramble1").toUpperCase()}
              </span>
              <span className="h-px w-2 bg-foreground/30" />
              <span className="font-hud border border-primary/40 bg-primary/[0.08] px-2 py-1 text-primary backdrop-blur-md">
                {t("hero.scramble2").toUpperCase()}
              </span>
              <span className="h-px w-2 bg-foreground/30" />
              <span className="font-hud border border-foreground/15 bg-background/55 px-2 py-1 text-foreground/85 backdrop-blur-md">
                {t("hero.scramble3").toUpperCase()}
              </span>
            </div>

            <p className="hidden font-hud text-foreground/70 md:block">
              <ScrambleWord word={t("hero.scramble1").toUpperCase()} delay={1500} />
              <span className="text-foreground/35"> // </span>
              <ScrambleWord word={t("hero.scramble2").toUpperCase()} delay={1700} />
              <span className="text-foreground/35"> // </span>
              <ScrambleWord word={t("hero.scramble3").toUpperCase()} delay={1900} />
            </p>
            <p className="italic-serif mt-3 text-[19px] sm:text-[26px] text-foreground/85 leading-snug">
              {/* LetterTilt :: each char in the subline tilts toward cursor.
                  Subtle (3°) so it reads "alive" rather than "gimmick". */}
              <LetterTilt maxTilt={3} radius={300}>{t("hero.subline")}</LetterTilt>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.65, ease: easeOut }}
            className="flex flex-wrap items-center gap-4 sm:gap-5"
          >
            <Magnetic strength={0.45}>
              <Link
                href="#play"
                data-cursor="play"
                data-cursor-label={t("hero.start")}
                className="group relative inline-flex h-[54px] sm:h-[58px] items-center gap-3 sm:gap-4 rounded-full bg-primary pl-5 sm:pl-6 pr-2.5 sm:pr-3 text-primary-foreground overflow-hidden"
              >
                <span className="relative z-10 font-hud text-[11px]">{t("hero.start")}</span>
                <span className="relative z-10 flex h-[38px] w-[38px] sm:h-[42px] sm:w-[42px] items-center justify-center rounded-full bg-primary-foreground/15">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-foreground/10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0"
                />
              </Link>
            </Magnetic>
            <Magnetic strength={0.3}>
              <Link
                href="#enter"
                data-cursor="hover"
                className="group relative inline-flex items-center gap-3 py-2 font-hud text-foreground/75 hover:text-foreground transition-colors"
              >
                <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-foreground/25">
                  <span className="h-1 w-1 rounded-full bg-foreground" />
                </span>
                {t("hero.begin")}
              </Link>
            </Magnetic>
          </motion.div>
        </div>
      </motion.div>

      {/* ============================================================ *
       * Bottom HUD strip :: visible on every screen, content reflows. *
       * ============================================================ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.9 }}
        style={{ y: hudY, opacity: hudOpacity }}
        className="absolute bottom-4 left-5 right-5 sm:bottom-5 sm:left-8 sm:right-8 z-10 flex flex-wrap items-end justify-between gap-3 font-hud text-foreground/45"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-[42px] w-px overflow-hidden bg-foreground/20">
            <motion.span
              initial={{ y: "-100%" }}
              animate={{ y: "100%" }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="absolute inset-x-0 top-0 h-[30%] bg-primary"
            />
          </div>
          <span>{t("hud.scroll")}</span>
        </div>

        {/* World load meter :: now visible on every screen */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-[10px] w-[140px] sm:w-[200px] items-center gap-[2px] overflow-hidden rounded-sm border border-foreground/15 p-[2px]">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="h-full flex-1"
                style={{
                  background:
                    i < Math.round((count / 100) * 24) ? "oklch(0.74 0.15 52)" : "oklch(1 0 0 / 0.06)",
                }}
              />
            ))}
          </div>
          <span>{t("hud.world")} // {count}%</span>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <span>{t("hud.session")}</span>
          <span>v.000.23</span>
        </div>
      </motion.div>

      {/* Faint giant text at bottom :: signature. Hidden on mobile so it
          doesn't compete with the inline title block. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-3vw] z-[5] hidden text-center md:block">
        <span className="italic-serif inline-block text-[18vw] leading-none text-foreground/[0.04]">
          {t("hero.beyond")}
        </span>
      </div>

      {/* ============================ *
       * Edge column markers           *
       * Visible on every screen now   *
       * ============================ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-[28px] sm:w-[44px] items-center justify-center"
      >
        <span
          className="font-hud rotate-[-90deg] origin-center whitespace-nowrap text-foreground/30 text-[8px] sm:text-[10px]"
          style={{ letterSpacing: "0.32em" }}
        >
          {t("hero.edgeLeft")}
        </span>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-[28px] sm:w-[44px] items-center justify-center"
      >
        <span
          className="font-hud rotate-90 origin-center whitespace-nowrap text-foreground/30 text-[8px] sm:text-[10px]"
          style={{ letterSpacing: "0.32em" }}
        >
          {t("hero.edgeRight")}
        </span>
      </div>
    </section>
  )
}
