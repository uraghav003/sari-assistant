import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyApiHeaders, authConfigured, sessionFromRequest, verifyToken } from "./_security.js";

/**
 * Session probe. The SPA calls this on boot instead of trusting localStorage:
 * the session cookie is HttpOnly, so the server is the only source of truth.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use GET." });
    return;
  }

  if (!authConfigured()) {
    res.status(503).json({ ok: false, configured: false });
    return;
  }

  const authenticated = verifyToken(sessionFromRequest(req));
  res.status(200).json({ ok: authenticated, configured: true });
}
