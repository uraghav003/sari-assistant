import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authConfigured, checkCredentials, issueToken } from "./_auth";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!authConfigured()) {
    res.status(503).json({ error: "Login not configured on server. Set SARI_LOGIN_EMAIL, SARI_PASSWORD_HASH and SARI_SESSION_SECRET in Vercel env." });
    return;
  }

  const body = typeof req.body === "object" && req.body !== null ? req.body : {};
  const email = "email" in body && typeof body.email === "string" ? body.email : "";
  const password = "password" in body && typeof body.password === "string" ? body.password : "";

  if (!email.trim() || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  if (checkCredentials(email, password)) {
    res.status(200).json({ token: issueToken() });
    return;
  }

  // Generic message — never reveal whether email or password was wrong
  res.status(401).json({ error: "Invalid email or password" });
}
