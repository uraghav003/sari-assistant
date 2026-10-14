const SESSION_KEY = "sari_session_token";

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;
  // Token format: "<expiryMs>.<hmac>" — expiry embedded, checked client-side;
  // signature is always verified server-side on every API call.
  const dot = token.indexOf(".");
  if (dot < 1) {
    clearSession();
    return null;
  }
  const expiry = parseInt(token.slice(0, dot), 10);
  if (!expiry || Date.now() > expiry) {
    clearSession();
    return null;
  }
  return token;
}

export async function loginWithServer(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (res.ok) {
      const data: unknown = await res.json();
      if (data && typeof data === "object" && "token" in data && typeof data.token === "string") {
        setSessionId(data.token);
        return { ok: true };
      }
      return { ok: false, error: "Authentication failed" };
    }
    const errData: unknown = await res.json().catch(() => null);
    const msg =
      errData && typeof errData === "object" && "error" in errData && typeof errData.error === "string"
        ? errData.error
        : "Authentication failed";
    return { ok: false, error: msg };
  } catch {
    return { ok: false, error: "Network error — connection failed" };
  }
}

export function setSessionId(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return !!getSessionId();
}
