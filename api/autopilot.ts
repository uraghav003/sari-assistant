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

  // /api/sari/:op is rewritten here by vercel.json (no extra serverless function).
  const op = typeof req.query.op === "string" ? req.query.op : "";
  if (op === "learn" || op === "simulate") {
    res.status(501).json({ ok: false, error: `"${op}" is not implemented on the cloud backend (Apps Script has no matching action).` });
    return;
  }
  if (op === "alerts") {
    const mailAuth = appsScriptAuth("gmail_mis_incoming");
    if (!mailAuth) {
      res.status(503).json({ ok: false, error: "SARI_SHARED_SECRET is not configured on the server." });
      return;
    }
    try {
      const upstream = await fetch(process.env.SARI_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gmail_mis_incoming", auth: mailAuth, limit: 10 }),
        signal: AbortSignal.timeout(20000),
      });
      const data = (await upstream.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        result?: { emails?: Array<{ subject?: string; from?: string; date?: string; snippet?: string; unread?: boolean; error?: string }> };
      };
      if (!upstream.ok || data.ok !== true || !Array.isArray(data.result?.emails)) {
        const hint = data.error === "UNKNOWN_ACTION" ? "Email alerts need the updated Apps Script (gmail_mis_incoming) deployed." : data.error || "Email alert source unavailable.";
        res.status(502).json({ ok: false, error: hint });
        return;
      }
      const alerts = data.result.emails
        .filter((e) => !e.error && e.subject)
        .map((e) => ({
          id: `${e.date ?? ""}|${e.subject}`.slice(0, 240),
          subject: String(e.subject).slice(0, 200),
          from: String(e.from ?? "").slice(0, 100),
          date: e.date ?? null,
          snippet: String(e.snippet ?? "").slice(0, 200),
          unread: e.unread !== false,
        }));
      res.status(200).json({ ok: true, count: alerts.length, alerts });
    } catch {
      res.status(502).json({ ok: false, error: "Could not reach the Apps Script backend." });
    }
    return;
  }

  const body = readBody(req);
  const refresh = body.refresh === true || op === "activate";
  const action = refresh ? "autopilot_heartbeat" : "autopilot_learn";
  const auth = appsScriptAuth(action);
  if (!auth) {
    res.status(503).json({ ok: false, error: "SARI_SHARED_SECRET is not configured on the server." });
    return;
  }

  const lessons = refresh ? [] : stringList(body.lessons, 20, 300);
  const skills = refresh ? [] : Array.isArray(body.skills) ? body.skills.slice(0, 50) : [];

  if (!refresh && lessons.length === 0 && skills.length === 0) {
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
    if (refresh) {
      const data = (await upstream.json().catch(() => ({}))) as { ok?: boolean; result?: { message?: string } | null; error?: string };
      if (data.ok !== true || !data.result?.message) {
        res.status(502).json({ ok: false, error: data.error || "Supreme Command did not acknowledge the refresh." });
        return;
      }
      if (op === "activate") {
        res.status(200).json({ ok: true, status: "active", mode: "autonomous", message: data.result.message });
        return;
      }
      res.status(200).json({ ok: true, system: "SARI_SUPREME_COMMAND", result: data.result });
      return;
    }
    res.status(200).json({ ok: true, lessons: lessons.length, skills: skills.length });
  } catch {
    res.status(502).json({ ok: false, error: "Could not reach the Apps Script backend." });
  }
}
