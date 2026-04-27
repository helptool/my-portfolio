"use client"

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import Image from "next/image"
import { SHIMMER } from "@/lib/shimmer"
import Link from "next/link"
import { useRef, useState, useTransition, type MouseEvent } from "react"
import { Magnetic } from "./magnetic"
import { useT } from "./i18n-context"
import { SectionAtmosphere } from "./section-atmosphere"
import { submitContact } from "@/app/actions/contact"

const ERROR_COPY: Record<string, string> = {
  invalid_email: "That doesn't look like a valid email.",
  missing_config: "Mailer not configured. Try the email link below.",
  send_failed: "Couldn't send right now. Try again or use the email link below.",
  rate_limited: "Too many sends from this address. Wait a minute and try again.",
}

export function FinalCTA() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const t = useT()

  return (
    <section id="enter" className="contain-section relative overflow-hidden bg-background py-28 md:py-40">
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/realms/hero-vista.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent_75%)]"
          placeholder="blur"
          blurDataURL={SHIMMER}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent,oklch(0.115_0.008_40)_75%)]" />

      {/* Premium ambient atmosphere :: floating embers across the closing room */}
      <SectionAtmosphere variant="embers" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-5 md:px-10">
        <div className="flex items-center gap-3">
          <span className="block h-px w-8 bg-foreground/30" />
          <span className="font-hud text-foreground/70">{t("contact.code")}</span>
        </div>

        <div className="mt-10 grid grid-cols-12 items-start gap-6 md:gap-10">
          <div className="col-span-12 md:col-span-8">
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="display-xl text-[clamp(52px,10vw,180px)]"
            >
              {t("contact.title1")} <span className="italic-serif text-primary">{t("contact.title2")}</span>
              <br />
              {t("contact.title3")} <span className="italic-serif">{t("contact.title4")}</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="mt-8 max-w-[520px] text-[15px] leading-relaxed text-foreground/65"
            >
              {t("contact.copy")}
            </motion.p>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="relative flex flex-col gap-6">
              <ContactArtifact />
              <div className="font-hud text-foreground/70">
                <div className="flex items-center justify-between border-b border-foreground/10 py-3">
                  <span>{t("contact.status")}</span>
                  <span className="flex items-center gap-2 text-foreground">
                    <span className="h-[6px] w-[6px] rounded-full bg-primary animate-pulse-soft" />
                    {t("contact.statusVal")}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-foreground/10 py-3">
                  <span>{t("contact.season")}</span>
                  <span className="text-foreground">{t("contact.seasonVal")}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span>{t("contact.response")}</span>
                  <span className="text-foreground">{t("contact.responseVal")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          onSubmit={(e) => {
            e.preventDefault()
            if (sent || isPending) return
            const value = email.trim()
            if (!value) return
            setError(null)
            startTransition(async () => {
              try {
                const res = await submitContact(value)
                if (res.ok) {
                  setSent(true)
                } else {
                  setError(ERROR_COPY[res.error] ?? "Something went wrong.")
                }
              } catch {
                setError(ERROR_COPY.send_failed)
              }
            })
          }}
          className="relative mt-20 flex max-w-[820px] flex-col items-stretch gap-3 border-b border-foreground/15 pb-5 md:flex-row md:items-end md:gap-6"
        >
          <div className="flex flex-1 flex-col gap-3">
            <label htmlFor="signal" className="font-hud text-foreground/70">
              {t("contact.signal")}
            </label>
            <input
              id="signal"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              disabled={sent || isPending}
              placeholder="you@studio.world"
              data-cursor="hover"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "signal-error" : undefined}
              className="w-full bg-transparent font-display text-3xl text-foreground placeholder:text-foreground/25 focus:outline-none md:text-5xl"
            />
            {error ? (
              <p id="signal-error" role="alert" className="font-hud text-[11px] text-red-400/90">
                {error}
              </p>
            ) : null}
          </div>
          <Magnetic strength={0.35}>
            {/* Outer wrapper hosts the ember-glow halo as a sibling of the
                button. The button itself uses overflow-hidden for the inner
                sweep, so the halo HAS to live outside it; using a named
                group/cta lets us drive halo opacity from the wrapper hover
                while the button keeps its own unnamed `group` for its
                child sweep + arrow nudge. */}
            <div className="group/cta relative inline-flex">
              {/* Ember-glow halo :: a soft outward radial behind the pill. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-3 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.74_0.15_52_/_0.55),transparent_70%)] opacity-0 blur-xl transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:opacity-100"
              />
              <button
                type="submit"
                disabled={sent || isPending}
                data-cursor="enter"
                data-cursor-label={sent ? t("contact.sent") : t("contact.send")}
                className="group relative inline-flex h-[64px] items-center gap-4 self-start rounded-full bg-primary pl-7 pr-3 text-primary-foreground transition-[opacity,box-shadow,filter] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-70 overflow-hidden hover:[box-shadow:0_0_0_1px_oklch(0.74_0.15_52_/_0.6),0_8px_32px_oklch(0.74_0.15_52_/_0.45),0_0_60px_oklch(0.74_0.15_52_/_0.35)] hover:[filter:saturate(1.15)]"
              >
                <span className="relative z-10 font-hud text-[11px]">
                  {sent ? t("contact.sentLong") : isPending ? "Sending…" : t("contact.sendLong")}
                </span>
                <span className="relative z-10 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-primary-foreground/15">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    {sent ? <path d="M5 12l5 5 10-12" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
                  </svg>
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-foreground/10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0"
                />
              </button>
            </div>
          </Magnetic>
        </motion.form>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 font-hud text-foreground/70">
          <a
            href="mailto:hello@vaish.studio"
            data-cursor="hover"
            className="link-reveal hover:text-foreground transition-colors"
          >
            hello@vaish.studio
          </a>
          <a href="#" data-cursor="hover" className="link-reveal hover:text-foreground transition-colors">
            Read.cv // @vaish
          </a>
          <a href="#" data-cursor="hover" className="link-reveal hover:text-foreground transition-colors">
            Book a 30-min call
          </a>
        </div>
      </div>
    </section>
  )
}

/**
 * A multi-layer animated sigil :: orbital rings, glyph ring, radiating shards,
 * pulsing core, mouse-parallax. Every layer is individually clickable and
 * routes to a different contact channel.
 */
function ContactArtifact() {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 100, damping: 14 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 100, damping: 14 })
  const tx = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 120, damping: 14 })
  const ty = useSpring(useTransform(my, [-0.5, 0.5], [-6, 6]), { stiffness: 120, damping: 14 })

  const [hover, setHover] = useState<"idle" | "outer" | "glyph" | "core">("idle")
  const [pressed, setPressed] = useState<null | "core" | "outer" | "glyph">(null)

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => {
    mx.set(0)
    my.set(0)
    setHover("idle")
  }

  const glyphRing = Array.from({ length: 12 })

  const tipKey =
    hover === "core" ? "portal.invoke" :
    hover === "glyph" ? "portal.mail" :
    hover === "outer" ? "portal.schedule" :
    "portal.default"

  function flashPress(which: "core" | "outer" | "glyph") {
    setPressed(which)
    setTimeout(() => setPressed(null), 320)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative mx-auto aspect-square w-full max-w-[340px]"
      style={{ perspective: 900 }}
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="absolute inset-0"
      >
        {/* Haze */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, oklch(0.74 0.15 52 / 0.35), transparent 65%)",
            filter: "blur(12px)",
          }}
        />

        {/* Outer rotating ring with tick marks :: clickable = schedule call */}
        <Link
          href="mailto:hello@vaish.studio?subject=Book%20a%2030-min%20call"
          data-cursor="hover"
          data-cursor-label={t("portal.schedule")}
          aria-label={t("portal.schedule")}
          onMouseEnter={() => setHover("outer")}
          onClick={() => flashPress("outer")}
          className={`group absolute inset-0 block animate-rotate-slow transition-[filter] duration-500 ${
            hover === "outer" ? "[filter:drop-shadow(0_0_24px_oklch(0.74_0.15_52_/_0.55))]" : ""
          }`}
        >
          <svg viewBox="0 0 240 240" className={`h-full w-full transition-colors duration-300 ${hover === "outer" ? "text-primary/90" : "text-foreground/30"}`}>
            <circle cx="120" cy="120" r="116" fill="none" stroke="currentColor" strokeWidth={hover === "outer" ? 1.4 : 1} />
            {Array.from({ length: 48 }).map((_, i) => {
              const a = (i / 48) * Math.PI * 2
              const x1 = 120 + Math.cos(a) * 108
              const y1 = 120 + Math.sin(a) * 108
              const x2 = 120 + Math.cos(a) * 116
              const y2 = 120 + Math.sin(a) * 116
              const thick = i % 4 === 0
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeOpacity={thick ? 0.8 : 0.35}
                  strokeWidth={thick ? 1.5 : 1}
                />
              )
            })}
          </svg>
          {pressed === "outer" && (
            <motion.span
              aria-hidden
              initial={{ scale: 0.7, opacity: 0.9 }}
              animate={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/60"
            />
          )}
        </Link>

        {/* Counter-rotating dashed ring */}
        <div
          className="absolute inset-6 animate-rotate-slow"
          style={{ animationDirection: "reverse", animationDuration: "80s" }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full text-foreground/45">
            <circle
              cx="100"
              cy="100"
              r="92"
              fill="none"
              stroke="currentColor"
              strokeDasharray="3 7"
            />
            <circle
              cx="100"
              cy="100"
              r="72"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.7"
            />
          </svg>
        </div>

        {/* Glyph ring :: clickable = compose mail */}
        <a
          href="mailto:hello@vaish.studio"
          data-cursor="hover"
          data-cursor-label={t("portal.mail")}
          aria-label={t("portal.mail")}
          onMouseEnter={() => setHover("glyph")}
          onClick={() => flashPress("glyph")}
          className={`group absolute inset-10 block animate-rotate-slow transition-[filter] duration-500 ${
            hover === "glyph" ? "[filter:drop-shadow(0_0_22px_oklch(0.74_0.15_52_/_0.5))]" : ""
          }`}
          style={{ animationDuration: "120s" }}
        >
          <div className="relative h-full w-full">
            {glyphRing.map((_, i) => {
              const angle = (i / glyphRing.length) * 360
              const ch = GLYPHS[i % GLYPHS.length]
              return (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-0 w-0"
                  style={{ transform: `rotate(${angle}deg) translateY(-40%)` }}
                >
                  <span
                    className={`block font-display text-[13px] transition-[color,transform] duration-300 ${
                      hover === "glyph" ? "text-primary" : "text-foreground/75"
                    }`}
                    style={{ transform: `rotate(${-angle}deg) translate(-50%, -50%) ${hover === "glyph" ? "scale(1.25)" : "scale(1)"}` }}
                  >
                    {ch}
                  </span>
                </span>
              )
            })}
          </div>
          {pressed === "glyph" && (
            <motion.span
              aria-hidden
              initial={{ scale: 0.7, opacity: 0.9 }}
              animate={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/60"
            />
          )}
        </a>

        {/* Radiating shards */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 h-full w-full text-primary/70 animate-pulse-soft"
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2
            const x1 = 100 + Math.cos(a) * 56
            const y1 = 100 + Math.sin(a) * 56
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
                strokeWidth="1.2"
                opacity="0.8"
              />
            )
          })}
        </svg>

        {/* Inner geometric sigil */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 h-full w-full text-foreground/70"
        >
          <g style={{ transformOrigin: "100px 100px" }} className="animate-rotate-slow" >
            <polygon
              points="100,48 140,100 100,152 60,100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <polygon
              points="100,64 132,100 100,136 68,100"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.55"
              strokeWidth="1"
            />
          </g>
        </svg>

        {/* Pulsing core with V mark :: clickable = invoke / focus form */}
        <motion.div
          style={{ x: tx, y: ty }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Link
            href="#signal"
            scroll={false}
            data-cursor="enter"
            data-cursor-label={t("portal.invoke")}
            aria-label={t("portal.invoke")}
            onMouseEnter={() => setHover("core")}
            onClick={(e) => {
              e.preventDefault()
              flashPress("core")
              const el = document.getElementById("signal")
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" })
                setTimeout(() => (el as HTMLInputElement).focus?.(), 420)
              }
            }}
            className="group relative block"
          >
            <motion.span
              animate={{
                scale: hover === "core" ? [1, 1.18, 1] : [1, 1.12, 1],
                opacity: [0.82, 1, 0.82],
              }}
              transition={{ duration: hover === "core" ? 1.8 : 3.4, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary"
              style={{
                boxShadow:
                  "0 0 90px 14px oklch(0.74 0.15 52 / 0.55), inset 0 0 24px oklch(0.74 0.15 52 / 0.6)",
              }}
            >
              <span className="font-wordmark-tight text-3xl font-bold text-primary-foreground">V</span>
              <span
                aria-hidden
                className="absolute inset-0 rounded-full border border-primary-foreground/25"
              />
            </motion.span>
            {pressed === "core" && (
              <motion.span
                aria-hidden
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/80"
              />
            )}
          </Link>
        </motion.div>

        {/* Corner HUD marks */}
        <span aria-hidden className="pointer-events-none absolute top-0 left-0 h-4 w-4 border-t border-l border-primary/60" />
        <span aria-hidden className="pointer-events-none absolute top-0 right-0 h-4 w-4 border-t border-r border-primary/60" />
        <span aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b border-l border-primary/60" />
        <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-primary/60" />
      </motion.div>

      {/* Caption tag */}
      <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-between font-hud text-foreground/45">
        <span>{t("contact.sigil")}</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={tipKey}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
            <span className={hover === "idle" ? "" : "text-primary"}>{t(tipKey)}</span>
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

const GLYPHS = ["᚛", "ᚠ", "ᚱ", "ᛗ", "ᛉ", "ᚦ", "ᛒ", "ᛇ", "ᛟ", "ᚷ", "ᚹ", "ᚨ"]
