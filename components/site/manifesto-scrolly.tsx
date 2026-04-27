"use client"

/* ---------------------------------------------------------------------------
 * ManifestoScrolly :: pinned four-act recital of the manifesto principles.
 *
 * Previous implementation relied on a single `useScroll` MotionValue driving
 * per-act opacity envelopes. In practice that was fragile: on Lenis-smoothed
 * scroll the observed `scrollYProgress` could briefly desync from the
 * physical scroll distance, and if the user flicked past the section
 * quickly the later acts never crossed their opacity threshold.
 *
 * This rewrite uses a deterministic stage index driven by IntersectionObserver
 * on four equal-height "slot" divs filling the section. Whichever slot's
 * centre crosses the viewport centre is the active act. Opacity on each act
 * is a simple boolean crossfade, so the reveal is always guaranteed to play
 * regardless of scroll speed.
 * ------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useT } from "./i18n-context"

const PRINCIPLE_KEYS = [
  "op.principle1",
  "op.principle2",
  "op.principle3",
  "op.principle4",
] as const

const NUMERALS = ["I", "II", "III", "IV"] as const

/* Per-act background colour stops :: subtle copper / teal swings around
   the base ink. The gradient origin shifts horizontally per act so each
   chapter has its own light source on the page. */
const ACT_GRADIENTS = [
  // Act I :: copper from upper-left, teal cool fade. Quiet, statement.
  "radial-gradient(80% 60% at 22% 18%, oklch(0.20 0.05 50 / 0.9) 0%, transparent 60%), radial-gradient(70% 70% at 80% 90%, oklch(0.15 0.03 220 / 0.6) 0%, transparent 70%), oklch(0.07 0.005 40)",
  // Act II :: light pulled to the centre-right, deeper teal anchors left.
  "radial-gradient(70% 60% at 80% 35%, oklch(0.21 0.06 55 / 0.85) 0%, transparent 65%), radial-gradient(60% 60% at 12% 80%, oklch(0.13 0.02 220 / 0.7) 0%, transparent 70%), oklch(0.07 0.005 40)",
  // Act III :: brighter copper crown across the top, near-black floor.
  "radial-gradient(120% 50% at 50% 0%, oklch(0.22 0.07 50 / 0.85) 0%, transparent 60%), radial-gradient(80% 80% at 50% 110%, oklch(0.10 0.01 40) 0%, transparent 70%), oklch(0.07 0.005 40)",
  // Act IV :: closure — single warm vignette centred, like dawn through fog.
  "radial-gradient(70% 60% at 50% 45%, oklch(0.24 0.08 52 / 0.85) 0%, transparent 65%), oklch(0.06 0.005 40)",
] as const

export function ManifestoScrolly() {
  const t = useT()
  const sectionRef = useRef<HTMLDivElement>(null)
  const slotsRef = useRef<(HTMLDivElement | null)[]>([])
  const reduced = useReducedMotion()
  const [isFinePointer, setFinePointer] = useState(false)
  const [activeAct, setActiveAct] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setFinePointer(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  /* IntersectionObserver on four equal-height slots inside the section.
     The rootMargin tightens the observation zone to a horizontal band near
     the viewport centre — the slot currently crossing the centre wins.

     Threshold / ratio notes ::
       Each slot is 100vh tall and the rootMargin shrinks the effective
       observation zone to ~20 % of the viewport height, so the maximum
       achievable intersectionRatio per slot is ~0.2. Thresholds are
       therefore chosen within 0–0.2 so every traversal reports multiple
       entries rather than only the enter/exit crossing.

       The callback also maintains a persistent per-slot ratio map. An
       IntersectionObserver only reports entries for slots that crossed
       a threshold in that cycle — slots that remain stable (e.g. the
       slot currently filling the band) are absent from the batch. If we
       treated "absent" as ratio 0, the just-entering slot would win every
       comparison even while the previous slot still dominates the band,
       producing premature act switches. Persisting the last-known ratio
       keeps the comparison honest. */
  useEffect(() => {
    if (!isFinePointer || reduced) return
    const slots = slotsRef.current.filter(Boolean) as HTMLDivElement[]
    if (slots.length === 0) return

    const lastRatios = new Array(slots.length).fill(0)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = slots.indexOf(entry.target as HTMLDivElement)
          if (idx >= 0) lastRatios[idx] = entry.intersectionRatio
        })
        // Pick the slot with the highest sustained intersection ratio.
        let bestIdx = -1
        let bestRatio = 0
        for (let i = 0; i < lastRatios.length; i++) {
          if (lastRatios[i] > bestRatio) {
            bestRatio = lastRatios[i]
            bestIdx = i
          }
        }
        if (bestIdx >= 0) setActiveAct(bestIdx)
      },
      {
        // Horizontal band of ~20 % viewport height, centred vertically.
        rootMargin: "-40% 0px -40% 0px",
        // Thresholds scaled to the band's actual max ratio (~0.2).
        threshold: [0, 0.02, 0.05, 0.1, 0.15, 0.2],
      },
    )
    slots.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [isFinePointer, reduced])

  /* Static fallback for touch / reduced-motion :: stack the four
     principles vertically with a small atmospheric backdrop. */
  if (!isFinePointer || reduced) {
    return (
      <section
        data-section
        className="relative isolate overflow-hidden bg-background py-20 sm:py-28"
        aria-label="Principles"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: ACT_GRADIENTS[0] }}
        />
        <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8">
          <div className="font-hud text-xs uppercase tracking-[0.4em] text-foreground/40">
            Principles
          </div>
          <ol className="mt-6 space-y-10">
            {PRINCIPLE_KEYS.map((k, i) => (
              <li key={k} className="flex flex-col gap-2">
                <span className="font-hud text-xs text-foreground/40">
                  Act {NUMERALS[i]}
                </span>
                <p className="font-display text-balance text-[clamp(28px,4.5vw,52px)] font-medium leading-[1.1] text-foreground">
                  {t(k)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      data-section
      className="relative isolate"
      aria-label="Principles"
      // 400vh :: four acts × 100vh of scrub apiece. The pinned panel below
      // holds the stage; the four absolute slots below it drive the
      // active-act IntersectionObserver.
      style={{ height: "400vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background">
        {/* Stacked gradient layers crossfade by active index. */}
        {ACT_GRADIENTS.map((bg, i) => (
          <motion.div
            key={i}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: bg }}
            animate={{ opacity: i === activeAct ? 1 : 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}

        {/* Soft grid pattern shared across all acts. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid-lines opacity-[0.18]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[28%]"
          style={{
            background: "linear-gradient(180deg, oklch(0 0 0 / 0.45), transparent)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%]"
          style={{
            background: "linear-gradient(0deg, oklch(0 0 0 / 0.45), transparent)",
          }}
        />

        {/* HUD corner */}
        <div className="absolute left-5 top-6 z-10 flex items-center gap-3 font-hud text-xs uppercase tracking-[0.35em] text-foreground/70 sm:left-8 sm:top-8">
          <span className="inline-block h-px w-8 bg-foreground/30" />
          <span>Principles</span>
        </div>

        {/* Act content :: crossfade via AnimatePresence keyed by activeAct. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAct}
            initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center px-6"
          >
            <div className="mx-auto max-w-[1100px] text-center">
              <div className="font-hud text-xs uppercase tracking-[0.4em] text-foreground/40">
                {`Act ${NUMERALS[activeAct]}`}
              </div>
              <p className="font-display mt-7 text-balance text-[clamp(36px,6vw,80px)] font-medium leading-[1.05] text-foreground">
                {t(PRINCIPLE_KEYS[activeAct])}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dot strip :: four dots, fill in sequence as acts advance. */}
        <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="relative h-px w-10 overflow-hidden bg-foreground/15"
              aria-hidden
            >
              <motion.div
                className="absolute inset-0 bg-primary origin-left"
                animate={{ scaleX: i <= activeAct ? 1 : 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Four absolutely-positioned slot divs — each 1/4 of the 400vh
          section. IntersectionObserver on these decides the active act. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            ref={(el) => {
              slotsRef.current[i] = el
            }}
            className="absolute left-0 right-0"
            style={{ top: `${i * 25}%`, height: "25%" }}
          />
        ))}
      </div>
    </section>
  )
}
