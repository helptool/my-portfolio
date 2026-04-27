"use client"

/* ---------------------------------------------------------------------------
 * LiveStatus :: subtle "what I'm working on" block. Lives at the bottom
 * of the page, near the footer. Reads from lib/status.ts so the value
 * can change without a deploy (well — a re-deploy, but it's a tiny diff).
 *
 * Subtle by design :: small mono caption + one bullet line. No heading.
 * Visitors who don't notice it are fine; visitors who do, notice.
 *
 * Rune counter :: if at least one rune is found, surface a small
 * `N / 5 ◆ runes` badge alongside. Reads through the RunesProvider so
 * it stays in sync across late-stage unlocks (same-tab + cross-tab).
 * ------------------------------------------------------------------------- */

import { motion, useReducedMotion } from "framer-motion"
import { liveStatus } from "@/lib/status"
import { useRunes } from "./runes-context"

export function LiveStatus() {
  const reduced = useReducedMotion()
  const { count, total } = useRunes()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-[1600px] px-5 pb-6 pt-10 md:px-10"
    >
      <div className="flex flex-col gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/40">
        <div className="flex items-center gap-3">
          <span aria-hidden className="block h-[6px] w-[6px] animate-pulse rounded-full bg-primary/80" />
          <span>// signal — currently</span>
          <span className="text-foreground/65 normal-case tracking-[0.04em]">
            {liveStatus.building}
          </span>
          {count > 0 && (
            <span
              className="rounded-full border border-primary/55 px-2 py-[2px] text-primary tracking-[0.22em]"
              title={`Runes found: ${count} of ${total}`}
            >
              {count} / {total} ◆ {count === total ? "ignited" : "runes"}
            </span>
          )}
        </div>
        {liveStatus.where && (
          <div className="pl-[18px] normal-case tracking-[0.04em] text-foreground/45">
            {liveStatus.where}
            {liveStatus.listening ? ` · listening to ${liveStatus.listening}` : null}
          </div>
        )}
      </div>
    </motion.div>
  )
}
