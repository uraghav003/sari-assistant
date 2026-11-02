import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  DEFAULT_APPS_SCRIPT_URL,
  applyApiHeaders,
  clientIp,
  isSameOrigin,
  rateLimit,
  requireSession,
  tooManyRequests,
} from "./_security.js";

const PROBE_WINDOW_MS = 60 * 1000;
const PROBE_MAX_REQUESTS = 20;
const CANONICAL_DEPLOYMENT_ID = process.env.SARI_APPS_SCRIPT_URL ? process.env.SARI_APPS_SCRIPT_URL.split("/").slice(-2)[0] : "AKfycbw_DlODYECpdfJKag01Jz5QlmoH2Fdj6kFElfKCOTiZfv8aFeYBLorki_4qlSC5tCr3";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (!isSameOrigin(req)) {
    res.status(403).json({ ok: false, error: "Cross-origin requests are not permitted." });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use GET." });
    return;
  }

  if (!requireSession(req, res)) return;

  const limit = rateLimit(`probe:${clientIp(req)}`, PROBE_MAX_REQUESTS, PROBE_WINDOW_MS);
  if (!limit.ok) {
    tooManyRequests(res, limit.retryAfter);
    return;
  }

  const rawId = typeof req.query?.deploymentId === "string" ? req.query.deploymentId.trim() : "";
  if (rawId && !/^[A-Za-z0-9_-]{20,100}$/.test(rawId)) {
    res.status(400).json({ ok: false, error: "Invalid deploymentId format." });
    return;
  }

  const url = rawId
    ? `https://script.google.com/macros/s/${rawId}/exec?action=status`
    : `${process.env.SARI_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL}?action=status`;

  let timeout: NodeJS.Timeout | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 10000);
    const upstream = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ ok: false, error: `Apps Script HTTP ${upstream.status}` });
      return;
    }

    const data = await upstream.json().catch(() => null);
    if (data && typeof data === "object") {
      res.status(200).json({ ok: true, data });
    } else {
      res.status(200).json({ ok: true, message: "Apps Script responded" });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    res.status(502).json({ ok: false, error: message });
  } finally {
    clearTimeout(timeout);
  }
}
