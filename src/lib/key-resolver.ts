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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${trimmed}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
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

export function importUniversalConfigJson(jsonText: string): ParsedConfigImport {
  try {
    const parsed: unknown = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid JSON format");
    }

    const obj = parsed as Record<string, unknown>;
    const extracted: ParsedConfigImport = { entriesCount: 0 };

    // Detect Gemini / Mallik Key
    const keyCandidates = [
      obj.MALLIK_API_KEY,
      obj.GEMINI_API_KEY,
      obj.GOOGLE_API_KEY,
      obj.AI_STUDIO_API_KEY,
      obj.geminiKey,
      obj.apiKey,
      obj.key,
    ];
    for (const k of keyCandidates) {
      if (typeof k === "string" && k.trim().length > 10) {
        extracted.geminiKey = k.trim();
        extracted.entriesCount++;
        break;
      }
    }

    // Detect Script ID / Deployment ID
    if (typeof obj.scriptId === "string") {
      extracted.scriptId = obj.scriptId.trim();
      extracted.entriesCount++;
    } else if (typeof obj.SCRIPT_ID === "string") {
      extracted.scriptId = obj.SCRIPT_ID.trim();
      extracted.entriesCount++;
    }

    if (typeof obj.deploymentId === "string") {
      extracted.deploymentId = obj.deploymentId.trim();
      extracted.entriesCount++;
    } else if (typeof obj.DEPLOYMENT_ID === "string") {
      extracted.deploymentId = obj.DEPLOYMENT_ID.trim();
      extracted.entriesCount++;
    } else if (typeof obj.BULBHUL_DEPLOYMENT_ID === "string") {
      extracted.deploymentId = obj.BULBHUL_DEPLOYMENT_ID.trim();
      extracted.entriesCount++;
    }

    // Detect Notion & NotebookLM
    if (typeof obj.notionToken === "string" || typeof obj.NOTION_API_KEY === "string") {
      extracted.notionToken = String(obj.notionToken || obj.NOTION_API_KEY).trim();
      extracted.entriesCount++;
    }
    if (typeof obj.notionDatabaseId === "string" || typeof obj.NOTION_DATABASE_ID === "string") {
      extracted.notionDatabaseId = String(obj.notionDatabaseId || obj.NOTION_DATABASE_ID).trim();
      extracted.entriesCount++;
    }
    if (typeof obj.notebooklmFolderId === "string" || typeof obj.NOTEBOOKLM_FOLDER_ID === "string") {
      extracted.notebooklmFolderId = String(obj.notebooklmFolderId || obj.NOTEBOOKLM_FOLDER_ID).trim();
      extracted.entriesCount++;
    }

    // Save extracted properties to dynamic config
    const updatePayload: Record<string, string> = {};
    if (extracted.geminiKey) {
      updatePayload.geminiKey = extracted.geminiKey;
      if (typeof window !== "undefined") {
        localStorage.setItem("MALLIK_API_KEY", extracted.geminiKey);
        localStorage.setItem("sari_gemini_key", extracted.geminiKey);
      }
    }
    if (extracted.scriptId) updatePayload.scriptId = extracted.scriptId;
    if (extracted.deploymentId) updatePayload.deploymentId = extracted.deploymentId;
    if (extracted.notionToken) updatePayload.notionToken = extracted.notionToken;
    if (extracted.notionDatabaseId) updatePayload.notionDatabaseId = extracted.notionDatabaseId;
    if (extracted.notebooklmFolderId) updatePayload.notebooklmFolderId = extracted.notebooklmFolderId;

    saveDynamicConfig(updatePayload);
    audit("config_importer", "success", `Imported ${extracted.entriesCount} parameters from JSON.`);

    return extracted;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    audit("config_importer", "error", `JSON Import error: ${message}`);
    throw new Error(`Failed to parse configuration JSON: ${message}`);
  }
}
