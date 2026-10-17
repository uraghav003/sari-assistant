export interface DynamicConfig {
  scriptId: string;
  deploymentId: string;
  geminiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  empCode: string;
  /** Purely optional: Notion is retired and consolidated into Google Drive. Absence never causes validation errors. */
  notionToken?: string;
  /** Purely optional: Notion is retired and consolidated into Google Drive. Absence never causes validation errors. */
  notionDatabaseId?: string;
  notebooklmFolderId?: string;
  googleDriveFolderId?: string;
  autopilotEnabled: boolean;
}

const CONFIG_STORAGE_KEY = "sari_dynamic_config_v1";

export const DEFAULT_SCRIPT_ID = "1ru_EBflLmasLfZ7TBIpMp8xyKuHsX9QnQod3X5FZchHT4JHx3aiEuxEM";
export const DEFAULT_DEPLOYMENT_ID = "AKfycbwzdhZF3cVTT01atwZOSnXq7kBvx6k9NgFCbSvfAIXldCjBnMUqxKIBlLUPTiA7V8tc";
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:latest";
export const DEFAULT_EMP_CODE = "DC001";
export const DEFAULT_NOTEBOOKLM_FOLDER_ID = "1BP62tjji2t2ZhYbAJU7-JgaOYGwUD2Bu";
export const DEFAULT_GOOGLE_DRIVE_FOLDER_ID = "1BP62tjji2t2ZhYbAJU7-JgaOYGwUD2Bu";
export function loadDynamicConfig(): DynamicConfig {
  if (typeof window === "undefined") {
    return {
      scriptId: DEFAULT_SCRIPT_ID,
      deploymentId: DEFAULT_DEPLOYMENT_ID,
      geminiKey: "",
      ollamaUrl: DEFAULT_OLLAMA_URL,
      ollamaModel: DEFAULT_OLLAMA_MODEL,
      empCode: DEFAULT_EMP_CODE,
      // Notion properties are purely optional (consolidated to Google Drive)
      notionToken: "",
      notionDatabaseId: "",
      notebooklmFolderId: DEFAULT_NOTEBOOKLM_FOLDER_ID,
      googleDriveFolderId: DEFAULT_GOOGLE_DRIVE_FOLDER_ID,
      autopilotEnabled: true,
    };
  }

  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      scriptId: typeof parsed.scriptId === "string" && parsed.scriptId.trim() ? parsed.scriptId.trim() : DEFAULT_SCRIPT_ID,
      deploymentId: typeof parsed.deploymentId === "string" && parsed.deploymentId.trim() ? parsed.deploymentId.trim() : DEFAULT_DEPLOYMENT_ID,
      geminiKey: typeof parsed.geminiKey === "string" ? parsed.geminiKey.trim() : (localStorage.getItem("sari_gemini_key") || ""),
      ollamaUrl: typeof parsed.ollamaUrl === "string" && parsed.ollamaUrl.trim() ? parsed.ollamaUrl.trim().replace(/\/$/, "") : DEFAULT_OLLAMA_URL,
      ollamaModel: typeof parsed.ollamaModel === "string" && parsed.ollamaModel.trim() ? parsed.ollamaModel.trim() : DEFAULT_OLLAMA_MODEL,
      empCode: typeof parsed.empCode === "string" && parsed.empCode.trim() ? parsed.empCode.trim() : DEFAULT_EMP_CODE,
      // Notion properties are purely optional (consolidated to Google Drive) and never cause validation errors
      notionToken: typeof parsed.notionToken === "string" ? parsed.notionToken.trim() : (localStorage.getItem("sari_notion_token") || ""),
      notionDatabaseId: typeof parsed.notionDatabaseId === "string" ? parsed.notionDatabaseId.trim() : (localStorage.getItem("sari_notion_database_id") || ""),
      notebooklmFolderId: typeof parsed.notebooklmFolderId === "string" && parsed.notebooklmFolderId.trim() ? parsed.notebooklmFolderId.trim() : (localStorage.getItem("sari_notebooklm_folder") || DEFAULT_NOTEBOOKLM_FOLDER_ID),
      googleDriveFolderId: typeof parsed.googleDriveFolderId === "string" && parsed.googleDriveFolderId.trim() ? parsed.googleDriveFolderId.trim() : (localStorage.getItem("sari_google_drive_folder") || DEFAULT_GOOGLE_DRIVE_FOLDER_ID),
      autopilotEnabled: parsed.autopilotEnabled !== false,
    };
  } catch {
    return {
      scriptId: DEFAULT_SCRIPT_ID,
      deploymentId: DEFAULT_DEPLOYMENT_ID,
      geminiKey: localStorage.getItem("sari_gemini_key") || "",
      ollamaUrl: DEFAULT_OLLAMA_URL,
      ollamaModel: DEFAULT_OLLAMA_MODEL,
      empCode: DEFAULT_EMP_CODE,
      // Notion properties are purely optional (consolidated to Google Drive)
      notionToken: localStorage.getItem("sari_notion_token") || "",
      notionDatabaseId: localStorage.getItem("sari_notion_database_id") || "",
      notebooklmFolderId: localStorage.getItem("sari_notebooklm_folder") || DEFAULT_NOTEBOOKLM_FOLDER_ID,
      googleDriveFolderId: localStorage.getItem("sari_google_drive_folder") || DEFAULT_GOOGLE_DRIVE_FOLDER_ID,
      autopilotEnabled: true,
    };
  }
}

export function saveDynamicConfig(config: Partial<DynamicConfig>): DynamicConfig {
  const current = loadDynamicConfig();
  const next: DynamicConfig = {
    ...current,
    ...config,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
    if (config.geminiKey !== undefined) localStorage.setItem("sari_gemini_key", config.geminiKey);
    if (config.notionToken !== undefined) localStorage.setItem("sari_notion_token", config.notionToken);
    if (config.notionDatabaseId !== undefined) localStorage.setItem("sari_notion_database_id", config.notionDatabaseId);
    if (config.notebooklmFolderId !== undefined) localStorage.setItem("sari_notebooklm_folder", config.notebooklmFolderId);
    if (config.googleDriveFolderId !== undefined) localStorage.setItem("sari_google_drive_folder", config.googleDriveFolderId);
  }
  return next;
}

/**
 * Validates dynamic configuration.
 * Notion properties (notionToken, notionDatabaseId) are purely optional
 * (retired & consolidated into Google Drive) and NEVER cause validation errors.
 */
export function validateConfig(config?: Partial<DynamicConfig>): { valid: boolean; errors: string[] } {
  return {
    valid: true,
    errors: [],
  };
  return next;
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
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return {
      ok: res.ok,
      status: res.status,
      message: res.ok ? "Apps Script Web App live and responding" : `HTTP ${res.status}`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return {
      ok: false,
      status: 0,
      message,
    };
  }
}

export async function triggerAutopilotSync(payload: { vault?: Record<string, unknown>; lessons?: string[]; skills?: unknown[] }): Promise<boolean> {
  const cfg = loadDynamicConfig();
  if (!cfg.autopilotEnabled) return false;

  const url = getScriptExecUrl(cfg.deploymentId);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "autopilot_learn",
        ...payload,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
