"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useCallback, useRef } from "react"
import { chapters } from "@/lib/vaish"
import { useT } from "./i18n-context"
import { SectionAtmosphere } from "./section-atmosphere"
import { useRunes } from "./runes-context"

export function Codex() {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.3"] })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  // Embers rune trigger :: every chronicle chapter scrolled into view at
  // least once. We use a Set ref + onViewportEnter callback per row so
  // re-views during a single session don't fire React state updates. The
  // rune unlocks once the set covers the full chapter list.
  const { addRune, hasRune } = useRunes()
  const seenRef = useRef<Set<number>>(new Set())
  const onChapterSeen = useCallback((index: number) => {
    if (hasRune("embers")) return
    seenRef.current.add(index)
    if (seenRef.current.size >= chapters.length) addRune("embers")
  }, [addRune, hasRune])

  return (
    <section id="codex" className="contain-section relative overflow-hidden bg-background py-28 md:py-40">
      {/* Premium ambient atmosphere :: distant rune disk + drifting nebulae */}
      <SectionAtmosphere variant="dossier" runeCorner="br" />

      <div className="pointer-events-none absolute inset-0 grid-lines opacity-15 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]" />

      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
        <div className="grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 flex items-center gap-3 md:col-span-3">
            <span className="block h-px w-8 bg-foreground/30" />
            <span className="font-hud text-muted-foreground">{t("codex.kicker")}</span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="display-lg text-[clamp(44px,7.5vw,120px)]">
              {t("codex.title")} <span className="italic-serif text-primary">{t("codex.titleAccent")}</span>
            </h2>
            <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">
              {t("codex.intro")}
            </p>
          </div>
        </div>

        <div ref={ref} className="relative mt-20 grid grid-cols-12 gap-6">
          {/* progress line */}
          <div className="pointer-events-none absolute left-[38px] top-0 hidden h-full w-px bg-foreground/10 md:block">
            <motion.span
              style={{ scaleY: lineScale }}
              className="absolute inset-0 origin-top bg-primary"
            />
          </div>

          <ul className="col-span-12 flex flex-col">
            {chapters.map((c, i) => (
              <ChapterRow key={c.num} data={c} index={i} t={t} onSeen={onChapterSeen} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function ChapterRow({
  data,
  index,
  t,
  onSeen,
}: {
  data: (typeof chapters)[number]
  index: number
  t: (k: string) => string
  onSeen: (i: number) => void
}) {
  const yearText = (data as any).yearKey ? t((data as any).yearKey) : data.year
  return (
    <motion.li
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => onSeen(index)}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.9, delay: 0.05 * index, ease: [0.22, 1, 0.36, 1] }}
      className="group relative grid grid-cols-12 gap-6 border-b border-foreground/10 py-10 first:border-t md:py-14"
    >
      <div className="col-span-12 flex items-center gap-6 md:col-span-4">
        <div className="relative hidden h-[78px] w-[78px] items-center justify-center border border-foreground/15 md:flex">
          <span className="font-display italic-serif text-primary text-4xl">{data.num}</span>
          <span className="pointer-events-none absolute -left-[4px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
        <div className="md:hidden">
          <span className="font-display italic-serif text-primary text-5xl">{data.num}</span>
        </div>
        <div className="flex flex-col">
          <span className="font-hud text-muted-foreground">{yearText}</span>
          <h3 className="mt-2 font-display text-3xl leading-tight text-foreground md:text-4xl">
            {t(data.titleKey)}
          </h3>
        </div>
      </div>

      <div className="col-span-12 flex flex-col gap-4 md:col-span-7 md:col-start-6">
        <p className="italic-serif text-xl text-foreground/85 md:text-2xl">{t(data.leadKey)}</p>
        <p className="max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">{t(data.bodyKey)}</p>
        <a
          href="#enter"
          data-cursor="hover"
          className="group/link mt-2 inline-flex items-center gap-2 self-start py-1 font-hud text-foreground/80"
        >
          <span className="relative">
            {t("codex.inscribe")}
            <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-foreground transition-transform duration-500 group-hover/link:scale-x-100" />
          </span>
          <span className="transition-transform duration-500 group-hover/link:translate-x-1">{"->"}</span>
        </a>
      </div>

      <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 font-display text-[12vw] leading-none text-foreground/[0.035] opacity-0 transition-opacity duration-700 group-hover:opacity-100 md:block hidden">
        {data.num}
      </span>
    </motion.li>
  )
}
