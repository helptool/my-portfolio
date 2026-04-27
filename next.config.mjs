/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Image optimization is handled at runtime by the Cloudflare IMAGES binding
  // (see wrangler.jsonc). The adapter exposes a Next.js-compatible loader so
  // <Image /> requests are transformed (AVIF/WebP, responsive sizes) on the
  // edge instead of shipping raw JPEGs from /public.
}

export default nextConfig
