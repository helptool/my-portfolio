"use client"

import Image from "next/image"
import { SHIMMER } from "@/lib/shimmer"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { classes, realms } from "@/lib/vaish"
import { cn } from "@/lib/utils"
import { useT } from "./i18n-context"
import { SectionAtmosphere } from "./section-atmosphere"

const realmByName = new Map(realms.map((r) => [r.name, r]))

/* ---------------------------------------------------------------------------
 * Discipline iconography
 *
 * Three custom glyphs that each *visually* encode the discipline they
 * represent. Icons all live on the same square viewBox so they can be
 * dropped into the discipline cards interchangeably.
 *  - Builder      :: hex grid + foundation bar  (engineering scaffold)
 *  - Seer         :: triangle eye + crosshair   (visual direction)
 *  - Nightstalker :: arc + dotted bezier        (motion curve)
 * ------------------------------------------------------------------------- */
const disciplineIcons: Record<string, JSX.Element> = {
  warden: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="32,8 52,20 52,44 32,56 12,44 12,20" />
      <polygon points="32,18 44,25 44,39 32,46 20,39 20,25" />
      <line x1="20" y1="25" x2="44" y2="39" />
      <line x1="44" y1="25" x2="20" y2="39" />
      <line x1="8" y1="58" x2="56" y2="58" />
      <line x1="14" y1="62" x2="50" y2="62" strokeOpacity="0.5" />
    </svg>
  ),
  seer: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="32,8 56,52 8,52" />
      <circle cx="32" cy="38" r="8" />
      <circle cx="32" cy="38" r="2.5" fill="currentColor" stroke="none" />
      <line x1="32" y1="22" x2="32" y2="30" />
      <line x1="32" y1="46" x2="32" y2="54" />
      <line x1="22" y1="38" x2="14" y2="38" />
      <line x1="42" y1="38" x2="50" y2="38" />
    </svg>
  ),
  nightstalker: (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 48 C 20 12, 44 12, 56 48" />
      <circle cx="8" cy="48" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="56" cy="48" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="32" cy="22" r="3" />
      <line x1="32" y1="14" x2="32" y2="6" strokeOpacity="0.6" />
      <line x1="20" y1="56" x2="44" y2="56" strokeDasharray="2 3" />
    </svg>
  ),
}

export function Classes() {
  const t = useT()
  // Active discipline index. Click cards to switch; default is 0 (Builder).
  const [active, setActive] = useState<number>(0)
  const current = classes[active]

  return (
    <section id="classes" className="contain-section relative overflow-hidden bg-background py-28 md:py-40">
      {/* Premium ambient atmosphere :: drifting copper grid + nebulae */}
      <SectionAtmosphere variant="lattice" />

      {/* Section ambience */}
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-20 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />

      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
        {/* ---- Header */}
        <div className="grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 flex items-center gap-3 md:col-span-3">
            <span className="block h-px w-8 bg-foreground/30" />
            <span className="font-hud text-foreground/70">{t("classes.kicker")}</span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="font-wordmark-tight text-[clamp(44px,7.5vw,120px)] font-semibold leading-[0.95]">
              {t("classes.title")}{" "}
              <span className="italic-serif font-display font-normal text-primary">
                {t("classes.titleAccent")}
              </span>
            </h2>
            <p className="mt-5 max-w-[640px] text-[15px] leading-relaxed text-foreground/65">
              {t("classes.intro")}
            </p>
          </div>
        </div>

        {/* ---- DISCIPLINE TRIPTYCH ::
            Three cards. Each one is a complete signal: number, custom icon,
            class name, role label, kicker line. Click to focus. The focused
            card glows copper and feeds the detail panel below. */}
        <div className="mt-14 md:mt-20">
          <div className="mb-5 flex items-center justify-between font-hud text-foreground/45">
            <span className="flex items-center gap-2">
              <span className="inline-block h-1 w-1 rotate-45 bg-primary" />
              {t("classes.kicker")} // 03 DISCIPLINES
            </span>
            <span>{t("classes.tapHint")}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {classes.map((c, i) => {
              const isActive = i === active
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(i)}
                  data-cursor="view"
                  data-cursor-label={t(c.roleKey)}
                  aria-pressed={isActive}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "group relative flex flex-col gap-5 overflow-hidden border p-6 text-left transition-colors duration-500 md:p-7",
                    isActive
                      ? "border-primary/65 bg-primary/[0.05]"
                      : "border-foreground/12 bg-background/60 hover:border-foreground/30",
                  )}
                >
                  {/* Corner brackets when active */}
                  {isActive && (
                    <>
                      <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l border-t border-primary" />
                      <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-r border-t border-primary" />
                      <span aria-hidden className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-primary" />
                      <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-primary" />
                    </>
                  )}

                  {/* Discipline number + role */}
                  <div className="flex items-baseline justify-between font-hud">
                    <span
                      className={cn(
                        "tabular-nums transition-colors",
                        isActive ? "text-primary" : "text-foreground/45",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")} / 03
                    </span>
                    <span
                      className={cn(
                        "transition-colors",
                        isActive ? "text-foreground" : "text-foreground/70",
                      )}
                    >
                      {t(c.roleKey).toUpperCase()}
                    </span>
                  </div>

                  {/* Icon + class name */}
                  <div className="flex items-start gap-4">
                    <span
                      className={cn(
                        "relative flex h-14 w-14 shrink-0 items-center justify-center transition-colors duration-500",
                        isActive ? "text-primary" : "text-foreground/70 group-hover:text-foreground/85",
                      )}
                    >
                      {/* Subtle rotating ring around the icon when active */}
                      {isActive && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-[-6px] rounded-full border border-primary/30"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                      <span className="block h-10 w-10">{disciplineIcons[c.id]}</span>
                    </span>
                    <div className="min-w-0">
                      <h3
                        className={cn(
                          "font-wordmark-tight text-[clamp(28px,3.4vw,44px)] font-semibold leading-[0.95] transition-colors",
                          isActive ? "text-foreground" : "text-foreground/85",
                        )}
                      >
                        {c.name}
                      </h3>
                      <p
                        className={cn(
                          "italic-serif mt-1.5 text-base leading-snug transition-colors",
                          isActive ? "text-foreground/85" : "text-foreground/70",
                        )}
                      >
                        {t(c.kickerKey)}
                      </p>
                    </div>
                  </div>

                  {/* Three top stats as compact bars :: a quick sense of
                      what this discipline DOES, without opening the panel. */}
                  <div className="mt-1 flex flex-col gap-2">
                    {c.stats.map((s) => (
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="font-hud min-w-[120px] text-foreground/70">{s.label}</span>
                        <div className="relative h-[2px] flex-1 overflow-hidden bg-foreground/10">
                          <motion.span
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: s.value / 100 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 + 0.04 * i }}
                            className={cn(
                              "absolute inset-y-0 left-0 w-full origin-left",
                              isActive ? "bg-primary" : "bg-foreground/55",
                            )}
                          />
                        </div>
                        <span className="font-hud tabular-nums text-foreground/85">{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer chip :: signals selectable / open */}
                  <div className="mt-2 flex items-center justify-between font-hud">
                    <span className={cn("transition-colors", isActive ? "text-primary" : "text-foreground/45")}>
                      {isActive ? t("classes.dossierOpen").toUpperCase() : t("classes.select").toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center border transition-all duration-500",
                        isActive ? "border-primary bg-primary text-primary-foreground" : "border-foreground/25 text-foreground/70",
                      )}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3 w-3">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>

                  {/* Sweep accent on hover (non-active) */}
                  {!isActive && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-primary transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* ---- DETAIL PANEL ::
            Photograph on the left, dossier on the right. Cross-fades when
            the active discipline changes. */}
        <div className="mt-12 grid grid-cols-12 gap-6 md:mt-20 md:gap-10">
          {/* Portrait */}
          <div className="col-span-12 md:col-span-5">
            <div className="relative aspect-[3/4] w-full overflow-hidden border border-foreground/10">
              {/* Frame ticks */}
              {["left-2 top-2", "right-2 top-2", "left-2 bottom-2", "right-2 bottom-2"].map((pos, idx) => (
                <div key={idx} className={`pointer-events-none absolute ${pos} z-20 h-3 w-3`}>
                  <span className={`absolute h-[2px] w-full bg-primary ${pos.includes("top") ? "top-0" : "bottom-0"} ${pos.includes("left") ? "left-0" : "right-0"}`} />
                  <span className={`absolute h-full w-[2px] bg-primary ${pos.includes("top") ? "top-0" : "bottom-0"} ${pos.includes("left") ? "left-0" : "right-0"}`} />
                </div>
              ))}

              <AnimatePresence mode="sync">
                {classes.map((c, i) =>
                  i === active ? (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 1.06 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={c.image}
                        alt={c.name}
                        fill
                        sizes="(min-width: 768px) 40vw, 100vw"
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={SHIMMER}
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,oklch(0.09_0.006_40/0.8)_100%)]" />
                    </motion.div>
                  ) : null,
                )}
              </AnimatePresence>

              {/* Top-left status */}
              <div className="pointer-events-none absolute left-4 top-4 z-30 flex items-center gap-2">
                <span className="h-[6px] w-[6px] rounded-full bg-primary animate-pulse-soft" />
                <span className="font-hud text-foreground">
                  {t("classes.slot")} {String(active + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Bottom overlay :: name + ordinal */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute inset-x-4 bottom-4 z-30 flex items-end justify-between gap-3"
                >
                  <div>
                    <span className="font-hud text-foreground/70">
                      {t(current.roleKey).toUpperCase()}
                    </span>
                    <p className="italic-serif mt-1 text-2xl leading-tight text-foreground md:text-3xl">
                      {t(current.kickerKey)}
                    </p>
                  </div>
                  <span className="font-wordmark-tight text-[68px] font-semibold leading-[0.9] text-primary md:text-[96px]">
                    {String(active + 1).padStart(2, "0")}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Dossier */}
          <div className="col-span-12 md:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-8"
              >
                {/* Title row */}
                <div className="flex items-center gap-4">
                  <span className="text-primary">
                    <span className="block h-12 w-12">{disciplineIcons[current.id]}</span>
                  </span>
                  <div>
                    <span className="font-hud text-foreground/70">
                      {t("classes.dossierOpen").toUpperCase()} //{" "}
                      {String(active + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-wordmark-tight text-[clamp(36px,5vw,68px)] font-semibold leading-[0.95]">
                      {current.name}
                    </h3>
                  </div>
                </div>

                {/* Brief */}
                <p className="max-w-[640px] text-[15px] leading-relaxed text-foreground/75">
                  {t(current.briefKey)}
                </p>

                {/* Toolkit */}
                <div className="flex flex-col gap-3">
                  <span className="font-hud text-foreground/70">
                    {t("classes.toolkit")} // {String(current.tools.length).padStart(2, "0")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {current.tools.map((tool, ti) => (
                      <motion.span
                        key={tool}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 * ti, ease: [0.22, 1, 0.36, 1] }}
                        className="inline-flex items-center gap-1.5 border border-foreground/15 bg-background/40 px-3 py-1.5 text-[12px] text-foreground/85"
                      >
                        <span className="inline-block h-1 w-1 rounded-full bg-primary/80" />
                        {tool}
                      </motion.span>
                    ))}
                  </div>
                </div>

                {/* Deployed-in :: linked realms */}
                <div className="flex flex-col gap-3">
                  <span className="font-hud text-foreground/70">
                    {t("classes.deployedIn")}
                  </span>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {current.projects.map((pname, pi) => {
                      const realm = realmByName.get(pname)
                      if (!realm) return null
                      return (
                        <motion.div
                          key={pname}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.55, delay: 0.1 + 0.07 * pi, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <Link
                            href="#realms"
                            data-cursor="view"
                            data-cursor-label={t("op.open")}
                            className="group/realm relative block overflow-hidden border border-foreground/10 bg-background/40"
                          >
                            <div className="relative aspect-[4/3] w-full overflow-hidden">
                              <Image
                                src={realm.image}
                                alt={realm.name}
                                fill
                                sizes="(min-width: 640px) 18vw, 90vw"
                                className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/realm:scale-110"
                                placeholder="blur"
                                blurDataURL={SHIMMER}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                              <span className="font-hud absolute left-3 top-3 text-foreground/75">
                                {realm.index}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2 border-t border-foreground/10 p-3">
                              <span className="font-wordmark-tight text-sm font-semibold text-foreground">
                                {realm.name}
                              </span>
                              <span className="font-hud truncate text-foreground/70">
                                {t(realm.kindKey)}
                              </span>
                            </div>
                            <span
                              aria-hidden
                              className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-primary transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/realm:scale-x-100"
                            />
                          </Link>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
