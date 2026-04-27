"use client"

/* ---------------------------------------------------------------------------
 * KeyboardShortcuts :: a small "Keys to the Realm" overlay that surfaces
 * when the visitor presses `?` (or Shift+/). Lists the global shortcuts
 * and gives an honest progress readout for the rune meta-game without
 * spoiling any individual unlock.
 *
 * Shortcuts handled here
 *   ?            :: open / close this overlay
 *   Shift + /    :: same (alt key for non-US layouts)
 *   Esc          :: close
 *   M            :: toggle ambient sound (only fires when the overlay is
 *                   not the active modal — on `keydown` it just lives on
 *                   the same global window listener)
 *
 * Glitch-free :: the open/close transitions match the existing Konami /
 * EchoVault aesthetic so a visitor who finds one already knows what the
 * rest look like. We bail on input/textarea targets so typing in the
 * contact form doesn't surprise-open the modal.
 *
 * Hidden when nothing of interest :: until the visitor has triggered any
 * easter egg or sound at least once we don't loudly advertise the panel
 * (no on-screen hint). The keyboard listener is the discovery surface;
 * Awwwards juries press `?` on every entry as a habit.
 * ------------------------------------------------------------------------- */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
import { useRunes } from "./runes-context"
import { useSound } from "./sound-context"

type ShortcutRow = {
  keys: string[]
  label: string
}

const ROWS: ShortcutRow[] = [
  { keys: ["?"], label: "Open this panel" },
  { keys: ["Esc"], label: "Close this panel / dismiss any overlay" },
  { keys: ["M"], label: "Toggle ambient sound" },
  { keys: ["↑", "↑", "↓", "↓", "←", "→", "←", "→", "B", "A"], label: "An older code, still listening" },
]

/* Element check :: don't fire global shortcuts while the visitor is
   typing into a form. Returns true if the keyboard event originated
   from an editable surface. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const { count, total } = useRunes()
  const { enabled: soundOn, toggle: toggleSound } = useSound()

  const close = useCallback(() => setOpen(false), [])

  /* Global key handler :: a single window listener handles both opening
     the overlay (?, Shift+/) and the standalone shortcuts (M for sound,
     Esc to close). Keeping it as one effect avoids the priority dance
     between overlapping listeners. */
  useEffect(() => {
    if (typeof window === "undefined") return

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return

      // Open / close shortcut. e.key is the printed character so this
      // works regardless of `Shift+/` vs a literal `?` from a non-US
      // layout that has it on a different physical key.
      if (e.key === "?" || (e.shiftKey && e.code === "Slash")) {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }

      if (e.key === "Escape" && open) {
        e.preventDefault()
        close()
        return
      }

      // Sound toggle :: skip while a modifier is held (Cmd+M minimises
      // on macOS, Ctrl+M can be a browser shortcut). Plain `M` only.
      if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Intercept only if the overlay is currently visible OR we're at
        // the document body / html — that way a visitor mashing M while
        // an arcade game is focused doesn't have it stolen. We use a
        // light heuristic: any focused element with `data-sound-passthru`
        // (or the root) opts into M as the toggle.
        const t = e.target as HTMLElement | null
        const focusedRoot =
          !t || t === document.body || t === document.documentElement || t.dataset.soundPassthru === "true"
        if (focusedRoot) {
          e.preventDefault()
          toggleSound()
        }
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close, toggleSound])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="keyboard-shortcuts"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.18 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[95] grid place-items-center bg-background/80 px-6 backdrop-blur-md"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            transition={{ duration: reduced ? 0.18 : 0.42, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-md border border-primary/35 bg-background/90 p-8 shadow-[0_30px_120px_-30px_oklch(0.74_0.15_52/0.5)]"
          >
            {/* Corner ornaments :: same copper rune motif as EchoVault. */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <span className="absolute left-3 top-3 font-display text-[10px] tracking-[0.4em] text-primary/55">◆</span>
              <span className="absolute right-3 top-3 font-display text-[10px] tracking-[0.4em] text-primary/55">◆</span>
              <span className="absolute bottom-3 left-3 font-display text-[10px] tracking-[0.4em] text-primary/55">◆</span>
              <span className="absolute bottom-3 right-3 font-display text-[10px] tracking-[0.4em] text-primary/55">◆</span>
            </div>

            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary/85">
              ◇ keys to the realm
            </div>
            <h2 className="font-display mt-3 text-2xl leading-tight text-foreground">
              A small map of the keyboard.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              The realm watches the keys as well as the cursor. These work anywhere on the page.
            </p>

            <ul className="mt-6 space-y-3">
              {ROWS.map((row, i) => (
                <li key={i} className="flex items-start justify-between gap-6">
                  <span className="text-sm leading-relaxed text-foreground/80">{row.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {row.keys.map((k, j) => (
                      <Kbd key={j}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>

            {/* Status block :: shows ambient state without leaking secrets. */}
            <div className="mt-7 grid grid-cols-2 gap-4 border-t border-primary/15 pt-5 font-mono text-[11px] text-foreground/70">
              <div>
                <div className="text-primary/75">// runes</div>
                <span aria-live="polite">
                  {count} / {total} found
                </span>
              </div>
              <div>
                <div className="text-primary/75">// ambient</div>
                <span aria-live="polite">{soundOn ? "on" : "silent"}</span>
              </div>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-foreground/45">
              The runes themselves stay hidden — listen, hover, and look at the things people usually scroll past.
            </p>

            <button
              type="button"
              onClick={close}
              className="mt-6 inline-flex items-center gap-2 rounded-sm border border-primary/40 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-primary transition-colors hover:bg-primary/10"
            >
              Close
              <Kbd>Esc</Kbd>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* Tiny <kbd> with the realm aesthetic. Keeps the panel from feeling
   like a generic system dialog; the kbd glyphs read as engraved tablets
   instead of OS chrome. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-sm border border-primary/35 bg-primary/5 px-1.5 font-mono text-[10px] uppercase leading-none tracking-[0.1em] text-primary/90">
      {children}
    </kbd>
  )
}
