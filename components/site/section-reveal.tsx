"use client"

import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from "framer-motion"
import { useEffect, useRef, useState, type ReactNode } from "react"

/* ---------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------- */

/** Match `(min-width: 768px)` once and on resize :: gives mobile vs desktop. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const handler = () => setIsDesktop(mq.matches)
    handler()
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isDesktop
}

/* ---------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Flavors:
 *  - "ascend"   :: section lifts up with a small rotation while HUD corner
 *                  brackets close in around it. Calm, default.
 *  - "track"    :: a column of vertical guide lines draws across the frame
 *                  first, then the section slides in behind them, then the
 *                  guides retract. Reads like a tracking shot lining up.
 *  - "aperture" :: a circular mask opens from the center outward. A copper
 *                  ring traces around the aperture during the open.
 *  - "cinema"   :: theatrical letterbox open + warm color-grade pass + a
 *                  copper key-light sweep. Reserved for hero-class moments.
 */
type Flavor = "ascend" | "track" | "aperture" | "cinema"

/** Cue caption that flashes during the transition window. */
type Caption = string

interface SectionRevealProps {
  children: ReactNode
  flavor?: Flavor
  /** Direction for the "track" flavor */
  side?: "left" | "right"
  /** HUD caption shown during the transition. Defaults to the flavor name. */
  caption?: Caption
  className?: string
}

/* ---------------------------------------------------------------------------
 * SectionReveal
 *
 * A scroll-driven wrapper that gives every page section a deliberate
 * cinematic entrance. Every flavor shares a common HUD overlay (corner
 * brackets + a scan progress meter + an optional caption) so the page reads
 * like one continuous control surface.
 * --------------------------------------------------------------------------- */
export function SectionReveal({
  children,
  flavor = "ascend",
  side = "left",
  caption,
  className,
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const isDesktop = useIsDesktop()

  /* The progress curve we read everything from. Window tightened from
     ["start 95%", "start 35%"] -> ["start 92%", "start 45%"] so reveals
     complete before the section is fully on screen instead of mid-screen.
     Reads as "section is already settled by the time you reach it" rather
     than "section is still animating while I'm trying to read it".
     Spring stiffness bumped 130 -> 180 so motion lands a hair faster. */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 92%", "start 45%"],
  })
  const eased = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 32,
    mass: 0.5,
  })

  /* Mobile gets gentler distances. Desktop reads more theatrical. */
  const yDist = isDesktop ? 80 : 36
  const xDist = isDesktop ? 110 : 28
  const rotDist = isDesktop ? 1.6 : 0.8

  /* Shared :: lift / slide / opacity / rotate */
  const y = useTransform(eased, [0, 1], [yDist, 0])
  const x = useTransform(eased, [0, 1], [side === "left" ? -xDist : xDist, 0])
  const opacity = useTransform(eased, [0, 0.55, 1], [0, 1, 1])
  const rotate = useTransform(eased, [0, 1], [side === "left" ? -rotDist : rotDist, 0])

  /* HUD :: corner-bracket retract + scan progress */
  const cornerInset = useTransform(eased, [0, 1], ["10%", "0%"])
  const cornerOpacity = useTransform(eased, [0, 0.2, 0.85, 1], [0, 1, 1, 0])
  const scanWidth = useTransform(eased, [0, 1], ["0%", "100%"])
  const scanOpacity = useTransform(eased, [0, 0.2, 0.9, 1], [0, 1, 1, 0])
  const captionOpacity = useTransform(eased, [0, 0.2, 0.85, 1], [0, 1, 1, 0])
  const captionY = useTransform(eased, [0, 0.5, 1], [8, 0, -8])

  /* "track" :: vertical guide lines draw across, then retract */
  const guideScale = useTransform(eased, [0, 0.45, 0.9], [0, 1, 1])
  const guideOpacity = useTransform(eased, [0, 0.15, 0.7, 1], [0, 1, 1, 0])

  /* "aperture" :: circular mask opens from 0% to 75%, ring follows */
  const apertureRadius = useTransform(eased, [0, 1], ["0%", "78%"])
  const apertureClip = useTransform(
    apertureRadius,
    (r) => `circle(${r} at 50% 50%)`,
  )
  const ringSize = useTransform(eased, [0, 1], ["0%", "78%"])
  const ringOpacity = useTransform(eased, [0, 0.15, 0.85, 1], [0, 1, 1, 0])
  const apertureRotate = useTransform(eased, [0, 1], [-12, 0])

  /* "cinema" :: letterbox + grade + key-light sweep */
  const matH = useTransform(eased, [0, 0.65, 1], ["100%", "16%", "0%"])
  const cinemaScale = useTransform(eased, [0, 1], [1.06, 1])
  const cinemaY = useTransform(eased, [0, 1], [isDesktop ? 60 : 28, 0])
  const sweepX = useTransform(eased, [0.1, 0.9], ["-30%", "130%"])
  const sweepOpacity = useTransform(eased, [0.15, 0.4, 0.7, 0.95], [0, 1, 1, 0])
  const tintOpacity = useTransform(eased, [0, 0.55, 1], [0.7, 0.18, 0])

  /* Reduced motion :: no transforms, no overlays. */
  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    )
  }

  /* Caption text :: flavor-specific default */
  const captionText =
    caption ??
    (flavor === "cinema"
      ? "CUE // 02 — OPERATOR"
      : flavor === "aperture"
        ? "APERTURE // OPEN"
        : flavor === "track"
          ? "TRACK // ALIGNING"
          : "ASCEND // BRIDGE")

  /* ----- shared HUD overlay (corner brackets + scan + caption) ----- */
  const HUDOverlay = (
    <>
      {/* Corner brackets that close in toward the section */}
      <CornerBracket
        position="tl"
        inset={cornerInset}
        opacity={cornerOpacity}
      />
      <CornerBracket
        position="tr"
        inset={cornerInset}
        opacity={cornerOpacity}
      />
      <CornerBracket
        position="bl"
        inset={cornerInset}
        opacity={cornerOpacity}
      />
      <CornerBracket
        position="br"
        inset={cornerInset}
        opacity={cornerOpacity}
      />

      {/* Scan progress meter at the top */}
      <motion.span
        aria-hidden
        style={{ opacity: scanOpacity }}
        className="font-hud pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-foreground/60 md:top-6"
      >
        <span className="inline-block h-1 w-1 rotate-45 bg-primary" />
        <motion.span
          style={{ y: captionY, opacity: captionOpacity }}
          className="tracking-[0.34em]"
        >
          {captionText}
        </motion.span>
        <span className="relative inline-block h-px w-24 overflow-hidden bg-foreground/15 sm:w-32">
          <motion.span
            style={{ width: scanWidth }}
            className="absolute inset-y-0 left-0 block bg-primary"
          />
        </span>
        <span className="tabular-nums text-foreground/45">REC</span>
      </motion.span>
    </>
  )

  /* --------------------------------------------------------------------- *
   * "aperture"
   * Circular reveal :: clip-path circle expands from the center.
   * --------------------------------------------------------------------- */
  if (flavor === "aperture") {
    return (
      <div ref={ref} className="relative isolate overflow-hidden">
        <motion.div
          className={className}
          style={{ clipPath: apertureClip, opacity }}
        >
          {children}
        </motion.div>

        {/* Tracing ring around the aperture */}
        <motion.span
          aria-hidden
          style={{
            width: ringSize,
            height: ringSize,
            opacity: ringOpacity,
            rotate: apertureRotate,
          }}
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
        >
          <span
            className="block h-full w-full rounded-full"
            style={{
              border: "1px solid oklch(0.74 0.15 52 / 0.5)",
              boxShadow: "0 0 0 1px oklch(0.74 0.15 52 / 0.08), inset 0 0 60px oklch(0.74 0.15 52 / 0.08)",
            }}
          />
          {/* Tick marks around the ring */}
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute left-1/2 top-1/2 -ml-px h-2 w-px origin-bottom bg-primary/55"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-50%)`,
              }}
            />
          ))}
        </motion.span>

        {HUDOverlay}
      </div>
    )
  }

  /* --------------------------------------------------------------------- *
   * "track"
   * Vertical guide lines draw across, section slides in behind them,
   * guides retract.
   * --------------------------------------------------------------------- */
  if (flavor === "track") {
    return (
      <div ref={ref} className="relative isolate overflow-x-clip">
        {/* Section content */}
        <motion.div className={className} style={{ x, opacity }}>
          {children}
        </motion.div>

        {/* Vertical guide lines that draw across */}
        <motion.div
          aria-hidden
          style={{ opacity: guideOpacity }}
          className="pointer-events-none absolute inset-0 z-20"
        >
          {[0.18, 0.36, 0.62, 0.82].map((leftPct, i) => (
            <motion.span
              key={i}
              style={{
                left: `${leftPct * 100}%`,
                scaleY: guideScale,
                originY: i % 2 === 0 ? 0 : 1,
              }}
              transition={{ delay: i * 0.06 }}
              className="absolute top-0 block h-full w-px bg-foreground/15"
            >
              {/* Tick markers along the line */}
              <span
                className="absolute top-[14%] -left-1 block h-px w-2 bg-primary/65"
                aria-hidden
              />
              <span
                className="absolute bottom-[14%] -left-1 block h-px w-2 bg-primary/65"
                aria-hidden
              />
              {/* A traveling dot sliding down the guide */}
              <motion.span
                animate={{ y: ["0%", "100%"] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                className="absolute -left-[2px] top-0 block h-1 w-1 rounded-full bg-primary"
              />
            </motion.span>
          ))}
        </motion.div>

        {HUDOverlay}
      </div>
    )
  }

  /* --------------------------------------------------------------------- *
   * "cinema"
   * Theatrical letterbox + warm color-grade + key-light sweep.
   * --------------------------------------------------------------------- */
  if (flavor === "cinema") {
    return (
      <div ref={ref} className="relative isolate overflow-hidden">
        <motion.div
          className={className}
          style={{
            scale: cinemaScale,
            y: cinemaY,
            opacity,
            transformOrigin: "50% 40%",
          }}
        >
          {children}
        </motion.div>

        {/* Theatrical letterbox bars */}
        <motion.span
          aria-hidden
          style={{ height: matH }}
          className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-background"
        >
          <span className="absolute inset-x-0 bottom-0 h-px bg-foreground/25" />
          <span className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
        </motion.span>
        <motion.span
          aria-hidden
          style={{ height: matH }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-background"
        >
          <span className="absolute inset-x-0 top-0 h-px bg-foreground/25" />
          <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
        </motion.span>

        {/* Color-grade tint */}
        <motion.span
          aria-hidden
          style={{ opacity: tintOpacity }}
          className="pointer-events-none absolute inset-0 z-20"
        >
          <span
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, transparent 30%, oklch(0.06 0.005 40 / 0.9) 100%)",
            }}
          />
          <span
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 30% 40% at 50% 60%, oklch(0.74 0.15 52 / 0.16), transparent 70%)",
            }}
          />
        </motion.span>

        {/* Key-light sweep */}
        <motion.span
          aria-hidden
          style={{ x: sweepX, opacity: sweepOpacity }}
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[35%] -skew-x-12"
        >
          <span
            className="block h-full w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.74 0.15 52 / 0.18) 45%, oklch(0.94 0.06 80 / 0.14) 55%, transparent)",
            }}
          />
        </motion.span>

        {HUDOverlay}
      </div>
    )
  }

  /* --------------------------------------------------------------------- *
   * "ascend" (default)
   * Calm lift + tiny rotation + corner-bracket choreography.
   * --------------------------------------------------------------------- */
  return (
    <div ref={ref} className="relative isolate overflow-x-clip">
      <motion.div
        className={className}
        style={{ y, opacity, rotate, transformOrigin: "50% 100%" }}
      >
        {children}
      </motion.div>

      {HUDOverlay}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * CornerBracket
 * Small L-shaped bracket pinned to a corner of the wrapper. Animates its
 * inset toward the corner as the section settles, signalling "frame locked".
 * --------------------------------------------------------------------------- */
function CornerBracket({
  position,
  inset,
  opacity,
}: {
  position: "tl" | "tr" | "bl" | "br"
  inset: MotionValue<string>
  opacity: MotionValue<number>
}) {
  const isTop = position === "tl" || position === "tr"
  const isLeft = position === "tl" || position === "bl"
  const corner = isTop
    ? isLeft
      ? { top: inset, left: inset }
      : { top: inset, right: inset }
    : isLeft
      ? { bottom: inset, left: inset }
      : { bottom: inset, right: inset }

  return (
    <motion.span
      aria-hidden
      style={{ opacity, ...corner }}
      className="pointer-events-none absolute z-20 h-7 w-7"
    >
      {/* Horizontal stroke */}
      <span
        className={`absolute h-px w-7 bg-primary/85 ${
          isTop ? "top-0" : "bottom-0"
        } ${isLeft ? "left-0" : "right-0"}`}
      />
      {/* Vertical stroke */}
      <span
        className={`absolute h-7 w-px bg-primary/85 ${
          isTop ? "top-0" : "bottom-0"
        } ${isLeft ? "left-0" : "right-0"}`}
      />
      {/* Glow dot at the elbow */}
      <span
        className={`absolute h-1.5 w-1.5 rounded-full bg-primary ${
          isTop ? "top-0" : "bottom-0"
        } ${isLeft ? "left-0" : "right-0"} -translate-x-1/2 -translate-y-1/2 ${
          !isLeft ? "translate-x-1/2" : ""
        } ${!isTop ? "translate-y-1/2" : ""}`}
        style={{
          boxShadow: "0 0 8px 2px oklch(0.74 0.15 52 / 0.6)",
        }}
      />
    </motion.span>
  )
}
