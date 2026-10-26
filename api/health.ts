import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authConfigured } from "./_security.js";

const START_TIME = Date.now();

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const uptimeMs = Date.now() - START_TIME;
  const hours = Math.floor(uptimeMs / 3_600_000);
  const minutes = Math.floor((uptimeMs % 3_600_000) / 60_000);

  res.status(200).json({
    status: "ok",
    system: "SARI_SOVEREIGN_AI",
    version: "4.1.0",
    uptime: `${hours}h ${minutes}m`,
    auth: authConfigured() ? "configured" : "missing",
    environment: process.env.VERCEL_ENV || "local",
    region: process.env.VERCEL_REGION || "unknown",
    node: process.version,
    timestamp: new Date().toISOString(),
  });
}
