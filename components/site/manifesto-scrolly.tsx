"use client"

/* ---------------------------------------------------------------------------
 * ManifestoScrolly :: a pinned, scroll-scored four-act sequence that turns
 * the manifesto's principles into a cinematic recital. Each principle pins
 * for a quarter of the section's scroll range, fades in with a small
 * reveal, then yields to the next. A subtle background gradient morphs per
 * act so the page feels like it's moving through weather rather than
 * scrolling through copy.
 *
 * Why this lives here (and not inside Manifesto.tsx)
 *   The existing Manifesto component is already two-column and content-heavy.
 *   Splitting the principles into a dedicated pinned section keeps the
 *   choreography from competing with the portrait + bio + pillars layout
 *   that already does its own scroll work, and lets us short-circuit on
 *   touch / reduced-motion without disturbing the rest of the section.
 *
 * Layout
 * ------
 *   Outer wrapper :: 400vh tall on desktop. The browser sees a long
 *   container; the inner sticky panel pins to top and acts as our stage.
 *
 *   Inner panel :: position: sticky, top: 0, h-screen. Holds:
 *     - Background gradient layer that morphs per act
 *     - Roman numeral "chapter mark" at top-right
 *     - Centred display-type principle with per-word reveal
 *     - Dot strip at bottom showing scrub progress
 *
 * Performance gates
 *   - Coarse pointer / touch: render a static stack of all four principles,
 *     skip pinning entirely. Pinned sticky on mobile fights momentum
 *     scroll and produces the choppiness we just spent PR #10 fixing.
 *   - Reduced motion: same fallback as touch. No per-word fade; principles
 *     just appear.
 *   - Off-screen: the rAF-bound transforms framer-motion produces are
 *     already cheap, but `whileInView once` patterns are used for the
 *     chapter mark + dot strip so they don't churn during scroll.
 * ------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react"
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion"
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
   chapter has its own light source on the page.

   Tuned dark enough that text contrast stays AA throughout — the lightest
   stop is `oklch(0.18 ...)` against foreground at `oklch(0.94)`. */
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

function PrincipleAct({
  text,
  numeral,
  progress,
  range,
}: {
  text: string
  numeral: string
  progress: MotionValue<number>
  range: [number, number, number, number] // fadeIn-start, fadeIn-end, fadeOut-start, fadeOut-end
}) {
  const [a, b, c, d] = range
  /* Opacity envelope :: ramp up across [a,b], hold at 1 over [b,c], ramp
     down across [c,d]. This is the standard "story beat" pattern —
     readers spend the longest at full opacity, just long enough to
     register the line. */
  const opacity = useTransform(progress, [a, b, c, d], [0, 1, 1, 0])
  /* Vertical drift :: the line floats up as it enters, settles, then
     drifts up further as the next act takes over. The total range is
     small (24px) so the focus stays on the type. */
  const y = useTransform(progress, [a, b, c, d], [24, 0, 0, -24])
  /* Subtle blur on the entry / exit for cinematic depth-of-field feel.
     Capped at 6px so type stays readable through the transition. */
  const blur = useTransform(progress, [a, b, c, d], [6, 0, 0, 6])
  const filter = useTransform(blur, (v) => `blur(${v}px)`)

  return (
    <motion.div
      style={{ opacity, y, filter }}
      className="absolute inset-0 flex items-center justify-center px-6"
      aria-hidden={false}
    >
      <div className="mx-auto max-w-[1100px] text-center">
        <div className="font-hud text-xs uppercase tracking-[0.4em] text-foreground/40">
          {`Act ${numeral}`}
        </div>
        <p className="font-display mt-7 text-balance text-[clamp(36px,6vw,80px)] font-medium leading-[1.05] text-foreground">
          {text}
        </p>
      </div>
    </motion.div>
  )
}

export function ManifestoScrolly() {
  const t = useT()
  const sectionRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [isFinePointer, setFinePointer] = useState(false)

  /* The fine-pointer / touch detection runs after mount because matchMedia
     is a client-only API. We default to `false` (the static stack) and
     opt up to the pinned 400vh version once the client confirms a fine
     pointer — same convention as hero-aura.tsx, divider-fluid.tsx, and
     custom-cursor.tsx. Starting `true` would render a 400vh tall section
     during SSR, then collapse to ~100vh on mobile after hydration,
     producing a large layout shift that can teleport the reader to an
     unrelated part of the page. Adding scroll length on desktop is the
     less disorienting direction of change. */
  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)")
    const update = () => setFinePointer(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  /* Scroll progress :: 0 at section top, 1 at section bottom. The
     section is 400vh tall on desktop so the user gets a real scrub
     window per act. Offset clamps at start-start / end-end so the
     pinned panel doesn't half-show during the entry / exit. */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  })

  /* Background gradient morph :: useTransform over an array of strings
     would produce a CSS string mismatch (radial-gradient counts differ
     between acts). Instead we crossfade by stacking four full-cover
     layers and animating each one's opacity through its own envelope. */
  const opacity1 = useTransform(scrollYProgress, [0.0, 0.20, 0.30], [1, 1, 0])
  const opacity2 = useTransform(scrollYProgress, [0.20, 0.30, 0.45, 0.55], [0, 1, 1, 0])
  const opacity3 = useTransform(scrollYProgress, [0.45, 0.55, 0.70, 0.80], [0, 1, 1, 0])
  const opacity4 = useTransform(scrollYProgress, [0.70, 0.80, 1.0], [0, 1, 1])

  /* Static fallback for touch / reduced-motion :: stack the four
     principles vertically with a small atmospheric backdrop. No pinning,
     no scroll-driven fades — the lines are just paragraphs the reader
     scrolls past at their normal pace. */
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
      // 400vh :: four acts × 100vh of scrub apiece. The pinned panel
      // below holds the actual rendered stage at h-screen.
      style={{ height: "400vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background">
        {/* Stacked gradient layers — each opacity envelope ramps in /
            out across its act. Layered absolutely so the morph is a
            true crossfade, not a string interpolation. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: opacity1, background: ACT_GRADIENTS[0] }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: opacity2, background: ACT_GRADIENTS[1] }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: opacity3, background: ACT_GRADIENTS[2] }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: opacity4, background: ACT_GRADIENTS[3] }}
        />

        {/* Soft grid pattern shared across all acts, tinted in. Lifts
            the otherwise-empty centre out of pure colour space and
            gives the eye geometric context. */}
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

        {/* Top-left HUD label :: tells the reader what this section is.
            Static, doesn't move with the scrub — anchors the stage. */}
        <div className="absolute left-5 top-6 z-10 flex items-center gap-3 font-hud text-xs uppercase tracking-[0.35em] text-foreground/70 sm:left-8 sm:top-8">
          <span className="inline-block h-px w-8 bg-foreground/30" />
          <span>Principles</span>
        </div>

        {/* Acts :: each is absolutely positioned and runs its own
            opacity / y / blur envelope keyed against scrollYProgress.
            Ranges are designed to overlap slightly so there's never a
            blank frame between two acts. */}
        <PrincipleAct
          text={t(PRINCIPLE_KEYS[0])}
          numeral={NUMERALS[0]}
          progress={scrollYProgress}
          range={[0.00, 0.08, 0.20, 0.28]}
        />
        <PrincipleAct
          text={t(PRINCIPLE_KEYS[1])}
          numeral={NUMERALS[1]}
          progress={scrollYProgress}
          range={[0.22, 0.32, 0.45, 0.53]}
        />
        <PrincipleAct
          text={t(PRINCIPLE_KEYS[2])}
          numeral={NUMERALS[2]}
          progress={scrollYProgress}
          range={[0.47, 0.57, 0.70, 0.78]}
        />
        <PrincipleAct
          text={t(PRINCIPLE_KEYS[3])}
          numeral={NUMERALS[3]}
          progress={scrollYProgress}
          range={[0.72, 0.82, 0.96, 1.00]}
        />

        {/* Dot strip :: shows scrub position. Each dot fills as its
            act enters; this gives the reader a sense of "how much
            longer" without being a literal progress bar. */}
        <DotStrip progress={scrollYProgress} />
      </div>
    </section>
  )
}

/* DotStrip :: four dots, each filling at the centre of its act's
   range. We use a separate transform per dot rather than a single
   array index so the fill is gradual (matches the slow pinned tempo). */
function DotStrip({ progress }: { progress: MotionValue<number> }) {
  // Centres of the four acts' "hold" ranges.
  const fill1 = useTransform(progress, [0.00, 0.10, 0.20], [0, 1, 1])
  const fill2 = useTransform(progress, [0.22, 0.34, 0.45], [0, 1, 1])
  const fill3 = useTransform(progress, [0.47, 0.59, 0.70], [0, 1, 1])
  const fill4 = useTransform(progress, [0.72, 0.84, 1.00], [0, 1, 1])
  const fills = [fill1, fill2, fill3, fill4]
  return (
    <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center gap-3">
      {fills.map((f, i) => (
        <div
          key={i}
          className="relative h-px w-10 overflow-hidden bg-foreground/15"
          aria-hidden
        >
          <motion.div
            style={{ scaleX: f, transformOrigin: "left center" }}
            className="absolute inset-0 bg-primary"
          />
        </div>
      ))}
    </div>
  )
}
