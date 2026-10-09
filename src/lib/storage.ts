export interface AuditEntry {
  t: string;
  a: string;
  d: string;
}

export function audit(action: string, status: string, detail: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("sari_audit_log_v1") || "[]";
    const entries: unknown = JSON.parse(raw);
    const validEntries: AuditEntry[] = Array.isArray(entries)
      ? entries.filter(
          (e): e is AuditEntry =>
            e !== null &&
            typeof e === "object" &&
            "t" in e &&
            "a" in e &&
            "d" in e &&
            typeof e.t === "string" &&
            typeof e.a === "string" &&
            typeof e.d === "string"
        )
      : [];

    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";
    const next = [{ t: now, a: `${action} [${status}]`, d: detail }, ...validEntries].slice(0, 100);
    localStorage.setItem("sari_audit_log_v1", JSON.stringify(next));
  } catch {
    // Fail-safe: ignore local storage errors
  }
}

export function getAuditLogs(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("sari_audit_log_v1") || "[]";
    const entries: unknown = JSON.parse(raw);
    return Array.isArray(entries)
      ? entries.filter(
          (e): e is AuditEntry =>
            e !== null &&
            typeof e === "object" &&
            "t" in e &&
            "a" in e &&
            "d" in e &&
            typeof e.t === "string" &&
            typeof e.a === "string" &&
            typeof e.d === "string"
        )
      : [];
  } catch {
    return [];
  }
}
