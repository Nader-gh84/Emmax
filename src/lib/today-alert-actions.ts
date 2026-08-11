import { zonedDateTimeToUtc } from "@/lib/local-date";
import type { AppNotification } from "@/types/notification";
import type { ScheduleItem, ScheduleTaskType } from "@/types/schedule-item";

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export type AlertScheduleDraft = {
  title: string;
  task_type: ScheduleTaskType;
  notes: string | null;
  dateKey: string;
  /** HH:MM for timed items; empty string = all-day. */
  timeHm: string;
  project_id: string | null;
  customer_id: string | null;
  material_order_id: string | null;
  source: "from_material_order";
};

/** Alerts that can become a schedule_items row from metadata. */
export function isAddableTodayAlert(notification: AppNotification): boolean {
  if (notification.type !== "materials_confirmed") return false;
  const orderId = notification.metadata?.material_order_id;
  return typeof orderId === "string" && orderId.length > 0;
}

export function alreadyScheduledFromAlert(
  notification: AppNotification,
  scheduleItems: ScheduleItem[]
): boolean {
  const orderId = notification.metadata?.material_order_id;
  if (typeof orderId !== "string" || !orderId) return false;
  return scheduleItems.some(
    (row) =>
      row.material_order_id === orderId &&
      row.status !== "cancelled"
  );
}

/**
 * Build a schedule draft from materials_confirmed metadata.
 * Uses availability_date/time when present; otherwise falls back to today.
 */
export function buildAlertScheduleDraft(
  notification: AppNotification,
  fallbackDateKey: string
): AlertScheduleDraft | null {
  if (!isAddableTodayAlert(notification)) return null;
  const meta = notification.metadata ?? {};
  const supplier =
    typeof meta.supplier_name === "string" && meta.supplier_name.trim()
      ? meta.supplier_name.trim()
      : "Supplier";
  const project =
    typeof meta.project_name === "string" && meta.project_name.trim()
      ? meta.project_name.trim()
      : null;
  const branch =
    typeof meta.branch_location === "string" && meta.branch_location.trim()
      ? meta.branch_location.trim()
      : null;

  const dateKey =
    typeof meta.availability_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(meta.availability_date)
      ? meta.availability_date
      : fallbackDateKey;

  const timeHm = parseAvailabilityTimeHm(
    typeof meta.availability_time === "string" ? meta.availability_time : null
  );

  const noteParts = [
    project ? `Project: ${project}` : null,
    branch ? `Branch: ${branch}` : null,
    notification.message?.trim() || null,
  ].filter(Boolean);

  return {
    title: `Pickup — ${supplier}`,
    task_type: "pickup",
    notes: noteParts.length ? noteParts.join(" · ") : null,
    dateKey,
    timeHm,
    project_id:
      typeof meta.project_id === "string" && meta.project_id
        ? meta.project_id
        : null,
    customer_id:
      typeof meta.customer_id === "string" && meta.customer_id
        ? meta.customer_id
        : null,
    material_order_id:
      typeof meta.material_order_id === "string"
        ? meta.material_order_id
        : null,
    source: "from_material_order",
  };
}

export function draftToScheduleInsert(
  draft: AlertScheduleDraft,
  userId: string,
  timeZone: string
): {
  user_id: string;
  task_type: ScheduleTaskType;
  title: string;
  notes: string | null;
  status: "todo";
  scheduled_start: string;
  scheduled_end: string | null;
  all_day: boolean;
  project_id: string | null;
  customer_id: string | null;
  material_order_id: string | null;
  source: "from_material_order";
} {
  const allDay = !draft.timeHm.trim();
  if (allDay) {
    const start = zonedDateTimeToUtc(draft.dateKey, "00:00:00", timeZone);
    return {
      user_id: userId,
      task_type: draft.task_type,
      title: draft.title,
      notes: draft.notes,
      status: "todo",
      scheduled_start: start.toISOString(),
      scheduled_end: null,
      all_day: true,
      project_id: draft.project_id,
      customer_id: draft.customer_id,
      material_order_id: draft.material_order_id,
      source: "from_material_order",
    };
  }

  const hm = draft.timeHm.trim().slice(0, 5);
  const normalized = /^\d{2}:\d{2}$/.test(hm) ? `${hm}:00` : "09:00:00";
  const start = zonedDateTimeToUtc(draft.dateKey, normalized, timeZone);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);

  return {
    user_id: userId,
    task_type: draft.task_type,
    title: draft.title,
    notes: draft.notes,
    status: "todo",
    scheduled_start: start.toISOString(),
    scheduled_end: end.toISOString(),
    all_day: false,
    project_id: draft.project_id,
    customer_id: draft.customer_id,
    material_order_id: draft.material_order_id,
    source: "from_material_order",
  };
}

/** Parse "14:30", "14:30:00", or "2:30 PM" → "HH:MM". Empty if unknown. */
export function parseAvailabilityTimeHm(
  value: string | null | undefined
): string {
  if (!value?.trim()) return "";
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}
