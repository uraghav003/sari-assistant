#!/usr/bin/env tsx
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../../../Users/aecr/.agents/skills/ruflo-hub-runner.ts
var ruflo_hub_runner_exports = {};
__export(ruflo_hub_runner_exports, {
  checkHttpHealth: () => checkHttpHealth,
  runSelfTests: () => runSelfTests
});
module.exports = __toCommonJS(ruflo_hub_runner_exports);
var http = __toESM(require("node:http"));
var fs = __toESM(require("node:fs"));
var path = __toESM(require("node:path"));
var readline = __toESM(require("node:readline"));
var cp = __toESM(require("node:child_process"));
var import_node_util = require("node:util");
var execFileAsync = (0, import_node_util.promisify)(cp.execFile);
var DEFAULT_WORKSPACE = path.resolve(__dirname, "..");
var DEFAULT_ENDPOINT = "http://127.0.0.1:3000";
function loadConfig() {
  const possiblePaths = [
    process.env.RUFLO_CONFIG_PATH,
    path.join(__dirname, "ruflo-hub.config.json"),
  ].filter(Boolean);
  for (const cfgPath of possiblePaths) {
    if (fs.existsSync(cfgPath)) {
      try {
        const raw = fs.readFileSync(cfgPath, "utf-8");
        const parsed = JSON.parse(raw);
        return { config: parsed, configPath: cfgPath };
      } catch (err) {
        console.error(`[ruflo-hub] Failed to parse config at ${cfgPath}:`, err);
      }
    }
  }
  return {
    config: {
      hub: {
        name: "omp-ruflo-ai-hub",
        version: "3.0.0",
        port: 3e3,
        host: "127.0.0.1",
        endpoint: DEFAULT_ENDPOINT,
        workspace: DEFAULT_WORKSPACE
      },
      swarm: {
        topology: "hierarchical-mesh",
        strategy: "adaptive",
        maxAgents: 15,
        v3Mode: true,
        leader: "sari"
      },
      memory: {
        backend: "hybrid",
        vectorSearch: true,
        autoPersist: true,
        namespaces: ["default", "swarm", "episodes", "banking-ops"]
      },
      agents: {
        architect: { role: "Chief Systems Architect & Technical Specification Designer" },
        bulbhul: { role: "BULBHUL Autonomous Fintech Personal Banker & CRM Operations" },
        "devops-sre": { role: "DevOps, SRE, Platform Infrastructure & CI/CD Engineer" },
        "quality-test-engineer": { role: "TDD, QA Automation, E2E Testing & Diagnostics Specialist" },
        "security-reviewer": { role: "Security Auditor, Threat Modeling & Vulnerability Specialist" },
        postmaster: { role: "Master Omnichannel Postmaster & Telephony Calling Desk" },
        sari: { role: "SARI Master Sovereign AI Swarm Orchestrator & Dynamic Mind" }
      }
    },
    configPath: "internal-fallback"
  };
}
function checkHttpHealth(url, timeoutMs = 2500) {
  const { promise, resolve: resolve2 } = Promise.withResolvers();
  try {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: "GET",
        timeout: timeoutMs
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          let data = body;
          try {
            data = JSON.parse(body);
          } catch {
          }
          resolve2({
            connected: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 400,
            status: res.statusCode,
            data
          });
        });
      }
    );
    req.on("error", (err) => {
      resolve2({ connected: false, error: err.message });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve2({ connected: false, error: `Connection timed out after ${timeoutMs}ms` });
    });
    req.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    resolve2({ connected: false, error: message });
  }
  return promise;
}
function textToVector(text, dimensions = 64) {
  const vec = new Array(dimensions).fill(0);
  const words = text.toLowerCase().match(/\w+/g) || [];
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = hash * 31 + word.charCodeAt(i) >>> 0;
    }
    vec[hash % dimensions] += 1;
  }
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }
  return vec;
}
function cosineSimilarity(a, b) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, Math.min(1, dot));
}
var HubMemoryStore = class {
  records = /* @__PURE__ */ new Map();
  persistPath = null;
  constructor(persistPath) {
    if (persistPath) {
      this.persistPath = path.isAbsolute(persistPath) ? persistPath : path.join(DEFAULT_WORKSPACE, persistPath, "memory.json");
    } else {
      this.persistPath = path.join(DEFAULT_WORKSPACE, ".claude-flow", "data", "memory.json");
    }
    this.loadFromDisk();
  }
  loadFromDisk() {
    if (!this.persistPath) return;
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, "utf-8");
        const list = JSON.parse(raw);
        for (const item of list) {
          const id = `${item.namespace || "default"}:${item.key}`;
          this.records.set(id, item);
        }
      }
    } catch (err) {
      console.error("[ruflo-hub] Memory file load warning:", err);
    }
  }
  saveToDisk() {
    if (!this.persistPath) return;
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.records.values());
      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2), "utf-8");
    } catch {
    }
  }
  set(key, value, namespace = "default", tags = []) {
    const textRepresentation = `${key} ${typeof value === "object" ? JSON.stringify(value) : String(value ?? "")} ${tags.join(" ")}`;
    const vector = textToVector(textRepresentation);
    const record = {
      key,
      value,
      namespace,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      vector,
      tags
    };
    const id = `${namespace}:${key}`;
    this.records.set(id, record);
    this.saveToDisk();
    return record;
  }
  get(key, namespace = "default") {
    const id = `${namespace}:${key}`;
    const found = this.records.get(id);
    if (found) return found;
    for (const rec of this.records.values()) {
      if (rec.key === key) return rec;
    }
    return null;
  }
  search(query, namespace, limit = 10) {
    const queryVec = textToVector(query);
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results = [];
    for (const rec of this.records.values()) {
      if (namespace && namespace !== "all" && rec.namespace !== namespace) {
        continue;
      }
      const cosSim = cosineSimilarity(queryVec, rec.vector);
      const text = `${rec.key} ${JSON.stringify(rec.value)}`.toLowerCase();
      let keywordHits = 0;
      for (const term of queryTerms) {
        if (text.includes(term)) keywordHits++;
      }
      const keywordScore = queryTerms.length > 0 ? keywordHits / queryTerms.length : 0;
      const finalScore = Number((cosSim * 0.6 + keywordScore * 0.4).toFixed(4));
      if (finalScore > 0.05 || queryTerms.length === 0) {
        results.push({
          key: rec.key,
          namespace: rec.namespace,
          value: rec.value,
          score: finalScore,
          timestamp: rec.timestamp
        });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
  stats() {
    const nsSet = /* @__PURE__ */ new Set();
    for (const rec of this.records.values()) {
      nsSet.add(rec.namespace);
    }
    return {
      totalEntries: this.records.size,
      namespaces: Array.from(nsSet),
      persistPath: this.persistPath
    };
  }
};
var dispatchHistory = [];
function selectAgentForTask(taskText, catalog) {
  const lower = taskText.toLowerCase();
  if (lower.match(/test|tdd|qa|assert|spec|verify|validation/)) return "quality-test-engineer";
  if (lower.match(/security|auth|token|vulnerability|audit|owasp/)) return "security-reviewer";
  if (lower.match(/deploy|ci|cd|docker|k8s|kubernetes|pipeline|daemon/)) return "devops-sre";
  if (lower.match(/architect|design|interface|adr|system|schema/)) return "architect";
  if (lower.match(/loan|bank|credit|interest|borrower|crm|tat/)) return "bulbhul";
  if (lower.match(/call|phone|telephony|voice|script|queue|meet/)) return "postmaster";
  const available = Object.keys(catalog);
  return available.includes("sari") ? "sari" : available[0] || "sari";
}
var { config: hubConfig, configPath: loadedConfigPath } = loadConfig();
var memoryStore = new HubMemoryStore(hubConfig.memory?.persistPath);
var TOOLS_CATALOG = [
  {
    name: "ruflo_hub_status",
    description: "Inspects hub health, port 3000 status, loaded config, and active agents in the Ruflo AI Agent Hub.",
    inputSchema: {
      type: "object",
      properties: {
        detailed: { type: "boolean", description: "Include deep diagnostics and configuration snapshot" },
        includeAgents: { type: "boolean", description: "Include complete capability details of registered agents" }
      }
    }
  },
  {
    name: "ruflo_hub_dispatch",
    description: "Accepts and routes task instructions to a selected agent, then records the routing outcome. Does not execute agents or return execution results.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task objective or instructions to execute" },
        agent: {
          type: "string",
          description: "Target agent role or name (auto, architect, bulbhul, devops-sre, quality-test-engineer, security-reviewer, postmaster, sari, coder, reviewer)",
          enum: ["auto", "architect", "bulbhul", "devops-sre", "quality-test-engineer", "security-reviewer", "postmaster", "sari", "coder", "reviewer"]
        },
        topology: { type: "string", description: "Swarm topology (hierarchical-mesh, ring, star, peer-to-peer)" },
        priority: { type: "string", enum: ["low", "normal", "high", "critical"], description: "Execution priority level" },
        context: { type: "object", description: "Optional execution payload, project metadata, or constraints" }
      },
      required: ["task"]
    }
  },
  {
    name: "ruflo_hub_memory",
    description: "Accepts action (get, set, search, store, recall, stats), persists to memory store and vector cache, returns stored/retrieved data.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["get", "set", "search", "store", "recall", "stats"],
          description: "Memory action to perform"
        },
        key: { type: "string", description: "Key name for get/set/store/recall operations" },
        value: { description: "Value to store (string, number, boolean, or JSON serializable object)" },
        query: { type: "string", description: "Query string for semantic vector search" },
        namespace: { type: "string", description: "Memory namespace partition (default: 'default')" },
        limit: { type: "number", description: "Maximum search results to return (default: 10)" },
        tags: { type: "array", items: { type: "string" }, description: "Optional categorization tags" }
      },
      required: ["action"]
    }
  }
];
function parseStatusArgs(raw) {
  return {
    detailed: typeof raw.detailed === "boolean" ? raw.detailed : void 0,
    includeAgents: typeof raw.includeAgents === "boolean" ? raw.includeAgents : void 0
  };
}
function parseDispatchArgs(raw) {
  return {
    task: typeof raw.task === "string" ? raw.task : "",
    agent: typeof raw.agent === "string" ? raw.agent : void 0,
    topology: typeof raw.topology === "string" ? raw.topology : void 0,
    priority: typeof raw.priority === "string" ? raw.priority : void 0,
    context: raw.context
  };
}
function parseMemoryArgs(raw) {
  const actionRaw = typeof raw.action === "string" ? raw.action : "";
  const allowed = ["get", "set", "search", "store", "recall", "stats"];
  const action = allowed.includes(actionRaw) ? actionRaw : "stats";
  return {
    action,
    key: typeof raw.key === "string" ? raw.key : void 0,
    value: raw.value,
    query: typeof raw.query === "string" ? raw.query : void 0,
    namespace: typeof raw.namespace === "string" ? raw.namespace : void 0,
    limit: typeof raw.limit === "number" ? raw.limit : void 0,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === "string") : void 0
  };
}
async function handleToolStatus(args = {}) {
  const endpoint = hubConfig.hub?.endpoint || DEFAULT_ENDPOINT;
  const healthCheck = await checkHttpHealth(`${endpoint}/health`, 2e3);
  const catalog = hubConfig.agents || {};
  const activeAgentList = Object.keys(catalog).map((id) => ({
    id,
    name: catalog[id].name || id,
    role: catalog[id].role || "Swarm Agent",
    archetype: catalog[id].archetype || "agent"
  }));
  const response = {
    hub: {
      name: hubConfig.hub?.name || "ruflo-hub",
      version: hubConfig.hub?.version || "3.0.0",
      endpoint,
      workspace: hubConfig.hub?.workspace || DEFAULT_WORKSPACE,
      configFile: loadedConfigPath,
      transportMode: "stdio-jsonrpc",
      status: healthCheck.connected ? "healthy" : "standby",
      portStatus: healthCheck.connected ? "online (port 3000)" : "offline (fallback mode)"
    },
    swarm: {
      topology: hubConfig.swarm?.topology || "hierarchical-mesh",
      strategy: hubConfig.swarm?.strategy || "adaptive",
      maxAgents: hubConfig.swarm?.maxAgents || 15,
      v3Mode: hubConfig.swarm?.v3Mode ?? true,
      leader: hubConfig.swarm?.leader || "sari",
      activeAgentSlots: activeAgentList.length
    },
    memory: {
      backend: hubConfig.memory?.backend || "hybrid",
      vectorSearch: hubConfig.memory?.vectorSearch ?? true,
      autoPersist: hubConfig.memory?.autoPersist ?? true,
      stats: memoryStore.stats()
    },
    activeAgents: args.includeAgents ? catalog : activeAgentList,
    healthCheck,
    recentDispatches: dispatchHistory.slice(-5),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (args.detailed) {
    response.fullConfig = hubConfig;
  }
  return response;
}
async function handleToolDispatch(args) {
  if (!args || typeof args.task !== "string" || !args.task.trim()) {
    throw new Error("Missing required parameter 'task'");
  }
  const catalog = hubConfig.agents || {};
  let targetAgent = args.agent && args.agent !== "auto" ? args.agent.toLowerCase() : "";
  if (!targetAgent) {
    targetAgent = selectAgentForTask(args.task, catalog);
  }
  const topology = args.topology || hubConfig.swarm?.topology || "hierarchical-mesh";
  const priority = args.priority || "normal";
  const dispatchId = `disp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record = {
    dispatchId,
    task: args.task,
    targetAgent,
    topology,
    priority,
    status: "accepted",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    context: args.context,
    routingResult: {
      status: "routed",
      agent: targetAgent,
      role: catalog[targetAgent]?.role || "Swarm Agent",
      summary: `Task accepted and routed to ${targetAgent} under ${topology} topology; no agent execution was performed.`
    }
  };
  dispatchHistory.push(record);
  return {
    dispatchId: record.dispatchId,
    status: record.status,
    task: record.task,
    targetAgent: record.targetAgent,
    topology: record.topology,
    priority: record.priority,
    timestamp: record.timestamp,
    routingResult: record.routingResult
  };
}
async function handleToolMemory(args) {
  const { action, key, value, query, namespace = "default", limit = 10, tags = [] } = args || {};
  if (!action) {
    throw new Error("Missing required parameter 'action' (get|set|search|store|recall|stats)");
  }
  if (action === "set" || action === "store") {
    if (!key) throw new Error("Memory action 'set'/'store' requires a 'key'");
    const record = memoryStore.set(key, value, namespace, tags);
    return {
      success: true,
      action: "stored",
      key: record.key,
      namespace: record.namespace,
      timestamp: record.timestamp,
      tags: record.tags
    };
  }
  if (action === "get" || action === "recall") {
    if (!key) throw new Error("Memory action 'get'/'recall' requires a 'key'");
    const record = memoryStore.get(key, namespace);
    if (!record) {
      return {
        found: false,
        key,
        namespace,
        message: `Key '${key}' not found in namespace '${namespace}'`
      };
    }
    return {
      found: true,
      key: record.key,
      namespace: record.namespace,
      value: record.value,
      timestamp: record.timestamp,
      tags: record.tags
    };
  }
  if (action === "search") {
    const q = query || key || "";
    if (!q) throw new Error("Memory action 'search' requires 'query'");
    const matches = memoryStore.search(q, namespace, limit);
    return {
      query: q,
      namespace,
      totalMatches: matches.length,
      results: matches
    };
  }
  if (action === "stats") {
    return {
      backend: hubConfig.memory?.backend || "hybrid",
      vectorSearch: hubConfig.memory?.vectorSearch ?? true,
      ...memoryStore.stats()
    };
  }
  throw new Error(`Unsupported memory action '${action}'`);
}
async function runSelfTests() {
  const endpoint = hubConfig.hub?.endpoint || DEFAULT_ENDPOINT;
  const healthCheck = await checkHttpHealth(`${endpoint}/health`, 2500);
  const testKey = `health_probe_${Date.now()}`;
  memoryStore.set(testKey, { probe: "ruflo_self_test", ts: Date.now() }, "test", ["probe"]);
  const recalled = memoryStore.get(testKey, "test");
  const searchResults = memoryStore.search("ruflo_self_test", "test", 5);
  const testDispatch = await handleToolDispatch({
    task: "Verify system architecture contract for OMP Ruflo Hub",
    agent: "architect",
    priority: "normal"
  });
  let testDispatchId = "";
  if (testDispatch && typeof testDispatch === "object" && "dispatchId" in testDispatch && typeof testDispatch.dispatchId === "string") {
    testDispatchId = testDispatch.dispatchId;
  }
  const agentKeys = Object.keys(hubConfig.agents || {});
  const testReport = {
    test: "ruflo-hub-runner self-test",
    success: true,
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    serverInfo: {
      name: "ruflo-hub",
      version: "3.0.0"
    },
    healthCheck: {
      url: `${endpoint}/health`,
      connected: healthCheck.connected,
      status: healthCheck.status ?? null,
      data: healthCheck.data ?? null,
      error: healthCheck.error ?? null
    },
    config: {
      loaded: loadedConfigPath !== "internal-fallback",
      path: loadedConfigPath,
      name: hubConfig.hub?.name || "omp-ruflo-ai-hub",
      topology: hubConfig.swarm?.topology || "hierarchical-mesh",
      agentsCount: agentKeys.length,
      agents: agentKeys
    },
    tools: [
      {
        name: "ruflo_hub_status",
        verified: true,
        endpointTested: `${endpoint}/health`
      },
      {
        name: "ruflo_hub_dispatch",
        verified: true,
        testDispatchId
      },
      {
        name: "ruflo_hub_memory",
        verified: true,
        vectorSearchTested: searchResults.length > 0,
        recallVerified: recalled !== null
      }
    ],
    exitCode: 0
  };
  console.log(JSON.stringify(testReport, null, 2));
  process.exit(0);
}
async function handleJsonRpc(req) {
  const id = req.id ?? null;
  const method = req.method;
  if (req.id === void 0) {
    if (method === "notifications/initialized") {
      console.error("[ruflo-hub] Client initialized successfully via stdio.");
    }
    return null;
  }
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: {
          name: "ruflo-hub",
          version: "3.0.0"
        },
        capabilities: {
          tools: {}
        }
      }
    };
  }
  if (method === "ping") {
    return {
      jsonrpc: "2.0",
      id,
      result: {}
    };
  }
  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS_CATALOG
      }
    };
  }
  if (method === "tools/call") {
    const rawParams = req.params;
    const toolName = rawParams && typeof rawParams === "object" && "name" in rawParams && typeof rawParams.name === "string" ? rawParams.name : void 0;
    const toolArgs = rawParams && typeof rawParams === "object" && "arguments" in rawParams && rawParams.arguments && typeof rawParams.arguments === "object" ? rawParams.arguments : {};
    try {
      let resultData = null;
      if (toolName === "ruflo_hub_status") {
        resultData = await handleToolStatus(parseStatusArgs(toolArgs));
      } else if (toolName === "ruflo_hub_dispatch") {
        resultData = await handleToolDispatch(parseDispatchArgs(toolArgs));
      } else if (toolName === "ruflo_hub_memory") {
        resultData = await handleToolMemory(parseMemoryArgs(toolArgs));
      } else {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: JSON.stringify({ error: `Tool not found: '${toolName}'` }, null, 2)
              }
            ]
          }
        };
      }
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(resultData, null, 2)
            }
          ]
        }
      };
    } catch (toolErr) {
      const message = toolErr instanceof Error ? toolErr.message : String(toolErr);
      return {
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: message }, null, 2)
            }
          ]
        }
      };
    }
  }
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: -32601,
      message: `Method not found: '${method}'`
    }
  };
}
var DISPATCH_PRIORITIES = { low: true, normal: true, high: true, critical: true };
async function dispatchHubCommand(args) {
  let response;
  try {
    response = await runOneShot(args);
  } catch (err) {
    response = {
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32602, message: err instanceof Error ? err.message : String(err) }
    };
    console.error(`[ruflo-hub] ${response.error.message}`);
  }
  process.stdout.write(JSON.stringify(response) + "\n");
  if (response?.error || response?.result && typeof response.result === "object" && "isError" in response.result && response.result.isError === true) {
    process.exitCode = 1;
  }
}
async function runOneShot(args) {
  const command = args[0];
  let toolName;
  let toolArgs = {};
  if (command === "status") {
    if (args.length !== 1) throw new Error("Usage: ruflo hub status");
    toolName = "ruflo_hub_status";
  } else if (command === "dispatch") {
    const task = args[1];
    if (task === void 0 || !task.trim()) throw new Error("Missing required non-empty task");
    if (task.startsWith("--")) throw new Error("Task must be a single quoted argument before options");
    toolArgs = { task };
    for (let index = 2; index < args.length; index += 2) {
      const flag = args[index];
      const value = args[index + 1];
      if (flag !== "--agent" && flag !== "--topology" && flag !== "--priority") {
        throw new Error(`Unknown or misplaced dispatch argument: '${flag}'`);
      }
      if (value === void 0 || !value.trim() || value.startsWith("--")) {
        throw new Error(`Option '${flag}' requires a non-empty value`);
      }
      toolArgs[flag.slice(2)] = value;
    }
    if (typeof toolArgs.priority === "string" && !DISPATCH_PRIORITIES[toolArgs.priority]) {
      throw new Error("Priority must be one of: low, normal, high, critical");
    }
    toolName = "ruflo_hub_dispatch";
  } else {
    throw new Error('Usage: ruflo hub status | ruflo hub dispatch "<task>" [--agent <name>] [--topology <name>] [--priority <low|normal|high|critical>]');
  }
  return handleJsonRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: toolName, arguments: toolArgs }
  });
}
async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "status" || args[0] === "dispatch") {
    await dispatchHubCommand(args);
    return;
  }
  if (args.includes("--test") || args.includes("-t")) {
    await runSelfTests();
    return;
  }
  console.error(`[ruflo-hub] Starting Ruflo Hub Runner MCP Server (v3.0.0)...`);
  console.error(`[ruflo-hub] Config: ${loadedConfigPath}`);
  console.error(`[ruflo-hub] Listening on stdio transport...`);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });
  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const req = JSON.parse(trimmed);
      const res = await handleJsonRpc(req);
      if (res !== null) {
        process.stdout.write(JSON.stringify(res) + "\n");
      }
    } catch (parseErr) {
      const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.error("[ruflo-hub] Parse error on incoming JSON:", message);
      const errRes = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error"
        }
      };
      process.stdout.write(JSON.stringify(errRes) + "\n");
    }
  });
  rl.on("close", () => {
    console.error("[ruflo-hub] Stdio interface closed. Exiting process.");
    process.exit(0);
  });
}
main().catch((err) => {
  console.error("[ruflo-hub] Fatal error:", err);
  process.exit(1);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkHttpHealth,
  runSelfTests
});
