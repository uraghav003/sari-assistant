/**
 * SARI Supreme Command — Apps Script Autopilot Core v4.1.0
 *
 * Every write path is gated by an HMAC signature over `<action>.<timestamp>`
 * using SARI_SHARED_SECRET (Script Properties). There is no caller-supplied
 * API key fallback and no anonymous memory read.
 */

var ALLOWED_ACTIONS = [
  "ping",
  "autopilot_heartbeat",
  "ai_infer",
  "sync_memory",
  "autopilot_learn",
  "notion_sync",
  "notebooklm_sync",
  "terminal_status"
];

var AUTH_WINDOW_MS = 5 * 60 * 1000;
var MAX_VAULT_BYTES = 32 * 1024;

function props_() {
  return PropertiesService.getScriptProperties();
}

function sharedSecret_() {
  return props_().getProperty("SARI_SHARED_SECRET") || "";
}

function hmacHex_(message, secret) {
  var bytes = Utilities.computeHmacSha256Signature(message, secret);
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var v = (bytes[i] < 0 ? bytes[i] + 256 : bytes[i]).toString(16);
    hex += v.length === 1 ? "0" + v : v;
  }
  return hex;
}

/** Constant-time comparison to avoid leaking signature prefixes. */
function constantTimeEqual_(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function verifyAuth_(action, ts, sig) {
  var secret = sharedSecret_();
  if (!secret || !ts || !sig) return false;
  var stamp = parseInt(ts, 10);
  if (!stamp || Math.abs(Date.now() - stamp) > AUTH_WINDOW_MS) return false;
  return constantTimeEqual_(hmacHex_(action + "." + stamp, secret), String(sig));
}

function jsonOut_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action || "status";

  // Public health probe only — no identifiers, no memory, no config.
  if (action === "status") {
    return jsonOut_({
      status: "ok",
      system: "SARI_SUPREME_COMMAND_AUTOPILOT",
      version: "4.1.0",
      time: new Date().toISOString()
    });
  }

  if (!verifyAuth_(action, params.ts, params.sig)) {
    return jsonOut_({ ok: false, error: "UNAUTHORIZED" });
  }

  if (action === "get_memory") {
    var stored = props_().getProperty("SARI_MEMORY_VAULT");
    return jsonOut_({ ok: true, memory: stored ? JSON.parse(stored) : {} });
  }

  return jsonOut_({ ok: false, error: "UNKNOWN_ACTION" });
}

function sanitizeVault_(vault) {
  if (!vault || typeof vault !== "object" || Array.isArray(vault)) return {};
  var clean = {};
  var keys = Object.keys(vault).slice(0, 200);
  for (var i = 0; i < keys.length; i++) {
    var value = vault[keys[i]];
    if (typeof value === "string") clean[keys[i].slice(0, 120)] = value.slice(0, 2000);
  }
  return clean;
}

function doPost(e) {
  try {
    var raw = e && e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(raw);
    var action = payload.action || "ping";
    var auth = payload.auth || {};
    var timestamp = new Date().toISOString();

    if (ALLOWED_ACTIONS.indexOf(action) === -1) {
      return jsonOut_({ ok: false, error: "UNKNOWN_ACTION" });
    }

    if (!verifyAuth_(action, auth.ts, auth.sig)) {
      return jsonOut_({ ok: false, error: "UNAUTHORIZED" });
    }

    var response = { ok: true, action: action, timestamp: timestamp, result: null };

    if (action === "ping" || action === "autopilot_heartbeat") {
      props_().setProperty("LAST_AUTOPILOT_SYNC", timestamp);
      response.result = { message: "SARI Autopilot Heartbeat ACK", system: "SARI_SUPREME", healed: true };
      return jsonOut_(response);
    }

    if (action === "ai_infer") {
      var promptText = String(payload.prompt || "Hello SARI").slice(0, 8000);
      var apiKey = props_().getProperty("MALLIK_API_KEY") ||
                   props_().getProperty("GEMINI_API_KEY") || "";

      if (!apiKey) {
        return jsonOut_({ ok: false, error: "NO_MODEL_KEY_CONFIGURED" });
      }

      var models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      for (var mi = 0; mi < models.length; mi++) {
        try {
          var res = UrlFetchApp.fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/" + models[mi] + ":generateContent",
            {
              method: "post",
              contentType: "application/json",
              headers: { "x-goog-api-key": apiKey },
              muteHttpExceptions: true,
              payload: JSON.stringify({
                systemInstruction: {
                  parts: [{
                    text: "You are SARI Personal Intelligence for Divyanshi Capital. Owner is MD. Answer in 4 blocks: UNDERSTAND, PLAN, ACT, LEARN."
                  }]
                },
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
              })
            }
          );

          if (res.getResponseCode() === 200) {
            var data = JSON.parse(res.getContentText());
            var candidate = data.candidates && data.candidates[0];
            var parts = candidate && candidate.content && candidate.content.parts;
            var text = parts && parts[0] ? parts[0].text : "";
            if (text) {
              response.result = { text: text, source: "AppsScript_Gemini_UrlFetch", model: models[mi] };
              return jsonOut_(response);
            }
          }
        } catch (ignored) {
          // try the next model
        }
      }

      return jsonOut_({ ok: false, error: "UPSTREAM_MODEL_FAILED" });
    }

    if (action === "sync_memory") {
      var vault = sanitizeVault_(payload.vault);
      var serialized = JSON.stringify(vault);
      if (serialized.length > MAX_VAULT_BYTES) {
        return jsonOut_({ ok: false, error: "VAULT_TOO_LARGE" });
      }
      props_().setProperty("SARI_MEMORY_VAULT", serialized);
      response.result = { synced: true, keysCount: Object.keys(vault).length };
      return jsonOut_(response);
    }

    if (action === "autopilot_learn") {
      var existingRaw = props_().getProperty("SARI_MEMORY_VAULT");
      var existing = existingRaw ? JSON.parse(existingRaw) : {};
      var lessons = Array.isArray(payload.lessons) ? payload.lessons.slice(0, 20) : [];
      var skills = Array.isArray(payload.skills) ? payload.skills.slice(0, 50) : [];
      var priorLessons = Array.isArray(existing.lessons) ? existing.lessons : [];
      var mergedLessons = lessons
        .filter(function (l) { return typeof l === "string"; })
        .map(function (l) { return l.slice(0, 300); })
        .concat(priorLessons)
        .slice(0, 50);

      existing.lessons = mergedLessons;
      existing.skills = skills;
      var nextSerialized = JSON.stringify(sanitizeVault_(existing));
      if (nextSerialized.length <= MAX_VAULT_BYTES) {
        props_().setProperty("SARI_MEMORY_VAULT", nextSerialized);
      }
      response.result = { learned: mergedLessons.length, skills: skills.length };
      return jsonOut_(response);
    }

    if (action === "notion_sync") {
      response.result = { notionConfigured: isNotionConfigured(), syncedCases: 0 };
      return jsonOut_(response);
    }

    if (action === "notebooklm_sync") {
      var folderId = String(payload.folderId || "").slice(0, 100);
      if (folderId) props_().setProperty("NOTEBOOKLM_FOLDER_ID", folderId);
      response.result = { notebooklmConfigured: true, folderSet: Boolean(folderId) };
      return jsonOut_(response);
    }
    if (action === "terminal_status") {
      var cfg = checkConfiguration();
      response.result = {
        system: "SARI_SUPREME_COMMAND",
        version: "4.1.0",
        configuration: cfg,
        uptime: new Date().toISOString()
      };
      return jsonOut_(response);
    }

    return jsonOut_({ ok: false, error: "UNKNOWN_ACTION" });
  } catch (err) {
    return jsonOut_({ ok: false, error: "INTERNAL_ERROR" });
  }
}

function isNotionConfigured() {
  return !!props_().getProperty("NOTION_API_KEY");
}

function isNotebookLMConfigured() {
  return !!props_().getProperty("NOTEBOOKLM_FOLDER_ID");
}

/**
 * Run this from the Apps Script editor (Run → checkConfiguration) after setting
 * Script Properties. It reports presence only — never the values.
 */
function checkConfiguration() {
  var p = props_();
  var report = {
    sharedSecretConfigured: Boolean(p.getProperty("SARI_SHARED_SECRET")),
    sharedSecretLength: (p.getProperty("SARI_SHARED_SECRET") || "").length,
    modelKeyConfigured: Boolean(p.getProperty("MALLIK_API_KEY") || p.getProperty("GEMINI_API_KEY")),
    vaultBytes: (p.getProperty("SARI_MEMORY_VAULT") || "").length,
    lastAutopilotSync: p.getProperty("LAST_AUTOPILOT_SYNC") || "never",
    webAppAccess: "ANYONE_ANONYMOUS (requests must carry a valid HMAC signature)"
  };
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}
