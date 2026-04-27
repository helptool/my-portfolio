-- Arcade leaderboard schema for the `portfolio-arcade` D1 database.
--
-- Apply via Cloudflare dashboard:
--   D1 SQL Database -> portfolio-arcade -> Console -> paste this file -> Execute
--
-- Or via wrangler (after `wrangler login`):
--   npx wrangler d1 execute portfolio-arcade --remote --file=db/schema.sql

CREATE TABLE IF NOT EXISTS arcade_sessions (
  id          TEXT PRIMARY KEY,
  game        TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  submitted   INTEGER NOT NULL DEFAULT 0,
  salt        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_started_at
  ON arcade_sessions (started_at);

CREATE TABLE IF NOT EXISTS arcade_scores (
  id          TEXT PRIMARY KEY,
  game        TEXT NOT NULL,
  name        TEXT NOT NULL,
  score       INTEGER NOT NULL,
  stats       TEXT NOT NULL DEFAULT '{}',
  created_at  INTEGER NOT NULL
);

-- Leaderboard read pattern: top N per game ordered by score desc, then earliest first.
CREATE INDEX IF NOT EXISTS idx_scores_game_rank
  ON arcade_scores (game, score DESC, created_at ASC);
