export interface DynamicConfig {
  scriptId: string;
  deploymentId: string;
  ollamaUrl: string;
  ollamaModel: string;
  empCode: string;
  notebooklmFolderId?: string;
  googleDriveFolderId?: string;
  autopilotEnabled: boolean;
}

const CONFIG_STORAGE_KEY = "sari_dynamic_config_v1";

export const DEFAULT_SCRIPT_ID = "15rN7xFT8jSqTNs1Pu-M9h4E4eD5DXaQdtkLm6Z1p-CvLH52TIWKshhI3";
export const DEFAULT_DEPLOYMENT_ID = "AKfycbw_DlODYECpdfJKag01Jz5QlmoH2Fdj6kFElfKCOTiZfv8aFeYBLorki_4qlSC5tCr3";
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:latest";
export const DEFAULT_EMP_CODE = "DC001";
export const DEFAULT_NOTEBOOKLM_FOLDER_ID = "1BP62tjji2t2ZhYbAJU7-JgaOYGwUD2Bu";
export const DEFAULT_GOOGLE_DRIVE_FOLDER_ID = "1BP62tjji2t2ZhYbAJU7-JgaOYGwUD2Bu";

/**
 * Only non-secret routing configuration belongs here. API keys, session
 * tokens and integration credentials live in the server environment.
 */
export function loadDynamicConfig(): DynamicConfig {
  const defaults: DynamicConfig = {
    scriptId: DEFAULT_SCRIPT_ID,
    deploymentId: DEFAULT_DEPLOYMENT_ID,
    ollamaUrl: DEFAULT_OLLAMA_URL,
    ollamaModel: DEFAULT_OLLAMA_MODEL,
    empCode: DEFAULT_EMP_CODE,
    notebooklmFolderId: DEFAULT_NOTEBOOKLM_FOLDER_ID,
    googleDriveFolderId: DEFAULT_GOOGLE_DRIVE_FOLDER_ID,
    autopilotEnabled: true,
  };

  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    const parsed: Record<string, unknown> = raw ? JSON.parse(raw) : {};
    return {
      scriptId: typeof parsed.scriptId === "string" && parsed.scriptId.trim() ? parsed.scriptId.trim() : DEFAULT_SCRIPT_ID,
      deploymentId:
        typeof parsed.deploymentId === "string" && parsed.deploymentId.trim()
          ? parsed.deploymentId.trim()
          : DEFAULT_DEPLOYMENT_ID,
      ollamaUrl:
        typeof parsed.ollamaUrl === "string" && parsed.ollamaUrl.trim()
          ? parsed.ollamaUrl.trim().replace(/\/$/, "")
          : DEFAULT_OLLAMA_URL,
      ollamaModel:
        typeof parsed.ollamaModel === "string" && parsed.ollamaModel.trim()
          ? parsed.ollamaModel.trim()
          : DEFAULT_OLLAMA_MODEL,
      empCode: typeof parsed.empCode === "string" && parsed.empCode.trim() ? parsed.empCode.trim() : DEFAULT_EMP_CODE,
      notebooklmFolderId:
        typeof parsed.notebooklmFolderId === "string" && parsed.notebooklmFolderId.trim()
          ? parsed.notebooklmFolderId.trim()
          : DEFAULT_NOTEBOOKLM_FOLDER_ID,
      googleDriveFolderId:
        typeof parsed.googleDriveFolderId === "string" && parsed.googleDriveFolderId.trim()
          ? parsed.googleDriveFolderId.trim()
          : DEFAULT_GOOGLE_DRIVE_FOLDER_ID,
      autopilotEnabled: parsed.autopilotEnabled !== false,
    };
  } catch {
    return defaults;
  }
}

export function saveDynamicConfig(config: Partial<DynamicConfig>): DynamicConfig {
  const next: DynamicConfig = { ...loadDynamicConfig(), ...config };
  if (typeof window !== "undefined") {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

/**
 * Real validation: deployment IDs must look like Apps Script IDs and URLs must
 * be http(s). Secrets are deliberately not validated here — they are not stored
 * in the browser.
 */
export function validateConfig(config?: Partial<DynamicConfig>): { valid: boolean; errors: string[] } {
  const current: DynamicConfig = { ...loadDynamicConfig(), ...(config || {}) };
  const errors: string[] = [];

  if (!/^[A-Za-z0-9_-]{20,}$/.test(current.deploymentId)) {
    errors.push("Deployment ID looks invalid (expected a long Apps Script ID).");
  }
  if (!/^[A-Za-z0-9_-]{20,}$/.test(current.scriptId)) {
    errors.push("Script ID looks invalid.");
  }
  if (!/^https?:\/\/[^\s]+$/.test(current.ollamaUrl)) {
    errors.push("Ollama URL must be an http(s) URL.");
  }

  return { valid: errors.length === 0, errors };
}

export function getScriptExecUrl(deploymentId?: string): string {
  const depId = deploymentId || loadDynamicConfig().deploymentId || DEFAULT_DEPLOYMENT_ID;
  return `https://script.google.com/macros/s/${depId}/exec`;
}

export async function pingAppsScript(deploymentId?: string): Promise<{ ok: boolean; status: number; message: string }> {
  const url = getScriptExecUrl(deploymentId);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeout);
    return {
      ok: res.ok,
      status: res.status,
      message: res.ok ? "Apps Script web app responded" : `HTTP ${res.status}`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return { ok: false, status: 0, message };
  }
}

/**
 * Autopilot sync is routed through the authenticated server endpoint so the
 * browser never needs the Apps Script shared secret.
 */
export async function triggerAutopilotSync(payload: {
  lessons?: string[];
  skills?: unknown[];
}): Promise<boolean> {
  const cfg = loadDynamicConfig();
  if (!cfg.autopilotEnabled) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("/api/autopilot", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessons: payload.lessons, skills: payload.skills }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
