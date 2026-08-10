export const SCHEDULE_TASK_TYPES = [
  "project_task",
  "pickup",
  "delivery",
  "site_visit",
  "call",
  "inspection",
  "payment_reminder",
  "personal",
  "other",
] as const;

export type ScheduleTaskType = (typeof SCHEDULE_TASK_TYPES)[number];

export const SCHEDULE_ITEM_STATUSES = [
  "todo",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type ScheduleItemStatus = (typeof SCHEDULE_ITEM_STATUSES)[number];

export const SCHEDULE_ITEM_SOURCES = [
  "manual",
  "from_project_task",
  "from_material_order",
  "from_invoice",
  "voice",
] as const;

export type ScheduleItemSource = (typeof SCHEDULE_ITEM_SOURCES)[number];

export const AGENDA_PRIORITIES = ["high", "medium", "low"] as const;

export type AgendaPriority = (typeof AGENDA_PRIORITIES)[number];

export interface ScheduleItem {
  id: string;
  user_id: string;
  task_type: ScheduleTaskType;
  title: string;
  notes: string | null;
  status: ScheduleItemStatus;
  /** Present after migration 042; treat missing as medium until then. */
  priority?: AgendaPriority;
  scheduled_start: string | null;
  scheduled_end: string | null;
  all_day: boolean;
  project_id: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  material_order_id: string | null;
  source_task_id: string | null;
  source: ScheduleItemSource;
  completed_at: string | null;
  external_calendar_id: string | null;
  external_event_id: string | null;
  external_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export function isScheduleTaskType(value: string): value is ScheduleTaskType {
  return (SCHEDULE_TASK_TYPES as readonly string[]).includes(value);
}

export function isScheduleItemStatus(value: string): value is ScheduleItemStatus {
  return (SCHEDULE_ITEM_STATUSES as readonly string[]).includes(value);
}

export function isAgendaPriority(value: string): value is AgendaPriority {
  return (AGENDA_PRIORITIES as readonly string[]).includes(value);
}

export function agendaPriorityLabel(priority: AgendaPriority): string {
  switch (priority) {
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "Medium";
  }
}

export function scheduleTaskTypeLabel(type: ScheduleTaskType): string {
  switch (type) {
    case "project_task":
      return "Project task";
    case "pickup":
      return "Pickup";
    case "delivery":
      return "Delivery";
    case "site_visit":
      return "Site visit";
    case "call":
      return "Call";
    case "inspection":
      return "Inspection";
    case "payment_reminder":
      return "Payment";
    case "personal":
      return "Personal";
    default:
      return "Other";
  }
}
