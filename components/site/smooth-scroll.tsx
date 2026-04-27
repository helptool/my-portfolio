"use client"

import { useEffect } from "react"
import Lenis from "lenis"

export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return

    /* Touch / coarse-pointer devices :: skip Lenis entirely.
       Even with `syncTouch: false`, Lenis still mounts a wheel-event
       listener and runs a continuous rAF loop. On a phone the loop wakes
       the page once per frame doing nothing useful while native momentum
       scroll handles the actual gesture, and the no-op rAF tick measurably
       contends with paint work on a low-end device. Native scroll on iOS
       and Android is already buttery — Lenis offers nothing to gain on
       touch and only costs frames.

       Desktop tuning notes ::
       - lerp 0.10 lands somewhere between "anchored" (0.08) and "floaty" (0.13).
         Feels more responsive on a normal mouse wheel without overshooting on
         heavy flicks.
       - wheelMultiplier 1.1 lifts the per-tick distance just enough that the
         page tracks finger/wheel input 1:1 instead of trailing slightly.
       - gestureOrientation 'vertical' :: explicitly opt out of horizontal
         capture so the scroll-arc + arcade horizontal scrubbers get raw events. */
    const isCoarse = window.matchMedia("(hover: none), (pointer: coarse)").matches
    if (isCoarse) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      lerp: 0.1,
      wheelMultiplier: 1.1,
      touchMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      gestureOrientation: "vertical",
    })

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])
  return null
}
