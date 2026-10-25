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
    expect(res.statusCode).toBe(503);
    const data = res.data as Record<string, unknown>;
    expect(data.ok).toBe(false);
    expect(data.text).toBeUndefined();
  }, 25000);

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
    expect(res.statusCode).toBe(400);
  });

  it("clears session cookie on logout", async () => {
    const res = createMockResponse();
    await logoutHandler(request("POST", {}, { cookie: authCookie }), res.res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["set-cookie"]).toMatch(/Max-Age=0/);
  });
});
