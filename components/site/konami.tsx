"use client"

/* ---------------------------------------------------------------------------
 * KonamiSecret :: ↑↑↓↓←→←→BA reveals a hidden HUD with a thank-you
 * message + dev stats. Glitch-free :: input is debounced via a fixed
 * sequence pointer; rapid keypresses can't double-fire because the
 * pointer only advances on exact matches.
 *
 * Persistence :: once unlocked, a localStorage flag keeps the badge
 * available in the live-status block (see <LiveStatus />). Re-typing the
 * code re-opens the overlay.
 *
 * Reduced motion :: overlay still works but skips the stagger.
 * ------------------------------------------------------------------------- */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import { useRunes } from "./runes-context"

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
] as const

const STORAGE_KEY = "vaish.konami"

export function KonamiSecret() {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const { count, total, addRune } = useRunes()

  useEffect(() => {
    if (typeof window === "undefined") return
    let pointer = 0

    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input.
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return
      }
      const expected = SEQUENCE[pointer]
      if (e.code === expected) {
        pointer++
        if (pointer === SEQUENCE.length) {
          pointer = 0
          // Legacy flag :: keep writing it so older callers (LiveStatus's
          // direct localStorage check, plus any third-party screenshots
          // floating around) still see the unlock. RunesProvider also
          // migrates this flag → "dawn" on hydrate.
          try { localStorage.setItem(STORAGE_KEY, "1") } catch {}
          // The browser's `storage` event only fires in OTHER tabs, so
          // dispatch a custom event for in-tab listeners (e.g.
          // <LiveStatus />) to surface the rune badge without a reload.
          try { window.dispatchEvent(new CustomEvent("vaish:konami")) } catch {}
          addRune("dawn")
          setOpen(true)
        }
      } else if (e.code === SEQUENCE[0]) {
        pointer = 1
      } else {
        pointer = 0
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [addRune])

  // Allow Esc to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="konami"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.18 : 0.34, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[90] grid place-items-center bg-background/80 backdrop-blur-md"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-label="Hidden message unlocked"
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 10 }}
            transition={{ duration: reduced ? 0.18 : 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl rounded-md border border-primary/40 bg-background/85 p-10 shadow-[0_30px_120px_-30px_oklch(0.74_0.15_52/0.55)]"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary/85">
              ◆ rune unlocked
            </div>
            <h2 className="font-display mt-4 text-3xl leading-tight text-foreground">
              You found the cheat code.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-foreground/70">
              The realm acknowledges. You've now unlocked the developer's badge —
              it lives quietly at the foot of the page from here on out.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-[11px] text-foreground/70">
              <div>
                <div className="text-primary/75">// build</div>
                Next 16 / Workers
              </div>
              <div>
                <div className="text-primary/75">// rune count</div>
                {count} / {total}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-8 inline-flex items-center gap-2 border-b border-primary/55 pb-1 text-xs uppercase tracking-[0.28em] text-primary transition-colors hover:text-foreground"
            >
              return to realm
              <span aria-hidden>↳</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
