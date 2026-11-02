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
  "terminal_status",
  "drive_workspace",
  "gmail_mis_incoming"
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
    var stored = getVaultData_();
    return jsonOut_({ ok: true, memory: stored });
  }

  return jsonOut_({ ok: false, error: "UNKNOWN_ACTION" });
}

function sanitizeVault_(vault) {
  if (!vault || typeof vault !== "object" || Array.isArray(vault)) return {};
  var clean = {};
  var keys = Object.keys(vault).slice(0, 200);
  for (var i = 0; i < keys.length; i++) {
    var key = String(keys[i]).slice(0, 120);
    var value = vault[keys[i]];
    if (typeof value === "string") {
      clean[key] = value.slice(0, 4000);
    } else if (typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    } else if (Array.isArray(value)) {
      clean[key] = value.slice(0, 100).map(function(item) {
        if (typeof item === "string") return item.slice(0, 500);
        if (typeof item === "object" && item !== null) {
          try { return JSON.parse(JSON.stringify(item)); } catch(e) { return String(item); }
        }
        return item;
      });
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeVault_(value);
    }
  }
  return clean;
}

function getVaultData_() {
  var props = props_();
  var totalChunks = parseInt(props.getProperty("SARI_VAULT_CHUNKS") || "1", 10);
  if (totalChunks > 1) {
    var combined = "";
    for (var c = 0; c < totalChunks; c++) {
      combined += (props.getProperty("SARI_VAULT_CHUNK_" + c) || "");
    }
    try { return JSON.parse(combined); } catch (e) { return {}; }
  }
  var single = props.getProperty("SARI_MEMORY_VAULT");
  if (single) {
    try { return JSON.parse(single); } catch (e) { return {}; }
  }
  return {};
}

function setVaultData_(vaultObj) {
  var sanitized = sanitizeVault_(vaultObj);
  var serialized = JSON.stringify(sanitized);
  if (serialized.length > MAX_VAULT_BYTES) {
    return { ok: false, error: "VAULT_TOO_LARGE" };
  }
  var props = props_();
  var CHUNK_SIZE = 8000;
  if (serialized.length <= CHUNK_SIZE) {
    props.setProperty("SARI_MEMORY_VAULT", serialized);
    props.deleteProperty("SARI_VAULT_CHUNKS");
  } else {
    var chunks = [];
    for (var i = 0; i < serialized.length; i += CHUNK_SIZE) {
      chunks.push(serialized.substring(i, i + CHUNK_SIZE));
    }
    props.setProperty("SARI_VAULT_CHUNKS", String(chunks.length));
    for (var j = 0; j < chunks.length; j++) {
      props.setProperty("SARI_VAULT_CHUNK_" + j, chunks[j]);
    }
    props.deleteProperty("SARI_MEMORY_VAULT");
  }
  return { ok: true, size: serialized.length };
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

      var models = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"];
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
      var saveRes = setVaultData_(payload.vault);
      if (!saveRes.ok) {
        return jsonOut_({ ok: false, error: saveRes.error || "VAULT_TOO_LARGE" });
      }
      response.result = { synced: true, size: saveRes.size };
      return jsonOut_(response);
    }

    if (action === "autopilot_learn") {
      var existing = getVaultData_();
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
      var saveResult = setVaultData_(existing);
      response.result = { learned: mergedLessons.length, skills: skills.length, saved: saveResult.ok };
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
    if (action === "drive_workspace") {
      var folderId = String(payload.folderId || "").trim();
      var folderName = String(payload.folderName || "sari_supreme_command").trim();
      var folder = null;
      if (folderId) {
        try {
          folder = DriveApp.getFolderById(folderId);
        } catch (e) {
          // invalid ID fallback
        }
      }
      if (!folder) {
        folder = getOrCreateWorkspaceFolder_(folderName);
      }
      var fileCount = 0;
      var fileList = [];
      if (folder) {
        var files = folder.getFiles();
        while (files.hasNext() && fileList.length < 50) {
          var f = files.next();
          fileCount++;
          fileList.push({ name: f.getName(), id: f.getId(), size: f.getSize(), updated: f.getLastUpdated().toISOString() });
        }
      }
      response.result = {
        folderName: folder ? folder.getName() : folderName,
        folderId: folder ? folder.getId() : null,
        url: folder ? folder.getUrl() : null,
        fileCount: fileCount,
        files: fileList,
        synced: Boolean(folder)
      };
      return jsonOut_(response);
    }
    if (action === "gmail_mis_incoming") {
      var maxEmails = Math.min(parseInt(payload.limit || "10", 10), 30);
      var emails = readMisIncomingEmails_(maxEmails);
      response.result = {
        label: "MIS-Incoming",
        count: emails.length,
        emails: emails,
        owner: "upendra.raghav@divyanshicapital.com"
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

function getOrCreateWorkspaceFolder_(name) {
  try {
    var targetName = name || "sari_supreme_command";
    var query = 'title = "' + targetName + '" and mimeType = "application/vnd.google-apps.folder" and trashed = false';
    var folders = DriveApp.searchFolders(query);
    if (folders.hasNext()) {
      return folders.next();
    }
    var altName = targetName === "sari_supreme_command" ? "sari_superme_commond" : "sari_supreme_command";
    var altFolders = DriveApp.searchFolders('title = "' + altName + '" and mimeType = "application/vnd.google-apps.folder" and trashed = false');
    if (altFolders.hasNext()) {
      return altFolders.next();
    }
    return DriveApp.createFolder(targetName);
  } catch (err) {
    return null;
  }
}

/**
 * Read emails from Gmail label "MIS-Incoming".
 * Returns subject, sender, date, snippet, and read status for BULBHUL alerts.
 */
function readMisIncomingEmails_(maxCount) {
  var results = [];
  try {
    var labelName = "MIS-Incoming";
    var threads = GmailApp.search("label:" + labelName, 0, maxCount);
    for (var t = 0; t < threads.length; t++) {
      var thread = threads[t];
      var msgs = thread.getMessages();
      var lastMsg = msgs[msgs.length - 1];
      var subject = lastMsg.getSubject() || "(no subject)";
      var from = lastMsg.getFrom() || "unknown";
      var date = lastMsg.getDate().toISOString();
      var snippet = thread.getFirstMessageSubject() || subject;
      var isUnread = thread.isUnread();

      var caseMatch = subject.match(/Case\s+(\d{2}\/\d{2}\/\d+)\/([A-Z\s]+)\s*[—–-]\s*(.+?)(?:\(([^)]+)\))?$/i);
      var parsed = null;
      if (caseMatch) {
        parsed = {
          caseId: caseMatch[1].trim(),
          assignee: caseMatch[2].trim(),
          customer: caseMatch[3].trim(),
          loanType: caseMatch[4] ? caseMatch[4].trim() : "UNKNOWN"
        };
      }

      results.push({
        subject: subject.slice(0, 200),
        from: from.slice(0, 100),
        date: date,
        snippet: snippet.slice(0, 200),
        unread: isUnread,
        parsed: parsed
      });
    }
  } catch (err) {
    results.push({ error: "Gmail access error: " + String(err).slice(0, 200) });
  }
  return results;
}
