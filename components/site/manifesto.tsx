"use client"

import Image from "next/image"
import dynamic from "next/dynamic"
import { SHIMMER } from "@/lib/shimmer"

/* Lazy load the shader-image so the WebGL host JS only ships once the
   manifesto enters the viewport. SSR is disabled because WebGL has no
   server-side equivalent; the same module also exports a plain <Image>
   fallback for SSR via its own internal default render. */
const ShaderImage = dynamic(
  () => import("./shader-image").then((m) => ({ default: m.ShaderImage })),
  { ssr: false, loading: () => null },
)
import Link from "next/link"
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  easeOut,
  type MotionValue,
} from "framer-motion"
import { useEffect, useRef, useState, type MouseEvent } from "react"
import { brand } from "@/lib/vaish"
import { useT } from "./i18n-context"
import { SectionAtmosphere } from "./section-atmosphere"
import { ScrollWeight } from "./scroll-weight"
import { useRunes } from "./runes-context"

/* ---------------------------------------------------------------------------
 * About Operator :: a brief, cinematic introduction to Aryaman.
 *
 * Layout
 * ------
 *  Left  : sticky portrait plate with HUD readouts, ken-burns zoom,
 *          traveling scan-line, and an animated stat rail underneath.
 *  Right : kicker, headline (word-by-word reveal), short lede,
 *          two-column bio paragraphs, three pillars, two square plates,
 *          a "currents" status row.
 *
 * Motion rules
 * ------------
 *  - Section runs a scroll-pinned scrub :: portrait scales while text rises
 *  - Each headline word reveals on its own row
 *  - Pillars stagger in with delays
 *  - Stat rail counts up the first time it enters the viewport
 * ------------------------------------------------------------------------- */

function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setSeen(true)
      },
      { threshold },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [threshold])
  return [ref, seen] as const
}

function Counter({ to, suffix = "", duration = 1.4 }: { to: number; suffix?: string; duration?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.5)
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!seen) return
    const start = performance.now()
    let raf = 0
    const tick = (n: number) => {
      const p = Math.min(1, (n - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.floor(eased * to))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to, duration])
  return (
    <span ref={ref}>
      {v.toLocaleString()}
      {suffix}
    </span>
  )
}

function HeadlineWord({
  children,
  progress,
  range,
  accent,
}: {
  children: React.ReactNode
  progress: MotionValue<number>
  range: [number, number]
  accent?: boolean
}) {
  const opacity = useTransform(progress, range, [0.14, 1])
  const y = useTransform(progress, range, [16, 0])
  return (
    <motion.span
      style={{ opacity, y }}
      className={`mr-[0.22em] inline-block will-change-transform ${
        accent ? "italic-serif font-display font-normal text-primary" : ""
      }`}
    >
      {children}
    </motion.span>
  )
}

function PortraitPlate() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const zoom = useTransform(scrollYProgress, [0, 1], [1.08, 1.22])
  const liftY = useTransform(scrollYProgress, [0, 1], [40, -40])
  const scanY = useTransform(scrollYProgress, [0, 1], ["-10%", "110%"])
  const t = useT()

  return (
    <motion.div ref={ref} style={{ y: liftY }} className="relative">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md border border-foreground/10 bg-foreground/[0.03]">
        <motion.div style={{ scale: zoom }} className="absolute inset-0">
          {/* SSR + before-shader fallback :: plain priority image so SEO
              crawlers and visitors with reduced-motion / no WebGL still
              see the portrait. */}
          <Image
            src="/operator/portrait.jpg"
            alt={t("op.portraitAlt")}
            fill
            sizes="(max-width: 1024px) 80vw, 40vw"
            className="object-cover"
            placeholder="blur"
            blurDataURL={SHIMMER}
            priority
          />
          {/* WebGL displacement layer :: paints over the fallback once the
              shader is live. baseWarp/hoverWarp dialed conservatively so
              the face only gets a soft liquid-glass shimmer, not a horror
              warp. Chromatic aberration blooms around the cursor. */}
          <ShaderImage
            src="/operator/portrait.jpg"
            alt=""
            fill
            sizes="(max-width: 1024px) 80vw, 40vw"
            className="absolute inset-0"
            style={{ objectFit: "cover" }}
            baseWarp={0.022}
            hoverWarp={0}
            chromaticAberration={0.005}
            // Idle = soft warp + RGB split paints the whole portrait.
            // Hovering animates both toward 0 over ~0.5s so the visitor
            // can "see through" the shader by holding the cursor over
            // the photo. Reads as a deliberate gesture rather than the
            // shader being broken.
            clearOnHover
          />
        </motion.div>

        {/* Decorative gradient overlays sit ON TOP of the ShaderImage
            canvas. Without `pointer-events-none` they eat every mouse
            event before it reaches the canvas, which is what was
            preventing the clearOnHover behaviour from firing — the
            ShaderImage's pointermove handler never received an event,
            so warp/aberration stayed at their idle full values. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-background/30 mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-0 mix-blend-soft-light bg-gradient-to-br from-primary/15 via-transparent to-transparent" />

        <motion.span
          aria-hidden
          style={{ y: scanY }}
          className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent"
          // halo
        />

        {/* Bracket frame */}
        <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l-2 border-t-2 border-primary/70" />
        <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r-2 border-t-2 border-primary/70" />
        <span className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 border-l-2 border-b-2 border-primary/70" />
        <span className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 border-r-2 border-b-2 border-primary/70" />

        {/* HUD readouts */}
        <div className="absolute left-4 top-4 flex items-center gap-2 font-hud text-foreground/85">
          <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
          <span>{t("op.subjectTag")}</span>
        </div>
        <div className="absolute right-4 top-4 font-hud text-foreground/85">{t("op.frame")}</div>

        <div className="absolute left-4 bottom-4 right-4 flex items-end justify-between font-hud text-foreground/85">
          <div>
            <div className="text-foreground">{brand.creator}</div>
            <div className="text-foreground/70">{t("op.role")}</div>
          </div>
          <div className="text-right">
            <div className="text-foreground/70">{t("op.basedIn")}</div>
            <div className="text-foreground">{t("brand.location")}</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function SquarePlate({ src, captionKey, code }: { src: string; captionKey: string; code: string }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(50)
  const my = useMotionValue(50)
  const sx = useSpring(mx, { stiffness: 110, damping: 18 })
  const sy = useSpring(my, { stiffness: 110, damping: 18 })
  const glow = useTransform(
    [sx, sy] as [MotionValue<number>, MotionValue<number>],
    ([x, y]: number[]) =>
      `radial-gradient(280px 220px at ${x}% ${y}%, oklch(0.74 0.15 52 / 0.18), transparent 70%)`,
  )

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    mx.set(((e.clientX - r.left) / r.width) * 100)
    my.set(((e.clientY - r.top) / r.height) * 100)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className="group relative aspect-square w-full overflow-hidden rounded-md border border-foreground/10"
    >
      <Image
        src={src || "/placeholder.svg"}
        alt=""
        fill
        sizes="(max-width: 1024px) 50vw, 24vw"
        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
        placeholder="blur"
        blurDataURL={SHIMMER}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent mix-blend-multiply" />
      <div className="absolute inset-0 mix-blend-soft-light bg-gradient-to-br from-primary/12 via-transparent to-transparent" />
      <motion.span
        aria-hidden
        style={{ background: glow }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-foreground/40" />
      <span className="pointer-events-none absolute right-2 bottom-2 h-3 w-3 border-r border-b border-foreground/40" />
      <div className="absolute left-3 bottom-3 right-3 flex items-end justify-between font-hud text-foreground/80">
        <span>{t(captionKey)}</span>
        <span className="text-foreground/50">{code}</span>
      </div>
    </motion.div>
  )
}

function Pillar({
  index,
  glyph,
  title,
  body,
  delay = 0,
}: {
  index: string
  glyph: string
  title: string
  body: string
  delay?: number
}) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3)
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={seen ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: easeOut }}
      className="relative flex items-start gap-4 border-l border-foreground/10 pl-5"
    >
      <span className="absolute left-[-4px] top-2 h-[7px] w-[7px] rounded-full bg-primary" />
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-3 font-hud text-foreground/45">
          <span>{index}</span>
          <span className="font-display text-base text-foreground/75">{glyph}</span>
        </div>
        <h4 className="font-wordmark-tight mt-1 text-2xl font-semibold text-foreground">{title}</h4>
        <p className="mt-2 max-w-[36ch] text-pretty text-foreground/70 leading-relaxed">{body}</p>
      </div>
    </motion.div>
  )
}

export function Manifesto() {
  const t = useT()
  const headRef = useRef<HTMLHeadingElement>(null)
  const { scrollYProgress } = useScroll({ target: headRef, offset: ["start 0.85", "end 0.4"] })

  const headlineWords = t("op.headline").split(" ")
  const accentSet = new Set(t("op.headlineAccent").split("|").filter(Boolean))

  // Loom rune trigger :: clicking the central ᛟ glyph in the rune strip
  // unlocks "loom". The strip is decorative on most surfaces so this
  // doesn't conflict with any existing interactions.
  const { addRune } = useRunes()

  return (
    <section
      id="manifesto"
      data-section
      className="relative isolate overflow-hidden bg-background py-28 sm:py-36"
    >
      {/* Premium ambient atmosphere :: nebulae + ribbons + motes */}
      <SectionAtmosphere variant="aurora" />

      {/* Backdrop grid + soft top vignette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-lines opacity-25" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(60% 40% at 50% 0%, oklch(0.74 0.15 52 / 0.06), transparent 70%)",
        }}
      />

      {/* Header */}
      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: easeOut }}
            className="flex items-center gap-3 font-hud text-foreground/70"
          >
            <span className="inline-block h-px w-10 bg-foreground/30" />
            <span>{t("op.kicker")}</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.1, ease: easeOut }}
            className="hidden items-center gap-3 font-hud text-foreground/70 sm:flex"
          >
            <span>{t("op.frame")}</span>
            <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
          </motion.div>
        </div>

        {/* Rune strip :: a small cinematic flourish before the headline.
            Originally mobile-only; now visible at every size because the
            ᛟ glyph is a hidden meta-game trigger and we want it
            discoverable on desktop too. The ᛟ is a real button that
            unlocks the "loom" rune; the others are decorative spans. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: easeOut }}
          className="mt-5 flex items-center gap-3"
        >
          <span className="block h-px flex-1 bg-foreground/10" />
          <span aria-hidden className="font-display text-lg text-foreground/60">ᚦ</span>
          <span aria-hidden className="font-display text-lg text-primary">ᚱ</span>
          <span aria-hidden className="font-display text-lg text-foreground/60">ᚹ</span>
          <button
            type="button"
            onClick={() => addRune("loom")}
            aria-label="Hidden rune"
            className="font-display text-lg text-foreground/40 transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary"
          >
            ᛟ
          </button>
          <span className="block h-px flex-1 bg-foreground/10" />
        </motion.div>

        <h2
          ref={headRef}
          className="font-wordmark-tight mt-6 text-balance text-[clamp(56px,9vw,128px)] font-semibold leading-[0.92]"
        >
          {/* ScrollWeight :: Bodoni Moda is loaded as a variable font in
              app/layout.tsx, so the wght axis interpolates continuously
              from 500..880 with scroll velocity. Settles back to 500
              over ~600ms. The per-word HeadlineWord reveals are
              independent and continue to work since opacity/y are
              orthogonal to fontVariationSettings. */}
          <ScrollWeight as="span" min={500} max={880} threshold={75}>
            {headlineWords.map((w, i) => {
              const start = i / headlineWords.length
              const end = start + 1.4 / headlineWords.length
              return (
                <HeadlineWord key={i} progress={scrollYProgress} range={[start, end]} accent={accentSet.has(w)}>
                  {w}
                </HeadlineWord>
              )
            })}
          </ScrollWeight>
        </h2>
      </div>

      {/* Body */}
      <div className="relative mx-auto mt-20 grid max-w-[1400px] grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-12">
        {/* Left :: portrait + stat rail */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <PortraitPlate />

            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-foreground/10 pt-6">
              <div>
                <div className="font-wordmark-tight text-3xl font-semibold text-foreground">
                  <Counter to={6} suffix="+" />
                </div>
                <div className="mt-1 font-hud text-foreground/70">{t("op.stat1")}</div>
              </div>
              <div>
                <div className="font-wordmark-tight text-3xl font-semibold text-foreground">
                  <Counter to={48} />
                </div>
                <div className="mt-1 font-hud text-foreground/70">{t("op.stat2")}</div>
              </div>
              <div>
                <div className="font-wordmark-tight text-3xl font-semibold text-foreground">
                  <Counter to={12} />
                </div>
                <div className="mt-1 font-hud text-foreground/70">{t("op.stat3")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right :: text */}
        <div className="lg:col-span-7">
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1, ease: easeOut }}
            className="italic-serif text-balance text-[clamp(20px,2.4vw,30px)] leading-snug text-foreground/85"
          >
            {t("op.lede")}
          </motion.p>

          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, delay: 0.1, ease: easeOut }}
              className="text-pretty leading-relaxed text-foreground/70"
            >
              {t("op.bio1")}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, delay: 0.2, ease: easeOut }}
              className="text-pretty leading-relaxed text-foreground/70"
            >
              {t("op.bio2")}
            </motion.p>
          </div>

          {/* Pillars */}
          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Pillar index="01" glyph="ᚦ" title={t("op.pillar1Title")} body={t("op.pillar1Body")} delay={0.15} />
            <Pillar index="02" glyph="ᚱ" title={t("op.pillar2Title")} body={t("op.pillar2Body")} delay={0.25} />
            <Pillar index="03" glyph="ᚹ" title={t("op.pillar3Title")} body={t("op.pillar3Body")} delay={0.35} />
          </div>

          {/* Square plates */}
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <SquarePlate src="/operator/workspace.jpg" captionKey="op.plate1" code="FRG.WRK" />
            <SquarePlate src="/operator/hands.jpg" captionKey="op.plate2" code="FRG.HND" />
          </div>

          {/* Currents row */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, ease: easeOut }}
            className="mt-14 grid grid-cols-2 gap-6 border-t border-foreground/10 pt-6 font-hud text-foreground/70 sm:grid-cols-4"
          >
            <div>
              <div className="text-foreground/45">{t("op.row.now")}</div>
              <div className="mt-1 text-foreground">{t("op.row.nowVal")}</div>
            </div>
            <div>
              <div className="text-foreground/45">{t("op.row.craft")}</div>
              <div className="mt-1 text-foreground">{t("op.row.craftVal")}</div>
            </div>
            <div>
              <div className="text-foreground/45">{t("op.row.tools")}</div>
              <div className="mt-1 text-foreground">{t("op.row.toolsVal")}</div>
            </div>
            <div>
              <div className="text-foreground/45">{t("op.row.signal")}</div>
              <div className="mt-1 text-foreground">{t("op.row.signalVal")}</div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, ease: easeOut }}
            className="mt-10 flex items-center gap-5"
          >
            <Link
              href="#enter"
              data-cursor="enter"
              data-cursor-label={t("op.dossierCta")}
              className="group relative inline-flex h-[58px] items-center gap-4 rounded-full bg-primary pl-6 pr-3 text-primary-foreground overflow-hidden"
            >
              <span className="relative z-10 font-hud text-[11px]">{t("op.dossierCta")}</span>
              <span className="relative z-10 inline-flex h-[42px] w-[42px] items-center justify-center rounded-full bg-primary-foreground/15">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-foreground/10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0"
              />
            </Link>

            <Link
              href="#realms"
              data-cursor="hover"
              className="group inline-flex items-center gap-3 py-2 font-hud text-foreground/75 transition-colors hover:text-foreground"
            >
              <span className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-foreground/25">
                <span className="h-1 w-1 rounded-full bg-foreground" />
              </span>
              {t("op.seeWorks")}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
