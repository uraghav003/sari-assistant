import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  applyApiHeaders,
  authConfigured,
  checkCredentials,
  clientIp,
  isSameOrigin,
  rateLimit,
  readBody,
  resetRateLimit,
  tooManyRequests,
} from "./_security.js";

const CHANGE_PW_WINDOW_MS = 15 * 60 * 1000; // 15 mins
const CHANGE_PW_MAX_ATTEMPTS = 5;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function updateLocalEnv(newPassword: string, newHash: string): boolean {
  try {
    const cwd = process.cwd();
    const envProdPath = path.resolve(cwd, ".env.production.local");
    const envPath = path.resolve(cwd, ".env");

    const targetFiles = [envProdPath, envPath].filter((f) => fs.existsSync(f));
    if (targetFiles.length === 0) return false;

    for (const filePath of targetFiles) {
      let content = fs.readFileSync(filePath, "utf8");
      if (/^SARI_PASSWORD=/m.test(content)) {
        content = content.replace(/^SARI_PASSWORD=.*$/m, () => `SARI_PASSWORD=${newPassword}`);
      } else {
        content += `\nSARI_PASSWORD=${newPassword}`;
      }

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
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!email || !currentPassword || !newPassword) {
      res.status(400).json({ ok: false, error: "Email, current password, and new password are required" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ ok: false, error: "New password must be at least 6 characters long" });
      return;
    }

    const limitKey = `change-pw:${clientIp(req)}`;
    const limit = rateLimit(limitKey, CHANGE_PW_MAX_ATTEMPTS, CHANGE_PW_WINDOW_MS);
    if (!limit.ok) {
      tooManyRequests(res, limit.retryAfter);
      return;
    }

    if (!checkCredentials(email, currentPassword)) {
      res.status(401).json({ ok: false, error: "Current credentials invalid" });
      return;
    }

    resetRateLimit(limitKey);

    const newHash = hashPassword(newPassword);

    process.env.SARI_PASSWORD = newPassword;
    process.env.SARI_PASSWORD_HASH = newHash;

    const persistedLocally = updateLocalEnv(newPassword, newHash);

    res.status(200).json({
      ok: true,
      message: "Password changed successfully",
      newHash,
      persistedLocally,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Password change failed";
    res.status(500).json({ ok: false, error: message });
  }
}
