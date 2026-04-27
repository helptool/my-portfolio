"use server"

import { headers } from "next/headers"

const RESEND_API_URL = "https://api.resend.com/emails"
const FROM = "VAISH Signal <onboarding@resend.dev>"
const TO = "paidtoolsdrive@gmail.com"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ContactResult =
  | { ok: true }
  | { ok: false; error: "invalid_email" | "missing_config" | "send_failed" | "rate_limited" }

// Per-isolate in-memory rate limit. Workers isolates recycle so this is best-
// effort, not a hard global guarantee — sufficient to slow down dumb bots.
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 5
const lastByIp = new Map<string, number[]>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const arr = (lastByIp.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (arr.length >= RATE_MAX) return false
  arr.push(now)
  lastByIp.set(ip, arr)
  return true
}

export async function submitContact(email: string): Promise<ContactResult> {
  const trimmed = (email ?? "").trim().slice(0, 254)
  if (!EMAIL_RE.test(trimmed)) return { ok: false, error: "invalid_email" }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY is not set")
    return { ok: false, error: "missing_config" }
  }

  const h = await headers()
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  const ua = h.get("user-agent") ?? "unknown"

  if (!rateLimit(ip)) return { ok: false, error: "rate_limited" }

  const html = `
    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.6; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">VAISH // new signal</h2>
      <p><strong>Email:</strong> ${escapeHtml(trimmed)}</p>
      <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
      <p><strong>User-Agent:</strong> ${escapeHtml(ua)}</p>
      <p><strong>Time (UTC):</strong> ${new Date().toISOString()}</p>
    </div>
  `.trim()

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: trimmed,
        subject: `VAISH signal: ${trimmed}`,
        html,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error(`[contact] Resend send failed: ${res.status} ${body}`)
      return { ok: false, error: "send_failed" }
    }
    return { ok: true }
  } catch (err) {
    console.error("[contact] Resend send threw:", err)
    return { ok: false, error: "send_failed" }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
