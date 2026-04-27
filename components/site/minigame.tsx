"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import { arcade } from "@/lib/vaish"
import { useT } from "./i18n-context"
import { LeaderboardPanel } from "./arcade/leaderboard"
import { PlayerNameCard } from "./arcade/player-name-card"
import { useArcade, type GameId } from "./arcade/arcade-context"
import { cn } from "@/lib/utils"
import { SectionAtmosphere } from "./section-atmosphere"

// Each game is ~300-450 LOC of canvas/Framer logic. Lazy-load so the home page
// only ships the active tab's bundle (and only if the user actually scrolls
// into the arcade and picks a game).
const GameLoading = () => (
  <div className="flex h-full w-full items-center justify-center font-hud text-foreground/40 text-[11px]">
    Loading game…
  </div>
)
const dynamicGame = (loader: () => Promise<{ default: React.ComponentType }>) =>
  dynamic(loader, { ssr: false, loading: GameLoading })

const RuneChaseGame = dynamicGame(() => import("./games/rune-chase").then((m) => ({ default: m.RuneChaseGame })))
const GlyphReflexGame = dynamicGame(() => import("./games/glyph-reflex").then((m) => ({ default: m.GlyphReflexGame })))
const MemoryPulseGame = dynamicGame(() => import("./games/memory-pulse").then((m) => ({ default: m.MemoryPulseGame })))
const RuneMatchGame = dynamicGame(() => import("./games/rune-match").then((m) => ({ default: m.RuneMatchGame })))
const SigilTraceGame = dynamicGame(() => import("./games/sigil-trace").then((m) => ({ default: m.SigilTraceGame })))
const SigilForgeGame = dynamicGame(() => import("./games/sigil-forge").then((m) => ({ default: m.SigilForgeGame })))

export function MiniGame() {
  const [active, setActive] = useState<GameId>("rune-chase")
  const activeGame = arcade.games.find((g) => g.id === active) ?? arcade.games[0]
  const { playerName } = useArcade()
  const t = useT()

  // Tab transitions are handled by the three AnimatePresence mode="wait"
  // instances below (panel header, active-game canvas, leaderboard).
  // We deliberately do NOT wrap setActive in startViewTransition here:
  // the View Transition crossfade and AnimatePresence's exit/enter
  // animations would run against the same state change, fighting for
  // the same pixels and producing a 360ms-delayed pop on Chromium-
  // based browsers. AnimatePresence wins because it works everywhere.
  // (View Transitions remain useful for the i18n switcher in
  // i18n-context.tsx, where there is no competing animation system.)

  return (
    <section id="play" className="contain-section relative w-full bg-noise py-20 sm:py-28 lg:py-32 overflow-hidden">
      {/* Premium ambient atmosphere :: arcade haze + drifting embers */}
      <SectionAtmosphere variant="aurora" />

      <div className="absolute inset-0 grid-lines opacity-40" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Section header */}
        <div className="mb-8 sm:mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-hud text-foreground/70 mb-3 flex items-center gap-2">
              <span className="inline-block h-px w-8 bg-foreground/30" />
              <span>{t("arcade.kicker")}</span>
              <span className="ml-2 text-primary/80">{t("arcade.subtitle")}</span>
            </div>
            <h2 className="font-wordmark-tight text-[14vw] sm:text-[8.8vw] lg:text-[6.2vw] leading-[0.9]">
              {t("arcade.title")}{" "}
              <span className="italic-serif font-display font-normal text-primary">{t("arcade.titleAccent")}</span>
            </h2>
          </div>
          <p className="max-w-md text-pretty text-foreground/65 italic-serif text-lg sm:text-xl leading-snug">
            {t("arcade.intro")}
          </p>
        </div>

        {/* Player name card */}
        <div className="mb-6">
          <PlayerNameCard />
        </div>

        {/* Tab bar :: horizontal scroll-snap on mobile (each tab snaps to the
            start of the rail so partial-tab states never linger), grid on
            tablet+ where all six fit at once. The snap rail uses
            overscroll-contain so flicking the tabs doesn't bubble into the
            page scroll. */}
        <div className="mb-6 flex snap-x snap-mandatory overflow-x-auto gap-2 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [overscroll-behavior-x:contain] sm:mx-0 sm:px-0 sm:grid sm:snap-none sm:overflow-visible sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-6">
          {arcade.games.map((g) => {
            const isActive = g.id === active
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActive(g.id as GameId)}
                data-cursor="hover"
                data-cursor-label={isActive ? t("arcade.active") : t("arcade.load")}
                className={cn(
                  "group relative flex shrink-0 basis-[44%] snap-start flex-col items-start gap-1 border bg-background/40 px-3 py-3 text-left transition-all duration-500 sm:shrink sm:basis-auto sm:snap-align-none",
                  isActive
                    ? "border-primary/60 bg-background/70"
                    : "border-foreground/10 hover:border-foreground/25 hover:bg-background/55",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 transition-opacity duration-500",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                  style={{
                    background:
                      "radial-gradient(120% 80% at 0% 100%, oklch(0.74 0.15 52 / 0.14), transparent 60%)",
                  }}
                />
                <div className="flex w-full items-baseline justify-between">
                  <span
                    className={cn(
                      "font-hud transition-colors",
                      isActive ? "text-primary" : "text-foreground/45",
                    )}
                  >
                    {g.code}
                  </span>
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full",
                      isActive ? "bg-primary animate-pulse-soft" : "bg-foreground/25",
                    )}
                  />
                </div>
                <div className="font-wordmark-tight text-[15px] sm:text-base font-semibold text-foreground leading-tight">
                  {g.name}
                </div>
                <div className="font-hud text-foreground/70 text-[9px] leading-tight line-clamp-2">
                  {g.kicker}
                </div>
              </button>
            )
          })}
        </div>

        {/* Game area + info + leaderboard */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {active === "rune-chase" && <RuneChaseGame />}
                {active === "glyph-reflex" && <GlyphReflexGame />}
                {active === "memory-pulse" && <MemoryPulseGame />}
                {active === "rune-match" && <RuneMatchGame />}
                {active === "sigil-trace" && <SigilTraceGame />}
                {active === "sigil-forge" && <SigilForgeGame />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right rail */}
          <aside className="flex flex-col gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeGame.id + "brief"}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="frame-hairline p-4 sm:p-5 bg-background/40"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-hud text-foreground/70">{activeGame.code} // {t("arcade.brief")}</span>
                  <span className="font-hud text-primary">LV.{activeGame.code.replace(/[^0-9]/g, "")}</span>
                </div>
                <div className="font-wordmark-tight text-xl font-semibold text-foreground mt-1">
                  {activeGame.name}
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-foreground/70">
                  {activeGame.brief}
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between border-b border-foreground/10 pb-2 font-hud text-foreground/70">
                    <dt>{t("arcade.controls")}</dt>
                    <dd className="text-foreground/85">{activeGame.controls}</dd>
                  </div>
                  <div className="flex justify-between border-b border-foreground/10 pb-2 font-hud text-foreground/70">
                    <dt>{t("arcade.duration")}</dt>
                    <dd className="text-foreground/85">
                      {activeGame.duration ? `${activeGame.duration}s` : t("arcade.endless")}
                    </dd>
                  </div>
                  <div className="flex justify-between font-hud text-foreground/70">
                    <dt>{t("arcade.score")}</dt>
                    <dd className="text-foreground/85 uppercase">{activeGame.scoreUnit}</dd>
                  </div>
                </dl>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeGame.id + "lb"}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <LeaderboardPanel game={activeGame.id as GameId} gameName={activeGame.name} />
              </motion.div>
            </AnimatePresence>

            <div className="frame-hairline p-4 bg-background/40">
              <div className="font-hud text-foreground/70 mb-2">{t("arcade.arcadist")}</div>
              <div className="font-wordmark-tight text-lg font-semibold text-foreground">
                {playerName || "Aryaman V. Gupta"}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/60">
                {t("arcade.arcadistTagline")}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
