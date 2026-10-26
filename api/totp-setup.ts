import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyApiHeaders, requireSession } from "./_security.js";
import { generateTotpSetup, totpEnabled, verifyTotp } from "./_totp.js";

/**
 * TOTP 2FA setup endpoint.
 *
 * GET  → returns { enabled, qrDataUrl?, secret? } (only if not already enabled)
 * POST → verifies a test code to confirm setup { code: "123456" }
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);
  if (!requireSession(req, res)) return;

  if (req.method === "GET") {
    if (totpEnabled()) {
      res.status(200).json({ ok: true, enabled: true, message: "2FA is already active." });
      return;
    }
    try {
      const setup = await generateTotpSetup();
      res.status(200).json({
        ok: true,
        enabled: false,
        secret: setup.secret,
        qrDataUrl: setup.qrDataUrl,
        uri: setup.uri,
        instructions: "Scan this QR code with Google Authenticator or Authy. Then POST a test code to confirm. Save the secret as SARI_TOTP_SECRET in Vercel env vars.",
      });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to generate TOTP setup" });
    }
    return;
  }

  if (req.method === "POST") {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const code = typeof body.code === "string" ? body.code : "";
    if (!code || !/^\d{6}$/.test(code)) {
      res.status(400).json({ ok: false, error: "Provide a 6-digit code from your authenticator app." });
      return;
    }
    const valid = verifyTotp(code);
    res.status(200).json({ ok: valid, message: valid ? "2FA code verified! TOTP is working." : "Invalid code. Try again." });
    return;
  }

  res.status(405).json({ ok: false, error: "Use GET or POST." });
}
