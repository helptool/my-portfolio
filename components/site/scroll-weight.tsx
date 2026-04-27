"use client"

/* ---------------------------------------------------------------------------
 * ScrollWeight :: ramps font-weight from `min` toward `max` based on scroll
 * velocity. At rest, weight settles back to `min` over ~600ms. Bodoni Moda
 * is a variable font with weights 400..900, so this reads as the type
 * "thickening when shoved" — extremely subtle, only noticeable when
 * scrolling. Reduced motion :: weight stays at `min` forever.
 *
 * Why scroll velocity, not scroll position
 *   Position-based weight feels arbitrary; velocity-based reads as a
 *   physical reaction to the user's input — the type is being *pushed*.
 * ------------------------------------------------------------------------- */

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion"
import { useEffect } from "react"
import type { JSX } from "react"
import { useCoarsePointer } from "@/lib/hooks"

type Props = {
  children: React.ReactNode
  className?: string
  /** Min font weight. Default 400. */
  min?: number
  /** Max font weight at peak velocity. Default 900. */
  max?: number
  /** Pixels-per-frame velocity that maps to `max`. Default 80. */
  threshold?: number
  /** HTML tag. Default span. */
  as?: "span" | "h1" | "h2" | "div" | "p"
  /**
   * Extra variation axes to preserve alongside `wght`. CSS
   * `font-variation-settings` is replace-not-merge, so any axes set on
   * the parent (e.g. `font-wordmark-tight`'s `"opsz" 96`) are clobbered
   * unless we re-declare them here. Default keeps Bodoni Moda's optical
   * size axis pegged at 96 to match the existing wordmark utilities.
   */
  extraAxes?: string
}

export function ScrollWeight({
  children,
  className,
  min = 400,
  max = 900,
  threshold = 80,
  as = "span",
  extraAxes = '"opsz" 96',
}: Props) {
  const reduced = useReducedMotion()
  // Variable-font axis writes are paint-bound :: the browser has to re-shape
  // and re-paint the whole text run on every scroll tick. On mobile this is
  // the single biggest scroll-jank source on the manifesto. Drop to a flat
  // weight on coarse-pointer devices — visually identical at rest, only the
  // velocity reaction is missing, which 99% of mobile users wouldn't notice
  // anyway since they're using momentum-scroll instead of a wheel flick.
  const coarse = useCoarsePointer()
  const weight = useMotionValue(min)
  const smoothed = useSpring(weight, { stiffness: 130, damping: 22, mass: 0.4 })
  // Variable-font axis. `wght` reads continuous values in Bodoni Moda's
  // 400..900 supported range. Using fontVariationSettings is more robust
  // than fontWeight (which some browsers round to nearest 100).
  // We also re-emit any extraAxes (default `"opsz" 96`) since
  // font-variation-settings replaces the entire inherited value.
  const variation = useMotionTemplate`"wght" ${smoothed}, ${extraAxes}`

  useEffect(() => {
    if (reduced || coarse) return
    let last = window.scrollY
    let lastTime = performance.now()
    let raf = 0
    const decay = () => {
      // Settle back to min when nothing's happening.
      const cur = weight.get()
      if (cur > min + 0.5) {
        weight.set(cur + (min - cur) * 0.08)
        raf = requestAnimationFrame(decay)
      } else {
        weight.set(min)
        raf = 0
      }
    }
    const onScroll = () => {
      const now = performance.now()
      const dy = window.scrollY - last
      const dt = Math.max(1, now - lastTime)
      const v = Math.abs(dy) / (dt / 16) // pixels-per-frame at 60fps
      const target = Math.min(1, v / threshold)
      const next = min + (max - min) * target
      weight.set(Math.max(weight.get(), next))
      last = window.scrollY
      lastTime = now
      if (!raf) raf = requestAnimationFrame(decay)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced, coarse, min, max, threshold, weight])

  if (reduced || coarse) {
    const Tag = as as keyof JSX.IntrinsicElements
    // Flat weight :: identical to the at-rest visual state on desktop, just
    // without the velocity reaction. Also keeps the inherited optical-size
    // axis intact so the text doesn't fall back to non-variable rendering.
    return (
      <Tag
        className={className}
        style={{ fontVariationSettings: `"wght" ${min}, ${extraAxes}` }}
      >
        {children}
      </Tag>
    )
  }

  const MotionTag = motion[as as "span"] as typeof motion.span
  return (
    <MotionTag className={className} style={{ fontVariationSettings: variation as unknown as string }}>
      {children}
    </MotionTag>
  )
}
