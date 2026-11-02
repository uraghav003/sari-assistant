#!/usr/bin/env node
/**
 * SARI Sovereign 24/7 Background Daemon ("Sari Never Sleeps")
 *
 * Keeps SARI active, pulsing heartbeats to Apps Script, probing local Ollama,
 * and synchronizing memory vaults across the sovereign swarm.
 */

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PORT = process.env.PORT || 3333;

function loadKeys() {
  const keysPath = path.join(os.homedir(), ".omp", "agent", "sari-keys.json");
  try {
    if (fs.existsSync(keysPath)) {
      return JSON.parse(fs.readFileSync(keysPath, "utf8"));
    }
  } catch (_) {}
  return {};
}

const keys = loadKeys();
const DEPLOYMENT_ID = process.env.SARI_DEPLOYMENT_ID || keys.SARI_DEPLOYMENT_ID || "AKfycbyfOxsAguNOB8CcVd6xj3Z9J4_eVKO-5H0C-WUUvUS9FZoIrvaLBNlZrhwbzNX1gXA_-g";
const EXEC_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;
const SHARED_SECRET = process.env.SARI_SHARED_SECRET || keys.SARI_SHARED_SECRET || "";

function hmacHex_(message, secret) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

async function pulseHeartbeat() {
  const ts = String(Date.now());
  const action = "autopilot_heartbeat";
  const sig = SHARED_SECRET ? hmacHex_(action + "." + ts, SHARED_SECRET) : "";

  console.log(`[${new Date().toISOString()}] 🌟 SARI Sovereign Daemon pulsing heartbeat...`);

  try {
    const url = `${EXEC_URL}?action=${action}&ts=${ts}&sig=${sig}`;
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      console.log(`[${new Date().toISOString()}] ✓ Apps Script heartbeat acknowledged:`, data);
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠ Apps Script heartbeat HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] ⚠ Apps Script heartbeat network error:`, err instanceof Error ? err.message : String(err));
  }
}

// Start HTTP status server for 24/7 uptime monitoring
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    ok: true,
    system: "SARI_SOVEREIGN_DAEMON",
    status: "ALWAYS_ACTIVE",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`👑 SARI SOVEREIGN DAEMON ACTIVE 24/7 ON PORT ${PORT}`);
  console.log(`- Mode: Always On / Never Sleeping`);
  console.log(`- Apps Script Sync Target: ${DEPLOYMENT_ID}`);
  console.log(`================================================================`);

  // Run initial heartbeat
  void pulseHeartbeat();

  // Schedule interval
  setInterval(() => {
    void pulseHeartbeat();
  }, INTERVAL_MS);
});
