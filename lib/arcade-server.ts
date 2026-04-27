import "server-only"
import { createHmac, randomBytes } from "crypto"
import { getCloudflareContext } from "@opennextjs/cloudflare"

/**
 * Per-game score rules. Used to reject obviously fabricated submissions.
 * - maxScorePerSecond caps the score rate. Above this = bypass attempt.
 * - minDuration is a soft floor to reject instant-finish submissions.
 * - maxDuration caps runaway sessions.
 */
export const GAME_RULES = {
  "rune-chase": { maxScorePerSecond: 5, minDurationMs: 6_000, maxDurationMs: 120_000, fixedDurationSec: 60 },
  "glyph-reflex": { maxScorePerSecond: 12, minDurationMs: 5_000, maxDurationMs: 90_000, fixedDurationSec: 30 },
  "memory-pulse": { maxScorePerSecond: 2, minDurationMs: 2_500, maxDurationMs: 300_000, fixedDurationSec: null as number | null },
  "rune-match": { maxScorePerSecond: 8, minDurationMs: 4_000, maxDurationMs: 180_000, fixedDurationSec: null as number | null },
  "sigil-trace": { maxScorePerSecond: 60, minDurationMs: 1_800, maxDurationMs: 30_000, fixedDurationSec: null as number | null },
  "sigil-forge": { maxScorePerSecond: 12, minDurationMs: 4_000, maxDurationMs: 180_000, fixedDurationSec: 90 },
} as const

export type GameId = keyof typeof GAME_RULES

const GAME_IDS = Object.keys(GAME_RULES) as GameId[]
const GAME_ID_SET = new Set<string>(GAME_IDS)

export type ScoreRow = {
  id: string
  game: GameId
  name: string
  score: number
  stats: Record<string, string | number>
  createdAt: number
}

const SESSION_TTL_MS = 30 * 60 * 1000
const TOP_LIMIT = 20

// HMAC secret must be stable across Worker isolates so a session opened on
// isolate A can be verified on isolate B. Set ARCADE_SECRET as a Worker
// secret in production. Local dev falls back to an ephemeral random hex —
// fine for `npm run dev`, useless for cross-request stability.
let cachedSecret: string | null = null
function getSecret(): string {
  if (cachedSecret) return cachedSecret
  const env = process.env.ARCADE_SECRET
  if (env && env.length >= 32) {
    cachedSecret = env
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[arcade] ARCADE_SECRET is not set in production. Sessions will not survive isolate recycles."
      )
    }
    cachedSecret = randomBytes(32).toString("hex")
  }
  return cachedSecret
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex")
}

// Minimal local typing for the D1 binding so we don't take a hard dependency
// on @cloudflare/workers-types. Mirrors the shape used here only.
type D1RunResult = { meta?: { changes?: number } }
type D1Stmt = {
  bind: (...values: unknown[]) => D1Stmt
  first: <T = unknown>() => Promise<T | null>
  all: <T = unknown>() => Promise<{ results?: T[] }>
  run: () => Promise<D1RunResult>
}
type D1 = {
  prepare: (sql: string) => D1Stmt
  batch: (stmts: D1Stmt[]) => Promise<D1RunResult[]>
}

function db(): D1 {
  const env = getCloudflareContext().env as unknown as { DB?: D1 }
  if (!env.DB) {
    throw new Error(
      "[arcade] D1 binding 'DB' is not configured. Add it to wrangler.jsonc and apply db/schema.sql."
    )
  }
  return env.DB
}

function sanitizeName(input: string) {
  const trimmed = (input || "").trim().slice(0, 20)
  // Keep letters, digits, spaces, hyphens, underscores and a few safe unicode marks.
  const safe = trimmed.replace(/[^\p{L}\p{N}\p{M} _.\-]/gu, "")
  return safe || "Wanderer"
}

function sanitizeStats(stats: Record<string, unknown> | undefined) {
  const out: Record<string, string | number> = {}
  if (!stats) return out
  let entries = 0
  for (const [k, v] of Object.entries(stats)) {
    if (entries >= 6) break
    const key = String(k).slice(0, 24)
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v
    else if (typeof v === "string") out[key] = v.slice(0, 48)
    entries++
  }
  return out
}

function rowToScore(row: {
  id: string
  game: string
  name: string
  score: number
  stats: string
  created_at: number
}): ScoreRow {
  let stats: Record<string, string | number> = {}
  try {
    const parsed = JSON.parse(row.stats)
    if (parsed && typeof parsed === "object") stats = parsed
  } catch {
    /* ignore corrupt stats */
  }
  return {
    id: row.id,
    game: row.game as GameId,
    name: row.name,
    score: row.score,
    stats,
    createdAt: row.created_at,
  }
}

export async function openSession(game: GameId): Promise<{
  sessionId: string
  token: string
  startedAt: number
  game: GameId
}> {
  if (!GAME_ID_SET.has(game)) throw new Error("Unknown game.")
  const id = randomBytes(12).toString("hex")
  const salt = randomBytes(8).toString("hex")
  const startedAt = Date.now()
  const cutoff = startedAt - SESSION_TTL_MS

  const d = db()
  // Insert + opportunistic cleanup of expired/submitted rows.
  await d.batch([
    d.prepare("DELETE FROM arcade_sessions WHERE submitted = 1 OR started_at < ?1").bind(cutoff),
    d
      .prepare(
        "INSERT INTO arcade_sessions (id, game, started_at, submitted, salt) VALUES (?1, ?2, ?3, 0, ?4)"
      )
      .bind(id, game, startedAt, salt),
  ])

  const token = sign(`${id}|${game}|${startedAt}|${salt}`)
  return { sessionId: id, token, startedAt, game }
}

export type SubmissionResult =
  | { ok: true; rank: number | null; top: ScoreRow[] }
  | { ok: false; reason: string }

export async function submit(opts: {
  sessionId: string
  token: string
  game: GameId
  score: number
  name: string
  durationMs?: number
  stats?: Record<string, unknown>
}): Promise<SubmissionResult> {
  if (!GAME_ID_SET.has(opts.game)) return { ok: false, reason: "Unknown game." }
  const d = db()

  const sess = await d
    .prepare(
      "SELECT id, game, started_at, submitted, salt FROM arcade_sessions WHERE id = ?1 LIMIT 1"
    )
    .bind(opts.sessionId)
    .first<{ id: string; game: string; started_at: number; submitted: number; salt: string }>()

  if (!sess) return { ok: false, reason: "Session missing or expired." }
  if (sess.submitted === 1) return { ok: false, reason: "Session already submitted." }
  if (sess.game !== opts.game) return { ok: false, reason: "Session / game mismatch." }

  const expectedToken = sign(`${sess.id}|${sess.game}|${sess.started_at}|${sess.salt}`)
  if (expectedToken !== opts.token) return { ok: false, reason: "Token invalid." }

  const rules = GAME_RULES[sess.game as GameId]
  const now = Date.now()
  const durationMs = Math.max(
    0,
    Math.min(opts.durationMs ?? now - sess.started_at, now - sess.started_at + 2000)
  )
  if (durationMs < rules.minDurationMs) return { ok: false, reason: "Duration too short." }
  if (durationMs > rules.maxDurationMs) return { ok: false, reason: "Duration out of range." }

  if (!Number.isFinite(opts.score) || opts.score < 0 || opts.score > 100_000) {
    return { ok: false, reason: "Score out of range." }
  }

  const durationSec = durationMs / 1000
  const maxExpected = rules.maxScorePerSecond * Math.max(durationSec, 1)
  if (opts.score > maxExpected * 1.25) return { ok: false, reason: "Score rate not plausible." }

  const name = sanitizeName(opts.name)
  const stats = sanitizeStats(opts.stats)
  const row: ScoreRow = {
    id: randomBytes(6).toString("hex"),
    game: sess.game as GameId,
    name,
    score: Math.floor(opts.score),
    stats,
    createdAt: now,
  }

  // Atomic claim + insert in a single D1 transaction. Both statements are
  // gated on submitted=0, so:
  //   - If the session is unclaimed, both INSERT and UPDATE write a row each.
  //     batch() commits them together.
  //   - If a concurrent request already claimed it, neither writes (changes=0
  //     on both) and we bail out cleanly.
  //   - If any statement throws (D1 transient error etc), batch() rolls the
  //     whole transaction back. The session is NOT burned, so the user can
  //     retry without losing their score.
  const results = await d.batch([
    d
      .prepare(
        "INSERT INTO arcade_scores (id, game, name, score, stats, created_at) " +
          "SELECT ?1, ?2, ?3, ?4, ?5, ?6 " +
          "WHERE EXISTS (SELECT 1 FROM arcade_sessions WHERE id = ?7 AND submitted = 0)"
      )
      .bind(row.id, row.game, row.name, row.score, JSON.stringify(stats), row.createdAt, sess.id),
    d
      .prepare("UPDATE arcade_sessions SET submitted = 1 WHERE id = ?1 AND submitted = 0")
      .bind(sess.id),
  ])
  if ((results[0]?.meta?.changes ?? 0) === 0) {
    return { ok: false, reason: "Session already submitted." }
  }

  const top = await getTop(row.game)
  const rank = top.findIndex((r) => r.id === row.id)
  return { ok: true, rank: rank >= 0 ? rank + 1 : null, top }
}

export async function getTop(game: GameId): Promise<ScoreRow[]> {
  if (!GAME_ID_SET.has(game)) return []
  const d = db()
  const res = await d
    .prepare(
      "SELECT id, game, name, score, stats, created_at FROM arcade_scores WHERE game = ?1 ORDER BY score DESC, created_at ASC LIMIT ?2"
    )
    .bind(game, TOP_LIMIT)
    .all<{
      id: string
      game: string
      name: string
      score: number
      stats: string
      created_at: number
    }>()
  return (res.results ?? []).map(rowToScore)
}

export async function getAllTop(): Promise<Record<GameId, ScoreRow[]>> {
  const out = {} as Record<GameId, ScoreRow[]>
  // Fan out in parallel — D1 over local socket is cheap, and there are only 6 games.
  const results = await Promise.all(GAME_IDS.map((g) => getTop(g)))
  GAME_IDS.forEach((g, i) => {
    out[g] = results[i]
  })
  return out
}
