/**
 * WebAuthn / Passkey support for SARI.
 *
 * Enables Face ID, fingerprint, Windows Hello login on devices that support it.
 * Credentials are stored in localStorage (challenge + credential ID).
 * Server-side verification uses the existing session token system.
 */

const CREDENTIAL_KEY = "sari_webauthn_cred_v1";

interface StoredCredential {
  credentialId: string; // base64url
  publicKey: string;    // base64url
  email: string;
  createdAt: number;
}

function bufToBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBuf(b64: string): ArrayBuffer {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** True if the browser supports WebAuthn and platform authenticators. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** True if a credential is already registered for this device. */
export function hasStoredCredential(): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(CREDENTIAL_KEY) !== null;
  } catch {
    return false;
  }
}

/** Get stored credential email. */
export function getStoredEmail(): string | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CREDENTIAL_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as StoredCredential).email;
  } catch {
    return null;
  }
}

/**
 * Register a new biometric credential after successful password login.
 * Call this after the user has authenticated via password.
 */
export async function registerBiometric(email: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = new TextEncoder().encode(email);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "SARI Sovereign AI", id: window.location.hostname },
        user: {
          id: userId,
          name: email,
          displayName: "SARI MD",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    const response = credential.response as AuthenticatorAttestationResponse;
    const stored: StoredCredential = {
      credentialId: bufToBase64Url(credential.rawId),
      publicKey: bufToBase64Url(response.getPublicKey?.() ?? new ArrayBuffer(0)),
      email,
      createdAt: Date.now(),
    };

    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(stored));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Authenticate using stored biometric credential.
 * Returns the email if successful, null otherwise.
 */
export async function authenticateWithBiometric(): Promise<string | null> {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CREDENTIAL_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const stored: StoredCredential = JSON.parse(raw);
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: base64UrlToBuf(stored.credentialId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) return null;

    // Biometric verified by the platform — return the associated email
    return stored.email;
  } catch {
    return null;
  }
}

/** Remove stored biometric credential. */
export function clearBiometric(): void {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(CREDENTIAL_KEY);
    } catch {}
  }
}
