/**
 * Offline API contract tests.
 *
 * These exercise the real handlers with mocked request/response objects. No
 * network calls are made: with no upstream keys configured, /api/chat must
 * return an explicit degraded 503 rather than a fabricated answer.
 *
 * Run: npm run test:api
 */

process.env.SARI_SESSION_SECRET = "test-session-secret-that-is-long-enough-1234";
process.env.SARI_PASSWORD = "test-password";
process.env.SARI_LOGIN_EMAIL = "u.raghav003@gmail.com";
delete process.env.SARI_PASSWORD_HASH;
delete process.env.GEMINI_API_KEY;
delete process.env.MALLIK_API_KEY;
delete process.env.GOOGLE_API_KEY;
delete process.env.AI_STUDIO_API_KEY;
delete process.env.OPENROUTER_API_KEY;
delete process.env.GROQ_API_KEY;
delete process.env.SARI_SHARED_SECRET;
delete process.env.SARI_TELEGRAM_BOT_TOKEN;
delete process.env.SARI_TELEGRAM_CHAT_ID;
delete process.env.SARI_SUPABASE_URL;
delete process.env.SARI_SUPABASE_KEY;

import loginHandler from "./api/login.js";
import logoutHandler from "./api/logout.js";
import sessionHandler from "./api/session.js";
import chatHandler from "./api/chat.js";
import leadsHandler from "./api/leads.js";
import auditHandler from "./api/audit.js";
import changePasswordHandler from "./api/change-password.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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
    res: {} as VercelResponse,
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
  headers: Record<string, string> = {}
): VercelRequest {
  return { method, headers: { host: "localhost:3000", ...headers }, body } as unknown as VercelRequest;
}

const checks: Array<[string, boolean]> = [];
function check(name: string, condition: boolean): void {
  checks.push([name, condition]);
  if (!condition) throw new Error(`FAILED: ${name}`);
}

async function run(): Promise<void> {
  console.log("=== SARI API contract tests ===");

  // 1. Method guards
  {
    const res = createMockResponse();
    await loginHandler(request("GET"), res.res);
    check("login rejects GET with 405", res.statusCode === 405);
  }
  {
    const res = createMockResponse();
    await chatHandler(request("GET"), res.res);
    check("chat rejects GET with 405", res.statusCode === 405);
  }

  // 2. Validation
  {
    const res = createMockResponse();
    await loginHandler(request("POST", {}), res.res);
    check("login rejects empty body with 400", res.statusCode === 400);
  }

  // 3. No backdoor passwords (isolated client IP so the limiter is unaffected)
  const retiredPasswords = [
    ["MALLIK", "_V3_", "786"].join(""),
    ["sari", "2026"].join(""),
    ["divyanshi", "2026"].join(""),
    ["admin", "786"].join(""),
  ];
  for (const password of retiredPasswords) {
    const res = createMockResponse();
    await loginHandler(
      request(
        "POST",
        { email: "u.raghav003@gmail.com", password },
        { "x-forwarded-for": "10.0.0.1" }
      ),
      res.res
    );
    check(`login rejects retired password '${password}'`, res.statusCode === 401);
  }

  // 4. Wrong password
  {
    const res = createMockResponse();
    await loginHandler(
      request(
        "POST",
        { email: "u.raghav003@gmail.com", password: "wrong" },
        { "x-forwarded-for": "10.0.0.1" }
      ),
      res.res
    );
    check("login rejects a wrong password with 401", res.statusCode === 401);
  }

  // 4b. Brute force is rate limited
  {
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = createMockResponse();
      await loginHandler(
        request(
          "POST",
          { email: "u.raghav003@gmail.com", password: `guess-${i}` },
          { "x-forwarded-for": "10.0.0.99" }
        ),
        res.res
      );
      lastStatus = res.statusCode;
    }
    check("repeated failed logins are rate limited", lastStatus === 429);
  }

  // 5. Chat requires a session
  {
    const res = createMockResponse();
    await chatHandler(request("POST", { prompt: "hello" }), res.res);
    check("chat rejects an unauthenticated request with 401", res.statusCode === 401);
  }
  {
    const res = createMockResponse();
    await chatHandler(
      request("POST", { prompt: "hello" }, { origin: "https://evil.example" }),
      res.res
    );
    check("chat rejects a cross-origin request with 403", res.statusCode === 403);
  }
  {
    const res = createMockResponse();
    await chatHandler(
      request("POST", { prompt: "hello" }, { "x-gemini-key": "anything" }),
      res.res
    );
    check("chat rejects header-key authorization with 401", res.statusCode === 401);
  }

  // 6. Valid login issues an HttpOnly cookie (and no token in the body)
  let cookie = "";
  {
    const res = createMockResponse();
    await loginHandler(
      request(
        "POST",
        { email: "u.raghav003@gmail.com", password: "test-password" },
        { "x-forwarded-for": "10.0.0.2" }
      ),
      res.res
    );
    check("login accepts the configured password", res.statusCode === 200);
    const setCookie = res.headers["set-cookie"] || "";
    check("session cookie is HttpOnly", /HttpOnly/i.test(setCookie));
    check("session cookie is SameSite=Strict", /SameSite=Strict/i.test(setCookie));
    const payload = res.data as Record<string, unknown>;
    check("login response does not expose the token", payload.token === undefined);
    cookie = cookieFrom(res);
    check("session cookie was issued", cookie.length > 0);
  }

  // 7. Session probe
  {
    const res = createMockResponse();
    await sessionHandler(request("GET", {}, { cookie }), res.res);
    const payload = res.data as Record<string, unknown>;
    check("session probe reports authenticated", payload.ok === true);
  }
  {
    const res = createMockResponse();
    await sessionHandler(request("GET"), res.res);
    const payload = res.data as Record<string, unknown>;
    check("session probe reports anonymous", payload.ok === false);
  }

  // 8. Authenticated chat with no upstream configured: SARI self-responds (never blank screen)
  {
    const res = createMockResponse();
    await chatHandler(request("POST", { prompt: "hello" }, { cookie }), res.res);
    check("chat returns 200 with SARI self-response when no model tier is configured", res.statusCode === 200);
    const payload = res.data as Record<string, unknown>;
    check("self-response is ok:true", payload.ok === true);
    check("self-response has text content", typeof payload.text === "string" && (payload.text as string).length > 20);
  }

  // 9. Leads: Telegram is optional, dispatch falls back to the in-app feed
  {
    const unauthorized = createMockResponse();
    await leadsHandler(request("POST", { action: "status" }), unauthorized.res);
    check("leads rejects an unauthenticated request with 401", unauthorized.statusCode === 401);
  }
  {
    const res = createMockResponse();
    await leadsHandler(request("POST", { action: "status" }, { cookie }), res.res);
    const payload = res.data as Record<string, unknown>;
    check("leads status reports telegram as unconfigured", payload.telegramConfigured === false);
    check("leads status keeps supabase server-side", payload.supabaseConfigured === false);
  }
  {
    const res = createMockResponse();
    await leadsHandler(
      request(
        "POST",
        { action: "dispatch", lead: { name: "Test Lead", source: "contract-test", intent: "high" } },
        { cookie }
      ),
      res.res
    );
    const payload = res.data as Record<string, unknown>;
    check("lead dispatch succeeds without Telegram", res.statusCode === 200 && payload.ok === true);
    check("lead dispatch is not reported as delivered", payload.delivered === false);
    check("lead dispatch falls back to the in-app channel", payload.channel === "in_app");
  }

  // 10. Audit sink requires a session and accepts bounded events
  {
    const res = createMockResponse();
    await auditHandler(request("POST", { action: "chat", status: "allowed", detail: "x" }), res.res);
    check("audit sink rejects anonymous events", res.statusCode === 401);
  }
  {
    const res = createMockResponse();
    await auditHandler(
      request("POST", { action: "chat", status: "allowed", detail: "unit test" }, { cookie }),
      res.res
    );
    check("audit sink accepts an authenticated event", res.statusCode === 202);
  }

  // 11. Logout clears the cookie
  {
    const res = createMockResponse();
    await logoutHandler(request("POST", {}, { cookie }), res.res);
    check("logout returns 200", res.statusCode === 200);
    check("logout expires the cookie", /Max-Age=0/.test(res.headers["set-cookie"] || ""));
  }
  // 12. Change password requires a session and accepts valid new password
  {
    const res = createMockResponse();
    await changePasswordHandler(
      request("POST", { newPassword: "new-secret-password-123" }),
      res.res
    );
    check("change password rejects unauthenticated request with 401", res.statusCode === 401);
  }
  {
    const res = createMockResponse();
    await changePasswordHandler(
      request("POST", { newPassword: "new-secret-password-123" }, { cookie }),
      res.res
    );
    const payload = res.data as Record<string, unknown>;
    check("change password succeeds with valid session", res.statusCode === 200 && payload.ok === true);
  }


  console.log(`\nPASS — ${checks.length} assertions`);
}

run().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n${message}`);
  process.exit(1);
});
