/* ---------------------------------------------------------------------------
 * One-shot OG generator. Run locally with `node scripts/gen-og.mjs`.
 * Writes 1200x630 PNGs into /public for each section variant.
 *
 * Why a static one-shot script (not a Next dynamic route)
 *   The previous app/opengraph-image.tsx relied on next/og (satori) which
 *   doesn't run on Cloudflare Workers without bundling extra runtime
 *   shims. See the "fix(og): use static /og.png" commit. Pre-rendering
 *   the cards at design time keeps the production worker as small as
 *   possible and edge-caches every variant via the ASSETS binding.
 *
 * Composition recipe
 *   - Solid dark base (#0a0606) with a per-section radial copper gradient
 *     positioned per variant so each card has a slightly different
 *     visual centre of gravity.
 *   - Section-specific rune glyph rendered as a giant translucent watermark.
 *   - VAISH wordmark in the top-left corner; section title + subline in the
 *     centre; small caption at the bottom.
 *
 * Variants
 *   default     — homepage / site root
 *   realms      — five forgotten kingdoms
 *   manifesto   — the long-form text section
 *   classes     — the 'classes' (skills) panel
 *   chronicle   — the chapter index
 *   arcade      — the seven mini-games + leaderboard
 *
 * The SVG approach below stays parameterised so all six cards share a
 * single layout source; each variant just feeds different copy + a
 * different accent hue + a different rune glyph.
 * ------------------------------------------------------------------------- */

import { writeFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = `${__dirname}/../public`

mkdirSync(PUBLIC, { recursive: true })

const W = 1200
const H = 630

/** Hex colors picked from the live palette (matches `--accent` in globals.css). */
const COPPER = "#c98b4f"
const DEEP = "#0a0606"
const PARCHMENT = "#f3e3c3"

/* The default `og.png` is intentionally NOT generated here — the existing
   public/og.png (82KB, hand-tuned earlier) is the highest-quality card we
   have for the homepage and Twitter card. The variants below are the per-
   section overrides that get swapped in by `generateMetadata` when the
   visitor lands with `?section=<id>`. */
const VARIANTS = [
  {
    file: "og-realms.png",
    eyebrow: "FIVE FORGOTTEN KINGDOMS",
    title: "Realms",
    sub: "Worlds that hold their own weather, time, and tongue.",
    glyph: "ᚹ",
    accent: COPPER,
    glow: { cx: 0.22, cy: 0.42 },
  },
  {
    file: "og-manifesto.png",
    eyebrow: "WORDS THAT BUILT THE REALM",
    title: "Manifesto",
    sub: "Not a portfolio. A place that remembers you stepped in.",
    glyph: "ᛟ",
    accent: COPPER,
    glow: { cx: 0.5, cy: 0.34 },
  },
  {
    file: "og-classes.png",
    eyebrow: "DISCIPLINES OF THE CRAFT",
    title: "Classes",
    sub: "The kits I bring — design, motion, code, narrative.",
    glyph: "ᚺ",
    accent: COPPER,
    glow: { cx: 0.7, cy: 0.5 },
  },
  {
    file: "og-chronicle.png",
    eyebrow: "EVERY CHAPTER, IN ORDER",
    title: "Chronicle",
    sub: "A long memory of work — entries you can scroll end to end.",
    glyph: "ᛞ",
    accent: COPPER,
    glow: { cx: 0.32, cy: 0.6 },
  },
  {
    file: "og-arcade.png",
    eyebrow: "SEVEN GAMES + A LEADERBOARD",
    title: "Arcade",
    sub: "Tiny play built to ruin the next ten minutes of your day.",
    glyph: "ᚱ",
    accent: COPPER,
    glow: { cx: 0.6, cy: 0.55 },
  },
]

function svgFor({ eyebrow, title, sub, glyph, accent, glow }) {
  // Note: Cloudflare-bound static assets, so size matters; we keep the
  // SVG terse. Fonts here resolve to whichever serif sharp's underlying
  // librsvg picks up — locally that's typically DejaVu Serif. Rendering
  // characters that exist in DejaVu (incl. the futhark runes used as
  // glyphs) keeps the cards consistent across machines.
  const cx = (glow.cx * W).toFixed(0)
  const cy = (glow.cy * H).toFixed(0)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g" cx="${cx}" cy="${cy}" r="${(W * 0.6).toFixed(0)}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="35%" stop-color="${accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${DEEP}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${DEEP}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${DEEP}" stop-opacity="0.55"/>
    </linearGradient>
    <pattern id="grain" patternUnits="userSpaceOnUse" width="3" height="3">
      <rect width="3" height="3" fill="${DEEP}"/>
      <circle cx="1" cy="1" r="0.4" fill="${PARCHMENT}" opacity="0.04"/>
    </pattern>
  </defs>

  <!-- base layers -->
  <rect width="${W}" height="${H}" fill="${DEEP}"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#grain)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>

  <!-- frame -->
  <rect x="42" y="42" width="${W - 84}" height="${H - 84}" fill="none" stroke="${accent}" stroke-opacity="0.32" stroke-width="1.5"/>
  <rect x="48" y="48" width="${W - 96}" height="${H - 96}" fill="none" stroke="${accent}" stroke-opacity="0.12" stroke-width="0.75"/>

  <!-- corner ornaments -->
  <text x="60" y="80" font-family="serif" font-size="22" fill="${accent}" fill-opacity="0.72">◆</text>
  <text x="${W - 75}" y="80" font-family="serif" font-size="22" fill="${accent}" fill-opacity="0.72" text-anchor="end">◆</text>
  <text x="60" y="${H - 56}" font-family="serif" font-size="22" fill="${accent}" fill-opacity="0.72">◆</text>
  <text x="${W - 75}" y="${H - 56}" font-family="serif" font-size="22" fill="${accent}" fill-opacity="0.72" text-anchor="end">◆</text>

  <!-- giant rune watermark behind the title -->
  <text x="${W - 110}" y="${H * 0.9}" font-family="serif" font-size="540" fill="${accent}" fill-opacity="0.07" text-anchor="end">${glyph}</text>

  <!-- VAISH lockup top-left -->
  <text x="80" y="120" font-family="monospace" font-size="13" letter-spacing="6" fill="${PARCHMENT}" fill-opacity="0.7">V · A · I · S · H</text>
  <text x="80" y="140" font-family="monospace" font-size="11" letter-spacing="4" fill="${accent}" fill-opacity="0.85">REALM OF THE UNTOLD</text>

  <!-- eyebrow -->
  <text x="80" y="${H * 0.55}" font-family="monospace" font-size="14" letter-spacing="6" fill="${accent}" fill-opacity="0.95">${eyebrow}</text>

  <!-- title -->
  <text x="80" y="${H * 0.55 + 92}" font-family="serif" font-size="120" font-weight="400" fill="${PARCHMENT}">${title}</text>

  <!-- subline -->
  <text x="80" y="${H * 0.55 + 138}" font-family="serif" font-size="26" fill="${PARCHMENT}" fill-opacity="0.7">${sub}</text>

  <!-- bottom caption -->
  <text x="80" y="${H - 80}" font-family="monospace" font-size="12" letter-spacing="4" fill="${PARCHMENT}" fill-opacity="0.55">ARYAMAN V. GUPTA</text>
  <text x="${W - 80}" y="${H - 80}" font-family="monospace" font-size="12" letter-spacing="4" fill="${PARCHMENT}" fill-opacity="0.55" text-anchor="end">vaish · 2026</text>
</svg>
`
}

async function build() {
  for (const v of VARIANTS) {
    const svg = svgFor(v)
    const buf = await sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer()
    const out = `${PUBLIC}/${v.file}`
    writeFileSync(out, buf)
    console.log(`wrote ${out} (${buf.byteLength} bytes)`)
  }
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
