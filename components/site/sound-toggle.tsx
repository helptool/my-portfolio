"use client"

/* ---------------------------------------------------------------------------
 * SoundToggle :: small fixed-position button (top-right) with three bars
 * that animate when sound is enabled. Default OFF, persists across visits.
 * ------------------------------------------------------------------------- */

import { motion, useReducedMotion } from "framer-motion"
import { useSound } from "./sound-context"

export function SoundToggle() {
  const { enabled, toggle } = useSound()
  const reduced = useReducedMotion()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? "Mute ambient sound" : "Enable ambient sound"}
      data-cursor="text"
      data-cursor-label={enabled ? "mute" : "sound"}
      className="fixed right-4 top-4 z-[60] grid h-10 w-10 place-items-center rounded-full border border-foreground/15 bg-background/40 backdrop-blur-md transition-colors hover:border-primary/45"
    >
      <span className="flex items-end gap-[3px] h-4">
        {[0, 1, 2].map((i) => {
          const heights = enabled ? ["55%", "100%", "70%"] : ["28%", "28%", "28%"]
          return (
            <motion.span
              key={i}
              aria-hidden
              className="block w-[3px] rounded-full bg-primary/85"
              style={{ height: heights[i] }}
              animate={
                enabled && !reduced
                  ? { height: ["35%", "95%", "55%", "85%", "35%"] }
                  : { height: heights[i] }
              }
              transition={
                enabled && !reduced
                  ? { duration: 1.4 + i * 0.3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: i * 0.1 }
                  : { duration: 0.2 }
              }
            />
          )
        })}
      </span>
    </button>
  )
}
