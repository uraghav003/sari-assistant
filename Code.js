/**
 * SARI Supreme Command Apps Script Backend
 * Development ID: 1ru_EBflLmasLfZ7TBIpMp8xyKuHsX9QnQod3X5FZchHT4JHx3aiEuxEM
 * Owner: MD (Upendra Singh Raghav) - Divyanshi Capital
 */

function doGet(e) {
  var output = {
    status: "ok",
    system: "SARI_SUPREME_COMMAND",
    version: "2.1.0",
    developmentId: "1ru_EBflLmasLfZ7TBIpMp8xyKuHsX9QnQod3X5FZchHT4JHx3aiEuxEM",
    time: new Date().toISOString(),
    message: "SARI Sovereign Brain Web App is live and responding."
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(rawData);
    var action = payload.action || "ping";
    
    var response = {
      status: "success",
      action: action,
      timestamp: new Date().toISOString(),
      result: null
    };

    if (action === "ping") {
      response.result = { message: "pong", system: "SARI" };
    } else if (action === "sync_memory") {
      var vault = payload.vault || {};
      PropertiesService.getScriptProperties().setProperty("SARI_MEMORY_VAULT", JSON.stringify(vault));
      response.result = { saved: true, entries: Object.keys(vault).length };
    } else if (action === "get_memory") {
      var stored = PropertiesService.getScriptProperties().getProperty("SARI_MEMORY_VAULT");
      response.result = stored ? JSON.parse(stored) : {};
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
