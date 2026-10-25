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
const VALID_CHANNELS: Record<AlertChannel, true> = {
  in_app: true,
  telegram: true,
  system: true,
};

function isValidChannel(channel: unknown): channel is AlertChannel {
  return typeof channel === "string" && channel in VALID_CHANNELS;
}

function isNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.title === "string" &&
    typeof item.body === "string" &&
    typeof item.createdAt === "number" &&
    Number.isFinite(item.createdAt) &&
    typeof item.read === "boolean" &&
    (item.channel === undefined || isValidChannel(item.channel))
  );
}

function read(): AppNotification[] {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isNotification)
      .slice(0, MAX_ITEMS)
      .map((item) => ({
        ...item,
        channel: isValidChannel(item.channel) ? item.channel : "in_app",
      }));
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
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or disabled — the feed still works for this session.
    }
  }
  for (const listener of listeners) {
    try {
      listener(items);
    } catch (err) {
      console.error("Alert listener error:", err);
    }
  }
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      items = read();
      for (const listener of listeners) {
        try {
          listener(items);
        } catch (err) {
          console.error("Alert listener error:", err);
        }
      }
    }
  });
}
export function subscribeAlerts(listener: Listener): () => void {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  try {
    listener(items);
  } catch (err) {
    console.error("Initial alert listener error:", err);
  }
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
  title?: string;
  body?: string;
  channel?: AlertChannel;
}): AppNotification {
  let id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      id = crypto.randomUUID();
    } catch {
      // fallback id
    }
  }

  const rawTitle = input?.title ?? "";
  const rawBody = input?.body ?? "";
  const channel: AlertChannel = isValidChannel(input?.channel) ? input.channel : "in_app";

  const notification: AppNotification = {
    id,
    title: String(rawTitle).slice(0, 160),
    body: String(rawBody).slice(0, 1000),
    channel,
    createdAt: Date.now(),
    read: false,
  };

  items = [notification, ...items].slice(0, MAX_ITEMS);
  persist();
  return notification;
}

export function markAsRead(id: string): void {
  if (!id) return;
  let changed = false;
  items = items.map((item) => {
    if (item.id === id && !item.read) {
      changed = true;
      return { ...item, read: true };
    }
    return item;
  });
  if (changed) persist();
}

export function removeAlert(id: string): void {
  if (!id) return;
  const prevLen = items.length;
  items = items.filter((item) => item.id !== id);
  if (items.length !== prevLen) persist();
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
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
    return "just now";
  }
  const diff = Date.now() - timestamp;
  if (diff < 0) return "just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  try {
    return new Date(timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return "recently";
  }
}
