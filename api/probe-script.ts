import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyApiHeaders } from "./_security.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  const deploymentId = typeof req.query.deploymentId === "string" ? req.query.deploymentId.trim() : "";
  const targetId = deploymentId || "AKfycbwzdhZF3cVTT01atwZOSnXq7kBvx6k9NgFCbSvfAIXldCjBnMUqxKIBlLUPTiA7V8tc";
  const url = `https://script.google.com/macros/s/${targetId}/exec?action=status`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const upstream = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      res.status(upstream.status).json({ ok: false, error: `Apps Script HTTP ${upstream.status}` });
      return;
    }

    const data = await upstream.json().catch(() => null);
    if (data && typeof data === "object") {
      res.status(200).json({ ok: true, data });
    } else {
      res.status(200).json({ ok: true, message: "Apps Script responded" });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    res.status(502).json({ ok: false, error: message });
  }
}
