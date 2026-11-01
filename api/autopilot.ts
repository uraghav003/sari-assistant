import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  DEFAULT_APPS_SCRIPT_URL,
  applyApiHeaders,
  appsScriptAuth,
  clientIp,
  isSameOrigin,
  rateLimit,
  readBody,
  requireSession,
  tooManyRequests,
} from "./_security.js";

const CANONICAL_APPS_SCRIPT_URL = DEFAULT_APPS_SCRIPT_URL;

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

function stringList(value: unknown, maxItems: number, maxChars: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, maxItems)
    .map((item) => item.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxChars))
    .filter(Boolean);
}

/** Authenticated proxy for memory/lesson sync — the browser never signs requests. */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (!isSameOrigin(req)) {
    res.status(403).json({ ok: false, error: "Cross-origin requests are not permitted." });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
    return;
  }

  if (!requireSession(req, res)) return;

  const limit = rateLimit(`autopilot:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) {
    tooManyRequests(res, limit.retryAfter);
    return;
  }

  const action = "autopilot_learn";
  const auth = appsScriptAuth(action);
  if (!auth) {
    res.status(503).json({ ok: false, error: "SARI_SHARED_SECRET is not configured on the server." });
    return;
  }

  const body = readBody(req);
  const lessons = stringList(body.lessons, 20, 300);
  const skills = Array.isArray(body.skills) ? body.skills.slice(0, 50) : [];

  if (lessons.length === 0 && skills.length === 0) {
    res.status(400).json({ ok: false, error: "Nothing to sync." });
    return;
  }

  try {
    const upstream = await fetch(process.env.SARI_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, auth, lessons, skills }),
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      res.status(502).json({ ok: false, error: `Apps Script returned HTTP ${upstream.status}.` });
      return;
    }
    res.status(200).json({ ok: true, lessons: lessons.length, skills: skills.length });
  } catch {
    res.status(502).json({ ok: false, error: "Could not reach the Apps Script backend." });
  }
}
