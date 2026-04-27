import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Nav } from "@/components/site/nav"
import { Hero } from "@/components/site/hero"
import { AboutVaish } from "@/components/site/about-vaish"
import { Manifesto } from "@/components/site/manifesto"
import { ManifestoScrolly } from "@/components/site/manifesto-scrolly"
import { Realms } from "@/components/site/realms"
import { Classes } from "@/components/site/classes"
import { Codex } from "@/components/site/codex"
import { Artifacts } from "@/components/site/artifacts"
import { Ticker } from "@/components/site/ticker"
import { FinalCTA } from "@/components/site/cta"
import { Footer } from "@/components/site/footer"
import { CustomCursor } from "@/components/site/custom-cursor"
import { ScrollArc } from "@/components/site/scroll-arc"
import { RuneDivider } from "@/components/site/rune-divider"
import { SectionReveal } from "@/components/site/section-reveal"
import { IntroLoader } from "@/components/site/loader"
import { SmoothScroll } from "@/components/site/smooth-scroll"
import { LiveStatus } from "@/components/site/live-status"

// MiniGame ships ~2300 LOC of canvas/Framer game logic. Code-split so the
// chunk only loads when the visitor scrolls past the codex into the arcade.
const MiniGame = dynamic(() => import("@/components/site/minigame").then((m) => ({ default: m.MiniGame })), {
  loading: () => <div className="min-h-[600px]" aria-hidden />,
})

/* Per-section share variants. When someone shares the URL with a
   `?section=<id>` query string, social cards render the matching OG image
   (pre-rendered into /public via scripts/gen-og.mjs). The hash is purely
   the in-page scroll target; query params are what crawlers read.

   We keep the title + description aligned with each variant so the unfurl
   in Twitter / Slack / iMessage is fully bespoke per section, not just the
   image. Default (no `?section=`) falls through to the layout's metadata. */
const SECTION_META: Record<
  string,
  { title: string; description: string; image: string }
> = {
  realms: {
    title: "Realms — VAISH",
    description: "Five forgotten kingdoms, each with its own weather, time, and tongue.",
    image: "/og-realms.png",
  },
  manifesto: {
    title: "Manifesto — VAISH",
    description: "Not a portfolio. A place that remembers you stepped in.",
    image: "/og-manifesto.png",
  },
  classes: {
    title: "Classes — VAISH",
    description: "The kits I bring — design, motion, code, narrative.",
    image: "/og-classes.png",
  },
  chronicle: {
    title: "Chronicle — VAISH",
    description: "A long memory of work — entries you can scroll end to end.",
    image: "/og-chronicle.png",
  },
  arcade: {
    title: "Arcade — VAISH",
    description: "Seven small games and a leaderboard that remembers you played.",
    image: "/og-arcade.png",
  },
}

type PageProps = {
  searchParams?: Promise<{ section?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = (await searchParams) ?? {}
  const key = (sp.section ?? "").toLowerCase()
  const v = SECTION_META[key]
  if (!v) return {}
  return {
    title: v.title,
    description: v.description,
    openGraph: {
      title: v.title,
      description: v.description,
      images: [{ url: v.image, width: 1200, height: 630, alt: v.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: v.title,
      description: v.description,
      images: [v.image],
    },
  }
}

/**
 * Page composition
 *
 * Each major section is wrapped in <SectionReveal> with a different flavor so
 * scrolling feels like a series of cuts rather than a uniform fade-up. The
 * RuneDivider acts as the cinematic interlude between rooms.
 */
export default function Page() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <SmoothScroll />
      <IntroLoader />
      <CustomCursor />
      <ScrollArc />
      <Nav />

      <Hero />

      <RuneDivider index="01" labelKey="divider.about" />
      <SectionReveal flavor="aperture" caption="CUE // 01 — ABOUT">
        <AboutVaish />
      </SectionReveal>

      <RuneDivider index="02" labelKey="divider.operator" />
      <SectionReveal flavor="cinema" caption="CUE // 02 — OPERATOR">
        <Manifesto />
      </SectionReveal>

      {/* Scrollytelling principles :: lives between OPERATOR and WORKS
          so it acts as a deliberate pause — the reader has just met the
          person, now they read the practice as a four-act recital. On
          touch / reduced-motion this falls back to a static stack so it
          never fights momentum scroll. */}
      <ManifestoScrolly />

      <RuneDivider index="03" labelKey="divider.works" />
      <SectionReveal flavor="ascend" caption="CUE // 03 — WORKS">
        <Realms />
      </SectionReveal>

      <RuneDivider index="04" labelKey="divider.abilities" />
      <SectionReveal flavor="track" side="right" caption="CUE // 04 — ABILITIES">
        <Classes />
      </SectionReveal>

      <RuneDivider index="05" labelKey="divider.codex" />
      <SectionReveal flavor="aperture" caption="CUE // 05 — CHRONICLES">
        <Codex />
      </SectionReveal>

      <RuneDivider index="06" labelKey="divider.arcade" />
      <SectionReveal flavor="ascend" caption="CUE // 06 — ARCADE">
        <MiniGame />
      </SectionReveal>

      <RuneDivider index="07" labelKey="divider.artifacts" />
      <SectionReveal flavor="track" side="left" caption="CUE // 07 — ARTIFACTS">
        <Artifacts />
      </SectionReveal>

      <Ticker />
      <FinalCTA />
      {/* LiveStatus :: subtle "currently working on" caption above the
          footer. Reads from lib/status.ts so future updates are a tiny
          one-line diff, not a full content rewrite. */}
      <LiveStatus />
      <Footer />
    </main>
  )
}
