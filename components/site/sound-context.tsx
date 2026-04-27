"use client"

/* ---------------------------------------------------------------------------
 * SoundProvider :: lazy-init Web Audio bed + UI-tick API.
 *
 * Default state :: OFF. Enabling requires a user gesture (click on the
 * toggle), at which point we lazily build the AudioContext, an ambient
 * brown-noise + drone bed (looped, ducked low), and expose a `tick()`
 * method that fires a short oscillator ping for hover/click feedback.
 *
 * Persistence :: localStorage. If the user enabled it before, we still
 * wait for the next gesture before resuming the AudioContext (Chrome
 * autoplay policy).
 *
 * Reduced motion :: bed is suppressed; ticks still work if explicitly
 * enabled by the user.
 * ------------------------------------------------------------------------- */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

type SoundCtx = {
  enabled: boolean
  ready: boolean
  toggle: () => void
  tick: (variant?: "soft" | "select" | "lift") => void
}

const Ctx = createContext<SoundCtx | null>(null)
const STORAGE_KEY = "vaish.sound"

type AudioGraph = {
  ctx: AudioContext
  master: GainNode
  bedGain: GainNode
  bedNodes: { stop: () => void }[]
}

/* Build the ambient bed :: filtered brown noise + a couple of slow
   low-frequency drones in fifths. Sounds like wind under a copper sky. */
function buildBed(ctx: AudioContext, dest: GainNode): { stop: () => void }[] {
  const nodes: { stop: () => void }[] = []

  // Brown noise generator — much warmer than white. We render a 2-second
  // buffer once and loop it.
  const bufferSize = 2 * ctx.sampleRate
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5 // boost
  }

  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer
  noise.loop = true

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = "lowpass"
  noiseFilter.frequency.value = 380
  noiseFilter.Q.value = 0.6

  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.18

  noise.connect(noiseFilter).connect(noiseGain).connect(dest)
  noise.start()
  nodes.push({ stop: () => { try { noise.stop() } catch {} } })

  // Low drones in a perfect fifth — copper resonance.
  const drones = [55, 82.5] // A1 + E2
  for (const freq of drones) {
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = freq
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07 + Math.random() * 0.05
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.04
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.025
    lfo.connect(lfoGain).connect(droneGain.gain)
    osc.connect(droneGain).connect(dest)
    osc.start()
    lfo.start()
    nodes.push({
      stop: () => {
        try { osc.stop() } catch {}
        try { lfo.stop() } catch {}
      },
    })
  }

  return nodes
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const graphRef = useRef<AudioGraph | null>(null)
  const lastTickRef = useRef(0)

  // Hydrate preference (still requires a gesture to actually start audio).
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === "1") setEnabled(true)
    } catch {
      /* private mode etc. */
    }
  }, [])

  const teardown = useCallback(() => {
    const g = graphRef.current
    if (!g) return
    // Schedule the master fade FIRST, then stop bed nodes after the fade
    // completes. Stopping the source nodes before the gain ramp would cut
    // audio dead and produce an audible click — the ramp had nothing left
    // to fade.
    //
    // Cancel any stale events before scheduling the fade. If the user
    // toggles off within the 1.6s window of init's fade-in ramp, both
    // ramps would coexist on the AudioParam timeline and the gain would
    // ramp back up to 0.5 after our teardown ramp landed at 0.
    try {
      const t = g.ctx.currentTime
      g.master.gain.cancelScheduledValues(t)
      g.master.gain.setValueAtTime(g.master.gain.value, t)
      g.master.gain.linearRampToValueAtTime(0, t + 0.25)
    } catch {}
    setTimeout(() => {
      g.bedNodes.forEach((n) => n.stop())
      try { g.ctx.close() } catch {}
    }, 300)
    graphRef.current = null
    setReady(false)
  }, [])

  const init = useCallback(() => {
    if (graphRef.current) return
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      const master = ctx.createGain()
      master.connect(ctx.destination)
      const bedGain = ctx.createGain()
      bedGain.gain.value = 0.6
      bedGain.connect(master)
      const bedNodes = buildBed(ctx, bedGain)
      graphRef.current = { ctx, master, bedGain, bedNodes }
      // Fade master in over 1.6s so toggle-on isn't a thump.
      // Anchor with setValueAtTime first :: per Web Audio spec, a ramp
      // with no preceding automation event uses an implementation-
      // defined start value (some older WebKit builds use the
      // GainNode default of 1.0, which would ramp DOWN from full
      // volume — the opposite of intent).
      const t = ctx.currentTime
      master.gain.setValueAtTime(0, t)
      master.gain.linearRampToValueAtTime(0.5, t + 1.6)
      setReady(true)
    } catch {
      /* WebAudio unavailable */
    }
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0") } catch {}
      if (next) init()
      else teardown()
      return next
    })
  }, [init, teardown])

  /* tick() :: short oscillator ping. Two-voice for warmth. Throttled to
     ~80ms to avoid clicks-during-rapid-hover spam. */
  const tick = useCallback((variant: "soft" | "select" | "lift" = "soft") => {
    const g = graphRef.current
    if (!g || !enabled) return
    const now = performance.now()
    if (now - lastTickRef.current < 80) return
    lastTickRef.current = now
    const baseFreq = variant === "select" ? 880 : variant === "lift" ? 1320 : 660
    const dur = variant === "lift" ? 0.18 : variant === "select" ? 0.14 : 0.09
    const peak = variant === "lift" ? 0.07 : variant === "select" ? 0.06 : 0.04
    const t = g.ctx.currentTime
    const tickGain = g.ctx.createGain()
    tickGain.gain.setValueAtTime(0, t)
    tickGain.gain.linearRampToValueAtTime(peak, t + 0.005)
    tickGain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    tickGain.connect(g.master)
    const osc1 = g.ctx.createOscillator()
    osc1.type = "sine"
    osc1.frequency.value = baseFreq
    osc1.connect(tickGain)
    const osc2 = g.ctx.createOscillator()
    osc2.type = "triangle"
    osc2.frequency.value = baseFreq * 1.504 // ~perfect fifth+ for shimmer
    const osc2Gain = g.ctx.createGain()
    osc2Gain.gain.value = 0.5
    osc2.connect(osc2Gain).connect(tickGain)
    osc1.start(t)
    osc2.start(t)
    osc1.stop(t + dur + 0.05)
    osc2.stop(t + dur + 0.05)
  }, [enabled])

  // Returning visitors :: localStorage said "1" so `enabled` hydrated to
  // true, but no audio graph exists yet (Chrome autoplay policy requires
  // a user gesture). On the first pointerdown, lazily build the graph.
  // If the graph already exists but is suspended (tab backgrounded),
  // just resume it.
  useEffect(() => {
    if (!enabled) return
    const onGesture = () => {
      const g = graphRef.current
      if (!g) {
        init()
        return
      }
      if (g.ctx.state === "suspended") g.ctx.resume()
    }
    window.addEventListener("pointerdown", onGesture, { once: true })
    return () => window.removeEventListener("pointerdown", onGesture)
  }, [enabled, ready, init])

  const value = useMemo<SoundCtx>(() => ({ enabled, ready, toggle, tick }), [enabled, ready, toggle, tick])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSound() {
  const v = useContext(Ctx)
  return v ?? { enabled: false, ready: false, toggle: () => {}, tick: () => {} }
}
