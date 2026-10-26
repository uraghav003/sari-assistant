import { TOTP } from "otpauth";
import QRCode from "qrcode";

const TOTP_ISSUER = "SARI";
const TOTP_LABEL = "Divyanshi Capital";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;

/**
 * Returns the configured TOTP secret, or null when 2FA is not enabled.
 * Set SARI_TOTP_SECRET in Vercel env vars to enable.
 */
export function totpSecret(): string | null {
  const raw = process.env.SARI_TOTP_SECRET?.trim();
  return raw && raw.length >= 16 ? raw : null;
}

/** True when a TOTP secret is configured and 2FA is enforced. */
export function totpEnabled(): boolean {
  return totpSecret() !== null;
}

function buildTotp(secret: string): TOTP {
  return new TOTP({
    issuer: TOTP_ISSUER,
    label: TOTP_LABEL,
    algorithm: "SHA1",
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });
}

/**
 * Verify a 6-digit TOTP code. Allows ±1 window (30s drift).
 */
export function verifyTotp(code: string): boolean {
  const secret = totpSecret();
  if (!secret) return true; // 2FA not enabled — pass through
  if (!/^\d{6}$/.test(code)) return false;
  const totp = buildTotp(secret);
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * Generate a new TOTP secret and return the provisioning URI + QR data URL.
 * Called once during setup; the secret must then be saved as SARI_TOTP_SECRET.
 */
export async function generateTotpSetup(): Promise<{
  secret: string;
  uri: string;
  qrDataUrl: string;
}> {
  const secret = new TOTP({
    issuer: TOTP_ISSUER,
    label: TOTP_LABEL,
    algorithm: "SHA1",
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  });
  const uri = secret.toString();
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 256, margin: 2 });
  return {
    secret: secret.secret.base32,
    uri,
    qrDataUrl,
  };
}
