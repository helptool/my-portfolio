"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

/* ---------------------------------------------------------------------------
 * SectionAtmosphere
 *
 * A drop-in ambient backdrop for content sections. It layers slow-moving
 * copper / aether nebulae, a subtle drifting grid, hairline scan ribbons,
 * floating motes, and an optional distant rune ring to make otherwise empty
 * dark sections feel premium and alive without ever competing with the
 * content above them.
 *
 * Variants
 * --------
 *  - "aurora"  :: 3 nebula blooms drift, scan ribbon sweeps, light motes.
 *  - "lattice" :: drifting grid, nebulae, scan ribbon. (Cool / structural.)
 *  - "embers"  :: heavier upward-floating motes + denser nebulae.
 *  - "dossier" :: distant orbital rune ring + nebulae + scan ribbon.
 *
 * Motion is purely decorative, marked aria-hidden, and collapses gracefully
 * when `prefers-reduced-motion` is set. All randomness is deterministic so
 * SSR and CSR render the exact same DOM.
 * ------------------------------------------------------------------------- */

type Variant = "aurora" | "lattice" | "embers" | "dossier"

/* ---------- Drifting nebulae ----------------------------------------------- */
function NebulaBlooms({ density = "med" }: { density?: "low" | "med" | "high" }) {
  const count = density === "low" ? 2 : density === "high" ? 4 : 3

  const blooms = useMemo(() => {
    const palette = [
      "oklch(0.74 0.18 52 / 0.20)", // copper
      "oklch(0.78 0.15 230 / 0.10)", // aether (cool)
      "oklch(0.7 0.2 38 / 0.15)", // ember
      "oklch(0.86 0.16 60 / 0.16)", // soft gold
    ]
    const out: { x: number; y: number; size: number; hue: string; dur: number; delay: number; dx: string; dy: string }[] = []
    for (let i = 0; i < count; i++) {
      const seed = i * 73.13
      const dx = `${((seed * 0.7) % 12) - 6}%`
      const dy = `${((seed * 0.9) % 10) - 5}%`
      out.push({
        x: ((seed * 1.6) % 70) + 15,
        y: ((seed * 1.2) % 70) + 15,
        size: 46 + ((i * 9) % 22),
        hue: palette[i % palette.length],
        dur: 26 + ((i * 5) % 16),
        delay: i * 1.4,
        dx,
        dy,
      })
    }
    return out
  }, [count])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {blooms.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.size}vmin`,
            height: `${b.size}vmin`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(closest-side, ${b.hue}, transparent 70%)`,
            willChange: "transform, opacity",
          }}
          animate={{
            x: ["0%", b.dx, "0%"],
            y: ["0%", b.dy, "0%"],
            opacity: [0.55, 0.95, 0.55],
            scale: [1, 1.06, 1],
          }}
          transition={{
            duration: b.dur,
            delay: b.delay,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          }}
        />
      ))}
    </div>
  )
}

/* ---------- Floating motes ------------------------------------------------- *
 * Tiny copper specs drift slowly upward across the section. A gentle x-jitter
 * keeps them feeling organic rather than mechanical.                        */
function DriftingMotes({ count = 16 }: { count?: number }) {
  const motes = useMemo(() => {
    const out: { x: number; size: number; dur: number; delay: number; drift: number; intensity: number }[] = []
    for (let i = 0; i < count; i++) {
      const seed = i * 41.7
      out.push({
        x: (seed * 1.7) % 100,
        size: 1 + (i % 3) * 0.6,
        dur: 16 + ((i * 0.3) % 12),
        delay: -((i * 0.7) % 10),
        drift: ((seed * 0.9) % 22) - 11,
        intensity: 0.55 + ((i % 5) * 0.08),
      })
    }
    return out
  }, [count])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {motes.map((m, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-primary"
          style={{
            left: `${m.x}%`,
            bottom: 0,
            width: m.size,
            height: m.size,
            opacity: m.intensity,
            boxShadow: "0 0 6px 1px oklch(0.74 0.18 52 / 0.55)",
            willChange: "transform, opacity",
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: ["0vh", "-110vh"],
            x: [0, m.drift, -m.drift / 2, 0],
            opacity: [0, m.intensity, m.intensity, 0],
          }}
          transition={{
            duration: m.dur,
            delay: m.delay,
            ease: "easeOut",
            repeat: Infinity,
            times: [0, 0.12, 0.85, 1],
          }}
        />
      ))}
    </div>
  )
}

/* ---------- Scan ribbon ---------------------------------------------------- *
 * A faint horizontal hairline traverses the section vertically, occasionally
 * lighting up like a film projector pass. Long duration so it's quiet.    */
function ScanRibbon({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 h-px"
      style={{
        background:
          "linear-gradient(90deg, transparent, oklch(0.74 0.18 52 / 0.45), transparent)",
        boxShadow: "0 0 14px 0 oklch(0.74 0.18 52 / 0.35)",
        willChange: "transform, opacity",
      }}
      initial={{ top: "-2%", opacity: 0 }}
      animate={{
        top: ["-2%", "102%"],
        opacity: [0, 0.7, 0.7, 0],
      }}
      transition={{
        duration: 12,
        delay,
        ease: "easeInOut",
        times: [0, 0.15, 0.85, 1],
        repeat: Infinity,
        repeatDelay: 5,
      }}
    />
  )
}

/* ---------- Drifting grid -------------------------------------------------- *
 * The site's `.grid-lines` utility wrapped in a slow translate so it feels
 * like a moving HUD rather than a static texture.                         */
function GridDrift() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid-lines opacity-[0.18] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]"
      animate={{ backgroundPosition: ["0px 0px", "84px 84px"] }}
      transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      style={{ willChange: "background-position" }}
    />
  )
}

/* ---------- Distant orbital rune ring -------------------------------------- *
 * A wireframe disk softly rotating in the corner. Tells the eye there's
 * machinery present without ever stealing the section's content.         */
function OrbitalRune({ corner = "tr" }: { corner?: "tr" | "tl" | "br" | "bl" }) {
  const pos =
    corner === "tr"
      ? "right-[-80px] top-[-60px] md:right-[4%] md:top-[8%]"
      : corner === "tl"
        ? "left-[-80px] top-[-60px] md:left-[4%] md:top-[8%]"
        : corner === "br"
          ? "right-[-80px] bottom-[-60px] md:right-[4%] md:bottom-[8%]"
          : "left-[-80px] bottom-[-60px] md:left-[4%] md:bottom-[8%]"

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute hidden opacity-50 md:block", pos)}
    >
      <motion.svg
        viewBox="0 0 200 200"
        className="h-[300px] w-[300px] text-foreground/15"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 220, ease: "linear", repeat: Infinity }}
      >
        <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="2 5"
        />
        <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" />
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2
          const x1 = 100 + Math.cos(a) * 86
          const y1 = 100 + Math.sin(a) * 86
          const x2 = 100 + Math.cos(a) * (i % 5 === 0 ? 96 : 90)
          const y2 = 100 + Math.sin(a) * (i % 5 === 0 ? 96 : 90)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={i % 5 === 0 ? 0.7 : 0.4}
            />
          )
        })}
        <circle cx="100" cy="100" r="2" fill="oklch(0.74 0.18 52)" />
      </motion.svg>
    </div>
  )
}

/* ---------- Public component ----------------------------------------------- */
export function SectionAtmosphere({
  variant = "aurora",
  className,
  runeCorner,
}: {
  variant?: Variant
  className?: string
  runeCorner?: "tr" | "tl" | "br" | "bl"
}) {
  const reduce = useReducedMotion() ?? false

  const showGrid = variant === "lattice"
  const showRune = variant === "dossier"
  const showRibbon = variant !== "embers"
  const showMotes = variant === "embers" || variant === "aurora" || variant === "lattice"
  const moteCount = variant === "embers" ? 22 : variant === "lattice" ? 10 : 14
  const nebulaDensity: "low" | "med" | "high" =
    variant === "embers" ? "high" : variant === "lattice" ? "low" : "med"

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {/* Edge vignette so the atmosphere fades at the section borders and
          never bleeds into adjacent sections. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 35%, oklch(0.09 0.006 40 / 0.55) 100%)",
        }}
      />

      {!reduce && <NebulaBlooms density={nebulaDensity} />}
      {!reduce && showGrid && <GridDrift />}
      {!reduce && showRune && <OrbitalRune corner={runeCorner ?? "tr"} />}
      {!reduce && showRibbon && <ScanRibbon />}
      {!reduce && showRibbon && variant === "dossier" && <ScanRibbon delay={6} />}
      {!reduce && showMotes && <DriftingMotes count={moteCount} />}

      {/* Hairline frames at the very top and bottom of the section unify
          the rhythm between sections. */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </div>
  )
}
