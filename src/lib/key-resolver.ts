import { saveDynamicConfig, loadDynamicConfig } from "./config";
import { audit } from "./storage";

export interface ParsedConfigImport {
  scriptId?: string;
  deploymentId?: string;
  notebooklmFolderId?: string;
  driveWorkspaceName?: string;
  entriesCount: number;
}

/**
 * Imports non-secret routing identifiers from a config JSON bundle.
 * API keys and tokens found in the file are ignored — they must be set as
 * server environment variables, never in the browser.
 */
export function importUniversalConfigJson(jsonText: string): ParsedConfigImport {
  try {
    const parsed: unknown = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid JSON format");
    }

    const obj = parsed as Record<string, unknown>;
    const extracted: ParsedConfigImport = { entriesCount: 0 };

    const scriptId = obj.scriptId ?? obj.SCRIPT_ID ?? obj.SARI_SCRIPT_ID;
    if (typeof scriptId === "string" && scriptId.trim()) {
      extracted.scriptId = scriptId.trim();
      extracted.entriesCount++;
    }

    const deploymentId = obj.deploymentId ?? obj.DEPLOYMENT_ID ?? obj.SARI_DEPLOYMENT_ID ?? obj.BULBHUL_DEPLOYMENT_ID;
    if (typeof deploymentId === "string" && deploymentId.trim()) {
      extracted.deploymentId = deploymentId.trim();
      extracted.entriesCount++;
    }

    const folderId = obj.notebooklmFolderId ?? obj.NOTEBOOKLM_FOLDER_ID ?? obj.googleDriveFolderId;
    if (typeof folderId === "string" && folderId.trim()) {
      extracted.notebooklmFolderId = folderId.trim();
      extracted.entriesCount++;
    }

    const workspaceName = obj.driveWorkspaceName ?? obj.googleDriveFolder ?? obj.workspaceName;
    if (typeof workspaceName === "string" && workspaceName.trim()) {
      extracted.driveWorkspaceName = workspaceName.trim();
      extracted.entriesCount++;
    }

    const update: Record<string, string> = {};
    if (extracted.scriptId) update.scriptId = extracted.scriptId;
    if (extracted.deploymentId) update.deploymentId = extracted.deploymentId;
    if (extracted.notebooklmFolderId) update.notebooklmFolderId = extracted.notebooklmFolderId;
    if (extracted.driveWorkspaceName) update.driveWorkspaceName = extracted.driveWorkspaceName;
    if (extracted.entriesCount > 0) saveDynamicConfig(update);

    audit("config_importer", "success", `Imported ${extracted.entriesCount} routing identifiers from JSON.`);
    return extracted;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    audit("config_importer", "error", `JSON import error: ${message}`);
    throw new Error(`Failed to parse configuration JSON: ${message}`);
  }
}

export interface AutoHealResult {
  entriesCount: number;
  extractedKeys: string[];
  fixesApplied: string[];
  status: "healed" | "partial" | "error";
  error?: string;
}

/**
 * Autonomous Key-Value Integrator & Auto-Fixer:
 * Accepts pasted text in either JSON or KEY=VALUE / .env format.
 * SARI parses the keys, extracts non-secret routing configurations,
 * applies fixes automatically to local/cloud dynamic routing, and returns
 * an audit of the actions taken.
 */
export function autoHealFromKeyValues(rawInput: string): AutoHealResult {
  const text = rawInput.trim();
  if (!text) {
    return {
      entriesCount: 0,
      extractedKeys: [],
      fixesApplied: [],
      status: "error",
      error: "Input was empty. Paste JSON or KEY=VALUE pairs.",
    };
  }

  const kvMap: Record<string, string> = {};

  // 1. Try parsing as JSON first
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            kvMap[k] = String(v).trim();
          } else if (v && typeof v === "object" && !Array.isArray(v)) {
            for (const [subK, subV] of Object.entries(v)) {
              if (typeof subV === "string" || typeof subV === "number" || typeof subV === "boolean") {
                kvMap[subK] = String(subV).trim();
              }
            }
          }
        }
      }
    } catch {}
  }

  // 2. If not parsed as JSON or flat lines present, parse line-by-line KEY=VALUE or KEY: VALUE
  if (Object.keys(kvMap).length === 0) {
    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || line.startsWith("//")) continue;
      const delimiter = line.includes("=") ? "=" : line.includes(":") ? ":" : null;
      if (delimiter) {
        const parts = line.split(delimiter);
        const key = parts[0].trim().replace(/^export\s+/, "").replace(/['"]/g, "");
        const val = parts.slice(1).join(delimiter).trim().replace(/^['"]|['"]$/g, "").replace(/,$/, "");
        if (key && val) {
          kvMap[key] = val;
        }
      }
    }
  }

  const fixes: string[] = [];
  const extractedKeys: string[] = [];
  const update: Record<string, string> = {};

  const findVal = (...aliases: string[]): string | undefined => {
    for (const a of aliases) {
      for (const [k, v] of Object.entries(kvMap)) {
        if (k.toLowerCase() === a.toLowerCase() && v) return v;
      }
    }
    return undefined;
  };

  // Extract Deployment ID
  const depId = findVal("deploymentId", "DEPLOYMENT_ID", "SARI_DEPLOYMENT_ID", "BULBHUL_DEPLOYMENT_ID", "appsScriptDeploymentId");
  if (depId && depId.length > 20) {
    update.deploymentId = depId;
    extractedKeys.push("deploymentId");
    fixes.push(`Auto-fixed Google Apps Script Deployment ID (${depId.slice(0, 12)}...)`);
  }

  // Extract Script ID
  const scriptId = findVal("scriptId", "SCRIPT_ID", "SARI_SCRIPT_ID");
  if (scriptId && scriptId.length > 15) {
    update.scriptId = scriptId;
    extractedKeys.push("scriptId");
    fixes.push(`Configured Apps Script Project ID (${scriptId.slice(0, 10)}...)`);
  }

  // Extract Folder ID
  const folderId = findVal("folderId", "NOTEBOOKLM_FOLDER_ID", "notebooklmFolderId", "googleDriveFolderId", "DRIVE_FOLDER_ID");
  if (folderId && folderId.length > 15) {
    update.notebooklmFolderId = folderId;
    update.googleDriveFolderId = folderId;
    extractedKeys.push("folderId");
    fixes.push(`Linked Google Drive Sovereign Knowledge Hub (${folderId})`);
  }

  // Extract Ollama / vLLM URL
  const ollamaUrl = findVal("ollamaUrl", "OLLAMA_URL", "vllmUrl", "VLLM_URL", "LOCAL_AI_URL");
  if (ollamaUrl && /^https?:\/\//i.test(ollamaUrl)) {
    update.ollamaUrl = ollamaUrl.replace(/\/$/, "");
    extractedKeys.push("ollamaUrl");
    fixes.push(`Connected Local AI Runtime endpoint (${ollamaUrl})`);
  }

  // Extract Model
  const model = findVal("ollamaModel", "OLLAMA_MODEL", "model", "MODEL", "vllmModel");
  if (model) {
    update.ollamaModel = model;
    extractedKeys.push("ollamaModel");
    fixes.push(`Set active local inference model (${model})`);
  }

  // Extract Workspace Name
  const wsName = findVal("driveWorkspaceName", "DRIVE_WORKSPACE_NAME", "workspaceName", "WORKSPACE");
  if (wsName) {
    update.driveWorkspaceName = wsName;
    extractedKeys.push("driveWorkspaceName");
    fixes.push(`Mapped Drive Workspace Name to "${wsName}"`);
  }

  if (extractedKeys.length > 0) {
    saveDynamicConfig(update);
    audit("auto_healer", "success", `SARI auto-healed ${extractedKeys.length} settings: ${fixes.join("; ")}`);
    return {
      entriesCount: extractedKeys.length,
      extractedKeys,
      fixesApplied: fixes,
      status: "healed",
    };
  }

  return {
    entriesCount: 0,
    extractedKeys: [],
    fixesApplied: [],
    status: "partial",
    error: "No recognized routing keys found. Supported: DEPLOYMENT_ID, SCRIPT_ID, FOLDER_ID, OLLAMA_URL, MODEL, WORKSPACE.",
  };
}

export function currentDeploymentId(): string {
  return loadDynamicConfig().deploymentId;
}
