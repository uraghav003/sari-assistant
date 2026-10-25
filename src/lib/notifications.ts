/**
 * In-app alert feed.
 *
 * Telegram is optional. Until a bot token is configured, lead and system alerts
 * land here so nothing is lost. Stored per-device in localStorage and capped so
 * it cannot grow without bound.
 */

export type AlertChannel = "in_app" | "telegram" | "system";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  channel: AlertChannel;
  createdAt: number;
  read: boolean;
}

const STORAGE_KEY = "sari_alerts_v1";
const MAX_ITEMS = 100;

type Listener = (items: AppNotification[]) => void;
const listeners = new Set<Listener>();

function isNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.body === "string" &&
    typeof item.createdAt === "number" &&
    typeof item.read === "boolean"
  );
}

function read(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isNotification).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

let items: AppNotification[] = read();
if (items.length === 0) {
  items = [{
    id: "sec-init-1",
    title: "SARI Sovereign Security & Auto-Learn Active",
    body: "Zero-trust guardrails enforced under MD (DC002) & Founder (DC001) governance. All tasks and events are monitored and synced.",
    channel: "system",
    createdAt: Date.now(),
    read: false
  }];
}
function persist(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or disabled — the feed still works for this session.
    }
  }
  for (const listener of listeners) listener(items);
}

export function subscribeAlerts(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

export function getAlerts(): AppNotification[] {
  return items;
}

export function unreadCount(): number {
  return items.filter((item) => !item.read).length;
}

export function pushAlert(input: {
  title: string;
  body: string;
  channel?: AlertChannel;
}): AppNotification {
  const notification: AppNotification = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title.slice(0, 160),
    body: input.body.slice(0, 1000),
    channel: input.channel || "in_app",
    createdAt: Date.now(),
    read: false,
  };

  items = [notification, ...items].slice(0, MAX_ITEMS);
  persist();
  return notification;
}

export function markAllRead(): void {
  items = items.map((item) => ({ ...item, read: true }));
  persist();
}

export function clearAlerts(): void {
  items = [];
  persist();
}

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
