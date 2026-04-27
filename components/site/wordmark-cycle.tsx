"use client"

/* ===========================================================================
 * WordmarkCycle — premium kinetic typography for the VAISH lockup.
 *
 * The base wordmark is mounted ONCE as a static, always-readable layer in
 * the foreground colour. On top of it, a sequenced loop of seven distinct
 * VFX stages run continuously, each one a different "language" of how
 * COPPER LIGHT can move through metal letterforms. All stages share a
 * single warm-copper hue family, anchor their effect INSIDE the letters
 * (not as a wash behind them), composite with `plus-lighter` for HDR-style
 * additive bloom, and stack multiple `drop-shadow()` halos for halation.
 *
 *   00 :: SOLAR BLOOM         a copper sun rises through the lockup, a
 *                             warm vertical gradient ascends INSIDE letters.
 *   01 :: INK FLOW            SVG fractal turbulence + feDisplacementMap
 *                             animated on rAF makes letters ripple molten.
 *   02 :: VECTOR FORGE        outline strokes (via -webkit-text-stroke) draw
 *                             on, a welding spark races along the top, then
 *                             a copper wash sweeps in to fill them.
 *   03 :: PARALLAX EXTRUDE    eight stacked clones at progressive z-depth
 *                             tilt on rotateX/Y for a real metal-slab feel,
 *                             with a bright rim-light skimming the top.
 *   04 :: SPARK STORM         70 deterministic copper embers burst OUT from
 *                             inside each letter, arc through the air, then
 *                             magnetically return to reform the lockup.
 *   05 :: HEATWAVE            high-frequency turbulence + amber thermal
 *                             gradient — branded-iron haze; rAF-driven.
 *   06 :: ECLIPTIC            a copper disc rises behind the lockup, three
 *                             concentric hairline rings expand outward, a
 *                             copper baseline thread stitches across.
 *
 * Honours `prefers-reduced-motion`: collapses to the static base + aura.
 * ========================================================================= */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const WORD = "VAISH"
const LETTERS = WORD.split("")

const STAGE_COUNT = 7
const STAGE_DURATION = 5400 // ms — total time a stage owns the foreground
const FADE = 1.2 // s — crossfade duration shared by every stage

const easeOut = [0.22, 1, 0.36, 1] as const
const easeInOut = [0.83, 0, 0.17, 1] as const
const stageWrapTransition = { duration: FADE, ease: easeOut } as const

/* --- Copper palette (resolved from the site theme) ---------------------- */
const HOT = "oklch(0.99 0.06 90)" // warm white spec   (hottest core)
const PEAK = "oklch(0.92 0.14 70)" // hot copper        (peak)
const BRIGHT = "oklch(0.86 0.16 60)" // bright copper     (highlight)
const COPPER = "oklch(0.74 0.18 52)" // deep copper       (body)
const SHADOW = "oklch(0.55 0.14 50)" // shadow copper     (rim)

/** Hand-set kerning so the V hugs the A and the wordmark never wobbles. */
const letterMargin = (l: string) => (l === "V" ? "-0.09em" : l === "A" ? "-0.01em" : "0em")

/** Common typographic system so base + every overlay align pixel-perfectly. */
const baseTypeStyle: React.CSSProperties = {
  fontSize: "clamp(96px,23vw,420px)",
  letterSpacing: "-0.035em",
  lineHeight: 0.84,
  fontFeatureSettings: "'kern' 1, 'liga' 1",
}

/* ---------- Static base layer (always visible) ----------------------------- */
function BaseWordmark() {
  return (
    <h2
      aria-label="VAISH"
      className="font-wordmark-tight relative flex select-none items-baseline justify-center font-semibold text-foreground"
      style={baseTypeStyle}
    >
      {LETTERS.map((l, i) => (
        <span key={i} className="inline-block" style={{ marginRight: letterMargin(l) }}>
          {l}
        </span>
      ))}
    </h2>
  )
}

/* ---------- InkWordmark ---------------------------------------------------- *
 * Shared painting surface for every stage. Renders the SAME letterforms as
 * BaseWordmark, but fills them with an animatable background gradient via
 * `background-clip: text`. This is what makes effects feel "made of copper
 * light" rather than pasted on top.
 * ------------------------------------------------------------------------- */
function InkWordmark({
  background,
  backgroundSize,
  initial,
  animate,
  transition,
  filter,
  className,
  style,
}: {
  background: string
  backgroundSize?: string
  initial?: any
  animate?: any
  transition?: any
  filter?: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <motion.div
      aria-hidden
      initial={initial}
      animate={animate}
      transition={transition}
      className={cn(
        "pointer-events-none absolute inset-0 flex select-none items-baseline justify-center font-semibold font-wordmark-tight",
        className,
      )}
      style={{
        ...baseTypeStyle,
        color: "transparent",
        WebkitTextFillColor: "transparent",
        backgroundImage: background,
        backgroundSize: backgroundSize ?? "100% 100%",
        backgroundRepeat: "no-repeat",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        filter,
        ...style,
      }}
    >
      {LETTERS.map((l, i) => (
        <span key={i} className="inline-block" style={{ marginRight: letterMargin(l) }}>
          {l}
        </span>
      ))}
    </motion.div>
  )
}

/* ---------- StrokeWordmark ------------------------------------------------- *
 * Outline-only render of the lockup using -webkit-text-stroke. Used by the
 * forge stage as the wireframe that the welding spark traces. */
function StrokeWordmark({
  strokeColor,
  strokeWidth = "1.5px",
  filter,
  className,
  style,
  initial,
  animate,
  transition,
}: {
  strokeColor: string
  strokeWidth?: string
  filter?: string
  className?: string
  style?: React.CSSProperties
  initial?: any
  animate?: any
  transition?: any
}) {
  return (
    <motion.div
      aria-hidden
      initial={initial}
      animate={animate}
      transition={transition}
      className={cn(
        "pointer-events-none absolute inset-0 flex select-none items-baseline justify-center font-semibold font-wordmark-tight",
        className,
      )}
      style={{
        ...baseTypeStyle,
        color: "transparent",
        WebkitTextFillColor: "transparent",
        WebkitTextStroke: `${strokeWidth} ${strokeColor}`,
        filter,
        ...style,
      }}
    >
      {LETTERS.map((l, i) => (
        <span key={i} className="inline-block" style={{ marginRight: letterMargin(l) }}>
          {l}
        </span>
      ))}
    </motion.div>
  )
}

/* =========================================================================
 * Stage 00 :: SOLAR BLOOM
 *
 * A copper sun ascends from below the lockup; a vertical warm gradient
 * ascends through each letter via background-clip:text, so the warm light
 * lives INSIDE the letterforms. A stacked drop-shadow chain creates HDR
 * halation around the lockup at peak.
 * ======================================================================= */
function StageSolarBloom() {
  const liquidBg = `linear-gradient(0deg,
      ${HOT} 0%,
      ${PEAK} 18%,
      ${BRIGHT} 38%,
      ${COPPER} 60%,
      ${SHADOW} 80%,
      transparent 100%
    )`

  return (
    <motion.div
      key="solar"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={stageWrapTransition}
      style={{ mixBlendMode: "plus-lighter" as any }}
      aria-hidden
    >
      {/* The rising sun — sits BEHIND the lockup */}
      <motion.span
        className="absolute"
        style={{
          left: "50%",
          width: "62%",
          aspectRatio: "1 / 1",
          background: `radial-gradient(circle at 50% 50%, ${HOT} 0%, ${BRIGHT} 28%, ${COPPER} 50%, ${SHADOW} 68%, transparent 78%)`,
          filter: "blur(10px)",
          mixBlendMode: "plus-lighter" as any,
          translate: "-50% 0",
        }}
        initial={{ y: "60%", opacity: 0, scale: 0.85 }}
        animate={{
          y: ["60%", "8%", "8%", "30%"],
          opacity: [0, 1, 1, 0],
          scale: [0.85, 1.08, 1.08, 0.96],
        }}
        transition={{ duration: 5.2, times: [0, 0.35, 0.7, 1], ease: easeOut }}
      />

      {/* The lockup, gradient-clipped to text. Background-position rises so
          warm light visibly ascends through the letters. */}
      <InkWordmark
        background={liquidBg}
        backgroundSize="100% 320%"
        filter="drop-shadow(0 0 18px oklch(0.86 0.16 60 / 0.65)) drop-shadow(0 0 60px oklch(0.74 0.18 52 / 0.55)) drop-shadow(0 0 120px oklch(0.55 0.14 50 / 0.45))"
        initial={{ backgroundPosition: "0% -120%" }}
        animate={{ backgroundPosition: ["0% -120%", "0% 60%", "0% 100%"] }}
        transition={{ duration: 5.0, times: [0, 0.7, 1], ease: easeInOut }}
      />
    </motion.div>
  )
}

/* =========================================================================
 * Stage 01 :: INK FLOW
 *
 * SVG fractal turbulence + feDisplacementMap distorts the lockup like
 * molten copper on the surface of liquid. Filter values are animated in
 * real time via a requestAnimationFrame loop that writes to <feTurbulence>
 * and <feDisplacementMap> attributes — this is the technique that buys the
 * truly "fluid" look you can't fake with CSS keyframes.
 * ======================================================================= */
function StageInkFlow({ filterId }: { filterId: string }) {
  const turbRef = useRef<SVGFETurbulenceElement | null>(null)
  const dispRef = useRef<SVGFEDisplacementMapElement | null>(null)

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = (now - start) / 1000
      const phase = Math.min(1, t / 5.2)
      const ramp = Math.sin(phase * Math.PI) // 0 → 1 → 0
      const scale = 2 + ramp * 18
      const fx = 0.008 + ramp * 0.006 + 0.002 * Math.sin(t * 0.7)
      const fy = 0.012 + ramp * 0.005 + 0.002 * Math.cos(t * 0.6)
      if (dispRef.current) dispRef.current.setAttribute("scale", String(scale))
      if (turbRef.current) turbRef.current.setAttribute("baseFrequency", `${fx} ${fy}`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <motion.div
      key="ink"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={stageWrapTransition}
      style={{ mixBlendMode: "plus-lighter" as any }}
      aria-hidden
    >
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden focusable="false">
        <defs>
          <filter id={filterId} x="-10%" y="-25%" width="120%" height="150%">
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.012 0.014"
              numOctaves="2"
              seed="7"
            />
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <motion.div
        className="absolute inset-0"
        style={{ filter: `url(#${filterId})` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.85, 0] }}
        transition={{ duration: 5.2, times: [0, 0.18, 0.7, 0.85, 1], ease: easeOut }}
      >
        <InkWordmark
          background={`linear-gradient(110deg, ${SHADOW} 0%, ${COPPER} 30%, ${HOT} 50%, ${COPPER} 70%, ${SHADOW} 100%)`}
          backgroundSize="220% 100%"
          filter="drop-shadow(0 0 28px oklch(0.74 0.18 52 / 0.65)) drop-shadow(0 0 80px oklch(0.55 0.14 50 / 0.5))"
          initial={{ backgroundPosition: "120% 50%" }}
          animate={{ backgroundPosition: ["120% 50%", "-160% 50%"] }}
          transition={{ duration: 5.2, ease: easeOut }}
        />
      </motion.div>
    </motion.div>
  )
}

/* =========================================================================
 * Stage 02 :: VECTOR FORGE
 *
 * Outline-only "wireframe" of the lockup is revealed via a clip-path wipe
 * (it draws on left-to-right). A bright welding spark races along the top
 * edge as the strokes appear, leaving an HDR trail. Once the strokes are
 * complete, a copper wash sweeps in to fill the letters with metal.
 * ======================================================================= */
function StageVectorForge() {
  return (
    <motion.div
      key="forge"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={stageWrapTransition}
      style={{ mixBlendMode: "plus-lighter" as any }}
      aria-hidden
    >
      {/* Stroke layer: copper outline, drawn on via a left-to-right clip wipe */}
      <motion.div
        className="absolute inset-0"
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{
          clipPath: [
            "inset(0 100% 0 0)",
            "inset(0 0% 0 0)",
            "inset(0 0% 0 0)",
            "inset(0 0% 0 0)",
          ],
        }}
        transition={{ duration: 5.2, times: [0, 0.45, 0.85, 1], ease: easeOut }}
      >
        <StrokeWordmark
          strokeColor={COPPER}
          strokeWidth="1.5px"
          filter="drop-shadow(0 0 14px oklch(0.74 0.18 52 / 0.85)) drop-shadow(0 0 36px oklch(0.55 0.14 50 / 0.5))"
        />
      </motion.div>

      {/* Welding spark — bright dot tracking the edge of the wipe */}
      <motion.span
        className="pointer-events-none absolute"
        style={{
          left: 0,
          top: "32%",
          width: 18,
          height: 18,
          borderRadius: 9999,
          background: `radial-gradient(circle, ${HOT} 0%, ${BRIGHT} 38%, transparent 75%)`,
          boxShadow: `0 0 24px 8px ${BRIGHT}, 0 0 60px 14px ${COPPER}, 0 0 120px 24px ${SHADOW}`,
          mixBlendMode: "plus-lighter" as any,
        }}
        initial={{ x: "-4%", opacity: 0, scale: 0.6 }}
        animate={{
          x: ["-4%", "98%", "98%"],
          opacity: [0, 1, 0],
          scale: [0.6, 1.1, 0.8],
        }}
        transition={{ duration: 5.2, times: [0, 0.45, 0.55], ease: easeOut }}
      />

      {/* Copper fill wash sweeping in to fill the strokes after they finish */}
      <motion.div
        className="absolute inset-0"
        style={{ mixBlendMode: "plus-lighter" as any }}
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{
          clipPath: [
            "inset(0 100% 0 0)",
            "inset(0 100% 0 0)",
            "inset(0 0% 0 0)",
            "inset(0 0% 0 100%)",
          ],
        }}
        transition={{ duration: 5.2, times: [0, 0.5, 0.8, 1], ease: easeOut }}
      >
        <InkWordmark
          background={`linear-gradient(95deg, ${SHADOW} 0%, ${COPPER} 35%, ${BRIGHT} 60%, ${HOT} 100%)`}
          filter="drop-shadow(0 0 18px oklch(0.86 0.16 60 / 0.7)) drop-shadow(0 0 48px oklch(0.74 0.18 52 / 0.55))"
        />
      </motion.div>
    </motion.div>
  )
}

/* =========================================================================
 * Stage 03 :: PARALLAX EXTRUDE
 *
 * Eight stacked clones of the lockup at progressively reduced opacity AND
 * deeper colour AND descending Y offset create a faux 3D extrusion. The
 * whole stack tilts on rotateX/Y for a real metal-slab feel, with a bright
 * rim-light skating across the front face.
 * ======================================================================= */
function StageParallaxExtrude() {
  const layers = 8
  return (
    <motion.div
      key="extrude"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={stageWrapTransition}
      style={{ perspective: 1400, mixBlendMode: "plus-lighter" as any }}
      aria-hidden
    >
      <motion.div
        className="relative"
        style={{ transformStyle: "preserve-3d" } as React.CSSProperties}
        initial={{ rotateX: -12, rotateY: -8 }}
        animate={{
          rotateX: [-12, 4, -2, -10],
          rotateY: [-8, 8, 0, -6],
        }}
        transition={{ duration: 5.2, ease: easeOut }}
      >
        {/* Render BACK to FRONT so paint order is physically correct */}
        {Array.from({ length: layers }).map((_, raw) => {
          const idx = raw // 0 = back, layers-1 = front
          const t = idx / (layers - 1) // 0..1
          const yOff = (1 - t) * -10 // front sits highest
          const zOff = idx * 1.6
          const fillOpacity = 0.42 + t * 0.5
          const stroke = `oklch(${0.34 + t * 0.45} 0.14 ${50 + t * 8})`
          const halo = t > 0.85 ? `drop-shadow(0 0 22px ${COPPER})` : undefined
          return (
            <div
              key={idx}
              className="absolute inset-0 flex items-baseline justify-center"
              style={{ transform: `translate3d(0, ${yOff}px, ${zOff}px)` }}
            >
              <StrokeWordmark
                strokeColor={stroke}
                strokeWidth={t > 0.85 ? "1.4px" : "1.1px"}
                filter={halo}
                style={{ opacity: fillOpacity }}
              />
            </div>
          )
        })}

        {/* Front-face copper fill so the leading slab reads as solid metal */}
        <div
          className="absolute inset-0 flex items-baseline justify-center"
          style={{ transform: `translate3d(0, -10px, ${(layers - 1) * 1.6 + 0.5}px)` }}
        >
          <InkWordmark
            background={`linear-gradient(180deg, ${PEAK} 0%, ${BRIGHT} 30%, ${COPPER} 65%, ${SHADOW} 100%)`}
            filter="drop-shadow(0 0 20px oklch(0.74 0.18 52 / 0.55))"
          />
        </div>

        {/* Rim light — sliding sheen on the front face */}
        <motion.div
          className="absolute inset-0 flex items-baseline justify-center"
          style={{
            transform: `translate3d(0, -10px, ${(layers - 1) * 1.6 + 1}px)`,
            mixBlendMode: "plus-lighter" as any,
          }}
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{
            clipPath: [
              "inset(0 100% 0 0)",
              "inset(0 -10% 0 30%)",
              "inset(0 -10% 0 110%)",
            ],
          }}
          transition={{ duration: 5.2, times: [0.05, 0.55, 0.95], ease: easeOut }}
        >
          <InkWordmark
            background={`linear-gradient(95deg, transparent 0%, ${HOT} 45%, ${HOT} 55%, transparent 100%)`}
            filter={`drop-shadow(0 0 14px ${HOT}) drop-shadow(0 0 32px ${BRIGHT})`}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/* =========================================================================
 * Stage 04 :: SPARK STORM
 *
 * Deterministic copper embers burst OUTWARD from inside each letter, follow
 * elliptical arcs out into the air, then spiral magnetically back inward.
 * Origins are seeded along the wordmark width so the storm clearly emits
 * FROM the lockup rather than around it.
 * ======================================================================= */
function StageSparkStorm({ reduce }: { reduce: boolean }) {
  const sparks = useMemo(() => {
    const out: {
      ox: number
      oy: number
      angle: number
      speed: number
      delay: number
      size: number
      curve: number
      hot: boolean
    }[] = []
    for (let li = 0; li < LETTERS.length; li++) {
      for (let si = 0; si < 14; si++) {
        const seed = li * 31 + si * 7
        const ox = ((li + 0.5) / LETTERS.length) * 100 + ((seed % 7) - 3) * 2
        const oy = 50 + ((seed * 13) % 30) - 15
        const angle = ((seed * 19) % 360) * (Math.PI / 180)
        const speed = 90 + ((seed * 11) % 110)
        const delay = ((seed * 0.013) % 0.7) + li * 0.04
        const size = 1.5 + (seed % 4) * 0.7
        const curve = ((seed % 5) - 2) * 0.3
        const hot = si % 5 === 0
        out.push({ ox, oy, angle, speed, delay, size, curve, hot })
      }
    }
    return out
  }, [])

  return (
    <motion.div
      key="storm"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={stageWrapTransition}
      aria-hidden
    >
      {/* Reservoir copper INSIDE the letters — the source the sparks leave from */}
      <motion.div
        className="absolute inset-0"
        style={{ mixBlendMode: "plus-lighter" as any }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.95, 0.7, 0] }}
        transition={{ duration: 5.2, times: [0, 0.25, 0.7, 1], ease: easeOut }}
      >
        <InkWordmark
          background={`linear-gradient(180deg, ${HOT} 0%, ${BRIGHT} 35%, ${COPPER} 70%, ${SHADOW} 100%)`}
          filter="drop-shadow(0 0 22px oklch(0.74 0.18 52 / 0.6)) drop-shadow(0 0 60px oklch(0.55 0.14 50 / 0.5))"
        />
      </motion.div>

      {/* Spark field — positioned within a wordmark-sized bounding box */}
      <div
        className="absolute"
        style={{
          width: "min(82vw, 1500px)",
          height: "clamp(96px,23vw,420px)",
        }}
      >
        {!reduce &&
          sparks.map((s, i) => {
            const dx = Math.cos(s.angle) * s.speed
            const dy = Math.sin(s.angle) * s.speed * 0.65
            const cx = -Math.sin(s.angle) * s.speed * s.curve
            const cy = Math.cos(s.angle) * s.speed * s.curve
            return (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${s.ox}%`,
                  top: `${s.oy}%`,
                  width: s.size,
                  height: s.size,
                  background: s.hot ? HOT : BRIGHT,
                  boxShadow: s.hot
                    ? `0 0 ${s.size * 5}px ${s.size * 1.5}px ${HOT}, 0 0 ${s.size * 14}px ${s.size * 2.5}px ${COPPER}`
                    : `0 0 ${s.size * 4}px ${s.size}px ${BRIGHT}, 0 0 ${s.size * 12}px ${s.size * 2}px ${COPPER}`,
                  mixBlendMode: "plus-lighter" as any,
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                animate={{
                  x: [0, dx + cx, dx + cx * 0.5, 0],
                  y: [0, dy + cy, dy + cy * 0.5, 0],
                  opacity: [0, 1, 0.9, 0],
                  scale: [0.3, 1, 0.9, 0.4],
                }}
                transition={{
                  duration: 4.6,
                  delay: s.delay,
                  times: [0, 0.35, 0.65, 1],
                  ease: easeOut,
                }}
              />
            )
          })}
      </div>
    </motion.div>
  )
}

/* =========================================================================
 * Stage 05 :: HEATWAVE
 *
 * High-frequency turbulence + amber thermal gradient gives the lockup a
 * branded-iron heat haze. Filter is animated continuously via rAF for
 * jitter-free shimmer at any frame rate.
 * ======================================================================= */
function StageHeatwave({ filterId }: { filterId: string }) {
  const turbRef = useRef<SVGFETurbulenceElement | null>(null)
  const dispRef = useRef<SVGFEDisplacementMapElement | null>(null)

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = (now - start) / 1000
      const fx = 0.025 + 0.01 * Math.sin(t * 1.4)
      const fy = 0.06 + 0.015 * Math.cos(t * 0.9)
      const phase = Math.min(1, t / 5.2)
      const ramp = Math.sin(phase * Math.PI)
      const scale = 1 + ramp * 8
      if (turbRef.current) turbRef.current.setAttribute("baseFrequency", `${fx} ${fy}`)
      if (dispRef.current) dispRef.current.setAttribute("scale", String(scale))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <motion.div
      key="heat"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={stageWrapTransition}
      style={{ mixBlendMode: "plus-lighter" as any }}
      aria-hidden
    >
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden focusable="false">
        <defs>
          <filter id={filterId} x="-10%" y="-30%" width="120%" height="160%">
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.025 0.06"
              numOctaves="2"
              seed="13"
            />
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              scale="3"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <motion.div
        className="absolute inset-0"
        style={{ filter: `url(#${filterId})` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 5.2, times: [0, 0.2, 0.75, 1], ease: easeOut }}
      >
        <InkWordmark
          background={`linear-gradient(0deg, ${HOT} 0%, ${PEAK} 25%, ${BRIGHT} 50%, ${SHADOW} 80%, transparent 100%)`}
          backgroundSize="100% 220%"
          filter="drop-shadow(0 0 18px oklch(0.86 0.16 60 / 0.7)) drop-shadow(0 0 50px oklch(0.74 0.18 52 / 0.55)) drop-shadow(0 8px 80px oklch(0.55 0.14 50 / 0.45))"
          initial={{ backgroundPosition: "0% 110%" }}
          animate={{ backgroundPosition: ["0% 110%", "0% -20%"] }}
          transition={{ duration: 5.2, ease: easeOut }}
        />
      </motion.div>
    </motion.div>
  )
}

/* =========================================================================
 * Stage 06 :: ECLIPTIC
 *
 * A copper disc rises BEHIND the lockup — the letters silhouette against
 * it. Three concentric hairline rings expand outward, very slow. A copper
 * baseline thread stitches across.
 * ======================================================================= */
function StageEcliptic() {
  return (
    <motion.div
      key="ecliptic"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={stageWrapTransition}
      aria-hidden
    >
      {/* Disc — sits BEHIND the lockup */}
      <motion.span
        className="absolute"
        style={{
          width: "min(28vw, 460px)",
          aspectRatio: "1 / 1",
          borderRadius: 9999,
          background: `radial-gradient(circle, ${COPPER} 0%, ${SHADOW} 60%, transparent 100%)`,
          mixBlendMode: "plus-lighter" as any,
          boxShadow: `0 0 70px 12px ${SHADOW}, 0 0 200px 36px ${COPPER}`,
        }}
        initial={{ scale: 0.4, y: 80, opacity: 0 }}
        animate={{
          scale: [0.4, 1, 1, 0.95],
          y: [80, 0, 0, -18],
          opacity: [0, 1, 1, 0],
        }}
        transition={{ duration: 5.2, times: [0, 0.32, 0.78, 1], ease: easeOut }}
      />

      {/* Three expanding hairline rings */}
      {[0, 0.18, 0.36].map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border"
          style={{
            width: "min(28vw, 460px)",
            aspectRatio: "1 / 1",
            borderColor: COPPER,
            borderWidth: 1,
            mixBlendMode: "plus-lighter" as any,
          }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 2 + i * 0.4], opacity: [0, 0.7, 0] }}
          transition={{
            duration: 4.4,
            delay: d + 0.4,
            times: [0, 0.4, 1],
            ease: easeOut,
          }}
        />
      ))}

      {/* Copper baseline thread */}
      <motion.span
        className="absolute h-px"
        style={{
          width: "min(80vw, 1500px)",
          background: `linear-gradient(90deg, transparent, ${COPPER}, ${HOT}, ${COPPER}, transparent)`,
          bottom: "26%",
          filter: `drop-shadow(0 0 10px ${COPPER})`,
          mixBlendMode: "plus-lighter" as any,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: [0, 1, 1, 0] }}
        transition={{ duration: 5.2, times: [0.1, 0.45, 0.85, 1], ease: easeOut }}
      />

      {/* Lockup gets a faint inner copper tint so it doesn't look "off" while
          the disc dominates the composition. */}
      <InkWordmark
        background={`linear-gradient(180deg, ${BRIGHT} 0%, ${COPPER} 60%, ${SHADOW} 100%)`}
        filter={`drop-shadow(0 0 12px oklch(0.74 0.18 52 / 0.5))`}
        animate={{ opacity: [0, 0.55, 0.55, 0] }}
        transition={{ duration: 5.2, times: [0, 0.35, 0.75, 1], ease: easeOut }}
        style={{ mixBlendMode: "plus-lighter" as any }}
      />
    </motion.div>
  )
}

/* =========================================================================
 * WordmarkCycle :: orchestrator
 *
 * Runs the seven stages on a wall-clock interval and crossfades them with
 * `AnimatePresence mode="sync"` and a long shared overlap. The static base
 * lockup is mounted once and never animates — it is ALWAYS readable, even
 * between stages or under reduced-motion.
 * ======================================================================= */
export function WordmarkCycle() {
  const reduce = useReducedMotion()
  const [stage, setStage] = useState(0)

  // Per-instance unique IDs for SVG filter references (so two instances on
  // the same page don't share displacement state).
  const inkFilterId = `vaish-ink-${useId().replace(/:/g, "")}`
  const heatFilterId = `vaish-heat-${useId().replace(/:/g, "")}`

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      setStage((s) => (s + 1) % STAGE_COUNT)
    }, STAGE_DURATION)
    return () => window.clearInterval(id)
  }, [reduce])

  return (
    <div className="relative w-full" aria-label="VAISH">
      {/* Persistent ambient aura — never fades, so the lockup is always lit
          in copper between stage handoffs. */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 mx-auto"
          style={{
            background: `radial-gradient(60% 50% at 50% 55%, ${SHADOW} 0%, transparent 70%)`,
            mixBlendMode: "plus-lighter" as any,
            filter: "blur(4px)",
          }}
          animate={{ opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Static base — always visible. */}
      <BaseWordmark />

      {/* Overlay plane — exactly the same size & alignment as the base. */}
      {!reduce && (
        <div className="pointer-events-none absolute inset-0">
          <AnimatePresence mode="sync" initial={false}>
            {stage === 0 && <StageSolarBloom key="0" />}
            {stage === 1 && <StageInkFlow key="1" filterId={inkFilterId} />}
            {stage === 2 && <StageVectorForge key="2" />}
            {stage === 3 && <StageParallaxExtrude key="3" />}
            {stage === 4 && <StageSparkStorm key="4" reduce={false} />}
            {stage === 5 && <StageHeatwave key="5" filterId={heatFilterId} />}
            {stage === 6 && <StageEcliptic key="6" />}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
