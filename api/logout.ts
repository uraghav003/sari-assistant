import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyApiHeaders, clearSessionCookie, isSameOrigin } from "./_security.js";

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
  try {
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal logout error";
    res.status(500).json({ ok: false, error: message });
  }
}
