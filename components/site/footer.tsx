"use client"

import Image from "next/image"
import { SHIMMER } from "@/lib/shimmer"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { brand, navItems } from "@/lib/vaish"
import { cn } from "@/lib/utils"
import { useI18n } from "./i18n-context"
import { WordmarkCycle } from "./wordmark-cycle"
import { Magnetic } from "./magnetic"
import { useSound } from "./sound-context"

/**
 * Footer
 *
 * Architecture (two horizontal slabs, photo first, lockup last):
 *  - Slab A :: full-bleed photo of the active language's region.
 *              All footer content (studio, navigation, channels, language
 *              picker, bottom rail) sits on top with a legibility ladder
 *              (dark vignette + grain + copper bloom).
 *  - Slab B :: dark plain background, hosts the giant VAISH wordmark only.
 *              Lives at the very bottom of the document so the lockup is
 *              the page's final breath, never overlaid by the photograph.
 *
 *  Hovering or selecting a language tile cross-fades the photo across the
 *  whole upper slab, with a slow Ken-Burns drift, so the footer feels like
 *  a postcard from wherever the language lives.
 */
export function Footer() {
  const { meta: current, languages, setLang, t } = useI18n()
  const sound = useSound()
  const [hoverCode, setHoverCode] = useState<string | null>(null)
  const hoverMeta = hoverCode ? languages.find((l) => l.code === hoverCode) : null
  const activeMeta = hoverMeta ?? current

  // UTC clock for the bottom rail
  const [now, setNow] = useState("")
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const hh = String(d.getUTCHours()).padStart(2, "0")
      const mm = String(d.getUTCMinutes()).padStart(2, "0")
      setNow(`${hh}:${mm} UTC`)
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  const cols = [
    {
      title: t("footer.colJourney"),
      items: [
        { label: t("nav.about"), href: "#about-vaish" },
        { label: t("nav.works"), href: "#realms" },
        { label: t("nav.abilities"), href: "#classes" },
        { label: t("nav.chronicles"), href: "#codex" },
        { label: "Artifacts", href: "#artifacts" },
      ],
    },
    {
      title: t("footer.colSignal"),
      items: [
        { label: "Dispatches", href: "#" },
        { label: "Almanac", href: "#" },
        { label: "Guild", href: "#" },
        { label: "Press", href: "#" },
        { label: t("nav.contact"), href: "#enter" },
      ],
    },
    {
      title: t("footer.colLedger"),
      items: [
        { label: "Terms", href: "#" },
        { label: "Privacy", href: "#" },
        { label: "Open Source", href: "#" },
        { label: "Colophon", href: "#" },
        { label: "Credits", href: "#" },
      ],
    },
  ]

  // Inline social icon set :: real glyphs instead of two-letter pills.
  // Sized to the chip; stroke uses currentColor so hover-color works.
  const socials: { code: string; label: string; href: string; icon: JSX.Element }[] = [
    {
      code: "x",
      label: "X / Twitter",
      href: "https://x.com",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px]">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.97 6.817H1.677l7.73-8.835L1.252 2.25h6.83l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      code: "ig",
      label: "Instagram",
      href: "https://instagram.com",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[16px] w-[16px]">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.6" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      code: "yt",
      label: "YouTube",
      href: "https://youtube.com",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[16px] w-[16px]">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.376.55A3.016 3.016 0 0 0 .502 6.186 31.394 31.394 0 0 0 0 12a31.394 31.394 0 0 0 .502 5.814 3.016 3.016 0 0 0 2.122 2.136C4.495 20.5 12 20.5 12 20.5s7.505 0 9.376-.55a3.016 3.016 0 0 0 2.122-2.136A31.394 31.394 0 0 0 24 12a31.394 31.394 0 0 0-.502-5.814zM9.75 15.568V8.432L15.818 12 9.75 15.568z" />
        </svg>
      ),
    },
    {
      code: "rs",
      label: "Read.cv",
      href: "https://read.cv",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
          <path d="M5.5 3.5h9.2L19.5 8v12.5h-14z" />
          <path d="M14.5 3.5V8h5" />
          <path d="M8.5 12.5h7M8.5 16h5" />
        </svg>
      ),
    },
  ]

  return (
    <footer id="footer" className="relative isolate text-foreground">
      {/* === A :: Footer slab with language photo as full-bleed background = */}
      <div className="relative overflow-hidden">
        {/* Image stack :: each language gets its own absolutely positioned
            <Image>; we cross-fade by toggling opacity. Avoids re-decoding. */}
        <div aria-hidden className="absolute inset-0 -z-10">
          {languages.map((l) => {
            const isActive = l.code === activeMeta.code
            return (
              <motion.div
                key={l.code}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scale: isActive ? 1.04 : 1.0,
                }}
                transition={{
                  opacity: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                  scale: { duration: 14, ease: "linear" },
                }}
                className="absolute inset-0"
              >
                <Image
                  src={l.image}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={l.code === current.code}
                  className="object-cover object-center"
                  placeholder="blur"
                  blurDataURL={SHIMMER}
                />
              </motion.div>
            )
          })}

          {/* Legibility ladder ::
              1. global dark scrim
              2. soft fade into background at top + bottom
              3. copper bloom along left edge so the slab feels themed
              4. grain to match the rest of the site */}
          <div className="absolute inset-0 bg-background/55" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background/85 to-transparent" />
          <div
            className="absolute inset-y-0 left-0 w-1/3"
            style={{
              background:
                "radial-gradient(60% 80% at 0% 50%, oklch(0.74 0.15 52 / 0.18), transparent 70%)",
            }}
          />
          <div className="grain pointer-events-none absolute inset-0 opacity-[0.05]" />
        </div>

        {/* Foreground content */}
        <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-10 px-5 pt-20 pb-14 md:px-10 md:pt-28 md:pb-20">
          {/* Studio card */}
          <div className="col-span-12 md:col-span-4">
            <div className="flex items-center gap-3">
              <span className="h-[7px] w-[7px] rounded-full bg-primary animate-pulse-soft" />
              <span className="font-wordmark-tight text-xl text-foreground">{brand.name}</span>
            </div>
            <p className="mt-5 max-w-[420px] text-[15px] leading-relaxed text-foreground/85">
              {t("footer.tagline")}{" "}
              <span className="text-foreground">{brand.creator}</span>.
            </p>

            <div className="mt-8 flex items-center gap-3">
              {socials.map((s) => (
                <Magnetic key={s.code} strength={0.32}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    data-cursor="hover"
                    data-cursor-label={s.label}
                    onMouseEnter={() => sound.tick("soft")}
                    onClick={() => sound.tick("select")}
                    className="group relative flex h-10 w-10 items-center justify-center overflow-hidden border border-foreground/25 bg-background/30 text-foreground/85 backdrop-blur-sm transition-colors hover:border-primary hover:text-primary"
                  >
                    {s.icon}
                    {/* Tiny corner accent that lights up on hover */}
                    <span aria-hidden className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-primary/0 transition-colors duration-300 group-hover:border-primary" />
                    <span aria-hidden className="absolute right-0 bottom-0 h-1.5 w-1.5 border-r border-b border-primary/0 transition-colors duration-300 group-hover:border-primary" />
                    {/* Sheen on hover */}
                    <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  </a>
                </Magnetic>
              ))}
            </div>

            {/* Language picker (no preview plate :: footer IS the preview) */}
            <div className="mt-10">
              <div className="font-hud text-foreground/60 mb-3 flex items-center gap-2">
                <span>{t("footer.lang")}</span>
                <span className="h-px flex-1 bg-foreground/15" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activeMeta.code}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="text-foreground"
                  >
                    {activeMeta.region}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* The list itself is a labelled radiogroup so a screen
                  reader announces "Language, group, 5 buttons" before
                  reading each option. Per-button `aria-label` reads
                  the human language name (e.g. "Switch language to
                  Français") instead of the cryptic two-letter code
                  the visible label shows. `aria-pressed` keeps state
                  visible to AT alongside the visual active dot. */}
              <ul
                role="group"
                aria-label={t("footer.lang")}
                className="flex flex-wrap gap-1.5"
              >
                {languages.map((l) => {
                  const isActive = l.code === current.code
                  return (
                    <li key={l.code}>
                      <button
                        type="button"
                        onClick={() => setLang(l.code)}
                        onMouseEnter={() => setHoverCode(l.code)}
                        onMouseLeave={() => setHoverCode(null)}
                        onFocus={() => setHoverCode(l.code)}
                        onBlur={() => setHoverCode(null)}
                        data-cursor="hover"
                        data-cursor-label={l.label}
                        aria-pressed={isActive}
                        aria-label={`Switch language to ${l.label}`}
                        className={cn(
                          "group relative overflow-hidden border bg-background/40 backdrop-blur-sm px-3 py-2 transition-colors",
                          isActive
                            ? "border-primary text-foreground"
                            : "border-foreground/20 text-foreground/80 hover:border-primary/60 hover:text-foreground hover:bg-background/55",
                        )}
                      >
                        <span className="block font-hud text-[11px] leading-none">{l.code.toUpperCase()}</span>
                        <span className="mt-1 block text-[12px] leading-none">{l.native}</span>
                        {isActive && (
                          <motion.span
                            layoutId="lang-active-dot"
                            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-3 flex items-center gap-3 font-hud text-foreground/60">
                <span className="inline-block h-1 w-1 bg-primary animate-pulse-soft" />
                <span className="italic-serif text-foreground/85 text-[15px]">{activeMeta.greeting}</span>
              </div>
            </div>
          </div>

          {/* Three columns */}
          {cols.map((col) => (
            <div key={col.title} className="col-span-6 md:col-span-2">
              <span className="font-hud text-primary">{col.title}</span>
              <ul className="mt-6 flex flex-col gap-3">
                {col.items.map((it) => (
                  <li key={it.label}>
                    <Link
                      href={it.href}
                      data-cursor="hover"
                      className="group inline-flex items-center gap-2 text-[14px] text-foreground/85 transition-colors hover:text-foreground"
                    >
                      <span className="h-px w-0 bg-primary transition-[width] duration-500 group-hover:w-4" />
                      <span className="relative">
                        {it.label}
                        <span className="absolute -bottom-px left-0 h-px w-0 bg-primary transition-[width] duration-500 group-hover:w-full" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Channel block, fills remaining 2 cols on desktop */}
          <div className="col-span-12 md:col-span-2">
            <span className="font-hud text-primary">{t("footer.colSignal")}</span>
            <ul className="mt-6 flex flex-col gap-3 text-[14px]">
              <li>
                <a
                  href="mailto:hello@vaish.studio"
                  data-cursor="hover"
                  className="group inline-flex items-baseline gap-3 text-foreground/85 hover:text-foreground"
                >
                  <span className="font-hud text-foreground/70">01</span>
                  <span className="relative">
                    hello@vaish.studio
                    <span className="absolute -bottom-px left-0 h-px w-0 bg-primary transition-[width] duration-500 group-hover:w-full" />
                  </span>
                </a>
              </li>
              <li>
                <Link
                  href="#enter"
                  data-cursor="hover"
                  className="group inline-flex items-baseline gap-3 text-foreground/85 hover:text-foreground"
                >
                  <span className="font-hud text-foreground/70">02</span>
                  <span className="relative">
                    {t("nav.contact")}
                    <span className="absolute -bottom-px left-0 h-px w-0 bg-primary transition-[width] duration-500 group-hover:w-full" />
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom rail of the photo slab */}
        <div className="relative mx-auto flex flex-col items-start gap-3 border-t border-foreground/15 px-5 py-6 font-hud text-foreground/65 md:flex-row md:items-center md:justify-between md:px-10">
          <nav className="hidden items-center gap-5 md:flex">
            {navItems.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-cursor="hover"
                className="transition-colors hover:text-foreground"
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
          <span className="flex items-center gap-2">
            <span>{t("footer.byAryaman")}</span>
            <Link
              href="#about-vaish"
              data-cursor="hover"
              className="text-foreground transition-colors hover:text-primary"
            >
              {brand.creator}
            </Link>
          </span>
        </div>
      </div>

      {/* === B :: VAISH wordmark on plain background, BELOW the footer body
              Now driven by the looping 4-stage VFX cycle component. */}
      <div className="relative overflow-hidden bg-background pt-16 pb-10 md:pt-24 md:pb-14">
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.04]" />

        {/* Animated wordmark with looping VFX */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <WordmarkCycle />
        </motion.div>

        <div className="mx-auto mt-8 flex max-w-[1600px] items-center justify-between px-5 font-hud text-foreground/45 md:px-10">
          <span>EST. UNTOLD // BUILD 000.23</span>
          <span>{now}</span>
          <span>{t("footer.silence")}</span>
        </div>
      </div>
    </footer>
  )
}
