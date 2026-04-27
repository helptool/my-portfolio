"use client"

/* ---------------------------------------------------------------------------
 * useTiltMotion :: returns a pair of MotionValues (-1..1) representing a
 * normalised "tilt" of the device or pointer relative to a neutral centre.
 *
 *   - On fine-pointer devices (desktop / laptop / stylus), `mx` and `my`
 *     are driven by `mousemove` relative to the viewport centre — the
 *     same idiom the hero already used inline.
 *   - On coarse-pointer devices (phone / tablet), the values are driven
 *     by `deviceorientation` (gamma → x, beta → y), giving subtle
 *     parallax on tilt. iOS 13+ requires a one-shot user-gesture
 *     permission grant for the event to fire; the hook arms a
 *     `pointerdown` listener that calls `requestPermission()` once.
 *     Android and older iOS just receive the event by default.
 *
 * Returns motion values centred at 0 with a ±1 range so consumers can
 * remap with `useTransform(mx, [-1, 1], [-pxA, pxB])` exactly like the
 * existing mouse parallax code. If neither input source is available
 * (SSR, very old browsers, permission denied) the values stay at 0,
 * which means consumers automatically fall back to a flat layout.
 * ------------------------------------------------------------------------- */

import { useEffect } from "react"
import { useMotionValue, useReducedMotion, type MotionValue } from "framer-motion"

// Tilt amplitude (degrees) above which we clamp to ±1. ~25° produces a
// natural full-range deflection without forcing the user into uncomfortable
// wrist angles.
const TILT_RANGE_DEG = 25

interface DeviceOrientationEventiOS extends Event {
  beta: number | null
  gamma: number | null
}

interface DeviceOrientationEventiOSConstructor {
  requestPermission?: () => Promise<"granted" | "denied">
}

export function useTiltMotion(): { mx: MotionValue<number>; my: MotionValue<number> } {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  // Reactive reduced-motion preference. Framer Motion's hook subscribes to
  // the underlying media query, so the effect below re-runs whenever the
  // user toggles the OS preference while the page is open — cleaning up
  // listeners when motion is disabled and re-attaching them when enabled.
  const reduced = useReducedMotion() ?? false

  useEffect(() => {
    if (typeof window === "undefined") return
    // Pin motion values to neutral and skip listener attachment when the
    // user prefers reduced motion. Because `reduced` is in the dep array,
    // toggling the preference live tears down or re-attaches listeners
    // automatically without needing a page reload.
    if (reduced) {
      mx.set(0)
      my.set(0)
      return
    }

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches

    // Marks the effect as torn down so async permission flows cannot
    // attach listeners after unmount. See iOS branch below.
    let disposed = false

    let detachMouse: (() => void) | undefined
    let detachOrient: (() => void) | undefined
    let detachUnlock: (() => void) | undefined

    if (fine) {
      const onMove = (e: MouseEvent) => {
        const cx = window.innerWidth / 2
        const cy = window.innerHeight / 2
        mx.set((e.clientX - cx) / cx)
        my.set((e.clientY - cy) / cy)
      }
      window.addEventListener("mousemove", onMove, { passive: true })
      detachMouse = () => window.removeEventListener("mousemove", onMove)
    } else {
      const clamp = (v: number) => Math.max(-1, Math.min(1, v))

      const onOrient = (e: DeviceOrientationEventiOS) => {
        // gamma: -90..90 (left-right tilt). beta: -180..180 (front-back).
        // Clip to a usable range, normalise to ±1.
        const g = e.gamma ?? 0
        const b = e.beta ?? 0
        // Pivot beta around 45° because users hold phones angled, not flat.
        const bShift = b - 45
        mx.set(clamp(g / TILT_RANGE_DEG))
        my.set(clamp(bShift / TILT_RANGE_DEG))
      }

      const attach = () => {
        window.addEventListener("deviceorientation", onOrient as EventListener, {
          passive: true,
        })
        detachOrient = () =>
          window.removeEventListener("deviceorientation", onOrient as EventListener)
      }

      const ctor = (window as unknown as { DeviceOrientationEvent?: DeviceOrientationEventiOSConstructor })
        .DeviceOrientationEvent
      if (ctor && typeof ctor.requestPermission === "function") {
        // iOS Safari requires a user gesture to grant the permission.
        // The `disposed` flag short-circuits the async resolution so we
        // never attach a listener after the effect has been torn down
        // (e.g. component unmounted while the permission dialog was up).
        const unlock = () => {
          ctor
            .requestPermission!()
            .then((state) => {
              if (!disposed && state === "granted") attach()
            })
            .catch(() => {
              /* user denied; remain flat */
            })
          if (detachUnlock) detachUnlock()
        }
        window.addEventListener("pointerdown", unlock, { once: true, passive: true })
        detachUnlock = () => window.removeEventListener("pointerdown", unlock)
      } else {
        attach()
      }
    }

    return () => {
      disposed = true
      if (detachMouse) detachMouse()
      if (detachOrient) detachOrient()
      if (detachUnlock) detachUnlock()
    }
  }, [mx, my, reduced])

  return { mx, my }
}
