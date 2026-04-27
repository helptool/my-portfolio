"use client"

import { motion, useScroll, useTransform, useReducedMotion, useSpring } from "framer-motion"
import { useRef } from "react"
import { useT } from "./i18n-context"
import { DividerFluid } from "./divider-fluid"

/**
 * RuneDivider :: cinematic interlude between sections.
 *
 * Effects, all scroll-scored:
 *   - The whole slab darkens into a vignette as it enters view, then lifts
 *     back out — the page momentarily passes through "night" between rooms.
 *   - The center sigil rotates against the scroll, its inner rings
 *     counter-rotate, the core pulses copper.
 *   - A bright scan line travels horizontally across the rule.
 *   - The label and code letters animate in with mask reveals + a tiny
 *     parallax tilt so the divider has weight, not just decoration.
 *
 * The component intentionally takes 100vh worth of "transition feel" inside
 * a compact ~14rem block by leaning on color and motion rather than space.
 */
export function RuneDivider({
  label,
  index,
  labelKey,
}: {
  label?: string
  index?: string
  /** When provided, the label is translated via the i18n dictionary. */
  labelKey?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const t = useT()

  // Track this divider's own scroll progress, 0 -> 1 as it crosses the viewport
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const eased = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })

  // Rotations / opacities driven by progress
  const sigilRotate = useTransform(eased, [0, 1], [-180, 180])
  const sigilCounter = useTransform(eased, [0, 1], [240, -240])
  const lineScale = useTransform(eased, [0, 0.5, 1], [0, 1, 1])
  const labelY = useTransform(eased, [0, 0.5, 1], [16, 0, -8])
  const labelOpacity = useTransform(eased, [0, 0.25, 0.75, 1], [0, 1, 1, 0.4])
  const vignette = useTransform(eased, [0, 0.5, 1], [0, 0.55, 0])
  const scanX = useTransform(eased, [0, 1], ["-30%", "130%"])
  const corePulse = useTransform(eased, [0, 0.5, 1], [0.85, 1.25, 0.9])
  // Mirrored scan-line position for the right rule
  const scanXRev = useTransform(scanX, (v) => `calc(100% - ${v} - 6rem)`)

  const labelText = labelKey ? t(labelKey) : (label ?? "")

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative isolate bg-background"
      // Custom property used for the vignette opacity — written by motion below
      style={{ ["--rune-vignette" as string]: 0 } as React.CSSProperties}
    >
      {/* Top + bottom hairlines that this slab "owns", not the section above */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      {/* Scroll-driven darkening vignette :: makes the cut between sections
          feel like the page is breathing rather than scrolling */}
      {!reduced && (
        <motion.div
          aria-hidden
          style={{ opacity: vignette }}
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 50%, transparent 30%, oklch(0.06 0.005 40 / 0.85) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 30% 30% at 50% 50%, oklch(0.74 0.15 52 / 0.10), transparent 70%)",
            }}
          />
        </motion.div>
      )}

      {/* Faint grid scribe so the divider has architecture */}
      <div className="grid-lines-fine pointer-events-none absolute inset-0 opacity-[0.35] mask-fade-x" />

      {/* WebGL fluid band :: copper-toned noise ribbon under the centre
          sigil. Mounted only on fine pointers (mouse / trackpad) so touch
          devices keep their existing flat-CSS divider for smoothness.
          Self-pauses when off-screen via IntersectionObserver. */}
      <DividerFluid className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[180px]" />

      <div className="relative mx-auto flex max-w-[1600px] items-center gap-6 px-5 py-16 md:px-10 md:py-24">
        {/* Left rule */}
        <div className="relative flex-1 overflow-hidden">
          <motion.span
            style={{ scaleX: lineScale }}
            className="block h-px origin-left bg-foreground/25"
          />
          {!reduced && (
            <motion.span
              aria-hidden
              style={{ x: scanX }}
              className="absolute top-1/2 -translate-y-1/2 h-[1px] w-24 bg-primary"
            />
          )}
        </div>

        {/* Index pill */}
        {index ? (
          <motion.div
            style={{ y: labelY, opacity: labelOpacity }}
            className="relative shrink-0"
          >
            <span className="font-hud tabular-nums text-primary tracking-[0.32em]">{index}</span>
          </motion.div>
        ) : null}

        {/* Center sigil :: nested rotating SVG rings + pulsing copper core */}
        <motion.div
          style={{ y: labelY }}
          className="relative grid h-[60px] w-[60px] shrink-0 place-items-center md:h-[72px] md:w-[72px]"
        >
          <motion.svg
            viewBox="0 0 100 100"
            className="absolute inset-0 text-foreground/40"
            style={{ rotate: reduced ? 0 : sigilRotate }}
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" />
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2
              const x1 = 50 + Math.cos(a) * 40
              const y1 = 50 + Math.sin(a) * 40
              const x2 = 50 + Math.cos(a) * 46
              const y2 = 50 + Math.sin(a) * 46
              const heavy = i % 6 === 0
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeOpacity={heavy ? 0.9 : 0.4}
                  strokeWidth={heavy ? 1.4 : 1}
                />
              )
            })}
          </motion.svg>
          <motion.svg
            viewBox="0 0 100 100"
            className="absolute inset-2 text-primary/55"
            style={{ rotate: reduced ? 0 : sigilCounter }}
          >
            <polygon
              points="50,10 88,32 88,68 50,90 12,68 12,32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <polygon
              points="50,22 76,36 76,64 50,78 24,64 24,36"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeOpacity="0.6"
            />
          </motion.svg>
          <motion.span
            style={{ scale: reduced ? 1 : corePulse }}
            className="relative h-2 w-2 rounded-full bg-primary"
            // Copper bloom around the core
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: "0 0 22px 4px oklch(0.74 0.15 52 / 0.65)" }}
            />
          </motion.span>
        </motion.div>

        {/* Label :: split letters with mask reveal */}
        {labelText ? (
          <motion.div
            style={{ y: labelY, opacity: labelOpacity }}
            className="relative shrink-0 overflow-hidden"
          >
            <span className="block font-hud text-foreground/80 tracking-[0.32em]">
              {labelText}
            </span>
          </motion.div>
        ) : null}

        {/* Right rule, mirrored */}
        <div className="relative flex-1 overflow-hidden">
          <motion.span
            style={{ scaleX: lineScale }}
            className="block h-px origin-right bg-foreground/25"
          />
          {!reduced && (
            <motion.span
              aria-hidden
              style={{ x: scanXRev }}
              className="absolute top-1/2 -translate-y-1/2 h-[1px] w-24 bg-primary"
            />
          )}
        </div>
      </div>

      {/* Wide, soft copper bloom that travels with scroll progress */}
      {!reduced && (
        <motion.div
          aria-hidden
          style={{ opacity: vignette }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        >
          <span
            className="absolute inset-x-0 bottom-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.74 0.15 52 / 0.55), transparent)",
            }}
          />
        </motion.div>
      )}
    </div>
  )
}
