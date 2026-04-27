import type { Metadata } from "next"
import Link from "next/link"
import { brand } from "@/lib/vaish"

export const metadata: Metadata = {
  title: `Off the realm path · ${brand.name}`,
  description:
    "This page never made it into the realm. Return to the wordmark, or wander through the chronicle.",
  robots: { index: false, follow: false },
}

/* ---------------------------------------------------------------------------
 * Custom 404 :: themed to match the rest of the realm. Default Next.js 404
 * is an instant tell that the rest of the site is templated — replacing it
 * with the wordmark + a narrative line + an explicit return link is one of
 * the cheapest ways to telegraph "every surface was thought through".
 *
 * Server-rendered on purpose :: no client JS needed for a static error page.
 * The wordmark animation is a CSS-only stagger so it works even with JS off.
 * ------------------------------------------------------------------------- */

const WORDMARK_LETTERS = ["V", "A", "I", "S", "H"] as const

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      {/* Ambient backdrop :: copper radial bloom + subtle vignette,
          mirroring the hero atmosphere without any per-frame work. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 45% at 50% 30%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 70%), radial-gradient(ellipse at 50% 90%, rgba(0,0,0,0.6), transparent 60%)",
        }}
      />

      {/* The wordmark, ghosted, with each letter fading in on a stagger.
          Pure CSS animation :: animation-delay scales by index. Respects
          prefers-reduced-motion via the @media query below. */}
      <div className="mb-8 flex select-none items-end gap-[0.04em]">
        {WORDMARK_LETTERS.map((ch, i) => (
          <span
            key={ch}
            className="font-wordmark-display text-[clamp(72px,16vw,168px)] leading-[0.85] text-foreground/85 [animation:nf-rise_900ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:[animation:none]"
            style={{ animationDelay: `${i * 110}ms` }}
            aria-hidden
          >
            {ch}
          </span>
        ))}
        <span className="sr-only">{brand.name}</span>
      </div>

      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary/85">
        404 · path-not-mapped
      </p>

      <h1 className="mt-3 max-w-[640px] text-center font-display text-[clamp(22px,3.4vw,32px)] leading-[1.18] text-foreground/85">
        You wandered off the realm path.
      </h1>

      <p className="mt-4 max-w-[520px] text-center text-[15px] leading-relaxed text-foreground/70">
        This page was never carved into the chronicle. The realm only remembers
        the seven pillars — the rest is fog. Return to the wordmark, then
        choose a path that exists.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="group/cta relative inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.22em] text-background transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden>↺</span> Return to the wordmark
        </Link>
        <Link
          href="/#chronicle"
          className="font-mono text-[12px] uppercase tracking-[0.22em] text-foreground/60 underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:text-primary"
        >
          Read the chronicle instead
        </Link>
      </div>

      {/* CSS keyframes :: staggered ghosted-letter rise. Lifted out of any
          global stylesheet so this page is self-contained — even pasted
          into a static-only host it would still animate correctly. */}
      <style>{`
        @keyframes nf-rise {
          0% {
            opacity: 0;
            transform: translateY(28px);
            filter: blur(6px);
          }
          100% {
            opacity: 0.85;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>
    </main>
  )
}
