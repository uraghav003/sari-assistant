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

export function currentDeploymentId(): string {
  return loadDynamicConfig().deploymentId;
}
