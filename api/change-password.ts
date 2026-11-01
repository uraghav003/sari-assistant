import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  applyApiHeaders,
  authConfigured,
  clientIp,
  isSameOrigin,
  rateLimit,
  readBody,
  requireSession,
  sessionFromRequest,
  tooManyRequests,
  verifyToken,
} from "./_security.js";
import { generateTotpSetup, totpEnabled, verifyTotp } from "./_totp.js";

const CHANGE_PW_WINDOW_MS = 15 * 60 * 1000;
const CHANGE_PW_MAX_ATTEMPTS = 5;
const OTP_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

// In-memory OTP store (single-instance; cleared on redeploy — acceptable for single-user)
const resetOtps = new Map<string, { code: string; expiresAt: number }>();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function updateLocalEnv(newHash: string): boolean {
  try {
    const cwd = process.cwd();
    const envProdPath = path.resolve(cwd, ".env.production.local");
    const envPath = path.resolve(cwd, ".env");

    const targetFiles = [envProdPath, envPath].filter((f) => fs.existsSync(f));
    if (targetFiles.length === 0) return false;

    for (const filePath of targetFiles) {
      let content = fs.readFileSync(filePath, "utf8");
      if (/^SARI_PASSWORD_HASH=/m.test(content)) {
        content = content.replace(/^SARI_PASSWORD_HASH=.*$/m, () => `SARI_PASSWORD_HASH=${newHash}`);
      } else {
        content += `\nSARI_PASSWORD_HASH=${newHash}`;
      }
      fs.writeFileSync(filePath, content, "utf8");
    }
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (!isSameOrigin(req)) {
    res.status(403).json({ ok: false, error: "Cross-origin requests are not permitted." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const queryAction = typeof req.query?.action === "string" ? req.query.action : "";
  const body = req.method === "POST" ? readBody(req) : {};
  const action = typeof body.action === "string" ? body.action : (queryAction || (req.method === "GET" ? "totp-setup" : "change"));

  // ── action: "totp-setup" | "totp-verify" (GET / POST) ──────────────────────
  if (action === "totp-setup" || action === "totp-verify") {
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
          instructions:
            "Scan this QR code with Google Authenticator or Authy. Then POST a test code to confirm. Save the secret as SARI_TOTP_SECRET in Vercel env vars.",
        });
      } catch {
        res.status(500).json({ ok: false, error: "Failed to generate TOTP setup" });
      }
      return;
    }

    if (req.method === "POST") {
      const code = typeof body.code === "string" ? body.code : "";
      if (!code || !/^\d{6}$/.test(code)) {
        res.status(400).json({ ok: false, error: "Provide a 6-digit code from your authenticator app." });
        return;
      }
      const valid = verifyTotp(code);
      res.status(200).json({
        ok: valid,
        message: valid ? "2FA code verified! TOTP is working." : "Invalid code. Try again.",
      });
      return;
    }

    res.status(405).json({ ok: false, error: "Use GET or POST." });
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
  // ── action: "request-otp" ─────────────────────────────────────────────────
  if (action === "request-otp") {
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
    resetOtps.set(email, { code, expiresAt: Date.now() + OTP_WINDOW_MS });
    res.status(200).json({
      ok: true,
      message: "Password reset OTP sent to registered email.",
      devCode: process.env.NODE_ENV === "development" ? code : undefined,
    });
    return;
  }

  // ── action: "change" (default) ────────────────────────────────────────────
  const sessionOk = verifyToken(sessionFromRequest(req));
  let authorized = sessionOk;

  if (!sessionOk) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : (typeof body.totpCode === "string" ? body.totpCode.trim() : "");
    const stored = resetOtps.get(email);

    if (email && otp && stored && stored.code === otp && Date.now() < stored.expiresAt) {
      authorized = true;
      resetOtps.delete(email);
    } else if (email && otp && verifyTotp(otp)) {
      authorized = true;
    }
  }

  if (!authorized) {
    res.status(401).json({ ok: false, error: "Unauthorized. Valid session or OTP required." });
    return;
  }

  try {
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!newPassword) {
      res.status(400).json({ ok: false, error: "New password is required" });
      return;
    }

    if (newPassword.length < 12) {
      res.status(400).json({ ok: false, error: "New password must be at least 12 characters long" });
      return;
    }

    const limitKey = `change-pw:${clientIp(req)}`;
    const limit = rateLimit(limitKey, CHANGE_PW_MAX_ATTEMPTS, CHANGE_PW_WINDOW_MS);
    if (!limit.ok) {
      tooManyRequests(res, limit.retryAfter);
      return;
    }

    const newHash = hashPassword(newPassword);
    process.env.SARI_PASSWORD_HASH = newHash;
    delete process.env.SARI_PASSWORD;

    const persistedLocally = updateLocalEnv(newHash);

    res.status(200).json({
      ok: true,
      message: "Password changed successfully",
      persistedLocally,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Password change failed";
    res.status(500).json({ ok: false, error: message });
  }
}
