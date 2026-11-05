import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  DEFAULT_APPS_SCRIPT_URL,
  applyApiHeaders,
  appsScriptAuth,
  clientIp,
  isSameOrigin,
  rateLimit,
  requireSession,
  tooManyRequests,
} from "./_security.js";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

/** Authenticated refresh: SARI Assistant calls SARI Supreme Command (Apps Script) heartbeat. */
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

  const limit = rateLimit(`refresh:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) {
    tooManyRequests(res, limit.retryAfter);
    return;
  }

  const action = "autopilot_heartbeat";
  const auth = appsScriptAuth(action);
  if (!auth) {
    res.status(503).json({ ok: false, error: "SARI_SHARED_SECRET is not configured on the server." });
    return;
  }

  try {
    const upstream = await fetch(process.env.SARI_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, auth }),
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      res.status(502).json({ ok: false, error: `Apps Script returned HTTP ${upstream.status}.` });
      return;
    }
    const data = (await upstream.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; error?: string };
    if (data.ok === false) {
      res.status(502).json({ ok: false, error: data.error || "Supreme Command rejected the refresh." });
      return;
    }
    res.status(200).json({ ok: true, system: "SARI_SUPREME_COMMAND", result: data.result ?? null });
  } catch {
    res.status(502).json({ ok: false, error: "Could not reach the Apps Script backend." });
  }
}
