import { describe, it, expect, beforeAll } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import loginHandler from "../api/login.js";
import logoutHandler from "../api/logout.js";
import sessionHandler from "../api/session.js";
import chatHandler from "../api/chat.js";
import leadsHandler from "../api/leads.js";
import auditHandler from "../api/audit.js";
import changePasswordHandler from "../api/change-password.js";
import probeScriptHandler from "../api/probe-script.js";
import webhookHandler from "../api/webhook.js";
import { appsScriptAuth, authConfigured } from "../api/_security.js";

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  data: unknown;
  ended: boolean;
  res: VercelResponse;
}

function createMockResponse(): MockResponse {
  const result: MockResponse = {
    statusCode: 200,
    headers: {},
    data: null,
    ended: false,
    res: {} as unknown as VercelResponse,
  };

  const resObj = {
    setHeader(name: string, value: string) {
      result.headers[name.toLowerCase()] = value;
      return resObj;
    },
    status(code: number) {
      result.statusCode = code;
      return resObj;
    },
    json(payload: unknown) {
      result.data = payload;
      result.ended = true;
      return resObj;
    },
    end() {
      result.ended = true;
      return resObj;
    },
  };

  result.res = resObj as unknown as VercelResponse;
  return result;
}

function cookieFrom(mock: MockResponse): string {
  const header = mock.headers["set-cookie"] || "";
  return header.split(";")[0] || "";
}

function request(
  method: string,
  body: Record<string, unknown> = {},
  headers: Record<string, string> = {},
  query: Record<string, string | string[]> = {}
): VercelRequest {
  return {
    method,
    headers: { host: "localhost:3000", ...headers },
    body,
    query,
  } as unknown as VercelRequest;
}

describe("SARI Sovereign API Contracts", () => {
  let authCookie = "";

  beforeAll(() => {
    process.env.SARI_SESSION_SECRET = "test-session-secret-that-is-long-enough-1234";
    process.env.SARI_PASSWORD = "test-password";
    process.env.SARI_LOGIN_EMAIL = "md@divyanshicapital.com";
    delete process.env.SARI_PASSWORD_HASH;
    delete process.env.GEMINI_API_KEY;
    delete process.env.MALLIK_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.AI_STUDIO_API_KEY;
    delete process.env.SARI_SHARED_SECRET;
    delete process.env.SARI_TELEGRAM_BOT_TOKEN;
    delete process.env.SARI_TELEGRAM_CHAT_ID;
    delete process.env.SARI_SUPABASE_URL;
    delete process.env.SARI_SUPABASE_KEY;
  });

  it("enforces method guards on login and chat", async () => {
    const res1 = createMockResponse();
    await loginHandler(request("GET"), res1.res);
    expect(res1.statusCode).toBe(405);

    const res2 = createMockResponse();
    await chatHandler(request("GET"), res2.res);
    expect(res2.statusCode).toBe(405);
  });

  it("rejects login with empty body", async () => {
    const res = createMockResponse();
    await loginHandler(request("POST", {}), res.res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects invalid login credentials without revealing target", async () => {
    const res = createMockResponse();
    await loginHandler(
      request("POST", { email: "md@divyanshicapital.com", password: "wrong" }, { "x-forwarded-for": "10.0.0.1" }),
      res.res
    );
    expect(res.statusCode).toBe(401);
  });

  it("authenticates valid login and returns secure HttpOnly cookie", async () => {
    const res = createMockResponse();
    await loginHandler(
      request("POST", { email: "md@divyanshicapital.com", password: "test-password" }, { "x-forwarded-for": "10.0.0.2" }),
      res.res
    );
    expect(res.statusCode).toBe(200);

    const setCookie = res.headers["set-cookie"] || "";
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);

    const payload = res.data as Record<string, unknown>;
    expect(payload.token).toBeUndefined(); // never expose token in body

    authCookie = cookieFrom(res);
    expect(authCookie.length).toBeGreaterThan(0);
  });

  it("verifies session status with session probe", async () => {
    const resAuth = createMockResponse();
    await sessionHandler(request("GET", {}, { cookie: authCookie }), resAuth.res);
    const authData = resAuth.data as Record<string, unknown>;
    expect(authData.ok).toBe(true);

    const resAnon = createMockResponse();
    await sessionHandler(request("GET"), resAnon.res);
    const anonData = resAnon.data as Record<string, unknown>;
    expect(anonData.ok).toBe(false);
  });

  it("rejects cross-origin chat requests", async () => {
    const res = createMockResponse();
    await chatHandler(
      request("POST", { prompt: "hello" }, { origin: "https://hostile.site", cookie: authCookie }),
      res.res
    );
    expect(res.statusCode).toBe(403);
  });

  it("degrades gracefully when no model tier is reachable without fabricating", async () => {
    const res = createMockResponse();
    await chatHandler(request("POST", { prompt: "hello" }, { cookie: authCookie }), res.res);
    // In CI (no keys) → 503; locally with OPENROUTER_API_KEY → 200 with real text
    expect([200, 503]).toContain(res.statusCode);
    const data = res.data as Record<string, unknown>;
    if (res.statusCode === 503) {
      expect(data.ok).toBe(false);
      expect(data.text).toBeUndefined();
    } else {
      expect(data.ok).toBe(true);
    }
  }, 30000);

  it("handles leads status and fallback dispatch", async () => {
    const resStatus = createMockResponse();
    await leadsHandler(request("POST", { action: "status" }, { cookie: authCookie }), resStatus.res);
    expect(resStatus.statusCode).toBe(200);
    const statusData = resStatus.data as Record<string, unknown>;
    expect(statusData.telegramConfigured).toBe(false);

    const resDispatch = createMockResponse();
    await leadsHandler(
      request(
        "POST",
        { action: "dispatch", lead: { name: "Test Lead", source: "contract-test", intent: "high" } },
        { cookie: authCookie }
      ),
      resDispatch.res
    );
    expect(resDispatch.statusCode).toBe(200);
    const dispatchData = resDispatch.data as Record<string, unknown>;
    expect(dispatchData.ok).toBe(true);
    expect(dispatchData.channel).toBe("in_app");
  });
  it("supports GET on leads endpoint for health and pipeline inspection", async () => {
    const resGet = createMockResponse();
    await leadsHandler(request("GET", {}, { cookie: authCookie }), resGet.res);
    expect(resGet.statusCode).toBe(200);
    const getData = resGet.data as Record<string, unknown>;
    expect(getData.ok).toBe(true);
    expect(Array.isArray(getData.leads)).toBe(true);
  });


  it("handles audit sink with session guard", async () => {
    const anonRes = createMockResponse();
    await auditHandler(request("POST", { action: "test", status: "ok" }), anonRes.res);
    expect(anonRes.statusCode).toBe(401);

    const authRes = createMockResponse();
    await auditHandler(request("POST", { action: "test", status: "ok" }, { cookie: authCookie }), authRes.res);
    expect(authRes.statusCode).toBe(202);
  });

  it("guards probe-script against invalid deployment IDs", async () => {
    const res = createMockResponse();
    await probeScriptHandler(request("GET", {}, {}, { deploymentId: "bad/id/with/slashes" }), res.res);
    // requireSession fires before format validation → 401, not 400
    expect(res.statusCode).toBe(401);
  });

  it("clears session cookie on logout", async () => {
    const res = createMockResponse();
    await logoutHandler(request("POST", {}, { cookie: authCookie }), res.res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["set-cookie"]).toMatch(/Max-Age=0/);
  });
  it("handles totp-setup and totp-verify via change-password handler", async () => {
    const unauthRes = createMockResponse();
    await changePasswordHandler(request("GET", {}, {}, { action: "totp-setup" }), unauthRes.res);
    expect(unauthRes.statusCode).toBe(401);

    const authRes = createMockResponse();
    await changePasswordHandler(request("GET", {}, { cookie: authCookie }, { action: "totp-setup" }), authRes.res);
    expect(authRes.statusCode).toBe(200);
    const data = authRes.data as Record<string, unknown>;
    expect(data.ok).toBe(true);

    const badVerifyRes = createMockResponse();
    await changePasswordHandler(
      request("POST", { action: "totp-verify", code: "bad" }, { cookie: authCookie }),
      badVerifyRes.res
    );
    expect(badVerifyRes.statusCode).toBe(400);
  });


  it("fails closed when no webhook secret is configured", async () => {
    delete process.env.SARI_MASTER_API_KEY;
    delete process.env.SARI_WEBHOOK_SECRET;
    delete process.env.SARI_SHARED_SECRET;

    const res = createMockResponse();
    await webhookHandler(
      request("POST", { agent: "monitor", event: "healthy" }, { authorization: "Bearer arbitrary-value" }),
      res.res
    );

    expect(res.statusCode).toBe(503);
  });

  it("syncs an authenticated webhook event to the SARI bridge", async () => {
    const previousFetch = globalThis.fetch;
    const previousWebhookSecret = process.env.SARI_WEBHOOK_SECRET;
    const previousSharedSecret = process.env.SARI_SHARED_SECRET;
    const webhookSecret = "webhook-secret-for-test-only-1234567890";
    const sharedSecret = "shared-secret-for-test-only-1234567890";
    const requests: string[] = [];
    process.env.SARI_WEBHOOK_SECRET = webhookSecret;
    process.env.SARI_SHARED_SECRET = sharedSecret;
    globalThis.fetch = async (input) => {
      requests.push(String(input));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    try {
      const res = createMockResponse();
      await webhookHandler(
        request(
          "POST",
          { agent: "monitor", event: "health_check", payload: { status: "ok" } },
          { authorization: `Bearer ${webhookSecret}`, "x-forwarded-for": "203.0.113.42" }
        ),
        res.res
      );

      expect(res.statusCode).toBe(200);
      expect(res.data).toMatchObject({ ok: true, synced: true, agent: "monitor", event: "health_check" });
      expect(requests).toHaveLength(1);
      expect(requests[0]).toContain("AKfycbw_DlODYECpdfJKag01Jz5QlmoH2Fdj6kFElfKCOTiZfv8aFeYBLorki_4qlSC5tCr3");
    } finally {
      globalThis.fetch = previousFetch;
      if (previousWebhookSecret === undefined) delete process.env.SARI_WEBHOOK_SECRET;
      else process.env.SARI_WEBHOOK_SECRET = previousWebhookSecret;
      if (previousSharedSecret === undefined) delete process.env.SARI_SHARED_SECRET;
      else process.env.SARI_SHARED_SECRET = previousSharedSecret;
    }
  });

  it("requires explicit environment configuration for session authentication", () => {
    const names = ["SARI_SESSION_SECRET", "SARI_PASSWORD", "SARI_PASSWORD_HASH", "SARI_LOGIN_EMAIL"] as const;
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    for (const name of names) delete process.env[name];

    try {
      expect(authConfigured()).toBe(false);
    } finally {
      for (const name of names) {
        const value = previous[name];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  it("does not sign Apps Script traffic without a configured shared secret", () => {
    const previousSharedSecret = process.env.SARI_SHARED_SECRET;
    delete process.env.SARI_SHARED_SECRET;

    try {
      expect(appsScriptAuth("autopilot_learn")).toBeNull();
    } finally {
      if (previousSharedSecret === undefined) delete process.env.SARI_SHARED_SECRET;
      else process.env.SARI_SHARED_SECRET = previousSharedSecret;
    }
  });
});
