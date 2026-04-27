"use client"

import Image from "next/image"
import { SHIMMER } from "@/lib/shimmer"
import { useRef } from "react"
import { motion, useScroll, useTransform, useMotionValue, useSpring, type MotionValue } from "framer-motion"
import { useT } from "./i18n-context"
import { stats } from "@/lib/vaish"
import { SectionAtmosphere } from "./section-atmosphere"

/**
 * A dedicated "What is VAISH" section that explains the portfolio project
 * itself. Sits between Hero and Operator (Manifesto). Mirrors the astro-HUD
 * visual language of the rest of the site and is fully translated.
 */
export function AboutVaish() {
  const ref = useRef<HTMLElement>(null)
  const t = useT()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const diagramRotate = useTransform(scrollYProgress, [0, 1], [-6, 6])
  const diagramY = useTransform(scrollYProgress, [0, 1], [40, -40])

  const principles = [
    { k: "I", title: t("vaish.principle1Title"), body: t("vaish.principle1") },
    { k: "II", title: t("vaish.principle2Title"), body: t("vaish.principle2") },
    { k: "III", title: t("vaish.principle3Title"), body: t("vaish.principle3") },
  ]

  return (
    <section
      ref={ref}
      id="about-vaish"
      className="contain-section relative overflow-hidden bg-background py-28 md:py-40"
    >
      {/* Premium ambient atmosphere :: drifting nebulae, scan ribbon, runes */}
      <SectionAtmosphere variant="dossier" runeCorner="tl" />

      {/* Ambient backdrop layers */}
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.18] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[12%] h-[55%]"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 80% 20%, oklch(0.74 0.15 52 / 0.12), transparent 65%)",
        }}
      />
      {/* Tiny starfield of HUD dots */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-[3px] w-[3px] rounded-full bg-primary/60 animate-pulse-soft"
            style={{
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
              animationDelay: `${(i * 0.17) % 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto grid max-w-[1600px] grid-cols-12 gap-6 px-5 md:gap-10 md:px-10">
        {/* Kicker */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="col-span-12 flex items-center gap-3 md:col-span-3"
        >
          <span className="block h-px w-8 bg-foreground/30" />
          <span className="font-hud text-foreground/70">{t("vaish.kicker")}</span>
        </motion.div>

        {/* Heading + body */}
        <div className="col-span-12 md:col-span-9">
          <h2 className="display-lg text-[clamp(40px,7vw,120px)] leading-[0.96] text-balance">
            {t("vaish.title")}{" "}
            <span className="italic-serif text-primary">{t("vaish.titleAccent")}</span>
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="mt-8 max-w-[640px] italic-serif text-xl leading-snug text-foreground/80 md:text-2xl"
          >
            {t("vaish.body")}
          </motion.p>
        </div>

        {/* Principle cards + diagram */}
        <div className="col-span-12 mt-10 grid grid-cols-12 gap-6 md:mt-16">
          {/* Diagram plate on the right, principles on the left */}
          <div className="col-span-12 flex flex-col gap-3 md:col-span-7 md:gap-4">
            {principles.map((p, i) => (
              <PrincipleCard key={p.k} index={i} k={p.k} title={p.title} body={p.body} progress={scrollYProgress} />
            ))}
          </div>

          <div className="col-span-12 md:col-span-5">
            <motion.div
              style={{ rotate: diagramRotate, y: diagramY }}
              className="relative mx-auto aspect-square w-[min(80vw,440px)]"
            >
              <VaishDiagram />
            </motion.div>

            {/* Metrics strip */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              className="mt-8"
            >
              <div className="mb-3 flex items-center justify-between font-hud text-foreground/70">
                <span>{t("vaish.metrics")}</span>
                <span className="h-px flex-1 mx-3 bg-foreground/10" />
                <span className="text-primary">04 // 04</span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.7, delay: 0.1 + i * 0.08 }}
                    className="frame-corners relative bg-background/40 p-4"
                  >
                    <div className="corner-tl" />
                    <div className="corner-br" />
                    <div className="font-display text-4xl leading-none tabular-nums">{s.value}</div>
                    <div className="mt-2 font-hud text-foreground/70">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PrincipleCard({
  index,
  k,
  title,
  body,
  progress,
}: {
  index: number
  k: string
  title: string
  body: string
  progress: MotionValue<number>
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(50)
  const my = useMotionValue(50)
  const sx = useSpring(mx, { stiffness: 180, damping: 22 })
  const sy = useSpring(my, { stiffness: 180, damping: 22 })
  const spot = useTransform(
    [sx, sy],
    ([x, y]) => `radial-gradient(220px 160px at ${x}% ${y}%, oklch(0.74 0.15 52 / 0.14), transparent 70%)`,
  )

  // A subtle parallax on the HUD chip driven by section scroll.
  const chipY = useTransform(progress, [0, 1], [-6, 6])

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.9, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={(e) => {
        const r = cardRef.current?.getBoundingClientRect()
        if (!r) return
        mx.set(((e.clientX - r.left) / r.width) * 100)
        my.set(((e.clientY - r.top) / r.height) * 100)
      }}
      className="group relative flex items-start gap-5 overflow-hidden border border-foreground/10 bg-background/40 p-5 md:gap-7 md:p-7"
    >
      <span aria-hidden className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t border-l border-primary/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-primary/60" />
      <motion.span
        aria-hidden
        style={{ background: spot }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <motion.div style={{ y: chipY }} className="relative flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, delay: index * 0.12 + 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display italic-serif text-5xl leading-none text-primary md:text-6xl"
        >
          {k}
        </motion.span>
        <motion.span
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, delay: index * 0.12 + 0.35 }}
          style={{ originY: 0 }}
          className="mt-2 block h-6 w-px bg-primary/50"
        />
      </motion.div>

      <div className="relative z-10 flex flex-col gap-2">
        <h3 className="font-display text-[22px] leading-tight text-foreground md:text-[26px]">
          {title}
        </h3>
        <p className="max-w-[560px] text-[14px] leading-relaxed text-foreground/70 md:text-[15px]">
          {body}
        </p>
      </div>

      {/* Scan line that sweeps on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 h-px origin-left scale-x-0 bg-primary/60 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
      />
    </motion.div>
  )
}

/**
 * A purely SVG schematic of the VAISH sigil: three overlapping orbits, tick
 * marks, a glyph ring, and the V mark at center. Fully animated.
 */
function VaishDiagram() {
  return (
    <div className="relative h-full w-full">
      {/* Outer hairline plate */}
      <div className="absolute inset-0 frame-hairline" />
      <div className="absolute inset-6 frame-corners pointer-events-none">
        <div className="corner-tl" />
        <div className="corner-br" />
      </div>

      {/* Render a reference artifact faintly under the rings */}
      <Image
        src="/works/orbital.jpg"
        alt=""
        fill
        sizes="440px"
        className="object-cover opacity-30 [mask-image:radial-gradient(ellipse_55%_55%_at_50%_50%,black,transparent_75%)]"
        placeholder="blur"
        blurDataURL={SHIMMER}
      />

      {/* Outer rotating tick ring */}
      <div className="absolute inset-0 animate-rotate-slow">
        <svg viewBox="0 0 240 240" className="h-full w-full text-foreground/40">
          <circle cx="120" cy="120" r="115" fill="none" stroke="currentColor" strokeOpacity="0.5" />
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * Math.PI * 2
            const x1 = 120 + Math.cos(a) * 107
            const y1 = 120 + Math.sin(a) * 107
            const x2 = 120 + Math.cos(a) * 115
            const y2 = 120 + Math.sin(a) * 115
            const thick = i % 5 === 0
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeOpacity={thick ? 0.9 : 0.35}
                strokeWidth={thick ? 1.5 : 0.8}
              />
            )
          })}
        </svg>
      </div>

      {/* Counter-rotating dashed mid ring */}
      <div
        className="absolute inset-10 animate-rotate-slow"
        style={{ animationDirection: "reverse", animationDuration: "70s" }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full text-foreground/50">
          <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeDasharray="3 6" />
          <circle cx="100" cy="100" r="68" fill="none" stroke="currentColor" strokeOpacity="0.7" />
        </svg>
      </div>

      {/* Inner hexagon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.svg
          viewBox="0 0 200 200"
          className="h-full w-full text-foreground/65"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
        >
          <polygon points="100,48 140,72 140,128 100,152 60,128 60,72" fill="none" stroke="currentColor" strokeWidth="1.25" />
          <polygon points="100,64 128,80 128,120 100,136 72,120 72,80" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
        </motion.svg>
      </div>

      {/* Radiating primary strokes */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full text-primary/80 animate-pulse-soft">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          const x1 = 100 + Math.cos(a) * 54
          const y1 = 100 + Math.sin(a) * 54
          const x2 = 100 + Math.cos(a) * 78
          const y2 = 100 + Math.sin(a) * 78
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="1.1"
              opacity="0.8"
            />
          )
        })}
      </svg>

      {/* Core with V */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/90"
          style={{
            boxShadow:
              "0 0 80px 14px oklch(0.74 0.15 52 / 0.45), inset 0 0 22px oklch(0.74 0.15 52 / 0.6)",
          }}
        >
          <span className="font-wordmark-tight text-4xl font-bold text-primary-foreground" style={{ letterSpacing: "-0.02em" }}>
            V
          </span>
        </motion.span>
      </div>

      {/* HUD caption */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between font-hud text-foreground/70">
        <span>VSH // SCHEMATIC</span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
          PRIMED
        </span>
      </div>
    </div>
  )
}
