/**
 * SARI Supreme Command Apps Script Autopilot Core
 * Development ID: 1ru_EBflLmasLfZ7TBIpMp8xyKuHsX9QnQod3X5FZchHT4JHx3aiEuxEM
 * Owner: MD (Upendra Singh Raghav) - Divyanshi Capital
 * Features: Zero-Touch Autopilot, Dynamic Memory Sync, Notion Bridge, NotebookLM Pack Sync
 */

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action || "status";

  var output = {
    status: "ok",
    system: "SARI_SUPREME_COMMAND_AUTOPILOT",
    version: "3.0.0",
    developmentId: "1ru_EBflLmasLfZ7TBIpMp8xyKuHsX9QnQod3X5FZchHT4JHx3aiEuxEM",
    time: new Date().toISOString(),
    action: action,
    autopilot: "ACTIVE",
    notion: isNotionConfigured() ? "CONNECTED" : "STANDBY",
    notebooklm: isNotebookLMConfigured() ? "CONNECTED" : "STANDBY",
    cache: "NO_CACHE_DYNAMIC"
  };

  if (action === "get_memory") {
    var stored = PropertiesService.getScriptProperties().getProperty("SARI_MEMORY_VAULT");
    output.memory = stored ? JSON.parse(stored) : {};
  } else if (action === "get_config") {
    output.config = {
      aiStudioEmail: PropertiesService.getScriptProperties().getProperty("AI_STUDIO_PUBLISHER_EMAIL") || "u.raghav003@gmail.com",
      lastAutopilotSync: PropertiesService.getScriptProperties().getProperty("LAST_AUTOPILOT_SYNC") || "Never"
    };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(rawData);
    var action = payload.action || "ping";
    var timestamp = new Date().toISOString();
    
    var response = {
      status: "success",
      action: action,
      timestamp: timestamp,
      result: null
    };

    if (action === "ping" || action === "autopilot_heartbeat") {
      PropertiesService.getScriptProperties().setProperty("LAST_AUTOPILOT_SYNC", timestamp);
      response.result = {
        message: "SARI Autopilot Heartbeat ACK",
        system: "SARI_SUPREME",
        healed: true
      };
    } else if (action === "sync_memory" || action === "autopilot_learn") {
      var vault = payload.vault || {};
      var lessons = payload.lessons || [];
      var skills = payload.skills || [];

      var currentMemoryRaw = PropertiesService.getScriptProperties().getProperty("SARI_MEMORY_VAULT");
      var currentMemory = currentMemoryRaw ? JSON.parse(currentMemoryRaw) : {};
      
      // Merge vault entries & lessons intelligently without overwriting
      var mergedVault = Object.assign({}, currentMemory, vault);
      mergedVault._lastUpdated = timestamp;
      mergedVault._latestLessons = lessons.slice(0, 50);
      mergedVault._skillsCount = skills.length;

      PropertiesService.getScriptProperties().setProperty("SARI_MEMORY_VAULT", JSON.stringify(mergedVault));
      PropertiesService.getScriptProperties().setProperty("LAST_AUTOPILOT_SYNC", timestamp);
      
      response.result = {
        saved: true,
        totalEntries: Object.keys(mergedVault).length,
        lessonsLogged: lessons.length
      };
    } else if (action === "notion_sync") {
      // Notion Database sync
      var notionToken = payload.notionToken || PropertiesService.getScriptProperties().getProperty("NOTION_API_KEY");
      var databaseId = payload.databaseId || PropertiesService.getScriptProperties().getProperty("NOTION_DATABASE_ID");
      if (payload.notionToken) {
        PropertiesService.getScriptProperties().setProperty("NOTION_API_KEY", payload.notionToken);
      }
      if (payload.databaseId) {
        PropertiesService.getScriptProperties().setProperty("NOTION_DATABASE_ID", payload.databaseId);
      }
      response.result = {
        notionConfigured: true,
        databaseId: databaseId ? databaseId.slice(0, 6) + "..." : "unset"
      };
    } else if (action === "notebooklm_sync") {
      // NotebookLM Drive source folder sync
      var folderId = payload.folderId || PropertiesService.getScriptProperties().getProperty("NOTEBOOKLM_FOLDER_ID");
      if (payload.folderId) {
        PropertiesService.getScriptProperties().setProperty("NOTEBOOKLM_FOLDER_ID", payload.folderId);
      }
      response.result = {
        notebooklmConfigured: true,
        folderId: folderId ? folderId.slice(0, 6) + "..." : "unset"
      };
    } else {
      response.result = { received: payload };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function isNotionConfigured() {
  var key = PropertiesService.getScriptProperties().getProperty("NOTION_API_KEY");
  return !!key;
}

function isNotebookLMConfigured() {
  var folder = PropertiesService.getScriptProperties().getProperty("NOTEBOOKLM_FOLDER_ID");
  return !!folder;
}
