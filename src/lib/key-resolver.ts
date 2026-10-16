import { saveDynamicConfig, loadDynamicConfig } from "./config";
import { audit } from "./storage";

export interface KeyValidationResult {
  valid: boolean;
  key: string;
  source: string;
  message: string;
}

export interface ParsedConfigImport {
  geminiKey?: string;
  scriptId?: string;
  deploymentId?: string;
  notionToken?: string;
  notionDatabaseId?: string;
  notebooklmFolderId?: string;
  empCode?: string;
  entriesCount: number;
}

// In-memory validation cache (valid for 5 minutes)
let cachedValidKey: { key: string; validUntil: number } | null = null;

export async function validateGeminiKey(key: string): Promise<boolean> {
  if (!key || typeof key !== "string" || key.trim().length < 10) return false;
  const trimmed = key.trim();

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  for (const m of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${trimmed}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (res.ok) return true;
    } catch {}
  }
  return false;
}

export async function resolveActiveGeminiKey(): Promise<KeyValidationResult> {
  // Check cached validated key
  if (cachedValidKey && Date.now() < cachedValidKey.validUntil) {
    return {
      valid: true,
      key: cachedValidKey.key,
      source: "validation_cache",
      message: "✓ Key active (cached)",
    };
  }

  // Collect candidate keys in priority order
  const candidates: Array<{ key: string; source: string }> = [];

  if (typeof window !== "undefined") {
    const mallikKey = localStorage.getItem("MALLIK_API_KEY");
    if (mallikKey) candidates.push({ key: mallikKey.trim(), source: "localStorage(MALLIK_API_KEY)" });

    const sariKey = localStorage.getItem("sari_gemini_key");
    if (sariKey && sariKey !== mallikKey) candidates.push({ key: sariKey.trim(), source: "localStorage(sari_gemini_key)" });

    const dynamicCfg = loadDynamicConfig();
    if (dynamicCfg.geminiKey && dynamicCfg.geminiKey !== mallikKey && dynamicCfg.geminiKey !== sariKey) {
      candidates.push({ key: dynamicCfg.geminiKey.trim(), source: "dynamic_config" });
    }
  }

  // Test candidates sequentially
  for (const candidate of candidates) {
    if (candidate.key) {
      const isValid = await validateGeminiKey(candidate.key);
      if (isValid) {
        cachedValidKey = { key: candidate.key, validUntil: Date.now() + 5 * 60 * 1000 };
        audit("key_resolver", "validated", `Key from ${candidate.source} validated successfully.`);
        return {
          valid: true,
          key: candidate.key,
          source: candidate.source,
          message: `✓ Validated active key from ${candidate.source}`,
        };
      } else {
        audit("key_resolver", "invalid", `Key from ${candidate.source} failed pre-flight probe.`);
      }
    }
  }

  return {
    valid: false,
    key: "",
    source: "none",
    message: "No valid Gemini/MALLIK API key found. Using local Ollama / offline fallback.",
  };
}
