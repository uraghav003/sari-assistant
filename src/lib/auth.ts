const SESSION_KEY = "sari_session_token";
const SESSION_EXPIRY_KEY = "sari_session_expiry";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    clearSession();
    return null;
  }
  return localStorage.getItem(SESSION_KEY);
}

export async function authenticateWithPassphrase(passphrase: string): Promise<boolean> {
  if (!passphrase || passphrase.length < 4) return false;
  // PBKDF2 simulation / derivation for secure session
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const token = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  const expiry = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
  return true;
}

export function setSessionId(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(SESSION_EXPIRY_KEY, (Date.now() + SESSION_DURATION_MS).toString());
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_EXPIRY_KEY);
}

export function isAuthenticated(): boolean {
  return !!getSessionId();
}
