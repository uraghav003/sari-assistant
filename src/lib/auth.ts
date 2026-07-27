const SESSION_KEY = "sari_session_id";
export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}
export function setSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
}
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
export function isAuthenticated(): boolean {
  return !!getSessionId();
}
