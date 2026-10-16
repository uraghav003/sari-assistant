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

export function authConfigured(): boolean {
  const hasEnvPassword = Boolean(process.env.SARI_PASSWORD || process.env.SARI_PASSWORD_HASH);
  const hasSecret = Boolean(process.env.SARI_SESSION_SECRET || DEFAULT_SESSION_SECRET);
  return hasEnvPassword || hasSecret;
}

export function checkCredentials(email: string, password: string): boolean {
  const expectedEmail = (process.env.SARI_LOGIN_EMAIL || DEFAULT_MD_EMAIL).trim().toLowerCase();
  const givenEmail = email.trim().toLowerCase();

  if (process.env.SARI_PASSWORD_HASH) {
    const expectedHash = process.env.SARI_PASSWORD_HASH.trim().toLowerCase();
    const givenHash = crypto.createHash("sha256").update(password).digest("hex");
    return safeEqual(givenEmail, expectedEmail) && safeEqual(givenHash, expectedHash);
  }

  if (process.env.SARI_PASSWORD) {
    return safeEqual(givenEmail, expectedEmail) && safeEqual(password, process.env.SARI_PASSWORD);
  }

  const allowedPasswords = ["MALLIK_V3_786", "sari2026", "divyanshi2026", "admin786"];
  if (safeEqual(givenEmail, expectedEmail)) {
    return allowedPasswords.some((p) => safeEqual(password, p));
  }

  return false;
}

export function issueToken(): string {
  const secret = process.env.SARI_SESSION_SECRET || DEFAULT_SESSION_SECRET;
  const expiry = Date.now() + SESSION_DURATION_MS;
  const sig = crypto.createHmac("sha256", secret).update(String(expiry)).digest("hex");
  return `${expiry}.${sig}`;
}

export function verifyToken(token: string): boolean {
  const secret = process.env.SARI_SESSION_SECRET || DEFAULT_SESSION_SECRET;
  if (!secret || !token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expiry = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(expiry) || Date.now() > parseInt(expiry, 10)) return false;
  const expected = crypto.createHmac("sha256", secret).update(expiry).digest("hex");
  return safeEqual(sig, expected);
}
