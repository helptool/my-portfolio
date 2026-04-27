"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

/* ---------------------------------------------------------------------------
 * IntroLoader :: cinematic entry sequence.
 *
 * Choreography (1.6s minimum, then waits for real readiness signals)
 *   t=0.00s  Curtain paints. Counter starts at 000.
 *            VAISH letters render as ghost outlines (low-opacity strokes).
 *   t=0-1.6s Progress bar fills, counter ticks, letters fill in sequence at
 *            their ~ progress thresholds (V@20%, A@40%, I@60%, S@80%, H@95%).
 *   t=ready  After progress hits 100 AND fonts/load are ready AND minimum
 *            time has elapsed → final beat (260ms hold), then curtain wipes.
 *   curtain  Three vertical panes wipe up in sequence (60ms stagger). The
 *            stagger reads more theatrical than a single wipe.
 *
 * Skip-on-revisit
 *   sessionStorage flag means a refresh inside the same tab gets a 320ms
 *   quick-fade instead of the full 2s sequence. First-visit-per-tab keeps
 *   the full theatrics.
 *
 * Reduced motion
 *   prefers-reduced-motion: reduce → instant 200ms fade with no choreography.
 * ------------------------------------------------------------------------- */

const LETTERS = ["V", "A", "I", "S", "H"] as const

function useReadiness() {
  /* Returns true once fonts are loaded AND the window load event has fired.
     Many users land on a fully-cached page and these resolve in <50ms;
     others on cold cache may take 800ms+. The loader paces itself to
     whichever is slower (this signal OR the minimum 1600ms). */
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    let cancelled = false

    const fontReady =
      typeof document !== "undefined" && "fonts" in document
        ? document.fonts.ready
        : Promise.resolve()

    const loadReady = new Promise<void>((resolve) => {
      if (document.readyState === "complete") return resolve()
      const onLoad = () => resolve()
      window.addEventListener("load", onLoad, { once: true })
    })

    Promise.all([fontReady, loadReady]).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return ready
}

export function IntroLoader() {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [reentry, setReentry] = useState(false)
  const ready = useReadiness()
  const reduced = useReducedMotion()

  /* Fast-path :: revisits within the same session get a soft fade. */
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (sessionStorage.getItem("vaish:intro-seen") === "1") {
        setReentry(true)
      } else {
        sessionStorage.setItem("vaish:intro-seen", "1")
      }
    } catch {
      // sessionStorage may be blocked (private mode, third-party context).
      // Default to full intro in that case — not the worst outcome.
    }
  }, [])

  /* Reduced motion :: bypass the whole sequence. */
  useEffect(() => {
    if (!reduced) return
    const id = setTimeout(() => setDone(true), 200)
    return () => clearTimeout(id)
  }, [reduced])

  /* Re-entry fast-fade. */
  useEffect(() => {
    if (!reentry) return
    const id = setTimeout(() => setDone(true), 320)
    return () => clearTimeout(id)
  }, [reentry])

  /* Main progress animation. Capped at 99 until BOTH the eased curve
     reaches 1.0 (minimum 1600ms elapsed) AND the readiness signal is
     true. We read `ready` through a ref so the effect doesn't tear
     down + restart when readiness flips — that would reset `start` and
     cause an instant jump-to-100 on fast cached loads. */
  const readyRef = useRef(ready)
  useEffect(() => {
    readyRef.current = ready
  }, [ready])

  useEffect(() => {
    if (reduced || reentry) return
    let raf = 0
    const start = performance.now()
    const minDur = 1600
    const tick = (t: number) => {
      const elapsed = t - start
      const p = Math.min(1, elapsed / minDur)
      const eased = 1 - Math.pow(1 - p, 3)
      // Hold at 99 until the page is ACTUALLY ready AND minimum time has
      // elapsed. Either condition unsatisfied keeps us below 1.0.
      const target = readyRef.current && p >= 1 ? 1 : Math.min(0.99, eased)
      setProgress(Math.round(target * 100))
      if (target < 1) raf = requestAnimationFrame(tick)
      else setTimeout(() => setDone(true), 260)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, reentry])

  /* Lock body scroll while the curtain is up. */
  useEffect(() => {
    if (typeof document === "undefined") return
    if (!done) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [done])

  /* Letter-fill thresholds. Each letter goes from ghost outline to filled
     when progress crosses its threshold. */
  const thresholds = [20, 40, 60, 80, 95]

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced || reentry ? 0.32 : 0.4, ease: [0.65, 0, 0.35, 1] }}
          className="fixed inset-0 z-[200] flex items-end justify-between bg-[oklch(0.08_0.005_40)] p-6 md:p-10"
          aria-hidden="true"
        >
          {/* Three-pane curtain :: each pane wipes up with a 60ms stagger.
              Pane content is the ambient grid; visually they're identical so
              the seams disappear during the static phase. */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              exit={{ y: "-101%" }}
              transition={{
                duration: reduced || reentry ? 0.32 : 0.95,
                delay: reduced || reentry ? 0 : i * 0.06,
                ease: [0.76, 0, 0.24, 1],
              }}
              className="absolute inset-y-0 bg-[oklch(0.08_0.005_40)]"
              style={{
                left: `${(i / 3) * 100}%`,
                width: `${100 / 3 + 0.5}%`, // tiny overlap kills sub-pixel seams
              }}
            >
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "linear-gradient(oklch(0.94 0.015 80 / 0.4) 1px, transparent 1px), linear-gradient(90deg, oklch(0.94 0.015 80 / 0.4) 1px, transparent 1px)",
                  backgroundSize: "48px 48px",
                }}
              />
            </motion.div>
          ))}

          {/* Top-left :: project mark */}
          <div className="relative flex flex-col gap-1">
            <span className="font-wordmark-tight text-[22px] font-semibold text-[oklch(0.94_0.015_80)]">
              VAISH
            </span>
            <span className="font-hud text-[10px] text-[oklch(0.62_0.02_60)]">
              Entry Sequence // by Aryaman V. Gupta
            </span>
          </div>

          {/* Center :: the wordmark assembly. Each letter goes from a thin
              outline (text-stroke) to a filled glyph at its threshold.
              Mobile drops to a smaller scale; desktop reads at 120-180px. */}
          {!reduced && !reentry && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
              <div className="flex items-baseline gap-[0.06em] md:gap-[0.04em]">
                {LETTERS.map((letter, i) => {
                  const filled = progress >= thresholds[i]
                  return (
                    <motion.span
                      key={letter}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: 0.15 + i * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="font-wordmark-tight text-[80px] font-semibold leading-none md:text-[180px]"
                      style={{
                        WebkitTextStroke: filled
                          ? "0px transparent"
                          : "1px oklch(0.72 0.14 50 / 0.55)",
                        color: filled ? "oklch(0.94 0.015 80)" : "transparent",
                        transition:
                          "color 320ms cubic-bezier(0.16,1,0.3,1), -webkit-text-stroke 320ms cubic-bezier(0.16,1,0.3,1)",
                      }}
                    >
                      {letter}
                    </motion.span>
                  )
                })}
              </div>
              {/* Subtitle that reveals as the wordmark assembles. */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: progress > 50 ? 1 : 0 }}
                transition={{ duration: 0.5 }}
                className="mt-3 text-center font-hud text-[10px] tracking-[0.32em] text-[oklch(0.62_0.02_60)]"
              >
                REALM OF THE UNTOLD
              </motion.div>
            </div>
          )}

          {/* Bottom-right :: the counter */}
          <div className="relative flex items-end gap-6">
            <div className="font-display text-[72px] leading-none text-[oklch(0.94_0.015_80)] md:text-[120px]">
              <motion.span
                key={Math.floor(progress / 5)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="tabular-nums"
              >
                {String(progress).padStart(3, "0")}
              </motion.span>
            </div>
          </div>

          {/* Bottom-edge progress rail */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-[oklch(0.94_0.015_80_/_0.1)]">
            <motion.div
              className="h-full bg-[oklch(0.72_0.14_50)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Top-right :: live signal indicator */}
          <div className="absolute top-6 right-6 flex items-center gap-2 md:top-10 md:right-10">
            <span className="h-[6px] w-[6px] rounded-full bg-[oklch(0.72_0.14_50)] animate-loader-tick" />
            <span className="font-hud text-[10px] text-[oklch(0.62_0.02_60)]">
              {progress < 100 ? "Acquiring Signal" : "Signal Acquired"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
