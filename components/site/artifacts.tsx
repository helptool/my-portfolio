"use client"

import { motion, useMotionValue, useSpring } from "framer-motion"
import { useRef } from "react"
import { artifacts } from "@/lib/vaish"
import { useT } from "./i18n-context"
import { SectionAtmosphere } from "./section-atmosphere"

export function Artifacts() {
  const t = useT()
  return (
    <section id="artifacts" className="relative overflow-hidden bg-background py-28 md:py-40">
      {/* Premium ambient atmosphere :: floating embers above the vault grid */}
      <SectionAtmosphere variant="embers" />

      <div className="pointer-events-none absolute inset-0 grid-lines opacity-15 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]" />

      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
        <div className="grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 flex items-center gap-3 md:col-span-3">
            <span className="block h-px w-8 bg-foreground/30" />
            <span className="font-hud text-muted-foreground">{t("artifacts.kicker")}</span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="display-lg text-[clamp(44px,7.5vw,120px)]">
              {t("artifacts.title")} <span className="italic-serif text-primary">{t("artifacts.titleAccent")}</span> {t("artifacts.titleAfter")}
            </h2>
            <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">
              {t("artifacts.intro")}
            </p>
          </div>
        </div>

        {/* Explicit row height on desktop :: previously `auto-rows-[minmax(0,1fr)]`
            with mismatched inner aspect-ratios produced an orphan cell because
            the row baseline depended on whichever card had the tallest content.
            Pinning rows to a clamp viewport unit + giving inner cards `h-full`
            keeps every row identical so the bento always tiles cleanly. */}
        <div className="mt-20 grid grid-cols-6 auto-rows-[minmax(0,1fr)] gap-4 md:grid-cols-12 md:auto-rows-[clamp(180px,18vw,260px)] md:gap-6">
          {artifacts.map((a, i) => (
            <ArtifactCard key={a.id} artifact={a} index={i} t={t} />
          ))}
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-foreground/10 pt-6 font-hud text-muted-foreground">
          <span>{t("artifacts.vault")}</span>
          <span className="flex items-center gap-2">
            <span className="h-[6px] w-[6px] rounded-full bg-primary animate-pulse-soft" />
            {t("artifacts.openRegistry")}
          </span>
        </div>
      </div>
    </section>
  )
}

function ArtifactCard({
  artifact,
  index,
  t,
}: {
  artifact: (typeof artifacts)[number]
  index: number
  t: (k: string) => string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(mx, { stiffness: 220, damping: 18 })
  const ry = useSpring(my, { stiffness: 220, damping: 18 })
  const lift = useMotionValue(0)
  const slift = useSpring(lift, { stiffness: 220, damping: 22 })

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    mx.set(px * 12)
    my.set(py * 12)
    lift.set(-8)
  }
  const onLeave = () => {
    mx.set(0)
    my.set(0)
    lift.set(0)
  }

  // Bento layout :: every row sums to 12 so there are no orphan gaps.
  //   Row 1 :: a1 (6×2 tall left) + a2 (3) + a3 (3)               = 12
  //   Row 2 :: a1 cont          + a4 (3) + a5 (3)                  = 12
  //   Row 3 :: a6 (12 full bottom)                                 = 12
  const spans = [
    "md:col-span-6 md:row-span-2", // tall left
    "md:col-span-3 md:row-span-1",
    "md:col-span-3 md:row-span-1",
    "md:col-span-3 md:row-span-1",
    "md:col-span-3 md:row-span-1",
    "md:col-span-12 md:row-span-1",
  ]

  // Inner aspects only apply on mobile (single-column stack). On desktop
  // the cell shape is dictated by the grid + auto-rows so we pin the
  // inner box to h-full to avoid the row-height drift that produced the
  // empty cell in the previous bento.
  const aspects = ["aspect-[4/5]", "aspect-square", "aspect-square", "aspect-square", "aspect-square", "aspect-[3/1]"]

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.9, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ x: rx, y: slift }}
      className={`group relative col-span-6 row-span-1 ${spans[index] ?? "md:col-span-4"}`}
      data-cursor="view"
      data-cursor-label={t("op.open")}
    >
      <motion.div
        style={{ y: ry }}
        className={`relative ${aspects[index] ?? "aspect-[4/5]"} w-full overflow-hidden border border-foreground/10 bg-[oklch(0.14_0.01_45)] md:aspect-auto md:h-full`}
      >
        <ArtifactGlyph letter={artifact.name.charAt(0)} index={index} />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="font-hud text-muted-foreground">
            {String(index + 1).padStart(2, "0")} / {String(artifacts.length).padStart(2, "0")}
          </span>
          <span className="font-hud text-primary">{artifact.era}</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
          <div>
            <span className="font-hud text-muted-foreground">{t(artifact.kindKey)}</span>
            <h3 className="mt-1 font-display text-xl text-foreground md:text-2xl">{artifact.name}</h3>
          </div>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-foreground/20 transition-[background,border] duration-500 group-hover:border-primary/70 group-hover:bg-primary/10">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </span>
        </div>

        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
          <span className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-sweep" />
        </span>
      </motion.div>
    </motion.div>
  )
}

function ArtifactGlyph({ letter, index }: { letter: string; index: number }) {
  // Use index to vary circle dash patterns
  const patterns = ["2 6", "1 4", "4 2", "6 2", "1 10", "3 3"]
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,oklch(0.22_0.02_50/0.85)_0%,oklch(0.11_0.008_40)_70%)]">
      <div className="relative">
        <svg viewBox="0 0 300 300" className="h-[70%] w-[70%] max-h-[420px] max-w-[420px] text-primary/35">
          <circle cx="150" cy="150" r="130" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle
            cx="150"
            cy="150"
            r="100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray={patterns[index % patterns.length]}
            className="animate-rotate-slow"
            style={{ transformOrigin: "150px 150px" }}
          />
          <circle cx="150" cy="150" r="70" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <line x1="150" y1="20" x2="150" y2="60" stroke="currentColor" strokeWidth="1" />
          <line x1="150" y1="240" x2="150" y2="280" stroke="currentColor" strokeWidth="1" />
          <line x1="20" y1="150" x2="60" y2="150" stroke="currentColor" strokeWidth="1" />
          <line x1="240" y1="150" x2="280" y2="150" stroke="currentColor" strokeWidth="1" />
        </svg>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-display italic-serif text-[120px] leading-none text-foreground/90 md:text-[160px]"
        >
          {letter}
        </span>
      </div>
    </div>
  )
}
