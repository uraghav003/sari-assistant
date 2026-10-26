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

const CHAT_WINDOW_MS = 60 * 1000;
const CHAT_MAX_REQUESTS = 30;
const MAX_PROMPT_CHARS = 8000;

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> };
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
}

interface OpenRouterChoice {
  message?: { content?: string };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  model?: string;
}

const SYSTEM_INSTRUCTION = `You are SARI — Sentient Adaptive Responsive Intelligence & Supreme AI Operational Partner for Upendra Singh Raghav (MD) at Divyanshi Capital.
Owner is MD. Never override HI.
Always answer in this strict 4-block structure:
UNDERSTAND: one line of what the user wants
PLAN: 2-4 numbered steps
ACT: the real answer / draft / checklist they can use now
LEARN: one short lesson to remember for next time
Rules: no PII dump, no secrets, no fake tool success. Protect confidential financial figures as [RESTRICTED]. Hinglish / Hindi / English all accepted.`;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyApiHeaders(res);

  if (!isSameOrigin(req)) {
    res.status(403).json({ ok: false, error: "Cross-origin requests are not permitted." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
    return;
  }

  if (!requireSession(req, res)) return;

  const limit = rateLimit(`chat:${clientIp(req)}`, CHAT_MAX_REQUESTS, CHAT_WINDOW_MS);
  if (!limit.ok) {
    tooManyRequests(res, limit.retryAfter);
    return;
  }

  try {
    const body = readBody(req);
    const prompt =
      (typeof body.prompt === "string" ? body.prompt : "") ||
      (typeof body.message === "string" ? body.message : "");

    if (!prompt.trim()) {
      res.status(400).json({ ok: false, error: "prompt is required" });
      return;
    }

    const trimmedPrompt = prompt.slice(0, MAX_PROMPT_CHARS);

    // ─── TIER 1: GOOGLE GEMINI (server-side keys only) ─────────────────────
    const rawKeys = [
      process.env.GEMINI_API_KEY,
      process.env.MALLIK_API_KEY,
      process.env.GOOGLE_API_KEY,
      process.env.AI_STUDIO_API_KEY,
    ]
      .filter((k): k is string => typeof k === "string" && k.trim().length > 10)
      .map((k) => k.trim());
    const candidateKeys = Array.from(new Set(rawKeys));

    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const apiKey of candidateKeys) {
      for (const model of modelsToTry) {
        try {
          const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                contents: [{ parts: [{ text: trimmedPrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
              }),
              signal: AbortSignal.timeout(15000),
            }
          );

          if (upstream.ok) {
            const data: GeminiApiResponse = await upstream.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              res.status(200).json({ ok: true, text, tier: "Cloud", model });
              return;
            }
          }
        } catch {
          // try next model / key
        }
      }
    }

    // ─── TIER 1.5: OPENROUTER (single key, 200+ models) ──────────────────
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
    if (openRouterKey && openRouterKey.length > 10) {
      const orModels = ["google/gemini-2.5-flash", "google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct"];
      for (const orModel of orModels) {
        try {
          const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterKey}`,
              "HTTP-Referer": "https://sari-assistant.vercel.app",
              "X-Title": "SARI Sovereign AI",
            },
            body: JSON.stringify({
              model: orModel,
              messages: [
                { role: "system", content: SYSTEM_INSTRUCTION },
                { role: "user", content: trimmedPrompt },
              ],
              temperature: 0.7,
              max_tokens: 1024,
            }),
            signal: AbortSignal.timeout(20000),
          });

          if (orRes.ok) {
            const orData: OpenRouterResponse = await orRes.json();
            const orText = orData.choices?.[0]?.message?.content?.trim();
            if (orText) {
              res.status(200).json({ ok: true, text: orText, tier: "OpenRouter", model: orData.model || orModel });
              return;
            }
          }
        } catch {
          // try next model
        }
      }
    }

    // ─── TIER 2: SIGNED APPS SCRIPT BRIDGE ────────────────────────────────
    const action = "ai_infer";
    const auth = appsScriptAuth(action);
    const scriptUrl = process.env.SARI_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
    if (auth) {
      try {
        const scriptRes = await fetch(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, prompt: trimmedPrompt, auth }),
          signal: AbortSignal.timeout(15000),
        });
        if (scriptRes.ok) {
          const scriptData: unknown = await scriptRes.json();
          if (scriptData && typeof scriptData === "object") {
            const obj = scriptData as Record<string, unknown>;
            const result = obj.result && typeof obj.result === "object" ? (obj.result as Record<string, unknown>) : null;
            const reply =
              (result && typeof result.text === "string" ? result.text : null) ||
              (typeof obj.reply === "string" ? obj.reply : null);
            if (reply) {
              res.status(200).json({ ok: true, text: reply, tier: "AppsScriptBrain", model: "AppsScript-Core" });
              return;
            }
          }
        }
      } catch {
        // fall through to degraded response
      }
    }

    // ─── No tier produced an answer: say so. Never fabricate. ─────────────
    res.status(503).json({
      ok: false,
      tier: "degraded",
      error:
        "No upstream model is reachable. Configure GEMINI_API_KEY (and optionally SARI_SHARED_SECRET + SARI_APPS_SCRIPT_URL), or use the local Ollama runtime.",
    });
  } catch {
    res.status(500).json({ ok: false, error: "Internal chat error" });
  }
}
