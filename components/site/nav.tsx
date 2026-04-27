"use client"

import Link from "next/link"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { navItems } from "@/lib/vaish"
import { cn } from "@/lib/utils"
import { useT } from "./i18n-context"

/** Geometry of the active rail item, used to position a single shared plate. */
type RailRect = { left: number; width: number; height: number; top: number }

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState("00:00:00")
  const [activeHash, setActiveHash] = useState<string>("#index")
  const t = useT()

  // Rail geometry :: a single absolutely positioned plate animates between
  // measured link rects. This is more reliable than `layoutId` across
  // conditionally rendered nodes.
  const railRef = useRef<HTMLDivElement | null>(null)
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [rect, setRect] = useState<RailRect | null>(null)

  const measure = () => {
    const rail = railRef.current
    if (!rail) return
    const idx = navItems.findIndex((n) => n.href === activeHash)
    const link = linkRefs.current[idx]
    if (!link) return
    const railBox = rail.getBoundingClientRect()
    const linkBox = link.getBoundingClientRect()
    setRect({
      left: linkBox.left - railBox.left,
      top: linkBox.top - railBox.top,
      width: linkBox.width,
      height: linkBox.height,
    })
  }

  // Re-measure whenever the active section changes or the viewport resizes.
  useLayoutEffect(() => {
    measure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHash])

  useEffect(() => {
    const onResize = () => measure()
    window.addEventListener("resize", onResize)
    // Fonts shift the rail width slightly when they finish loading; re-run.
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      ;(document as any).fonts.ready.then(() => measure())
    }
    return () => window.removeEventListener("resize", onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const fmt = () => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, "0")
      setTime(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    fmt()
    const id = setInterval(fmt, 1000)
    return () => clearInterval(id)
  }, [])

  // Reliable active-section tracker. Pick the section whose top has crossed
  // a probe line at ~32% of the viewport height. This is more dependable
  // than IntersectionObserver thresholds when sections sit inside reveal
  // wrappers that mutate transforms during entrance animations.
  useEffect(() => {
    const ids = navItems.map((n) => n.href.slice(1))
    let raf = 0

    const update = () => {
      raf = 0
      const probe = window.innerHeight * 0.32
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top - probe <= 0) current = id
      }
      setActiveHash(`#${current}`)
    }

    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background,backdrop-filter] duration-500",
          scrolled ? "bg-background/55 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-5 md:px-10 md:py-6">
          <Link
            href="#index"
            aria-label="Vaish"
            data-cursor="hover"
            data-cursor-label="Top"
            className="group relative flex items-center gap-3"
          >
            {/* Rotating sigil glyph :: same family as the rune dividers, miniaturised */}
            <span className="relative inline-flex h-7 w-7 items-center justify-center">
              {/* Outer dotted ring, slow rotation */}
              <motion.svg
                viewBox="0 0 100 100"
                className="absolute inset-0 text-foreground/70 transition-colors duration-500 group-hover:text-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              >
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.4" />
                {Array.from({ length: 12 }).map((_, i) => {
                  const a = (i / 12) * Math.PI * 2
                  const x1 = 50 + Math.cos(a) * 40
                  const y1 = 50 + Math.sin(a) * 40
                  const x2 = 50 + Math.cos(a) * 46
                  const y2 = 50 + Math.sin(a) * 46
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="currentColor"
                      strokeOpacity={i % 3 === 0 ? 0.95 : 0.45}
                      strokeWidth={i % 3 === 0 ? 1.4 : 1}
                    />
                  )
                })}
              </motion.svg>
              {/* Inner counter-rotating hex */}
              <motion.svg
                viewBox="0 0 100 100"
                className="absolute inset-1 text-primary/85"
                animate={{ rotate: -360 }}
                transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
              >
                <polygon
                  points="50,16 84,34 84,66 50,84 16,66 16,34"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </motion.svg>
              {/* Pulsing copper core */}
              <span className="relative h-1.5 w-1.5 rounded-full bg-primary">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: "0 0 14px 3px oklch(0.74 0.15 52 / 0.7)" }}
                />
              </span>
            </span>

            {/* Per-letter wordmark with hover sheen + draw-in copper underline */}
            <span className="relative flex items-baseline">
              {/* Bracket framing :: copper, fades in on hover */}
              <span
                aria-hidden
                className="font-hud mr-1 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              >
                [
              </span>

              <span className="font-wordmark-tight relative flex items-baseline text-[22px] font-semibold leading-none text-foreground">
                {"VAISH".split("").map((l, i) => (
                  <motion.span
                    key={i}
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.7,
                      delay: 0.3 + i * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block tabular-nums"
                    style={{
                      letterSpacing: "-0.02em",
                      // V wants its A nudged in
                      marginRight: l === "V" ? "-0.05em" : "0",
                    }}
                  >
                    {l}
                  </motion.span>
                ))}

                {/* Hover sheen sweeping left to right */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/85 to-transparent bg-clip-text text-transparent opacity-0 transition-[transform,opacity] duration-700 group-hover:translate-x-full group-hover:opacity-30"
                  style={{ WebkitTextFillColor: "transparent" }}
                >
                  VAISH
                </span>

                {/* Draw-in copper underline */}
                <span
                  aria-hidden
                  className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-primary transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-x-100"
                />
              </span>

              <span
                aria-hidden
                className="font-hud ml-1 text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              >
                ]
              </span>
            </span>

            {/* HUD meta column :: fades elegantly between "by Aryaman" and a build code */}
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="font-hud text-foreground/60">
                {t("nav.byArya")}
              </span>
              <span
                className={cn(
                  "font-hud tabular-nums transition-colors duration-500",
                  scrolled ? "text-primary" : "text-foreground/35",
                )}
              >
                BUILD 000.23 / {activeHash.replace("#", "").toUpperCase()}
              </span>
            </span>
          </Link>

          {/* Desktop nav rail :: a horizontal HUD with a single SHARED plate
              that animates between measured link rects whenever the active
              section changes. This sidesteps the unreliability of conditional
              `layoutId` and works regardless of mount/unmount order. */}
          <nav className="pointer-events-auto hidden items-center gap-1 md:flex">
            <div ref={railRef} className="relative flex items-stretch gap-1 px-1.5 py-1">
              {/* HUD frame around the entire rail */}
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[2px] border border-foreground/[0.06]" />
              <span aria-hidden className="pointer-events-none absolute -top-px left-3 h-px w-6 bg-primary/55" />
              <span aria-hidden className="pointer-events-none absolute -bottom-px right-3 h-px w-6 bg-primary/55" />

              {/* The single tracked plate :: animates left/top/width/height */}
              {rect && (
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={{
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                  }}
                  transition={{ type: "spring", stiffness: 480, damping: 42, mass: 0.7 }}
                  className="pointer-events-none absolute z-0 rounded-[2px] bg-primary/[0.10] outline outline-1 outline-primary/55"
                >
                  {/* Corner brackets that mark the active item */}
                  <span className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-primary" />
                  <span className="absolute right-0 top-0 h-1.5 w-1.5 border-r border-t border-primary" />
                  <span className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b border-l border-primary" />
                  <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-primary" />
                  {/* Subtle scan-line that sweeps inside the plate */}
                  <motion.span
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    aria-hidden
                  >
                    <motion.span
                      className="absolute inset-y-0 -left-1/2 w-1/2"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, oklch(0.74 0.15 52 / 0.35), transparent)",
                      }}
                      animate={{ x: ["0%", "300%"] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.span>
                </motion.span>
              )}

              {navItems.map((item, i) => {
                const isActive = activeHash === item.href
                const labelText = t(item.labelKey)
                return (
                  <Link
                    key={item.href}
                    ref={(el) => {
                      linkRefs.current[i] = el
                    }}
                    href={item.href}
                    data-cursor="hover"
                    aria-current={isActive ? "page" : undefined}
                    className="group relative flex items-center gap-1.5 px-2.5 py-1.5"
                  >
                    {/* Leading code chip */}
                    <span
                      className={cn(
                        "font-hud relative z-10 tabular-nums transition-colors duration-300",
                        isActive ? "text-primary" : "text-foreground/40 group-hover:text-foreground/70",
                      )}
                    >
                      {item.code}
                    </span>

                    <span
                      className={cn(
                        "font-hud relative z-10 transition-colors duration-300",
                        isActive
                          ? "text-foreground"
                          : "text-foreground/70 group-hover:text-foreground/90",
                      )}
                    >
                      {labelText}
                    </span>

                    {/* Hover underline only when not active */}
                    {!isActive && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-2.5 -bottom-px h-px origin-left scale-x-0 bg-foreground/40 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-x-100"
                      />
                    )}

                    {/* Trailing pulse pip on active */}
                    {isActive && (
                      <span aria-hidden className="relative z-10 ml-0.5 inline-flex h-1.5 w-1.5">
                        <span className="absolute inset-0 animate-ping rounded-full bg-primary/55" />
                        <span className="relative inline-block h-full w-full rounded-full bg-primary" />
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Active section read-out :: lives between the rail and the clock,
              giving an unmistakable label of the current section. */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="font-hud text-foreground/35">SECTOR</span>
            <span className="relative inline-flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 rotate-45 bg-primary" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={activeHash}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="font-hud text-primary"
                >
                  {(navItems.find((n) => n.href === activeHash)?.code ?? "00") + " // " + (
                    t(navItems.find((n) => n.href === activeHash)?.labelKey ?? "nav.index").toUpperCase()
                  )}
                </motion.span>
              </AnimatePresence>
            </span>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="h-[6px] w-[6px] rounded-full bg-primary/70 animate-pulse-soft" />
            <span className="font-hud text-foreground/70 tabular-nums">{time}</span>
          </div>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            data-cursor="hover"
            data-cursor-label={open ? t("nav.close") : t("nav.menu")}
            aria-label="Toggle menu"
            className="relative flex h-9 w-9 items-center justify-center md:hidden"
          >
            <span className={cn("absolute block h-px w-5 bg-foreground transition-transform duration-300", open ? "rotate-45" : "-translate-y-1")} />
            <span className={cn("absolute block h-px w-5 bg-foreground transition-transform duration-300", open ? "-rotate-45" : "translate-y-1")} />
          </button>
        </div>
        <div className={cn("h-px w-full bg-foreground/10 transition-opacity duration-500", scrolled ? "opacity-100" : "opacity-0")} />
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-30 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-full flex-col px-6 pt-24 pb-10">
              <nav className="flex flex-1 flex-col gap-1">
                {navItems.map((item, i) => {
                  const isActive = activeHash === item.href
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="relative flex items-center justify-between border-b border-foreground/10 py-4"
                      >
                        {/* Active marker :: copper diamond + a vertical bar */}
                        {isActive && (
                          <span aria-hidden className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-2">
                            <span className="block h-7 w-[2px] bg-primary" />
                            <span className="block h-1.5 w-1.5 rotate-45 bg-primary" />
                          </span>
                        )}
                        <span
                          className={cn(
                            "font-wordmark-tight text-4xl font-semibold transition-colors",
                            isActive ? "pl-7 text-foreground" : "text-foreground/85",
                          )}
                        >
                          {t(item.labelKey)}
                        </span>
                        <span
                          className={cn(
                            "font-hud transition-colors",
                            isActive ? "text-primary" : "text-foreground/70",
                          )}
                        >
                          {item.code}
                        </span>
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>
              <div className="font-hud flex items-center justify-between text-foreground/70">
                <span>Vaish // {t("brand.tagline")}</span>
                <span>{time}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
