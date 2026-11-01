/**
 * Session state lives on the server (HttpOnly cookie). Nothing is persisted
 * in localStorage, so an XSS cannot read or replay the session.
 */

type Listener = (authenticated: boolean) => void;

let authenticated = false;
let resolved = false;
const listeners = new Set<Listener>();

function notify(): void {
  resolved = true;
  for (const listener of listeners) listener(authenticated);
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  if (resolved) listener(authenticated);
  return () => {
    listeners.delete(listener);
  };
}

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/session", { method: "GET", credentials: "same-origin" });
    if (!res.ok) {
      authenticated = false;
    } else {
      const data: unknown = await res.json();
      authenticated =
        data !== null &&
        typeof data === "object" &&
        "ok" in data &&
        (data as { ok: unknown }).ok === true;
    }
  } catch {
    authenticated = false;
  }
  notify();
  return authenticated;
}

export async function loginWithServer(
  email: string,
  password: string,
  totp?: string
): Promise<{ ok: boolean; error?: string; totpRequired?: boolean }> {
  try {
    const payload: Record<string, string> = { email: email.trim(), password };
    if (totp) {
      payload.totp = totp;
      payload.totpCode = totp;
    }
    const res = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data: unknown = await res.json().catch(() => null);
    const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

    if (res.ok && obj.ok === true) {
      authenticated = true;
      notify();
      return { ok: true };
    }

    if (obj.totpRequired === true) {
      return { ok: false, totpRequired: true, error: typeof obj.error === "string" ? obj.error : "Enter authenticator code" };
    }

    const message = typeof obj.error === "string" ? obj.error : "Authentication failed";
    return { ok: false, error: message };
  } catch {
    return { ok: false, error: "Network error — connection failed" };
  }
}

export async function changePasswordWithServer(
  newPassword: string
): Promise<{ ok: boolean; error?: string; message?: string }> {
  try {
    const res = await fetch("/api/change-password", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    const data: unknown = await res.json().catch(() => null);
    const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

    if (res.ok && obj.ok === true) {
      return { ok: true, message: typeof obj.message === "string" ? obj.message : "Password changed successfully" };
    }

    const message = typeof obj.error === "string" ? obj.error : "Failed to change password";
    return { ok: false, error: message };
  } catch {
    return { ok: false, error: "Network error — failed to reach server" };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // Clearing local state still happens below.
  }
  authenticated = false;
  notify();
}

export function isAuthenticated(): boolean {
  return authenticated;
}
