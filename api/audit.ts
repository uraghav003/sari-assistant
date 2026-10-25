import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyApiHeaders,
  clientIp,
  isSameOrigin,
  rateLimit,
  readBody,
  requireSession,
  tooManyRequests,
} from "./_security.js";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

/**
 * Server-side audit sink.
 *
 * Events are written to stdout as single-line JSON, which Vercel retains in the
 * function log. This is the durable half of the audit trail; the browser-side
 * log is only a UI convenience.
 */
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

  const limit = rateLimit(`audit:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) {
    tooManyRequests(res, limit.retryAfter);
    return;
  }

  try {
    const body = readBody(req);
    const text = (value: unknown, max: number): string =>
      typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max) : "";

    const action = text(body.action, 80);
    const status = text(body.status, 40);
    const detail = text(body.detail, 300);

    if (!action) {
      res.status(400).json({ ok: false, error: "action is required" });
      return;
    }

    // Single-line JSON: greppable in `vercel logs`, no PII beyond what the caller sent.
    console.log(
      JSON.stringify({
        type: "sari.audit",
        at: new Date().toISOString(),
        action,
        status,
        detail,
        ip: clientIp(req),
      })
    );

    res.status(202).json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal audit error";
    res.status(500).json({ ok: false, error: message });
  }
}
