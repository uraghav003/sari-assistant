// SARI Supreme Presence Engine — Zero-Trust, CSP-Compliant
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const CHAT_ENDPOINT = "/api/chat";

let isListening = false;
let isTtsEnabled = true;
let recognition = null;
let currentLang = "hi";

const chatHistory = document.getElementById("chatHistory");
const promptInput = document.getElementById("promptInput");
const sendBtn = document.getElementById("sendBtn");
const statusPill = document.getElementById("statusPill");
const micBtn = document.getElementById("micBtn");
const ttsBtn = document.getElementById("ttsBtn");
const voiceIndicator = document.getElementById("voiceIndicator");
const voiceStatusText = document.getElementById("voiceStatusText");

function showPill(msg, type) {
  if (!statusPill) return;
  statusPill.textContent = msg;
  statusPill.style.display = "block";
  statusPill.style.color = type === "err" ? "var(--err)" : type === "warn" ? "var(--warn)" : "var(--accent)";
}

function hidePill() {
  if (!statusPill) return;
  statusPill.style.display = "none";
}

function initRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showPill("Speech recognition not supported in this browser.", "warn");
    return null;
  }
  const rec = new SpeechRec();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = currentLang === "en" ? "en-IN" : "hi-IN";

  rec.onstart = () => {
    isListening = true;
    micBtn?.classList.add("active");
    voiceIndicator?.classList.add("voice-active");
    if (voiceStatusText) voiceStatusText.textContent = "Listening to Malik...";
    showPill("Listening... Speak now", "ok");
  };

  rec.onresult = (e) => {
    let transcript = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    if (promptInput) promptInput.value = transcript;
    if (e.results[0].isFinal) {
      setTimeout(() => {
        if (promptInput && promptInput.value.trim().length > 1) sendPrompt();
      }, 600);
    }
  };

  rec.onerror = (e) => {
    console.warn("Speech error:", e.error);
    isListening = false;
    micBtn?.classList.remove("active");
    voiceIndicator?.classList.remove("voice-active");
    if (voiceStatusText) voiceStatusText.textContent = "Ready when you are";
    if (e.error === "not-allowed") {
      showPill("Microphone permission was denied by browser settings.", "err");
    } else {
      showPill("Voice recognition paused (" + e.error + ").", "warn");
    }
  };

  rec.onend = () => {
    isListening = false;
    micBtn?.classList.remove("active");
    voiceIndicator?.classList.remove("voice-active");
    if (voiceStatusText) voiceStatusText.textContent = "Ready when you are";
  };

  return rec;
}

function toggleVoice() {
  if (isListening && recognition) {
    recognition.stop();
    return;
  }
  recognition = initRecognition();
  if (recognition) {
    try {
      recognition.start();
    } catch (_) {}
  }
}

function toggleTts() {
  isTtsEnabled = !isTtsEnabled;
  if (ttsBtn) ttsBtn.style.opacity = isTtsEnabled ? "1" : "0.4";
  if (!isTtsEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
}

function speakText(text) {
  if (!isTtsEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[*#_`]/g, "").slice(0, 2500);
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = currentLang === "en" ? "en-IN" : "hi-IN";
  utter.rate = 1.0;
  window.speechSynthesis.speak(utter);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function addMessage(content, type) {
  if (!chatHistory) return;
  const div = document.createElement("div");
  div.className = "msg " + (type === "user" ? "msg-user" : "msg-bot");

  let formatted = escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");

  div.innerHTML = formatted;
  chatHistory.appendChild(div);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function sendPrompt() {
  if (!promptInput) return;
  const text = promptInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  promptInput.value = "";
  if (sendBtn) sendBtn.disabled = true;
  showPill("SARI is thinking...", "ok");
  if (voiceStatusText) voiceStatusText.textContent = "SARI is thinking...";

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });

    if (sendBtn) sendBtn.disabled = false;
    hidePill();
    if (voiceStatusText) voiceStatusText.textContent = "Ready when you are";

    if (res.status === 401) {
      addMessage("Session expired. Please sign in again at /login.", "bot");
      showPill("Not authenticated.", "err");
      return;
    }

    const data = await res.json();
    if (data.ok && data.text) {
      addMessage(data.text, "bot");
      speakText(data.text);
    } else {
      addMessage(data.error || "No inference tier is available right now.", "bot");
      showPill("Model unavailable.", "warn");
    }
  } catch (err) {
    if (sendBtn) sendBtn.disabled = false;
    hidePill();
    if (voiceStatusText) voiceStatusText.textContent = "Ready when you are";
    addMessage("Connection error: " + (err instanceof Error ? err.message : String(err)), "bot");
    showPill("Failed to reach SARI.", "err");
  }
}

async function refreshSessionTag() {
  const tag = document.getElementById("onlineTag");
  if (!tag) return;
  tag.textContent = "ONLINE • SECURE";
  tag.style.color = "var(--accent)";
  try {
    const res = await fetch("/api/session", { credentials: "same-origin" });
    const data = await res.json();
    if (data && data.ok) {
      tag.textContent = "SIGNED IN • SECURE";
      tag.style.color = "var(--accent)";
    }
  } catch (_) {
    // Keep online secure fallback
  }
}

function sendQuick(cmd) {
  if (!promptInput) return;
  promptInput.value = cmd;
  sendPrompt();
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
}

function clearChat() {
  if (!chatHistory) return;
  chatHistory.innerHTML = "";
  addMessage("Chat cleared, Malik. Ready when you are.", "bot");
}

function setTheme(theme) {
  document.body.setAttribute("data-theme", theme);
}

function changeLang() {
  const select = document.getElementById("langSelect");
  if (!select) return;
  currentLang = select.value;
  showPill("Language updated to " + currentLang, "ok");
}

// Bind event listeners cleanly without inline handlers (100% CSP compliant)
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("sendBtn")?.addEventListener("click", sendPrompt);
  document.getElementById("promptInput")?.addEventListener("keydown", handleKey);
  document.getElementById("micBtn")?.addEventListener("click", toggleVoice);
  document.getElementById("ttsBtn")?.addEventListener("click", toggleTts);
  document.getElementById("micToggleText")?.addEventListener("click", toggleVoice);
  document.getElementById("clearChatBtn")?.addEventListener("click", clearChat);
  document.getElementById("btnFocus")?.addEventListener("click", () => sendQuick("Find my focus"));
  document.getElementById("btnInbox")?.addEventListener("click", () => sendQuick("Read my inbox"));
  document.getElementById("langSelect")?.addEventListener("change", changeLang);

  document.querySelectorAll("[data-theme-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.getAttribute("data-theme-btn");
      if (theme) setTheme(theme);
    });
  });

  refreshSessionTag();
});
