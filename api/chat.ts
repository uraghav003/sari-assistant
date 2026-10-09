import type { VercelRequest, VercelResponse } from "@vercel/node";

interface GeminiCandidate {
  content?: {
    parts?: Array<{
      text?: string;
    }>;
  };
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
    code?: number;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const customKey = typeof req.headers["x-gemini-key"] === "string" ? req.headers["x-gemini-key"] : undefined;
  const apiKey = process.env.GEMINI_API_KEY || customKey;

  if (!apiKey) {
    res.status(503).json({
      error: "NO_KEY",
      hint: "Add GEMINI_API_KEY to Vercel Environment Variables, then redeploy.",
    });
    return;
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const prompt = "prompt" in body && typeof body.prompt === "string" ? body.prompt : "";

  if (!prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const data: GeminiApiResponse = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: `Gemini API Error: HTTP ${upstream.status}`,
        detail: data,
      });
      return;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    res.status(200).json({ text });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal proxy error";
    res.status(500).json({ error: message });
  }
}
