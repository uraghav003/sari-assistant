/**
 * Privacy helpers: remove credentials and business data left on this device.
 *
 * Earlier builds persisted API keys, tokens and session identifiers in
 * localStorage. Those keys are purged on boot and again on logout.
 */

const LEGACY_SECRET_KEYS = [
  "sari_session_token",
  "sari_gemini_key",
  "MALLIK_API_KEY",
  "sari_mallik_key",
  "sari_notion_token",
  "sari_notion_database_id",
  "sari_supabase_url",
  "sari_supabase_key",
  "sari_sup_url",
  "sari_sup_key",
  "sari_tg_token",
  "sari_tg_chat",
  "sari_wa_hook",
];

const BUSINESS_DATA_KEYS = [
  "sari_chat_history_v1",
  "sari_memory_vault",
  "sari_memory_sync_time",
  "sari_autonomous_leads",
  "sari_audit_log_v1",
];

function safeRemove(storage: Storage | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage can be unavailable (private mode); nothing to clean.
  }
}

/** Removes credentials persisted by older builds. Safe to call on every boot. */
export function purgeLegacySecrets(): void {
  if (typeof window === "undefined") return;

  for (const key of LEGACY_SECRET_KEYS) {
    safeRemove(window.localStorage, key);
    safeRemove(window.sessionStorage, key);
  }

  // Strip secret fields that older versions wrote into the routing config.
  try {
    const raw = localStorage.getItem("sari_dynamic_config_v1");
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    const config = parsed as Record<string, unknown>;
    let changed = false;
    for (const field of ["geminiKey", "notionToken", "notionDatabaseId"]) {
      if (field in config) {
        delete config[field];
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem("sari_dynamic_config_v1", JSON.stringify(config));
    }
  } catch {
    // A malformed config is simply left untouched.
  }
}

/** Clears local business data. Called on explicit logout. */
export function clearLocalData(): void {
  if (typeof window === "undefined") return;
  for (const key of BUSINESS_DATA_KEYS) {
    safeRemove(window.localStorage, key);
    safeRemove(window.sessionStorage, key);
  }
}
