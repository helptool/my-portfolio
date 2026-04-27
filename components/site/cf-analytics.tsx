/**
 * Cloudflare Web Analytics — privacy-first, no cookies, no consent banner.
 *
 * Reads the beacon token from NEXT_PUBLIC_CF_BEACON_TOKEN at build time. If the
 * env var is unset (e.g. local dev) the script tag is omitted entirely so we
 * don't ship empty beacon requests.
 *
 * To configure in production: Cloudflare dashboard -> portfolio-v2 -> Settings
 * -> Variables and Secrets -> Add Variable (Plaintext, NOT Secret) named
 * NEXT_PUBLIC_CF_BEACON_TOKEN with the token from the Web Analytics page.
 */
export function CloudflareAnalytics() {
  const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN
  if (!token) return null
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  )
}
