import { describe, it, expect } from "vitest";
import { getNotebookLMConfig, validateNotebookLMData } from "../src/lib/notebooklm-service.js";

describe("SARI NotebookLM & Skills Service", () => {
  it("returns correct NotebookLM folder configuration", () => {
    const config = getNotebookLMConfig();
    expect(config.folderId).toBe("1BP62tjji2t2ZhYbAJU7-JgaOYGwUD2Bu");
    expect(config.configured).toBe(true);
    expect(config.lenderCount).toBe(52);
  });

  it("validates enterprise dossier markdown successfully", () => {
    const sample = "# DIVYANSHI CAPITAL ENTERPRISE DOSSIER\nTarget Ingestion: NotebookLM\nCatalog: 52 lenders included.";
    const result = validateNotebookLMData(sample);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("catches missing dossier sections", () => {
    const sample = "incomplete dossier content";
    const result = validateNotebookLMData(sample);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
