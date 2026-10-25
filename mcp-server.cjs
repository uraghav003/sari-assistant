#!/usr/bin/env node
/**
 * SARI — Model Context Protocol (MCP) server
 *
 * Principles:
 *  - No fabricated data. Handlers either compute from their inputs or say
 *    explicitly that no data source is connected.
 *  - No unauthenticated proxy. The Apps Script bridge is signed and allowlisted.
 *  - Inputs are validated and bounded before use.
 */

const crypto = require("node:crypto");
const readline = require("node:readline");
const { sovereignMind, EXEC_URL, signedAuth } = require("./dynamic-mind.cjs");

const MAX_PROMPT_CHARS = 8000;
const MAX_TEXT_FIELD = 300;
const BRIDGE_ACTIONS = [
  "ping",
  "autopilot_heartbeat",
  "sync_memory",
  "autopilot_learn",
  "notion_sync",
  "notebooklm_sync",
];

const TOOLS = [
  {
    name: "sari_infer",
    description: "Run SARI sovereign inference with signed memory context (cloud Gemini, then local Ollama).",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "User query or directive (max 8000 chars)" },
        tier: { type: "string", enum: ["auto", "cloud", "local"], default: "auto" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "sari_loan_emi",
    description:
      "Compute amortised monthly EMI and total interest. Pure arithmetic — no lender data is fetched.",
    inputSchema: {
      type: "object",
      properties: {
        principal: { type: "number", description: "Loan amount in INR" },
        annualRatePercent: { type: "number", description: "Annual interest rate, e.g. 9.5" },
        tenureMonths: { type: "number", description: "Tenure in months" },
      },
      required: ["principal", "annualRatePercent", "tenureMonths"],
    },
  },
  {
    name: "sari_memory_vault_sync",
    description: "Append a lesson to the signed Apps Script memory vault.",
    inputSchema: {
      type: "object",
      properties: {
        lesson: { type: "string", description: "Lesson text (max 300 chars)" },
      },
      required: ["lesson"],
    },
  },
  {
    name: "sari_apps_script_bridge",
    description:
      "Send a signed, allowlisted action to the SARI Apps Script web app. Free-form actions are rejected.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: BRIDGE_ACTIONS },
        payload: { type: "object", description: "Optional bounded payload" },
      },
      required: ["action"],
    },
  },
  {
    name: "sari_verify_token",
    description:
      "Verify a session token or an Apps Script request signature against the configured secrets.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["session", "apps_script"] },
        token: { type: "string", description: "Session token (<expiry>.<hmac>)" },
        action: { type: "string", description: "Action name for apps_script signatures" },
        ts: { type: "string", description: "Millisecond timestamp for apps_script signatures" },
        sig: { type: "string", description: "HMAC hex for apps_script signatures" },
      },
      required: ["kind"],
    },
  },
];

function text(payload) {
  return { content: [{ type: "text", text: payload }] };
}

function fail(message) {
  return { isError: true, content: [{ type: "text", text: message }] };
}

function str(value, max = MAX_TEXT_FIELD) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function emiFormula(principal, annualRatePercent, tenureMonths) {
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) {
    const flat = principal / tenureMonths;
    return { emi: flat, totalInterest: 0 };
  }
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return { emi, totalInterest: emi * tenureMonths - principal };
}

async function handleToolCall(name, args) {
  switch (name) {
    case "sari_infer": {
      const prompt = str(args.prompt, MAX_PROMPT_CHARS);
      if (!prompt) return fail("prompt is required");
      const tier = ["auto", "cloud", "local"].includes(args.tier) ? args.tier : "auto";
      const result = await sovereignMind.infer(prompt, { tier });
      return text(`[${result.agent} · ${result.tier} (${result.model || "none"})]\n\n${result.text}`);
    }

    case "sari_loan_emi": {
      const principal = num(args.principal);
      const rate = num(args.annualRatePercent);
      const months = num(args.tenureMonths);
      if (!principal || principal <= 0 || rate === null || rate < 0 || !months || months <= 0) {
        return fail("principal, annualRatePercent and tenureMonths must be positive numbers");
      }
      const { emi, totalInterest } = emiFormula(principal, rate, months);
      const inr = (value) => `₹${Math.round(value).toLocaleString("en-IN")}`;
      return text(
        `Amortised EMI: ${inr(emi)} per month\n` +
          `Total interest over ${months} months: ${inr(totalInterest)}\n` +
          `Total repayment: ${inr(principal + totalInterest)}\n` +
          `Inputs: principal ${inr(principal)}, rate ${rate}% p.a., tenure ${months} months.`
      );
    }

    case "sari_memory_vault_sync": {
      const lesson = str(args.lesson);
      if (!lesson) return fail("lesson is required");
      const synced = await sovereignMind.syncLesson(lesson);
      if (!synced) {
        return fail(
          "Vault sync failed. Set SARI_DEPLOYMENT_ID and SARI_SHARED_SECRET and confirm the Apps Script backend is deployed."
        );
      }
      return text(`Lesson appended to the signed vault (${lesson.slice(0, 60)}…).`);
    }

    case "sari_apps_script_bridge": {
      const action = str(args.action, 40);
      if (!BRIDGE_ACTIONS.includes(action)) {
        return fail(`Action not allowed. Permitted: ${BRIDGE_ACTIONS.join(", ")}`);
      }
      const auth = signedAuth(action);
      if (!auth || !EXEC_URL) return fail("SARI_SHARED_SECRET and SARI_DEPLOYMENT_ID are required.");
      const payload = args.payload && typeof args.payload === "object" && !Array.isArray(args.payload)
        ? args.payload
        : {};
      try {
        const res = await fetch(EXEC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, action, auth }),
        });
        const body = await res.text();
        if (!res.ok) return fail(`Apps Script returned HTTP ${res.status}.`);
        return text(body.slice(0, 4000));
      } catch (err) {
        return fail(`Apps Script bridge failed: ${err.message}`);
      }
    }

    case "sari_verify_token": {
      const kind = str(args.kind, 20);
      if (kind === "session") {
        const secret = process.env.SARI_SESSION_SECRET || "";
        const token = str(args.token, 200);
        if (!secret) return fail("SARI_SESSION_SECRET is not set in this environment.");
        const dot = token.indexOf(".");
        if (dot < 1) return text("INVALID: token is not in <expiry>.<hmac> form.");
        const expiry = token.slice(0, dot);
        const sig = token.slice(dot + 1);
        if (!/^\d+$/.test(expiry)) return text("INVALID: expiry is not numeric.");
        const expected = crypto.createHmac("sha256", secret).update(expiry).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        const equal = a.length === b.length && crypto.timingSafeEqual(a, b);
        if (!equal) return text("INVALID: signature mismatch.");
        const expired = Date.now() > parseInt(expiry, 10);
        return text(expired ? "INVALID: signature valid but token expired." : "VALID: signature and expiry check passed.");
      }

      if (kind === "apps_script") {
        const secret = process.env.SARI_SHARED_SECRET || "";
        const action = str(args.action, 40);
        const ts = str(args.ts, 20);
        const sig = str(args.sig, 128);
        if (!secret) return fail("SARI_SHARED_SECRET is not set in this environment.");
        if (!action || !ts || !sig) return fail("action, ts and sig are required.");
        const stamp = parseInt(ts, 10);
        if (!stamp || Math.abs(Date.now() - stamp) > 5 * 60 * 1000) {
          return text("INVALID: timestamp outside the 5 minute window.");
        }
        const expected = crypto.createHmac("sha256", secret).update(`${action}.${stamp}`).digest("hex");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        const equal = a.length === b.length && crypto.timingSafeEqual(a, b);
        return text(equal ? "VALID: Apps Script signature matches." : "INVALID: signature mismatch.");
      }

      return fail("kind must be 'session' or 'apps_script'.");
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function mcpResponse(id, result) {
  return JSON.stringify({ jsonrpc: "2.0", id: id === undefined ? null : id, result });
}

function mcpError(id, code, message) {
  return JSON.stringify({ jsonrpc: "2.0", id: id === undefined ? null : id, error: { code, message } });
}

async function processRpcLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  let req;
  try {
    req = JSON.parse(trimmed);
  } catch {
    process.stdout.write(mcpError(null, -32700, "Parse error") + "\n");
    return;
  }

  const { id, method, params } = req;

  try {
    switch (method) {
      case "initialize":
        process.stdout.write(
          mcpResponse(id, {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "sari-mcp", version: "4.0.0" },
          }) + "\n"
        );
        break;

      case "notifications/initialized":
        break;

      case "ping":
        process.stdout.write(mcpResponse(id, {}) + "\n");
        break;

      case "tools/list":
        process.stdout.write(mcpResponse(id, { tools: TOOLS }) + "\n");
        break;

      case "tools/call": {
        if (!params || typeof params.name !== "string") {
          process.stdout.write(mcpError(id, -32602, "Missing tool name") + "\n");
          return;
        }
        const result = await handleToolCall(params.name, params.arguments || {});
        process.stdout.write(mcpResponse(id, result) + "\n");
        break;
      }

      default:
        process.stdout.write(mcpError(id, -32601, `Method not found: ${method}`) + "\n");
    }
  } catch (err) {
    process.stdout.write(mcpError(id, -32603, err.message || "Internal error") + "\n");
  }
}

function startServer() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on("line", (line) => {
    if (line.length > 100_000) {
      process.stdout.write(mcpError(null, -32600, "Request too large") + "\n");
      return;
    }
    processRpcLine(line).catch((err) => {
      process.stderr.write(`RPC error: ${err.message}\n`);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { TOOLS, handleToolCall, emiFormula };
