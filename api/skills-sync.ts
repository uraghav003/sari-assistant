import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyApiHeaders, clientIp, rateLimit, tooManyRequests } from "./_security.js";
import { seedSkills } from "../src/lib/skills-engine.js";
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

/**
 * Public or authenticated global skills registry endpoint.
 * Exposes SARI's sovereign skills manifest so external AI tools, MCP servers,
 * and multi-agent workers can ingest and share capabilities.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use GET or POST." });
    return;
  }

  const limit = rateLimit(`skills-sync:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) {
    tooManyRequests(res, limit.retryAfter);
    return;
  }

  try {
    res.setHeader("Content-Type", "application/json");
    res.status(200).json({
      ok: true,
      system: "SARI_SUPREME_GLOBAL_SKILLS",
      version: "4.1.0",
      principal: "Upendra Singh Raghav (MD & CEO / Maalik)",
      organization: "Divyanshi Capital",
      workspace: "sari_supreme_command",
      totalSkills: seedSkills.length,
      skills: seedSkills,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ ok: false, error: message });
  }
}
