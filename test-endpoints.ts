import loginHandler from "./api/login.js";
import chatHandler from "./api/chat.js";
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

async function runTests() {
  console.log("=== SARI API ENDPOINTS VERIFICATION ===");

  // TEST 1: login GET -> expect 405
  {
    const mockRes = createMockResponse();
    const req = {
      method: "GET",
      headers: {},
      body: {},
    } as unknown as VercelRequest;

    await loginHandler(req, mockRes.res);
    console.log("[LOGIN GET]", {
      status: mockRes.statusCode,
      data: mockRes.data,
    });
    if (mockRes.statusCode !== 405) {
      throw new Error(`Expected 405 for login GET, got ${mockRes.statusCode}`);
    }
  }

  // TEST 2: login empty POST -> expect 400
  {
    const mockRes = createMockResponse();
    const req = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: {},
    } as unknown as VercelRequest;

    await loginHandler(req, mockRes.res);
    console.log("[LOGIN EMPTY POST]", {
      status: mockRes.statusCode,
      data: mockRes.data,
    });
    if (mockRes.statusCode !== 400) {
      throw new Error(`Expected 400 for login empty POST, got ${mockRes.statusCode}`);
    }
  }

  // TEST 3: login valid credentials -> expect 200 with token
  let token = "";
  {
    const mockRes = createMockResponse();
    const req = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: {
        email: "md@divyanshicapital.com",
        password: "MALLIK_V3_786",
      },
    } as unknown as VercelRequest;

    await loginHandler(req, mockRes.res);
    console.log("[LOGIN VALID CREDENTIALS]", {
      status: mockRes.statusCode,
      data: mockRes.data,
    });
    if (mockRes.statusCode !== 200) {
      throw new Error(`Expected 200 for login valid credentials, got ${mockRes.statusCode}`);
    }
    const data = mockRes.data as { ok: boolean; token?: string };
    if (!data.ok || !data.token) {
      throw new Error("Login response missing token or ok: true");
    }
    token = data.token;
  // TEST 3B: login other allowed passwords & invalid passwords
  for (const pwd of ["sari2026", "divyanshi2026", "admin786"]) {
    const mockRes = createMockResponse();
    const req = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { email: "md@divyanshicapital.com", password: pwd },
    } as unknown as VercelRequest;
    await loginHandler(req, mockRes.res);
    if (mockRes.statusCode !== 200) {
      throw new Error(`Expected 200 for password ${pwd}, got ${mockRes.statusCode}`);
    }
  }

  // TEST 3C: login invalid credentials -> expect 401
  {
    const mockRes = createMockResponse();
    const req = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: { email: "md@divyanshicapital.com", password: "wrong-password" },
    } as unknown as VercelRequest;
    await loginHandler(req, mockRes.res);
    if (mockRes.statusCode !== 401) {
      throw new Error(`Expected 401 for wrong password, got ${mockRes.statusCode}`);
    }
    console.log("[LOGIN INVALID CREDENTIALS]", {
      status: mockRes.statusCode,
      data: mockRes.data,
    });
  }

  }

  // TEST 4: chat GET -> expect 405
  {
    const mockRes = createMockResponse();
    const req = {
      method: "GET",
      headers: {},
      body: {},
    } as unknown as VercelRequest;

    await chatHandler(req, mockRes.res);
    console.log("[CHAT GET]", {
      status: mockRes.statusCode,
      data: mockRes.data,
    });
    if (mockRes.statusCode !== 405) {
      throw new Error(`Expected 405 for chat GET, got ${mockRes.statusCode}`);
    }
  }

  // TEST 5: chat sample prompt with token -> expect 200 JSON
  {
    const mockRes = createMockResponse();
    const req = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sari-token": token,
      },
      body: {
        prompt: "Hello SARI! What is your current operational status?",
      },
    } as unknown as VercelRequest;

    await chatHandler(req, mockRes.res);
    console.log("[CHAT SAMPLE PROMPT]", {
      status: mockRes.statusCode,
      data: mockRes.data,
    });
    if (mockRes.statusCode !== 200) {
      throw new Error(`Expected 200 for chat prompt, got ${mockRes.statusCode}`);
    }
    const data = mockRes.data as { ok: boolean; text?: string; tier?: string; model?: string };
    if (!data.ok || !data.text) {
      throw new Error("Chat response missing text or ok: true");
    }
  }

  console.log("=== ALL SIMULATION TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err: unknown) => {
  console.error("Test failed:", err);
  process.exit(1);
});
