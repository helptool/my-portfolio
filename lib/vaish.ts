export const brand = {
  name: "VAISH",
  creator: "Aryaman V. Gupta",
  role: "Designer / Engineer / World-Builder",
  roleKey: "designer",
  tagline: "Realm of the Untold",
  subline:
    "I build interactive worlds for the web. Sites that feel like a place you stepped into, not a page you opened.",
  location: "Bengaluru // India",
  locationKey: "bengaluru",
  status: "Available for new quests, Q3.",
}

export const stats = [
  { label: "Years in the field", value: "06" },
  { label: "Realms shipped", value: "47" },
  { label: "Awards & honors", value: "11" },
  { label: "Cups of chai today", value: "04" },
]

// Selected Works framed as Realms / Quests
// Names are brand assets and stay un-translated. Every other surface has a tKey.
export const realms = [
  {
    index: "01",
    name: "Emberfall",
    kind: "Brand World // 2024", kindKey: "r1.kind",
    role: "Direction, Design, Motion", roleKey: "r1.role",
    image: "/realms/emberfall.jpg",
    quote: "Where the sky forgot its color and the ground learned to breathe.", quoteKey: "r1.quote",
    body: "An immersive launch site for a fashion house. Volcanic art direction, scroll-driven cinematography, and a custom WebGL fog system.",
    bodyKey: "r1.body",
    stats: { depth: "04.8 km", heat: "917 K", souls: "001,204" },
  },
  {
    index: "02",
    name: "Hollowreach",
    kind: "Product Site // 2024", kindKey: "r2.kind",
    role: "Engineering, Interaction", roleKey: "r2.role",
    image: "/realms/hollowreach.jpg",
    quote: "Even silence has a geometry here.", quoteKey: "r2.quote",
    body: "Marketing site for a synth audio platform. Reactive crystal grid that visualizes sound across the page in real time.",
    bodyKey: "r2.body",
    stats: { depth: "12.1 km", heat: "264 K", souls: "000,612" },
  },
  {
    index: "03",
    name: "Gildenspire",
    kind: "Editorial // 2023", kindKey: "r3.kind",
    role: "Art Direction, Build", roleKey: "r3.role",
    image: "/realms/gildenspire.jpg",
    quote: "The dawn has a curator here, and a taste for drama.", quoteKey: "r3.quote",
    body: "A digital magazine published in chapters. Each story unfolds as its own pinned, scroll-scored film.",
    bodyKey: "r3.body",
    stats: { depth: "00.0 km", heat: "298 K", souls: "019,870" },
  },
  {
    index: "04",
    name: "Verdant Wylds",
    kind: "Game Site // 2023", kindKey: "r4.kind",
    role: "Design, Motion, Audio", roleKey: "r4.role",
    image: "/realms/verdantwylds.jpg",
    quote: "The forest does not get lost. It lets you.", quoteKey: "r4.quote",
    body: "Reveal site for an indie exploration game. Hidden interactions across the page that mirror in-game discoveries.",
    bodyKey: "r4.body",
    stats: { depth: "00.7 km", heat: "289 K", souls: "003,441" },
  },
]

// Abilities (skills) framed as character classes.
// Each ability now carries a tool stack + the realms it shaped,
// surfaced in the expandable ability drawer on click.
export const classes = [
  {
    id: "warden",
    name: "The Builder",
    role: "Engineering", roleKey: "classes.role.engineering",
    image: "/classes/warden.jpg",
    kicker: "Discipline of the Long Watch", kickerKey: "classes.kicker.builder",
    body: "Production-grade Next.js. Edge runtime. Zero-jank pipelines. Builds that hold weight at scale.",
    bodyKey: "classes.body.builder",
    stats: [
      { label: "TypeScript", value: 96 },
      { label: "Next.js / React", value: 94 },
      { label: "Three.js / WebGL", value: 78 },
    ],
    tools: ["Next.js 16", "React 19", "TypeScript", "Node.js", "Edge Runtime", "Postgres", "tRPC", "Zustand"],
    projects: ["Hollowreach", "Emberfall", "Gildenspire"],
    brief: "I ship at production grade. Accessible, observable, lean. I treat performance as a design constraint, not an afterthought.",
    briefKey: "classes.brief.builder",
  },
  {
    id: "seer",
    name: "The Seer",
    role: "Design Direction", roleKey: "classes.role.design",
    image: "/classes/seer.jpg",
    kicker: "Keeper of Unwritten Hours", kickerKey: "classes.kicker.seer",
    body: "Brand systems, editorial typography, layered visual identity. A gut for what the page wants to become.",
    bodyKey: "classes.body.seer",
    stats: [
      { label: "Visual Direction", value: 95 },
      { label: "Typography", value: 92 },
      { label: "Brand Systems", value: 88 },
    ],
    tools: ["Figma", "Cavalry", "Blender", "After Effects", "Photoshop", "InDesign", "Glyphs App"],
    projects: ["Emberfall", "Gildenspire", "Verdant Wylds"],
    brief: "Direction is a discipline. I write the rules of a world first, then bend type, light, and motion until the whole page speaks one language.",
    briefKey: "classes.brief.seer",
  },
  {
    id: "nightstalker",
    name: "The Nightstalker",
    role: "Motion & Interaction", roleKey: "classes.role.motion",
    image: "/classes/ranger.jpg",
    kicker: "Lessons of the Unsaid Path", kickerKey: "classes.kicker.night",
    body: "Scroll-driven cinema. Physics-tuned micro-interactions. Cursors that breathe. Transitions that earn the wait.",
    bodyKey: "classes.body.night",
    stats: [
      { label: "Motion Craft", value: 95 },
      { label: "GSAP / Framer", value: 93 },
      { label: "Shader FX", value: 72 },
    ],
    tools: ["GSAP", "Framer Motion", "Lenis", "Three.js", "GLSL", "Rive", "Lottie"],
    projects: ["Hollowreach", "Verdant Wylds", "Emberfall"],
    brief: "Motion should carry the story, not decorate it. I chase the feeling of inevitability, where a transition lands so cleanly you stop noticing it is a transition.",
    briefKey: "classes.brief.night",
  },
]

// Chronicles / Career timeline
export const chapters = [
  {
    num: "I",
    year: "2019",
    title: "The Crossing", titleKey: "ch1.title",
    lead: "First commit, first heartbreak.", leadKey: "ch1.lead",
    body: "Started building tiny worlds in a borrowed editor. Learned the difference between making a thing work and making a thing live.",
    bodyKey: "ch1.body",
  },
  {
    num: "II",
    year: "2021",
    title: "The Naming", titleKey: "ch2.title",
    lead: "Found a voice in the noise.", leadKey: "ch2.lead",
    body: "Began shipping under the name VAISH. First site picked up by Awwwards. Realised the work and the world are the same gesture.",
    bodyKey: "ch2.body",
  },
  {
    num: "III",
    year: "2023",
    title: "The Vow", titleKey: "ch3.title",
    lead: "Stopped chasing trends, started chasing weight.", leadKey: "ch3.lead",
    body: "Independent studio of one. Worked with brands across fashion, audio, and indie games. Eleven honors. One quiet rule: nothing forgettable.",
    bodyKey: "ch3.body",
  },
  {
    num: "IV",
    year: "Now", yearKey: "ch4.year",
    title: "The Return", titleKey: "ch4.title",
    lead: "Building this. Then the next one.", leadKey: "ch4.lead",
    body: "Open to new collaborations. Looking for people who treat the web like a stage, not a brochure.",
    bodyKey: "ch4.body",
  },
]

// Achievements / Archive
export const artifacts = [
  { id: "a1", name: "Awwwards SOTD x6", era: "2021 // 2024", kind: "Honor", kindKey: "artifacts.kind.honor", span: "col-span-6 row-span-2", aspect: "aspect-[4/5]" },
  { id: "a2", name: "FWA of the Day", era: "2022", kind: "Honor", kindKey: "artifacts.kind.honor", span: "col-span-3 row-span-1", aspect: "aspect-square" },
  { id: "a3", name: "CSSDA Best UI", era: "2023", kind: "Honor", kindKey: "artifacts.kind.honor", span: "col-span-3 row-span-1", aspect: "aspect-square" },
  { id: "a4", name: "Speaker, Web Unleashed", era: "2023", kind: "Talk", kindKey: "artifacts.kind.talk", span: "col-span-4 row-span-1", aspect: "aspect-[5/4]" },
  { id: "a5", name: "Featured, SiteInspire", era: "2024", kind: "Press", kindKey: "artifacts.kind.press", span: "col-span-5 row-span-1", aspect: "aspect-[6/4]" },
  { id: "a6", name: "Mentor, Designer Fund", era: "Ongoing", kind: "Service", kindKey: "artifacts.kind.service", span: "col-span-3 row-span-1", aspect: "aspect-square" },
]

// Ticker uses i18n keys. "VAISH" stays as a literal brand mark.
export const tickerKeys: (string | "VAISH")[] = [
  "ticker.beyond",
  "VAISH",
  "ticker.craft",
  "VAISH",
  "ticker.enter",
  "VAISH",
  "ticker.memory",
  "VAISH",
  "ticker.q3",
  "VAISH",
]

export const navItems = [
  { label: "Index", labelKey: "nav.index", href: "#index", code: "00" },
  { label: "About", labelKey: "nav.about", href: "#about-vaish", code: "01" },
  { label: "Works", labelKey: "nav.works", href: "#realms", code: "02" },
  { label: "Abilities", labelKey: "nav.abilities", href: "#classes", code: "03" },
  { label: "Chronicles", labelKey: "nav.chronicles", href: "#codex", code: "04" },
  { label: "Play", labelKey: "nav.play", href: "#play", code: "05" },
  { label: "Contact", labelKey: "nav.contact", href: "#signal", code: "06" },
]

// Arcade: six distinct mini-games, each with its own isolated leaderboard.
export const arcade = {
  intro:
    "Six small rituals. Each asks something different of you. Choose one, speak your name, and try to outlast the ghost of your last run.",
  games: [
    {
      id: "rune-chase",
      code: "R.01",
      name: "Rune Chase",
      kicker: "Collect. Evade. Breathe.",
      brief:
        "Move your sigil through the field. Collect amber glyphs. Avoid the red wounds. Sixty seconds. Do not blink.",
      controls: "Mouse or Arrows / WASD",
      duration: 60,
      scoreUnit: "pts",
    },
    {
      id: "glyph-reflex",
      code: "R.02",
      name: "Glyph Reflex",
      kicker: "See it. Strike it. Before it forgets you.",
      brief:
        "Runes surface across the veil at random. Tap each one before it fades. Chain hits to raise the combo. One miss resets the chain.",
      controls: "Tap / Click",
      duration: 30,
      scoreUnit: "pts",
    },
    {
      id: "memory-pulse",
      code: "R.03",
      name: "Memory Pulse",
      kicker: "Listen twice. Answer once.",
      brief:
        "Four runes keep a secret between them. The veil whispers a pattern. Repeat it back. Each round grows one step longer.",
      controls: "Tap / Click",
      duration: null as number | null,
      scoreUnit: "rounds",
    },
    {
      id: "rune-match",
      code: "R.04",
      name: "Rune Match",
      kicker: "Twelve sigils. Six pairs. One breath.",
      brief:
        "Flip the tiles. Match the glyph pairs. Every mismatch drains the veil. Finish fast, finish clean, climb the board.",
      controls: "Tap / Click",
      duration: null as number | null,
      scoreUnit: "pts",
    },
    {
      id: "sigil-trace",
      code: "R.05",
      name: "Sigil Trace",
      kicker: "Draw the sigil in one stroke.",
      brief:
        "A sigil appears. Trace it without lifting. Accuracy and speed score you. Three sigils per seal, each one harder.",
      controls: "Mouse / Touch drag",
      duration: null as number | null,
      scoreUnit: "pts",
    },
    {
      id: "sigil-forge",
      code: "R.06",
      name: "Sigil Forge",
      kicker: "Ignite every rune in the grid.",
      brief:
        "A 4x4 grid of dormant runes. Tap a rune to light it and its neighbors. The toggle cascades. Forge every cell awake. Solve fast to climb the board. Ninety seconds, as many sigils as you can.",
      controls: "Tap / Click",
      duration: 90,
      scoreUnit: "pts",
    },
  ],
  achievements: [
    { score: 10, label: "Initiate" },
    { score: 25, label: "Wayfinder" },
    { score: 50, label: "Rune Singer" },
    { score: 100, label: "Veil Walker" },
  ],
}
