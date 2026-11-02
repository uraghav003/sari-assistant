import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  DEFAULT_APPS_SCRIPT_URL,
  applyApiHeaders,
  appsScriptAuth,
  clientIp,
  isSameOrigin,
  rateLimit,
  readBody,
  requireSession,
  tooManyRequests,
} from "./_security.js";

/**
 * Lead dispatch + vault connectivity, executed server-side.
 *
 * The browser never sees a Supabase service-role key or a Telegram bot token.
 * Everything comes from the deployment environment.
 */

const ACTION_WINDOW_MS = 60 * 1000;
const ACTION_MAX_REQUESTS = 20;
const MAX_FIELD_CHARS = 200;

interface LeadPayload {
  name?: unknown;
  source?: unknown;
  intent?: unknown;
}

function clean(value: unknown, max = MAX_FIELD_CHARS): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function telegramConfig(): { token: string; chatId: string } | null {
  const token = process.env.SARI_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.SARI_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return null;
  return { token, chatId };
}

function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SARI_SUPABASE_URL?.trim();
  const key = process.env.SARI_SUPABASE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

async function sendTelegram(text: string): Promise<{ ok: boolean; detail: string }> {
  const config = telegramConfig();
  if (!config) return { ok: false, detail: "Telegram is not configured on the server." };
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: config.chatId, text: text.slice(0, 3800) }),
      signal: AbortSignal.timeout(10000),
    });
    const data: unknown = await res.json().catch(() => null);
    const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    if (obj.ok === true) return { ok: true, detail: "Telegram accepted the message." };
    const description = typeof obj.description === "string" ? obj.description : `HTTP ${res.status}`;
    return { ok: false, detail: description };
  } catch {
    return { ok: false, detail: "Telegram request failed." };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (!isSameOrigin(req)) {
    res.status(403).json({ ok: false, error: "Cross-origin requests are not permitted." });
    return;
  }

  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use GET or POST." });
    return;
  }

  if (!requireSession(req, res)) return;

  const limit = rateLimit(`leads:${clientIp(req)}`, ACTION_MAX_REQUESTS, ACTION_WINDOW_MS);
  if (!limit.ok) {
    tooManyRequests(res, limit.retryAfter);
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      telegramConfigured: telegramConfig() !== null,
      supabaseConfigured: supabaseConfig() !== null,
      leads: [],
    });
    return;
  }

  try {
    const body = readBody(req);
    const action = clean(body.action, 40);

    switch (action) {
      case "status": {
        res.status(200).json({
          ok: true,
          telegramConfigured: telegramConfig() !== null,
          supabaseConfigured: supabaseConfig() !== null,
        });
        return;
      }

      case "test_telegram": {
        const result = await sendTelegram("SARI alert channel test — dispatch path is live.");
        res.status(200).json({ ok: result.ok, detail: result.detail });
        return;
      }

      case "test_supabase": {
        const config = supabaseConfig();
        let appScriptOk = false;
        let appScriptDetail = "";
        const auth = appsScriptAuth("notion_sync");
        const scriptUrl = process.env.SARI_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
        if (auth && scriptUrl) {
          try {
            const scriptRes = await fetch(scriptUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "notion_sync", auth }),
              signal: AbortSignal.timeout(8000),
            });
            if (scriptRes.ok) {
              const scriptData = await scriptRes.json().catch(() => null);
              if (scriptData && typeof scriptData === "object" && (scriptData as Record<string, unknown>).ok) {
                appScriptOk = true;
                appScriptDetail = "Google Apps Script Sovereign Vault Connected";
              }
            }
          } catch {}
        }

        if (!config && !appScriptOk) {
          res.status(200).json({ ok: false, detail: "Neither Supabase nor Google Apps Script Vault is configured." });
          return;
        }
        if (appScriptOk) {
          res.status(200).json({ ok: true, detail: `✓ ${appScriptDetail} (Hybrid Mode Active)` });
          return;
        }
        try {
          const probe = await fetch(`${config!.url}/rest/v1/`, {
            headers: { apikey: config!.key, Authorization: `Bearer ${config!.key}` },
            signal: AbortSignal.timeout(10000),
          });
          res.status(200).json({ ok: true, detail: `Endpoint reachable (HTTP ${probe.status}).` });
        } catch {
          res.status(200).json({ ok: false, detail: "Could not reach the Supabase endpoint." });
        }
        return;
      }


      case "dispatch": {
        const lead = (body.lead && typeof body.lead === "object" && !Array.isArray(body.lead) ? body.lead : {}) as LeadPayload;
        const name = clean(lead.name) || "Unnamed lead";
        const source = clean(lead.source) || "unknown";
        const intent = clean(lead.intent) || "unspecified";
        const message = `New lead\nName: ${name}\nSource: ${source}\nIntent: ${intent}`;
        const configured = telegramConfig() !== null;
        const result = await sendTelegram(message);

        // Telegram is optional: an unconfigured channel is not an error. The client
        // records the alert in its in-app feed instead.
        if (!configured) {
          res.status(200).json({
            ok: true,
            delivered: false,
            channel: "in_app",
            detail: "Telegram is not configured — the alert was kept in the in-app feed.",
          });
          return;
        }

        res.status(200).json({
          ok: result.ok,
          delivered: result.ok,
          channel: result.ok ? "telegram" : "in_app",
          detail: result.detail,
        });
        return;
      }

      default:
        res.status(400).json({ ok: false, error: "Unknown action." });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal leads error";
    res.status(500).json({ ok: false, error: message });
  }
}
