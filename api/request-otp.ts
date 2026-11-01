import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyApiHeaders, isSameOrigin, rateLimit, readBody, tooManyRequests } from "./_security.js";
import { verifyTotp } from "./_totp.js";

const OTP_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

export const resetOtps = new Map<string, { code: string; expiresAt: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (!isSameOrigin(req)) {
    res.status(403).json({ ok: false, error: "Cross-origin requests not permitted." });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const body = readBody(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      res.status(400).json({ ok: false, error: "Email is required" });
      return;
    }

    const limitKey = `request-otp:${email}`;
    const limit = rateLimit(limitKey, OTP_MAX_ATTEMPTS, OTP_WINDOW_MS);
    if (!limit.ok) {
      tooManyRequests(res, limit.retryAfter);
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetOtps.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    res.status(200).json({
      ok: true,
      message: "Password reset OTP sent to registered email.",
      devCode: process.env.NODE_ENV === "development" ? code : undefined
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to request OTP";
    res.status(500).json({ ok: false, error: message });
  }
}
