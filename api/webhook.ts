import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyApiHeaders,
  appsScriptAuth,
  clientIp,
  rateLimit,
  readBody,
  safeEqual,
  tooManyRequests,
} from "./_security.js";

const CANONICAL_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw_DlODYECpdfJKag01Jz5QlmoH2Fdj6kFElfKCOTiZfv8aFeYBLorki_4qlSC5tCr3/exec";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

/**
 * Universal Supreme Command Webhook endpoint for connecting all external agents, 
 * microservices, and webhook event sources into SARI's Sovereign Memory and Audit Vault.
 * Authenticated via Bearer API Key / SARI Master Secret.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
    return;
  }

  const body = readBody(req);
  const authHeader = req.headers.authorization;
  const authorization = Array.isArray(authHeader) ? authHeader[0] || "" : authHeader || "";
  const apiKey = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : typeof body.apiKey === "string"
      ? body.apiKey
      : "";
  const expectedKey = (
    process.env.SARI_WEBHOOK_SECRET ||
    process.env.SARI_MASTER_API_KEY ||
    process.env.SARI_SHARED_SECRET ||
    ""
  ).trim();

  if (!expectedKey) {
    res.status(503).json({ ok: false, error: "SARI webhook authentication is not configured." });
    return;
  }

  if (!safeEqual(apiKey, expectedKey)) {
    res.status(401).json({ ok: false, error: "Unauthorized: Invalid or missing SARI Supreme API Key." });
    return;
  }

  const limit = rateLimit(`webhook:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) {
    tooManyRequests(res, limit.retryAfter);
    return;
  }

  const agentName = String(body.agent || body.source || "external_agent").slice(0, 60);
  const eventType = String(body.event || body.action || "telemetry").slice(0, 60);
  const payload = body.payload || body;

  const action = "autopilot_learn";
  const auth = appsScriptAuth(action);
  if (!auth) {
    res.status(503).json({ ok: false, error: "SARI_SHARED_SECRET is not configured on the server." });
    return;
  }

  try {
    const upstream = await fetch(process.env.SARI_APPS_SCRIPT_URL || CANONICAL_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        auth,
        lessons: [`[${agentName} / ${eventType}] ${JSON.stringify(payload).slice(0, 400)}`],
        skills: [agentName]
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok) {
      res.status(502).json({ ok: false, error: "Upstream sovereign bridge sync failed." });
      return;
    }

    const isAutoHeal = eventType === "auto_heal" || eventType === "auto_fix" || Boolean(body.keys);
    res.status(200).json({
      ok: true,
      supreme: "SARI_SUPREME_COMMAND",
      agent: agentName,
      event: eventType,
      synced: true,
      healed: isAutoHeal,
      autoFixApplied: isAutoHeal,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Webhook dispatcher internal error." });
  }
}