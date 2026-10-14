import crypto from "crypto";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function authConfigured(): boolean {
  return Boolean(
    process.env.SARI_LOGIN_EMAIL &&
    process.env.SARI_PASSWORD_HASH &&
    process.env.SARI_SESSION_SECRET
  );
}

export function checkCredentials(email: string, password: string): boolean {
  if (!authConfigured()) return false;
  const expectedEmail = (process.env.SARI_LOGIN_EMAIL || "").trim().toLowerCase();
  const expectedHash = (process.env.SARI_PASSWORD_HASH || "").trim().toLowerCase();
  const givenEmail = email.trim().toLowerCase();
  const givenHash = crypto.createHash("sha256").update(password).digest("hex");
  return safeEqual(givenEmail, expectedEmail) && safeEqual(givenHash, expectedHash);
}

export function issueToken(): string {
  const secret = process.env.SARI_SESSION_SECRET || "";
  const expiry = Date.now() + SESSION_DURATION_MS;
  const sig = crypto.createHmac("sha256", secret).update(String(expiry)).digest("hex");
  return `${expiry}.${sig}`;
}

export function verifyToken(token: string): boolean {
  const secret = process.env.SARI_SESSION_SECRET || "";
  if (!secret || !token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expiry = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(expiry)) return false;
  if (Date.now() > parseInt(expiry, 10)) return false;
  const expected = crypto.createHmac("sha256", secret).update(expiry).digest("hex");
  return safeEqual(sig, expected);
}
