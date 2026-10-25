import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyApiHeaders,
  authConfigured,
  checkCredentials,
  clientIp,
  issueToken,
  isSameOrigin,
  rateLimit,
  readBody,
  resetRateLimit,
  setSessionCookie,
  tooManyRequests,
} from "./_security.js";

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (!isSameOrigin(req)) {
    res.status(403).json({ ok: false, error: "Cross-origin login is not permitted." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
    return;
  }

  if (!authConfigured()) {
    res.status(503).json({
      ok: false,
      error: "Server auth is not configured. Set SARI_SESSION_SECRET and SARI_PASSWORD_HASH.",
    });
    return;
  }

  try {
    const body = readBody(req);
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email.trim() || !password) {
      res.status(400).json({ ok: false, error: "Email and password required" });
      return;
    }

    // Count only real credential attempts, and clear the bucket on success.
    const limitKey = `login:${clientIp(req)}`;
    const limit = rateLimit(limitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
    if (!limit.ok) {
      tooManyRequests(res, limit.retryAfter);
      return;
    }

    if (!checkCredentials(email, password)) {
      // Generic message — never reveal whether the email or the password was wrong.
      res.status(401).json({ ok: false, error: "Invalid email or password" });
      return;
    }

    resetRateLimit(limitKey);

    const token = issueToken();
    if (!token) {
      res.status(503).json({ ok: false, error: "Server auth is not configured." });
      return;
    }

    setSessionCookie(res, token);
    res.status(200).json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "Internal login error" });
  }
}
