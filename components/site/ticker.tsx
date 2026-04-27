"use client"

import { tickerKeys } from "@/lib/vaish"
import { useT } from "./i18n-context"

// Brand-aware marquee. "VAISH" stays as a literal. Every other token
// resolves through the active language so the strip flips with the page.
export function Ticker() {
  const t = useT()
  const row = tickerKeys.map((k) => (k === "VAISH" ? "VAISH" : t(k))).join("   \u2022   ")
  return (
    <section aria-label="VAISH" className="relative overflow-hidden border-y border-foreground/10 bg-background py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-10" />

      <div className="relative mask-fade-x flex flex-col gap-3">
        <div className="flex w-max items-baseline whitespace-nowrap animate-marquee-x">
          <MarqueeRow text={row} />
          <MarqueeRow text={row} />
        </div>
        <div className="flex w-max items-baseline whitespace-nowrap animate-marquee-x-rev">
          <MarqueeRow text={row} italic dim />
          <MarqueeRow text={row} italic dim />
        </div>
      </div>
    </section>
  )
}

function MarqueeRow({ text, italic = false, dim = false }: { text: string; italic?: boolean; dim?: boolean }) {
  return (
    <span
      className={`pr-14 font-display leading-[0.95] ${italic ? "italic-serif" : ""} ${dim ? "text-foreground/25" : "text-foreground"}`}
      style={{ fontSize: "clamp(54px, 10vw, 180px)" }}
    >
      {text}&nbsp;&nbsp;&nbsp;
    </span>
  )
}
