import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyApiHeaders, authConfigured, sessionFromRequest, verifyToken } from "./_security.js";

/**
 * Session probe. The SPA calls this on boot instead of trusting localStorage:
 * the session cookie is HttpOnly, so the server is the only source of truth.
 *
 * `checks` reports only whether each variable exists — never a value. It is
 * here so a misconfigured deployment can be diagnosed without server access.
 */
function configChecks(): Record<string, boolean> {
  const customShared = process.env.SARI_SHARED_SECRET?.trim();
  const validShared = customShared !== undefined ? customShared.length >= 32 : true;
  return {
    sessionSecret: authConfigured(),
    passwordCredential: authConfigured(),
    sharedSecret: validShared,
    modelKey: Boolean(
      process.env.OPENROUTER_API_KEY ||
        process.env.GROQ_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.MALLIK_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.AI_STUDIO_API_KEY ||
        process.env.OPENROUTER_API_KEY
    ),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use GET." });
    return;
  }

  try {
    const checks = configChecks();

    if (!authConfigured()) {
      res.status(503).json({ ok: false, configured: false, checks });
      return;
    }

    const authenticated = verifyToken(sessionFromRequest(req));
    res.status(200).json({ ok: authenticated, configured: true, checks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal session error";
    res.status(500).json({ ok: false, error: message });
  }
}
