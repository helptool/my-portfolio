/* ---------------------------------------------------------------------------
 * Five hidden runes scattered across the site. Find them all to unlock the
 * "echo vault" reveal. Order is narrative :: dawn (first) → embers (last).
 *
 * Each rune is keyed by a short string so localStorage stays compact and the
 * key set survives string-translation churn. The codepoints are Old Norse /
 * Anglo-Saxon futhark glyphs that double as ambient typography in the
 * manifesto and footer — picking real glyphs (not arbitrary emoji) keeps
 * the meta-game congruent with the realm aesthetic.
 *
 * Triggers
 *   dawn   :: enter the konami code (↑↑↓↓←→←→BA) at any time
 *   tide   :: click the hero wordmark V·A·I·S·H 5 times in <3s
 *   loom   :: click the central ᛟ glyph in the manifesto rune strip
 *   vow    :: hold cursor over a single realm card for 6 continuous seconds
 *   embers :: scroll every chronicle chapter into view
 *
 * The triggers are deliberately discoverable without explanation — judges
 * who actually try the konami code will stumble onto the 0/5 counter
 * surfacing on the live-status block, and from there the rest reads as
 * "find the others".
 * ------------------------------------------------------------------------- */

export const RUNE_IDS = ["dawn", "tide", "loom", "vow", "embers"] as const

export type RuneId = typeof RUNE_IDS[number]

export const RUNES: Record<RuneId, { glyph: string; name: string; line: string }> = {
  dawn:   { glyph: "ᚦ", name: "Dawn",   line: "The first light of the realm." },
  tide:   { glyph: "ᚱ", name: "Tide",   line: "Five strikes against the wordmark, in one breath." },
  loom:   { glyph: "ᛟ", name: "Loom",   line: "The thread the manifesto kept hidden in plain sight." },
  vow:    { glyph: "ᚹ", name: "Vow",    line: "Six seconds of stillness on a realm that wasn't yours." },
  embers: { glyph: "ᛞ", name: "Embers", line: "Every chronicle chapter, witnessed end to end." },
}

export const RUNES_STORAGE_KEY = "vaish.runes"

/** Browser-safe rune-found broadcast. Fires in the same tab the unlock
 *  happens in (storage events only fire cross-tab per spec). */
export const RUNES_EVENT = "vaish:runes-changed"

/** Read the current rune set from localStorage. Defensive against parse
 *  errors and pre-existing legacy `"vaish.konami"` flag (PR A) — if konami
 *  was already unlocked, treat dawn as found. */
export function readRunes(): Set<RuneId> {
  if (typeof window === "undefined") return new Set()
  const out = new Set<RuneId>()
  try {
    const raw = localStorage.getItem(RUNES_STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw) as unknown
      if (Array.isArray(arr)) {
        for (const id of arr) {
          if (typeof id === "string" && (RUNE_IDS as readonly string[]).includes(id)) {
            out.add(id as RuneId)
          }
        }
      }
    }
    // Legacy migration :: PR A wrote `vaish.konami="1"` for konami unlock.
    // Translate that into a "dawn" rune so returning visitors don't
    // unfairly start at 0/5.
    if (localStorage.getItem("vaish.konami") === "1") out.add("dawn")
  } catch {
    /* ignore — fall back to empty set */
  }
  return out
}

/** Persist a rune-set to localStorage and broadcast a same-tab event so
 *  in-page listeners (LiveStatus, the unlock overlay) can re-render. */
export function writeRunes(set: Set<RuneId>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(RUNES_STORAGE_KEY, JSON.stringify(Array.from(set)))
    window.dispatchEvent(new CustomEvent(RUNES_EVENT))
  } catch {
    /* storage full / disabled — fail silently */
  }
}
