"use client"

/* ---------------------------------------------------------------------------
 * LetterTilt :: each character in the wrapped text leans 0–3° toward the
 * cursor with a soft spring. Restraint is the whole game — overdone reads
 * cheesy; tuned right reads "the type is alive."
 *
 * Splits the input string by character (preserving spaces with &nbsp;).
 * Each letter stores its center on mount; on parent pointermove we compute
 * a vector from the letter to the cursor and convert it to a tilt angle
 * scaled by inverse distance falloff so far-away letters barely move.
 *
 * Reduced motion :: renders flat text, no listeners attached.
 * ------------------------------------------------------------------------- */

import { useReducedMotion } from "framer-motion"
import { useEffect, useRef } from "react"
import { useFinePointer } from "@/lib/hooks"

type Props = {
  children: string
  className?: string
  /** Max tilt in degrees. Default 3. */
  maxTilt?: number
  /** Influence radius in px — distance at which tilt drops to ~0. Default 320. */
  radius?: number
}

export function LetterTilt({
  children,
  className,
  maxTilt = 3,
  radius = 320,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  // Pure mouse-tracking effect. On touch devices the pointermove listener
  // never fires productively but the per-character DOM scaffold still
  // mounts (one inline-block span per letter). On a 143-character subline
  // that's 143 extra elements + 143 inline transforms the browser has to
  // composite for nothing — a measurable mobile cost. Bail to plain text.
  const finePointer = useFinePointer()

  // Track cursor in document coordinates via a single window listener.
  useEffect(() => {
    if (reduced || !finePointer) return
    const root = ref.current
    if (!root) return
    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-tilt-char]"))
    if (!letters.length) return

    let raf = 0
    let mx = 0
    let my = 0
    let dirty = false

    const onMove = (e: PointerEvent) => {
      mx = e.clientX
      my = e.clientY
      dirty = true
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const tick = () => {
      raf = 0
      if (!dirty) return
      dirty = false
      for (const el of letters) {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dx = mx - cx
        const dy = my - cy
        const dist = Math.hypot(dx, dy)
        const falloff = Math.max(0, 1 - dist / radius)
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)
        const tilt = Math.cos((angle - 90) * (Math.PI / 180)) * maxTilt * falloff
        // Apply via CSS variable so framer's spring on the inner motion.span
        // can interpolate without a re-render.
        el.style.setProperty("--tilt", `${tilt.toFixed(2)}deg`)
      }
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      if (raf) cancelAnimationFrame(raf)
    }
    // `children` is in deps so the effect re-runs when the i18n language
    // switches and the subline string changes (lengths vary 39..143 chars
    // across en/es/fr/ja/hi). Without it, the captured DOM refs would
    // point at unmounted spans and getBoundingClientRect would return 0s.
  }, [reduced, finePointer, maxTilt, radius, children])

  if (reduced) {
    // Reduced-motion :: render plain text, no animation at all.
    return <span className={className}>{children}</span>
  }

  /* Touch / coarse-pointer fallback :: previously rendered plain text
     and dropped the per-letter scaffold entirely. Visually the wordmark
     felt static on phones — the user reported "many features missing
     from mobile". Now the touch path renders the same per-letter
     scaffold but with a tiny CSS-driven continuous wave (no JS, no
     pointer listeners, ~zero compositor cost). Each letter gets a
     staggered `--letter-delay` so the wave reads as a slow ripple
     across the line rather than every letter pulsing in sync. */
  if (!finePointer) {
    const words = children.split(/(\s+)/)
    return (
      <span className={className} aria-label={children}>
        {words.map((word, wi) => {
          if (/^\s+$/.test(word)) {
            return <span key={`s-${wi}`}>{word}</span>
          }
          const chars = Array.from(word)
          return (
            <span
              key={`w-${wi}`}
              aria-hidden
              style={{ display: "inline-block", whiteSpace: "nowrap" }}
            >
              {chars.map((ch, ci) => (
                <span
                  key={ci}
                  className="inline-block animate-letter-wave"
                  style={
                    {
                      "--letter-delay": `${((wi * 7 + ci) % 12) * 0.12}s`,
                    } as React.CSSProperties
                  }
                >
                  {ch}
                </span>
              ))}
            </span>
          )
        })}
      </span>
    )
  }

  // Split into words first, then characters within each word. This is the
  // only way to keep per-letter inline-block transforms (needed for tilt)
  // while still allowing the browser to break lines at word boundaries.
  // Adjacent JSX elements have no whitespace text between them; a real
  // space text node ` ` between word groups is the wrap opportunity.
  // Also splitting on \s+ via regex preserves multiple consecutive
  // whitespace as a single break.
  const words = children.split(/(\s+)/)

  return (
    <span ref={ref} className={className} aria-label={children}>
      {words.map((word, wi) => {
        // Whitespace runs render as plain text so the browser can break
        // there. Anything else becomes a non-breaking inline-block group
        // of tilt-able characters.
        if (/^\s+$/.test(word)) {
          return <span key={`s-${wi}`}>{word}</span>
        }
        const chars = Array.from(word)
        return (
          <span
            key={`w-${wi}`}
            aria-hidden
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
          >
            {chars.map((ch, ci) => (
              <span
                key={ci}
                data-tilt-char
                style={{
                  display: "inline-block",
                  transform: "rotate(var(--tilt, 0deg))",
                  transformOrigin: "50% 80%",
                  transition: "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
                  willChange: "transform",
                }}
              >
                {ch}
              </span>
            ))}
          </span>
        )
      })}
    </span>
  )
}
