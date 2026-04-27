import type { Metadata, Viewport } from "next"
import { Inter, Instrument_Serif, JetBrains_Mono, Bodoni_Moda, Noto_Serif_JP, Noto_Serif_Devanagari } from "next/font/google"
import "./globals.css"
import { ArcadeProvider } from "@/components/site/arcade/arcade-context"
import { I18nProvider } from "@/components/site/i18n-context"
import { CloudflareAnalytics } from "@/components/site/cf-analytics"
import { SoundProvider } from "@/components/site/sound-context"
import { SoundToggle } from "@/components/site/sound-toggle"
import { KonamiSecret } from "@/components/site/konami"
import { RunesProvider } from "@/components/site/runes-context"
import { EchoVault } from "@/components/site/echo-vault"
import { KeyboardShortcuts } from "@/components/site/keyboard-shortcuts"

const SITE_URL = "https://portfolio-v2.paidtoolsdrive.workers.dev"

/* All fonts use display:swap + adjustFontFallback so the metric-matched
   system fallback paints first and the swap to the real font is
   imperceptible. Without this, Bodoni Moda (~80KB woff2) causes a brief
   reflow on first paint that shows up as cumulative layout shift. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: true,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
})
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "Times New Roman", "serif"],
})
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-hud",
  display: "swap",
  adjustFontFallback: true,
  fallback: ["ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
})
// Bodoni Moda: razor-sharp high-contrast display serif with dramatic strokes.
// Edgy, editorial, and aligned with the dark-realm theme. Loaded as a
// variable font so ScrollWeight can interpolate the `wght` axis continuously
// (400..900) instead of snapping to the nearest static instance.
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-wordmark",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Didot", "Cormorant Garamond", "Georgia", "serif"],
})

/* CJK + Devanagari serif fallbacks for the wordmark glyph morph (N3).
   Only loaded when the visitor switches to ja / hi — `display: swap`
   avoids blocking first paint, and we cap weight to 700 so we ship a
   single subset file per script instead of the full 100..900 ladder. */
const notoSerifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-wordmark-jp",
  display: "swap",
  fallback: ["Hiragino Mincho ProN", "Yu Mincho", "serif"],
  preload: false,
  // The subset list above doesn't include "japanese" because Next's font
  // loader fetches the smallest matching CSS file; the unicode-range CSS
  // declarations from Google Fonts cover the katakana glyphs even via the
  // Latin subset CSS file because Google emits unicode-range hooks for
  // the full font. The browser only downloads the Japanese woff2 chunk
  // once a CJK glyph actually renders, which lines up with the language
  // switch. preload: false prevents an early fetch on first paint.
})
const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-wordmark-deva",
  display: "swap",
  fallback: ["Tiro Devanagari Hindi", "serif"],
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VAISH / Realm of the Untold",
    template: "%s — VAISH",
  },
  description:
    "VAISH is an interactive world by Aryaman V. Gupta. A cinematic living experience of forgotten realms, wandering souls, and signal memory.",
  applicationName: "VAISH",
  authors: [{ name: "Aryaman V. Gupta" }],
  creator: "Aryaman V. Gupta",
  keywords: [
    "VAISH",
    "Aryaman Gupta",
    "portfolio",
    "interactive design",
    "creative developer",
    "motion design",
    "web experience",
  ],
  openGraph: {
    title: "VAISH / Realm of the Untold",
    description: "A living world by Aryaman V. Gupta.",
    type: "website",
    url: SITE_URL,
    siteName: "VAISH",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "VAISH / Realm of the Untold",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VAISH / Realm of the Untold",
    description: "A living world by Aryaman V. Gupta.",
    creator: "@paidtoolsdrive",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: "#1a120a",
  width: "device-width",
  initialScale: 1,
}

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Aryaman V. Gupta",
  alternateName: "VAISH",
  url: SITE_URL,
  jobTitle: "Designer / Engineer / World-Builder",
  description:
    "Designer and engineer building interactive worlds for the web. Sites that feel like a place you stepped into, not a page you opened.",
  knowsAbout: [
    "Interactive Design",
    "Motion Design",
    "Creative Development",
    "Frontend Engineering",
    "Brand & Identity",
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrument.variable} ${jetbrains.variable} ${bodoni.variable} ${notoSerifJp.variable} ${notoSerifDevanagari.variable} bg-background`}
    >
      <body className="font-sans antialiased grain overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        <I18nProvider>
          <SoundProvider>
            <RunesProvider>
              <ArcadeProvider>{children}</ArcadeProvider>
              {/* Sound toggle, Konami listener, and Echo Vault live outside
                  the page tree so they're untouched by section transitions.
                  EchoVault is the all-five-runes celebration overlay; mounts
                  silently and only paints when the completion event fires. */}
              <SoundToggle />
              <KonamiSecret />
              <EchoVault />
              {/* `?` opens a keyboard-shortcut overlay; `M` toggles
                  ambient sound. Listener is global; modal is render-on-
                  demand so the DOM stays clean until invoked. */}
              <KeyboardShortcuts />
            </RunesProvider>
          </SoundProvider>
        </I18nProvider>
        <CloudflareAnalytics />
      </body>
    </html>
  )
}
