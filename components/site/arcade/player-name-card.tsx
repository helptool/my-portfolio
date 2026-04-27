"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useArcade } from "./arcade-context"
import { Magnetic } from "../magnetic"

/**
 * A one-time name card for the Arcade.
 * The player writes their name once; it is saved to localStorage and
 * used on every leaderboard submission.
 */
export function PlayerNameCard() {
  const { playerName, setPlayerName } = useArcade()
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(playerName)
    setEditing(!playerName)
  }, [playerName])

  const onSave = () => {
    const v = draft.trim().slice(0, 20)
    if (!v) return
    setPlayerName(v)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className="relative frame-hairline frame-corners bg-background/50 px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="corner-tl" />
      <div className="corner-br" />

      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center border border-primary/40 bg-primary/10"
        >
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.74_0.15_52/0.5),transparent_70%)]" />
          <span className="relative font-wordmark-tight text-sm font-bold text-primary">
            {(playerName || "V").charAt(0).toUpperCase()}
          </span>
        </span>
        <div className="min-w-0">
          <div className="font-hud text-foreground/70">Player Seal</div>
          <div className="font-wordmark-tight text-base sm:text-lg font-semibold text-foreground truncate">
            {playerName || "Unnamed Wanderer"}
          </div>
        </div>
      </div>

      <div className="flex-1 sm:border-l sm:border-foreground/10 sm:pl-6">
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.form
              key="edit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              onSubmit={(e) => {
                e.preventDefault()
                onSave()
              }}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <label htmlFor="player-name" className="sr-only">
                Your name
              </label>
              <input
                id="player-name"
                type="text"
                autoComplete="nickname"
                maxLength={20}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Speak your name // up to 20 letters"
                data-cursor="hover"
                className="w-full flex-1 bg-transparent border-b border-foreground/20 pb-1.5 font-display text-xl sm:text-2xl text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none"
              />
              <Magnetic strength={0.3}>
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  data-cursor="play"
                  data-cursor-label="Save"
                  className="relative inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground disabled:opacity-50"
                >
                  <span className="font-hud">{playerName ? "Update" : "Begin"}</span>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </Magnetic>
            </motion.form>
          ) : (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between gap-3"
            >
              <p className="text-[13px] leading-relaxed text-foreground/70 max-w-md">
                Your name is bound to every score you send across the six arcades.
                {saved && (
                  <span className="ml-2 font-hud text-primary">Sealed.</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                data-cursor="hover"
                data-cursor-label="Rename"
                className="font-hud text-foreground/65 hover:text-primary border-b border-foreground/20 hover:border-primary pb-0.5 transition-colors"
              >
                Rename
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
