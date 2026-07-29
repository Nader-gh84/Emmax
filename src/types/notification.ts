export const NOTIFICATION_TYPES = [
  "draft_quote",
  "quote_accepted",
  "supplier_price",
  "employee_clock",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationMetadata {
  quote_number?: string | null;
  customer_name?: string | null;
  grand_total?: number | null;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType | string;
  quote_id: string | null;
  message: string;
  metadata?: NotificationMetadata | null;
  read: boolean;
  created_at: string;
}

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export function getNotificationHref(notification: AppNotification): string | null {
  if (!notification.quote_id) return null;

  if (notification.type === "draft_quote") {
    return `/dashboard/voice-quote-builder?quote=${notification.quote_id}`;
  }

  if (notification.type === "quote_accepted") {
    return `/dashboard/quotes?quote=${notification.quote_id}`;
  }

  return `/dashboard/quotes?quote=${notification.quote_id}`;
}

export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function groupNotificationsByDay(notifications: AppNotification[]) {
  const groups: { label: string; items: AppNotification[] }[] = [];
  const buckets = new Map<string, AppNotification[]>();

  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const notification of notifications) {
    const created = startOfDay(new Date(notification.created_at));
    let label = "Earlier";

    if (created.getTime() === today.getTime()) {
      label = "Today";
    } else if (created.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    }

    const existing = buckets.get(label) ?? [];
    existing.push(notification);
    buckets.set(label, existing);
  }

  for (const label of ["Today", "Yesterday", "Earlier"]) {
    const items = buckets.get(label);
    if (items?.length) {
      groups.push({ label, items });
    }
  }

  return groups;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
