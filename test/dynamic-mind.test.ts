import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const SARI_SCRIPT_ID = "15rN7xFT8jSqTNs1Pu-M9h4E4eD5DXaQdtkLm6Z1p-CvLH52TIWKshhI3";
const SARI_DEPLOYMENT_ID = "AKfycbw_DlODYECpdfJKag01Jz5QlmoH2Fdj6kFElfKCOTiZfv8aFeYBLorki_4qlSC5tCr3";

describe("SARI Dynamic Mind defaults", () => {
  it("uses the SARI Apps Script bridge when no environment configuration exists", () => {
    const isolatedHome = mkdtempSync(join(tmpdir(), "sari-dynamic-mind-"));

    try {
      const output = execFileSync(
        process.execPath,
        [
          "-e",
          "const mind = require('./dynamic-mind.cjs'); console.log(JSON.stringify({ scriptId: mind.SCRIPT_ID, deploymentId: mind.DEPLOYMENT_ID, execUrl: mind.EXEC_URL }));",
        ],
        {
          cwd: projectRoot,
          encoding: "utf8",
          env: { PATH: process.env.PATH || "", HOME: isolatedHome, USERPROFILE: isolatedHome },
        }
      );
      const config = JSON.parse(output) as { scriptId: string; deploymentId: string; execUrl: string };

      expect(config.scriptId).toBe(SARI_SCRIPT_ID);
      expect(config.deploymentId).toBe(SARI_DEPLOYMENT_ID);
      expect(config.execUrl).toContain(SARI_DEPLOYMENT_ID);
    } finally {
      rmSync(isolatedHome, { recursive: true, force: true });
    }
  });
});
