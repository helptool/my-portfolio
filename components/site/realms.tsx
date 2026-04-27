"use client"

import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion"
import Image from "next/image"
import { RevealImage } from "./reveal-image"
import { SHIMMER } from "@/lib/shimmer"
import { useEffect, useMemo, useRef, useState } from "react"
import { realms } from "@/lib/vaish"
import { useT } from "./i18n-context"
import { useRunes } from "./runes-context"

/* ---------------------------------------------------------------------------
 * Realms :: scroll-driven horizontal carousel with STRICT scroll snap.
 *
 * The previous implementation mapped scrollYProgress linearly to x, so at any
 * mid-scroll position two slides were partially visible. This version snaps:
 * each slide owns a segment of vertical scroll, with a long REST plateau
 * (~75% of the segment, x is locked) and a short TRANSITION window (~25% of
 * the segment, x animates to the next slide). The motion is then smoothed
 * with a spring so transitions feel premium across mouse-wheel, trackpad,
 * and touch.
 *
 * Each card is an exact 100vw wide and the inner track is N * 100vw wide,
 * which means snap positions are pixel-perfect on every screen size — there
 * is never a partial card cut off at the edge.
 * ------------------------------------------------------------------------- */

// Fraction of a segment spent at REST (showing one fully-aligned card).
// The remaining fraction is the smooth TRANSITION to the next card.
const REST_RATIO = 0.75
// Total section height multiplier. With height = N * VIEWPORT_PER_SLIDE,
// the page reserves enough scroll for each slide to feel like a stop.
const VIEWPORT_PER_SLIDE = 1.2

export function Realms() {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })

  const N = realms.length

  // Build a stepped keyframe mapping that locks x during rest plateaus and
  // only moves during the short transition windows. With N=5 this yields
  // 10 keypoints. Outputs are negative VW numbers so we can run a spring
  // on them and then template them back into a `translateX(...vw)` later.
  // Memoised so the arrays remain reference-stable.
  const { inputs, outputs } = useMemo(() => {
    const ins: number[] = []
    const outs: number[] = []
    for (let i = 0; i < N; i++) {
      // Enter rest at slide i.
      ins.push(i / N)
      outs.push(-i * 100)
      // End of rest plateau for slide i (begin transition to slide i+1).
      if (i < N - 1) {
        ins.push((i + REST_RATIO) / N)
        outs.push(-i * 100)
      }
    }
    // Final keyframe locks the last slide all the way to scroll end.
    ins.push(1)
    outs.push(-(N - 1) * 100)
    return { inputs: ins, outputs: outs }
  }, [N])

  const xRawVw = useTransform(scrollYProgress, inputs, outputs)
  // Spring smooths the linear transition zone so it never feels mechanical.
  const xVw = useSpring(xRawVw, { stiffness: 140, damping: 26, mass: 0.45 })
  // Template the numeric vw value back into a real CSS transform so it
  // remains responsive to viewport width on every device.
  const transform = useMotionTemplate`translate3d(${xVw}vw, 0, 0)`

  const [active, setActive] = useState(0)
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // Determine which slide we're "resting on". Inside each segment, commit
    // the index to the next slide once we've crossed the midpoint of the
    // transition window so HUD readouts stay in sync with the visual.
    const seg = v * N
    const segIdx = Math.min(N - 1, Math.floor(seg))
    const segLocal = seg - segIdx
    const transitionMid = REST_RATIO + (1 - REST_RATIO) / 2
    const i = Math.min(N - 1, segIdx + (segLocal > transitionMid ? 1 : 0))
    setActive(i)
  })

  // Vow rune trigger :: hold the cursor still over a realm card for 6
  // continuous seconds. "Still" means within a 16px movement budget — pure
  // pointerleave detection would be too easy and pixel-exact stillness
  // would be unreasonable. Cancels on scroll, on slide change, or on
  // pointerleave.
  const { addRune, hasRune } = useRunes()
  const vowTimerRef = useRef<number | null>(null)
  const vowOriginRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    // Reset on slide change so each realm needs its own dwell.
    if (vowTimerRef.current !== null) {
      window.clearTimeout(vowTimerRef.current)
      vowTimerRef.current = null
      vowOriginRef.current = null
    }
  }, [active])

  const onCarouselEnter = (e: React.PointerEvent) => {
    if (hasRune("vow")) return
    vowOriginRef.current = { x: e.clientX, y: e.clientY }
    vowTimerRef.current = window.setTimeout(() => {
      addRune("vow")
    }, 6000)
  }
  const onCarouselMove = (e: React.PointerEvent) => {
    if (!vowOriginRef.current || vowTimerRef.current === null) return
    const dx = e.clientX - vowOriginRef.current.x
    const dy = e.clientY - vowOriginRef.current.y
    if (dx * dx + dy * dy > 16 * 16) {
      // Movement exceeded the stillness budget; restart the dwell from
      // the new position. This is more forgiving than a hard cancel —
      // honest stillness gets credited even after slight cursor drift.
      window.clearTimeout(vowTimerRef.current)
      vowOriginRef.current = { x: e.clientX, y: e.clientY }
      vowTimerRef.current = window.setTimeout(() => addRune("vow"), 6000)
    }
  }
  const onCarouselLeave = () => {
    if (vowTimerRef.current !== null) {
      window.clearTimeout(vowTimerRef.current)
      vowTimerRef.current = null
      vowOriginRef.current = null
    }
  }
  useEffect(() => () => {
    if (vowTimerRef.current !== null) window.clearTimeout(vowTimerRef.current)
  }, [])

  return (
    <section
      id="realms"
      ref={ref}
      className="relative bg-background"
      style={{ height: `${N * VIEWPORT_PER_SLIDE * 100}vh` }}
    >
      <div
        className="sticky top-0 h-[100svh] overflow-hidden"
        onPointerEnter={onCarouselEnter}
        onPointerMove={onCarouselMove}
        onPointerLeave={onCarouselLeave}
      >
        {/* Top HUD row */}
        <div className="pointer-events-none absolute left-0 right-0 top-24 z-20 flex items-start justify-between px-5 md:top-28 md:px-10">
          <div className="flex items-center gap-3">
            <span className="block h-px w-8 bg-foreground/30" />
            <span className="font-hud text-foreground/70">{t("realms.kicker")}</span>
          </div>
          <div className="flex items-baseline gap-2 text-right">
            <span className="font-display text-5xl leading-none tabular-nums text-foreground md:text-6xl">
              {String(active + 1).padStart(2, "0")}
            </span>
            <span className="font-hud text-foreground/70">/ {String(realms.length).padStart(2, "0")}</span>
          </div>
        </div>

        {/* Bottom HUD */}
        <div className="pointer-events-none absolute bottom-10 left-5 z-20 hidden items-center gap-3 md:flex md:left-10">
          <span className="h-[6px] w-[6px] rounded-full bg-primary animate-pulse-soft" />
          <span className="font-hud text-foreground/70">{t("realms.scrollHint")}</span>
        </div>

        <div className="pointer-events-none absolute bottom-10 right-5 z-20 hidden w-[240px] md:block md:right-10">
          <div className="mb-2 flex items-center justify-between font-hud text-foreground/70">
            <span>{realms[active]?.name}</span>
            <span className="tabular-nums">
              {String(Math.round(((active + 1) / realms.length) * 100)).padStart(2, "0")}%
            </span>
          </div>
          <div className="relative h-px w-full bg-foreground/15">
            <motion.div style={{ scaleX: scrollYProgress }} className="absolute inset-y-0 left-0 h-full w-full origin-left bg-primary" />
          </div>
        </div>

        <motion.div
          style={{ transform, width: `${N * 100}vw` }}
          className="flex h-full will-change-transform"
        >
          {realms.map((r, i) => (
            <RealmSlide key={r.index} realm={r} index={i} isActive={i === active} t={t} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function RealmSlide({ realm, index, isActive, t }: { realm: (typeof realms)[number]; index: number; isActive: boolean; t: (k: string) => string }) {
  return (
    <div className="relative h-full shrink-0 grow-0 basis-[100vw]" style={{ width: "100vw" }}>
      <div className="absolute inset-0">
        <motion.div
          animate={{ scale: isActive ? 1.02 : 1.12 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {/* RevealImage :: the visible realm IS the present-tense reading;
              the cursor-porthole reveals the same image with a "memory"
              filter (desaturated, sepia-warm, dimmed) — the realm as it
              was Untold. Same src so we don't double-fetch; the visual
              difference is pure CSS filter. */}
          <RevealImage
            src={realm.image}
            revealSrc={realm.image}
            alt={realm.name}
            revealAlt=""
            revealLabel="Untold"
            portholeSize={260}
            fill
            sizes="100vw"
            className="object-cover h-full w-full"
            revealClassName="object-cover [filter:grayscale(0.85)_sepia(0.45)_brightness(0.78)_contrast(1.05)]"
            priority={index === 0}
          />
        </motion.div>
      </div>

      {/* Decorative tone gradients sit on top of the RevealImage. They
          must opt out of pointer events so onPointerMove / Enter /
          Leave can reach the RevealImage container — that is what
          drives the cursor-porthole "Untold" reveal. Without
          pointer-events-none the overlays absorb every move event
          before it can hit the RevealImage's listeners and the
          porthole never opens. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,oklch(0.09_0.006_40/0.5)_0%,transparent_25%,transparent_55%,oklch(0.09_0.006_40/0.94)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,oklch(0.09_0.006_40/0.88)_0%,transparent_50%,transparent_100%)] md:bg-[linear-gradient(90deg,oklch(0.09_0.006_40/0.82)_0%,transparent_40%,transparent_100%)]" />

      {/* ghost index */}
      <div aria-hidden className="pointer-events-none absolute bottom-[-4vw] right-[-1vw] z-[5] text-right">
        <span className="font-display text-[28vw] leading-[0.8] text-foreground/[0.06]">{realm.index}</span>
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-[1600px] items-end px-5 pb-28 pt-28 md:items-center md:px-10 md:pb-0 md:pt-0">
        <motion.div
          animate={{ opacity: isActive ? 1 : 0.35, y: isActive ? 0 : 14 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[640px]"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-hud text-primary">{t("realms.project")} {realm.index}</span>
            <span className="h-px w-8 bg-foreground/30" />
            <span className="font-hud text-foreground/70">{t(realm.kindKey)}</span>
          </div>

          {/* Split per-word, then per-letter inside each word. The
              outer word wrapper carries `whiteSpace: nowrap` so the
              line-break engine can never split a word like "Wylds"
              across two lines. Real space text nodes between word
              wrappers keep the natural break opportunities — without
              this the browser would break between characters because
              each per-letter span is inline-block, producing the
              orphan "s" on the next line that motivated this fix. */}
          <h3 className="display-lg mt-5 text-[clamp(54px,9vw,140px)]">
            {realm.name.split(" ").map((word, wi, words) => (
              <span key={wi} className="inline-block whitespace-nowrap">
                {word.split("").map((c, i) => {
                  // Stagger across the whole title regardless of word
                  // index so the reveal reads as one continuous wave.
                  const offset =
                    words
                      .slice(0, wi)
                      .reduce((sum, w) => sum + w.length + 1, 0) + i
                  return (
                    <span
                      key={i}
                      className="inline-block overflow-hidden align-baseline [line-height:0.92]"
                    >
                      <motion.span
                        initial={{ y: "115%" }}
                        animate={{ y: isActive ? "0%" : "115%" }}
                        transition={{
                          duration: 0.9,
                          delay: offset * 0.03,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="inline-block will-change-transform"
                      >
                        {c}
                      </motion.span>
                    </span>
                  )
                })}
                {wi < words.length - 1 && " "}
              </span>
            ))}
          </h3>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 20 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="italic-serif mt-6 max-w-[540px] text-xl text-foreground/85 md:text-2xl"
          >
            &ldquo;{t(realm.quoteKey)}&rdquo;
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 16 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-6 max-w-[460px] text-[15px] leading-relaxed text-foreground/65"
          >
            {t(realm.bodyKey)}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 16 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-6 font-hud text-foreground/70"
          >
            {t("realms.role")} // <span className="text-foreground">{t(realm.roleKey)}</span>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-8 grid grid-cols-3 gap-4 border-t border-foreground/10 pt-5"
          >
            {Object.entries(realm.stats).map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <dt className="font-hud text-foreground/70">{t(`realms.${k}`)}</dt>
                <dd className="font-display text-2xl text-foreground tabular-nums">{v}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </div>
    </div>
  )
}
