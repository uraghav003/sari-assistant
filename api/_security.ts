import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Shared security primitives for every /api route.
 *
 * Design rules enforced here:
 *  - No default secrets. If the environment is not configured, we fail closed.
 *  - No hardcoded passwords. The built-in fallback list is gone.
 *  - Sessions live in an HttpOnly cookie, never in localStorage.
 *  - Every state-changing route is same-origin and rate limited.
 */

export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export const DEFAULT_APPS_SCRIPT_URL =
  process.env.SARI_APPS_SCRIPT_URL ??
  "https://script.google.com/macros/s/AKfycbw_DlODYECpdfJKag01Jz5QlmoH2Fdj6kFElfKCOTiZfv8aFeYBLorki_4qlSC5tCr3/exec";
export const SESSION_COOKIE = "sari_session";
const MIN_SECRET_LENGTH = 32;


function sessionSecret(): string | null {
  const value = process.env.SARI_SESSION_SECRET;
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < MIN_SECRET_LENGTH) return null;
  return trimmed;
}

// Per-process key for safeEqual; never leaves this module.
const _safeEqualKey = crypto.randomBytes(32);

/**
 * Constant-time string equality. Both values are HMAC'd to a fixed 32-byte
 * digest before comparison so buffer-length differences cannot be observed
 * as a timing side-channel.
 */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ha = crypto.createHmac("sha256", _safeEqualKey).update(a).digest();
  const hb = crypto.createHmac("sha256", _safeEqualKey).update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Returns true only when a secure session secret (≥32 chars) and at least
 * one credential check (SARI_PASSWORD or SARI_PASSWORD_HASH) are configured.
 */
export function authConfigured(): boolean {
  const hasSecret = sessionSecret() !== null;
  const hasCredential = Boolean(
    process.env.SARI_LOGIN_EMAIL?.trim() &&
      (process.env.SARI_PASSWORD_HASH?.trim() || process.env.SARI_PASSWORD)
  );
  return hasSecret && hasCredential;
}

export function issueToken(): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const expiry = Date.now() + SESSION_DURATION_MS;
  const sig = crypto.createHmac("sha256", secret).update(String(expiry)).digest("hex");
  return `${expiry}.${sig}`;
}

export function verifyToken(token: string | undefined | null): boolean {
  const secret = sessionSecret();
  if (!secret || !token || typeof token !== "string" || token.length > 500) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expiry = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d{1,15}$/.test(expiry) || Date.now() > parseInt(expiry, 10)) return false;
  const expected = crypto.createHmac("sha256", secret).update(expiry).digest("hex");
  return safeEqual(sig, expected);
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    }
  }
  return out;
}
export function sessionFromRequest(req: VercelRequest): string | null {
  const cookies = parseCookies(req.headers?.cookie);
  return cookies[SESSION_COOKIE] || null;
}

export function sessionCookieAttributes(): string {
  const isDev = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "development";
  const secure = isDev ? "" : " Secure;";
  return `HttpOnly;${secure} SameSite=Strict; Path=/`;
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${sessionCookieAttributes()}; Max-Age=${Math.floor(
      SESSION_DURATION_MS / 1000
    )}`
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; ${sessionCookieAttributes()}; Max-Age=0`
  );
}

/** Baseline headers for every API response. */
export function applyApiHeaders(res: VercelResponse): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
}

/**
 * Reject cross-site requests. The SPA is same-origin, so any Origin that does
 * not match the serving host is hostile (defence in depth alongside SameSite).
 */
export function isSameOrigin(req: VercelRequest): boolean {
  const origin = req.headers?.origin;
  if (!origin || origin === "null") return !origin; // no Origin: same-origin fetch or curl
  try {
    const originHost = new URL(origin).host.toLowerCase().replace(/:(443|80)$/, "");
    const rawHost = req.headers?.["x-forwarded-host"] || req.headers?.host;
    const host = (Array.isArray(rawHost) ? rawHost[0] : rawHost)?.split(",")[0]?.trim()?.toLowerCase()?.replace(/:(443|80)$/, "");
    return typeof host === "string" && originHost === host;
  } catch {
    return false;
  }
}

export function clientIp(req: VercelRequest): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const remoteAddr = req.socket?.remoteAddress;
  if (typeof remoteAddr === "string" && remoteAddr.length > 0) {
    return remoteAddr;
  }
  return "unknown";
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Fixed-window, in-memory limiter. Per-instance only — pair with a WAF at scale. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (buckets.size > 1000) {
    for (const [k, b] of buckets.entries()) {
      if (now > b.resetAt) buckets.delete(k);
    }
  }
  const current = buckets.get(key);
  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  current.count += 1;
  if (current.count > limit) {
    return { ok: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}
export function tooManyRequests(res: VercelResponse, retryAfter: number): void {
  res.setHeader("Retry-After", String(retryAfter));
  res.status(429).json({ ok: false, error: "Too many requests. Try again shortly." });
}

/** Clears a bucket, e.g. after a successful login. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Returns true when the request carries a valid session; otherwise writes 401. */
export function requireSession(req: VercelRequest, res: VercelResponse): boolean {
  if (!authConfigured()) {
    res.status(503).json({
      ok: false,
      error: "Server auth is not configured. Set SARI_SESSION_SECRET and SARI_PASSWORD_HASH.",
    });
    return false;
  }
  if (!verifyToken(sessionFromRequest(req))) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

export function readBody(req: VercelRequest): Record<string, unknown> {
  if (typeof req.body === "object" && req.body !== null && !Array.isArray(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === "string" && req.body.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(req.body);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // unparseable body is treated as empty
    }
  }
  return {};
}
/**
 * Credential check. Prefers `SARI_PASSWORD_HASH` (scrypt:<saltHex>:<hashHex>,
 * or a legacy 64-char SHA-256 hex digest), then `SARI_PASSWORD`. No fallbacks.
 */
export function checkCredentials(email: string, password: string): boolean {
  if (typeof email !== "string" || typeof password !== "string" || password.length > 512) return false;
  const rawEmailEnv = (process.env.SARI_LOGIN_EMAIL || "").trim().toLowerCase();
  if (!rawEmailEnv) return false;
  const givenEmail = email.trim().toLowerCase();
  const allowedEmails = rawEmailEnv.split(",").map(e => e.trim());
  if (!allowedEmails.includes(givenEmail)) return false;

  const passwordEnv = process.env.SARI_PASSWORD?.trim();
  if (passwordEnv && safeEqual(password, passwordEnv)) return true;

  const hash = process.env.SARI_PASSWORD_HASH?.trim();
  if (hash) {
    if (hash.startsWith("scrypt:")) {
      const parts = hash.split(":");
      const saltHex = parts[1];
      const digestHex = parts[2];
      if (!saltHex || !digestHex) return false;
      try {
        const derived = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 64).toString("hex");
        return safeEqual(derived, digestHex.toLowerCase());
      } catch {
        return false;
      }
    }
    const givenHash = crypto.createHash("sha256").update(password).digest("hex");
    return safeEqual(givenHash, hash.toLowerCase());
  }

  return false; // no credentials configured — fail closed
}

export function signPayload(action: string, timestamp: string, sharedSecret: string): string {
  return crypto.createHmac("sha256", sharedSecret).update(`${action}.${timestamp}`).digest("hex");
}

/** Signed envelope for the Apps Script bridge. Returns null when unconfigured. */
export function appsScriptAuth(action: string): { ts: string; sig: string } | null {
  const shared = process.env.SARI_SHARED_SECRET?.trim();
  if (!shared || shared.length < 32) return null;
  const ts = String(Date.now());
  return { ts, sig: signPayload(action, ts, shared) };
}
