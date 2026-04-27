/**
 * Shimmer placeholder generator for next/image.
 *
 * Returns a base64-encoded SVG that next/image accepts as `blurDataURL`.
 * The SVG paints a warm-onyx gradient that blends with the page background
 * so the moment between "request fired" and "image painted" reads as a
 * cinematic fade rather than a blank flash.
 *
 * For true LQIP we'd run plaiceholder/sharp at build time, but that needs
 * native sharp builds and ~3 MB of dependencies — this gives 90% of the
 * perceived-quality win for ~200 bytes per image and works the same on
 * the Cloudflare edge runtime where sharp doesn't run.
 */

const PALETTE = {
  base: "oklch(0.13 0.008 40)",
  mid: "oklch(0.16 0.012 50)",
  hi: "oklch(0.20 0.018 60)",
} as const

export function shimmerSVG(width: number, height: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><radialGradient id="g" cx="50%" cy="40%" r="80%"><stop offset="0%" stop-color="${PALETTE.hi}"/><stop offset="55%" stop-color="${PALETTE.mid}"/><stop offset="100%" stop-color="${PALETTE.base}"/></radialGradient></defs><rect width="${width}" height="${height}" fill="${PALETTE.base}"/><rect width="${width}" height="${height}" fill="url(#g)" opacity="0.6"/></svg>`
  return svg
}

function toBase64(input: string) {
  if (typeof window === "undefined") {
    return Buffer.from(input).toString("base64")
  }
  return window.btoa(input)
}

/**
 * Build a `data:image/svg+xml;base64,...` URI suitable for use as
 * `blurDataURL` on a `next/image` component with `placeholder="blur"`.
 */
export function shimmerDataURL(width = 16, height = 10) {
  return `data:image/svg+xml;base64,${toBase64(shimmerSVG(width, height))}`
}

/** Pre-computed default — most images don't need a custom aspect ratio. */
export const SHIMMER = shimmerDataURL()
