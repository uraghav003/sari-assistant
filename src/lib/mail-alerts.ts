import { pushAlert } from "./notifications";

/**
 * Live email alerts: polls /api/sari/alerts (Gmail label MIS-Incoming via the SARI Apps Script),
 * records each new unread mail in the in-app alert list and shows a system notification
 * (laptop toast / mobile PWA notification). Works while the app is open; it is not a background push.
 */
const POLL_MS = 60_000;
const SEEN_KEY = "sari_mail_alerts_seen";
const MAX_SEEN = 300;
const MAX_PER_POLL = 5;

interface MailAlert {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  unread: boolean;
}

let started = false;

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-MAX_SEEN)));
  } catch {
    // storage unavailable — alerts may repeat, which is safer than dropping them
  }
}

async function showSystemNotification(title: string, body: string): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: "sari-mail" });
    } else {
      new Notification(title, { body, icon: "/icon-192.png" });
    }
  } catch {
    // notification blocked by the platform
  }
}

async function poll(stop: () => void): Promise<void> {
  if (document.visibilityState === "hidden") return;
  try {
    const res = await fetch("/api/sari/alerts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(25_000),
    });
    if (res.status === 401) return; // not signed in yet; keep polling so alerts start right after login
    if (!res.ok) return;
    const data = (await res.json()) as { ok?: boolean; alerts?: MailAlert[] };
    if (!data.ok || !Array.isArray(data.alerts)) return;

    const seen = loadSeen();
    const fresh = data.alerts.filter((a) => a.unread && !seen.has(a.id)).slice(0, MAX_PER_POLL);
    for (const a of fresh) {
      const title = `📧 ${a.subject}`;
      const body = [a.from, a.snippet].filter(Boolean).join(" · ");
      pushAlert({ title, body, channel: "in_app" });
      void showSystemNotification(title, body);
    }
    for (const a of data.alerts) seen.add(a.id);
    saveSeen(seen);
  } catch {
    // network hiccup — retry on the next tick
  }
}

export function startMailAlerts(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  let timer: number | undefined;
  const stop = () => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };
  void poll(stop);
  timer = window.setInterval(() => void poll(stop), POLL_MS);
}
