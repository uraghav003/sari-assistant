import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const DEFAULT_SESSION_SECRET = "sari_sovereign_secure_hmac_secret_2026_divyanshi";
const DEFAULT_MD_EMAIL = "md@divyanshicapital.com";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function issueToken(): string {
  const secret = process.env.SARI_SESSION_SECRET || DEFAULT_SESSION_SECRET;
  const expiry = Date.now() + SESSION_DURATION_MS;
  const sig = crypto.createHmac("sha256", secret).update(String(expiry)).digest("hex");
  return `${expiry}.${sig}`;
}

function checkCredentials(email: string, password: string): boolean {
  const expectedEmail = (process.env.SARI_LOGIN_EMAIL || DEFAULT_MD_EMAIL).trim().toLowerCase();
  const givenEmail = email.trim().toLowerCase();

  // 1. Explicit hash in environment
  if (process.env.SARI_PASSWORD_HASH) {
    const expectedHash = process.env.SARI_PASSWORD_HASH.trim().toLowerCase();
    const givenHash = crypto.createHash("sha256").update(password).digest("hex");
    return safeEqual(givenEmail, expectedEmail) && safeEqual(givenHash, expectedHash);
  }

  // 2. Plain password in environment
  if (process.env.SARI_PASSWORD) {
    return safeEqual(givenEmail, expectedEmail) && safeEqual(password, process.env.SARI_PASSWORD);
  }

  // 3. Built-in secure fallback passwords for Divyanshi Capital MD Upendra Singh Raghav
  const allowedPasswords = ["MALLIK_V3_786", "sari2026", "divyanshi2026", "admin786"];
  if (safeEqual(givenEmail, expectedEmail)) {
    return allowedPasswords.some((p) => safeEqual(password, p));
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS & Preflight headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-gemini-key, x-sari-token, x-mallik-key");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
    return;
  }

  try {
    let body: Record<string, unknown> = {};
    if (typeof req.body === "object" && req.body !== null) {
      body = req.body as Record<string, unknown>;
    } else if (typeof req.body === "string" && req.body.trim().length > 0) {
      try {
        const parsed: unknown = JSON.parse(req.body);
        if (typeof parsed === "object" && parsed !== null) {
          body = parsed as Record<string, unknown>;
        }
      } catch {
        // unparseable body remains empty object
      }
    }

    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email.trim() || !password) {
      res.status(400).json({ ok: false, error: "Email and password required" });
      return;
    }

    if (checkCredentials(email, password)) {
      res.status(200).json({ ok: true, token: issueToken() });
      return;
    }

    // Generic message — never reveal whether email or password was wrong
    res.status(401).json({ ok: false, error: "Invalid email or password" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal login error";
    res.status(500).json({ ok: false, error: message });
  }
}
