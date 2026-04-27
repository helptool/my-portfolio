"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { useFinePointer } from "@/lib/hooks"

/* ---------------------------------------------------------------------------
 * NavMagneticArcs :: thin curved bezier from the cursor to the nearest
 * nav link when the cursor passes within `range` pixels.
 *
 * The component renders an absolutely-positioned SVG overlay (transparent,
 * `pointer-events: none`) inside the nav rail. On every `pointermove` it
 * computes the link centre nearest to the cursor; if within range, a
 * quadratic bezier is drawn from cursor → link, with a control point
 * offset perpendicular to the segment so the line reads as an arc rather
 * than a straight rubber band. Opacity falls off with distance so the arc
 * fades out as the cursor leaves the magnetic field.
 *
 * One arc is drawn at a time (the closest link); drawing many at once
 * looks like a spiderweb and dilutes the "the page is pulling at me"
 * read. The cursor side of the arc is a copper dot that doubles as a
 * subtle pointer marker.
 *
 * The wrapper element is queried with `getBoundingClientRect()` once per
 * pointermove. That's cheap and avoids subscribing to scroll/resize
 * separately — we always recompute geometry from the latest box.
 *
 * Disabled on touch devices (no hover means no magnetic field) and
 * `prefers-reduced-motion`.
 * ------------------------------------------------------------------------- */

interface Props {
  /** CSS selector resolved within the wrapper to find link rects. */
  linkSelector: string
  /** The wrapper element whose rect is the arc's coordinate space. */
  wrapperRef: React.RefObject<HTMLElement | null>
  /** Magnetic radius in pixels. Cursor must be within this of a link centre. */
  range?: number
  /** Maximum opacity at zero distance. */
  maxOpacity?: number
}

interface ArcState {
  cx: number
  cy: number
  tx: number
  ty: number
  opacity: number
}

export function NavMagneticArcs({
  linkSelector,
  wrapperRef,
  range = 120,
  maxOpacity = 0.85,
}: Props) {
  const fine = useFinePointer()
  const reduced = useReducedMotion() ?? false
  const svgRef = useRef<SVGSVGElement>(null)
  const [arc, setArc] = useState<ArcState | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (!fine || reduced) return
    const wrap = wrapperRef.current
    if (!wrap) return

    let raf = 0
    let pending: { x: number; y: number } | null = null

    const compute = () => {
      raf = 0
      const px = pending
      if (!px) return
      const wrapBox = wrap.getBoundingClientRect()
      const cx = px.x - wrapBox.left
      const cy = px.y - wrapBox.top
      const links = Array.from(wrap.querySelectorAll<HTMLElement>(linkSelector))
      let best: { dist: number; tx: number; ty: number } | null = null
      for (const link of links) {
        const lb = link.getBoundingClientRect()
        const tx = lb.left - wrapBox.left + lb.width / 2
        const ty = lb.top - wrapBox.top + lb.height / 2
        const dx = cx - tx
        const dy = cy - ty
        const dist = Math.hypot(dx, dy)
        if (!best || dist < best.dist) best = { dist, tx, ty }
      }
      if (!best || best.dist > range) {
        setArc(null)
        return
      }
      // Linear opacity falloff with the magnetic range. Squared falls off
      // too fast for the small radius we're using.
      const opacity = Math.max(0, (1 - best.dist / range) * maxOpacity)
      setArc({ cx, cy, tx: best.tx, ty: best.ty, opacity })
    }

    const onMove = (e: PointerEvent) => {
      pending = { x: e.clientX, y: e.clientY }
      if (!raf) raf = requestAnimationFrame(compute)
    }
    const onLeave = () => {
      pending = null
      setArc(null)
    }
    const onResize = () => {
      const b = wrap.getBoundingClientRect()
      setSize({ w: b.width, h: b.height })
    }

    onResize()
    // Listen on the document so the magnetic field activates as the cursor
    // approaches the rail from outside its bounding box — without this the
    // arc only appears once the cursor is already over the rail and the
    // "pulling" effect never reads.
    document.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave, { passive: true })
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onResize, { passive: true })

    return () => {
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [fine, reduced, wrapperRef, linkSelector, range, maxOpacity])

  if (!fine || reduced || !size) return null

  // Quadratic bezier control point :: midpoint of the segment, displaced
  // perpendicular to the segment by ~22% of its length so the arc bows
  // toward the rail's vertical axis. We always bow upward (toward the
  // rail centre) by negating the perpendicular's vertical component
  // because the rail sits at the top of the page and an arc that swings
  // upward into the link reads more deliberate than one that swings
  // randomly above or below.
  let path = ""
  if (arc) {
    const dx = arc.tx - arc.cx
    const dy = arc.ty - arc.cy
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const swing = len * 0.22
    // Bias the perpendicular so the arc consistently bows upward toward
    // the rail. If the natural perpendicular ny is positive, flip sign.
    const sign = ny > 0 ? -1 : 1
    const cxBezier = (arc.cx + arc.tx) / 2 + nx * swing * sign
    const cyBezier = (arc.cy + arc.ty) / 2 + ny * swing * sign
    path = `M ${arc.cx} ${arc.cy} Q ${cxBezier} ${cyBezier} ${arc.tx} ${arc.ty}`
  }

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-10 h-full w-full overflow-visible"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
    >
      {arc && (
        <g style={{ opacity: arc.opacity }}>
          <defs>
            <linearGradient
              id="magnetic-arc-gradient"
              gradientUnits="userSpaceOnUse"
              x1={arc.cx}
              y1={arc.cy}
              x2={arc.tx}
              y2={arc.ty}
            >
              <stop offset="0%" stopColor="oklch(0.74 0.15 52)" stopOpacity="0" />
              <stop offset="35%" stopColor="oklch(0.74 0.15 52)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="oklch(0.74 0.15 52)" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <path
            d={path}
            fill="none"
            stroke="url(#magnetic-arc-gradient)"
            strokeWidth={1}
            strokeLinecap="round"
          />
          {/* Cursor-end pip — a tiny marker at the arc's origin */}
          <circle
            cx={arc.cx}
            cy={arc.cy}
            r={2.4}
            fill="oklch(0.74 0.15 52)"
            opacity={0.85}
          />
          {/* Link-end glow — a soft halo at the magnetic target */}
          <circle
            cx={arc.tx}
            cy={arc.ty}
            r={5.5}
            fill="oklch(0.74 0.15 52)"
            opacity={0.18}
          />
          <circle
            cx={arc.tx}
            cy={arc.ty}
            r={2}
            fill="oklch(0.74 0.15 52)"
            opacity={0.95}
          />
        </g>
      )}
    </svg>
  )
}
