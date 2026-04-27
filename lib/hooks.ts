"use client"

/* ---------------------------------------------------------------------------
 * Tiny shared hooks. Kept in one file because each one is small and they
 * all answer the same question: "is this device worth running this effect
 * on?"
 *
 * `useFinePointer()` :: true on devices with a real pointer (mouse, trackpad,
 *   stylus) — i.e. where hover and per-pixel positioning are meaningful.
 *   False on touch-only devices, where mouse-tracking effects are dead
 *   listeners and per-pixel calculations can't fire anyway. Use this to
 *   decide whether to mount a magnetic spring, a per-letter cursor tilt,
 *   a reveal-on-hover porthole, etc.
 *
 * `useCoarsePointer()` :: opposite of the above. Useful when a different
 *   variant should render on mobile — e.g. swap a WebGL portrait warp
 *   for the underlying still image.
 *
 * Both hooks return `false` on the server and on first client render so
 * SSR markup is stable; the real value lands after the first paint via
 * a layout-effect-equivalent useEffect. That means the heavy variant
 * never renders on the server — only the light one — which is the
 * correct default for performance on a cold mobile load.
 * ------------------------------------------------------------------------- */

import { useEffect, useState } from "react"

const FINE_QUERY = "(hover: hover) and (pointer: fine)"
const COARSE_QUERY = "(hover: none), (pointer: coarse)"

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const handler = () => setMatches(mql.matches)
    handler()
    // Modern API + Safari-old fallback. addListener / removeListener are
    // deprecated but still present on lib.dom.d.ts; iOS < 14 only exposes
    // those, so we keep the fallback path for ancient devices.
    if (mql.addEventListener) {
      mql.addEventListener("change", handler)
      return () => mql.removeEventListener("change", handler)
    }
    mql.addListener(handler)
    return () => mql.removeListener(handler)
  }, [query])
  return matches
}

export function useFinePointer() {
  return useMediaQuery(FINE_QUERY)
}

export function useCoarsePointer() {
  return useMediaQuery(COARSE_QUERY)
}
