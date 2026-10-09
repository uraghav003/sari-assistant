export interface DynamicConfig {
  scriptId: string;
  deploymentId: string;
  geminiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  empCode: string;
}

const CONFIG_STORAGE_KEY = "sari_dynamic_config_v1";

export const DEFAULT_SCRIPT_ID = "1PP7wUFkDAkmgOjgPKeWbZeg3Ajs9N4ZNRPnfih_LMv89KEdSTVPvtipp";
export const DEFAULT_DEPLOYMENT_ID = "AKfycbwzdhZF3cVTT01atwZOSnXq7kBvx6k9NgFCbSvfAIXldCjBnMUqxKIBlLUPTiA7V8tc";
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "llama3.2:latest";
export const DEFAULT_EMP_CODE = "DC001";

export function loadDynamicConfig(): DynamicConfig {
  if (typeof window === "undefined") {
    return {
      scriptId: DEFAULT_SCRIPT_ID,
      deploymentId: DEFAULT_DEPLOYMENT_ID,
      geminiKey: "",
      ollamaUrl: DEFAULT_OLLAMA_URL,
      ollamaModel: DEFAULT_OLLAMA_MODEL,
      empCode: DEFAULT_EMP_CODE,
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
    };
  } catch {
    return {
      scriptId: DEFAULT_SCRIPT_ID,
      deploymentId: DEFAULT_DEPLOYMENT_ID,
      geminiKey: localStorage.getItem("sari_gemini_key") || "",
      ollamaUrl: DEFAULT_OLLAMA_URL,
      ollamaModel: DEFAULT_OLLAMA_MODEL,
      empCode: DEFAULT_EMP_CODE,
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
    if (config.geminiKey !== undefined) {
      localStorage.setItem("sari_gemini_key", config.geminiKey);
    }
  }
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
      message: res.ok ? "Apps Script Web App is live and responding" : `HTTP ${res.status}`,
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
