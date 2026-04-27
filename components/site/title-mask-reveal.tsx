"use client"

/* ---------------------------------------------------------------------------
 * TitleMaskReveal
 *
 * Skewed clip-path mask reveal for section titles. On viewport entry, the
 * wrapped heading is unmasked by a diagonal clip-path that sweeps left →
 * right with a small skew, reading like a piece of metal sliding past the
 * type. Replaces the generic vertical fade that other sections use for
 * section headings.
 *
 * Costs :: one compositor-accelerated property (clip-path) on a single
 * element. No JS-side per-frame subscribers beyond the single useInView
 * that framer installs. Safe to sprinkle across every section heading.
 *
 * Fallbacks ::
 *   - `prefers-reduced-motion: reduce` disables the mask; heading renders
 *     without any transform.
 *   - Browsers without animated clip-path (very old Safari) fall through
 *     to the static heading — still fully legible, just no cinematic entry.
 * ------------------------------------------------------------------------- */

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

interface TitleMaskRevealProps {
  children: ReactNode
  className?: string
  /* Seconds the reveal runs. Default tuned to feel substantial without
     blocking a reader who starts reading immediately. */
  duration?: number
  /* Seconds before the reveal starts, counted from the in-view trigger.
     Use to sequence the title against a preceding kicker / hairline. */
  delay?: number
  /* Amount of the element that must intersect before the reveal fires.
     Lower on long multi-line titles so the reveal starts when the top
     edge is only just in view. */
  amount?: number
}

export function TitleMaskReveal({
  children,
  className,
  duration = 1.1,
  delay = 0.05,
  amount = 0.4,
}: TitleMaskRevealProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      /* Clip-path parallelogram anchored off-screen left. The top edge is
         flush with 0%, the bottom edge is biased -10% to produce the -6°
         visual skew without having to transform the element itself. Four
         vertex-matching polygon keyframes keep clip-path interpolation
         smooth across browsers. */
      initial={{
        clipPath: "polygon(0% 0%, 0% 0%, -10% 100%, -10% 100%)",
      }}
      whileInView={{
        clipPath: "polygon(0% 0%, 110% 0%, 100% 100%, -10% 100%)",
      }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
