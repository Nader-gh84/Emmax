import type { MaterialOrder } from "@/types/material-order";
import type { AppNotification } from "@/types/notification";
import type { ProjectTask } from "@/types/project-operations";
import {
  isAgendaPriority,
  isScheduleItemStatus,
  isScheduleTaskType,
  scheduleTaskTypeLabel,
  type AgendaPriority,
  type ScheduleItem,
  type ScheduleTaskType,
} from "@/types/schedule-item";
import type { SupplierInvoiceRow } from "@/lib/supplier-accounting";
import {
  addDaysToDateKey,
  dateKeyFromIsoInTimeZone,
  startOfWeekMondayDateKey,
  toZonedDateKey,
  zonedDateTimeToUtc,
} from "@/lib/local-date";

export { toLocalDateKey, toZonedDateKey } from "@/lib/local-date";
export { parseDateKeyUtc as parseLocalDateKey } from "@/lib/local-date";

export type TodayAgendaKind =
  | "schedule"
  | "project_task"
  | "material"
  | "payment";

export type TodayAgendaItem = {
  id: string;
  kind: TodayAgendaKind;
  taskType: ScheduleTaskType;
  title: string;
  subtitle: string | null;
  status: "todo" | "in_progress" | "completed" | "cancelled" | "overdue";
  /** high | medium | low — from schedule_items/tasks; default medium for derived rows. */
  priority: AgendaPriority;
  /** ISO timestamptz when known; null for all-day / date-only. */
  scheduledStart: string | null;
  scheduledEnd: string | null;
  allDay: boolean;
  /** YYYY-MM-DD in local agenda day terms when date-only. */
  dateKey: string;
  href: string | null;
  /** Short label for the deep-link action (Open project, Open order, …). */
  hrefLabel?: string | null;
  meta?: {
    projectId?: string | null;
    projectName?: string | null;
    supplierId?: string | null;
    supplierName?: string | null;
    customerId?: string | null;
    materialOrderId?: string | null;
    amount?: number | null;
  };
};

export type TodayWeekDay = {
  dateKey: string;
  label: string;
  weekday: string;
  isToday: boolean;
  itemCount: number;
};

export type TodaySummary = {
  totalToday: number;
  completedToday: number;
  openToday: number;
  paymentsDueCount: number;
  paymentsDueAmount: number;
  pickupsCount: number;
  overdueCount: number;
  highPriorityCount: number;
};

export type TodayAgendaViewModel = {
  dateKey: string;
  timeZone: string;
  greetingName: string;
  briefLines: string[];
  items: TodayAgendaItem[];
  upNext: TodayAgendaItem[];
  week: TodayWeekDay[];
  alerts: AppNotification[];
  summary: TodaySummary;
};

function normalizeScheduleItem(row: ScheduleItem): ScheduleItem {
  return {
    ...row,
    task_type: isScheduleTaskType(String(row.task_type))
      ? row.task_type
      : "other",
    status: isScheduleItemStatus(String(row.status)) ? row.status : "todo",
    priority: resolveAgendaPriority(row.priority),
    notes: row.notes ?? null,
    all_day: Boolean(row.all_day),
  };
}

function resolveAgendaPriority(value: unknown): AgendaPriority {
  return isAgendaPriority(String(value ?? ""))
    ? (value as AgendaPriority)
    : "medium";
}

function materialTaskType(
  deliveryOption: string | null | undefined
): ScheduleTaskType {
  const value = (deliveryOption ?? "").toLowerCase();
  if (value.includes("delivery")) return "delivery";
  return "pickup";
}

function resolveProjectHref(
  customerId: string | null | undefined,
  projectId: string | null | undefined
): string | null {
  if (customerId && projectId) {
    return `/dashboard/customers/${customerId}/projects/${projectId}`;
  }
  return null;
}

function resolveOrderMaterialsHref(
  customerId: string | null | undefined,
  projectId: string | null | undefined
): string | null {
  if (customerId && projectId) {
    return `/dashboard/customers/${customerId}/projects/${projectId}/order-materials`;
  }
  return null;
}

function resolveScheduleHref(row: ScheduleItem): {
  href: string | null;
  hrefLabel: string | null;
} {
  if (row.material_order_id) {
    const orderHref = resolveOrderMaterialsHref(row.customer_id, row.project_id);
    if (orderHref) return { href: orderHref, hrefLabel: "Open order" };
  }
  const projectHref = resolveProjectHref(row.customer_id, row.project_id);
  if (projectHref) return { href: projectHref, hrefLabel: "Open project" };
  if (row.supplier_id) {
    return {
      href: `/dashboard/suppliers/${row.supplier_id}`,
      hrefLabel: "Open supplier",
    };
  }
  if (row.customer_id) {
    return {
      href: `/dashboard/customers/${row.customer_id}`,
      hrefLabel: "Open customer",
    };
  }
  return { href: null, hrefLabel: null };
}

/** Deep link for Today alert rows (Inbox still uses modal-only navigation). */
export function resolveTodayAlertHref(notification: AppNotification): string | null {
  const meta = notification.metadata;
  if (!meta) return "/dashboard/inbox";

  if (meta.customer_id && meta.project_id && meta.material_order_id) {
    return resolveOrderMaterialsHref(meta.customer_id, meta.project_id);
  }
  if (meta.customer_id && meta.project_id) {
    return resolveProjectHref(meta.customer_id, meta.project_id);
  }
  if (meta.customer_id) {
    return `/dashboard/customers/${meta.customer_id}`;
  }
  if (typeof meta.supplier_id === "string" && meta.supplier_id) {
    return `/dashboard/suppliers/${meta.supplier_id}`;
  }
  return "/dashboard/inbox";
}

function deriveScheduleStatus(
  row: ScheduleItem,
  now: Date
): TodayAgendaItem["status"] {
  if (row.status === "completed" || row.status === "cancelled") {
    return row.status;
  }
  if (!row.all_day && row.scheduled_start) {
    const startMs = new Date(row.scheduled_start).getTime();
    if (!Number.isNaN(startMs) && startMs < now.getTime()) {
      return "overdue";
    }
  }
  return row.status === "in_progress" ? "in_progress" : "todo";
}

function sortAgenda(a: TodayAgendaItem, b: TodayAgendaItem): number {
  // Overdue first, then other open, then completed; then by time, then title
  const rank = (status: TodayAgendaItem["status"]) => {
    if (status === "overdue") return 0;
    if (status === "completed" || status === "cancelled") return 2;
    return 1;
  };
  const byStatus = rank(a.status) - rank(b.status);
  if (byStatus !== 0) return byStatus;

  if (a.scheduledStart && b.scheduledStart) {
    return a.scheduledStart.localeCompare(b.scheduledStart);
  }
  if (a.scheduledStart) return -1;
  if (b.scheduledStart) return 1;
  return a.title.localeCompare(b.title);
}

export function buildTodayAgenda(input: {
  now?: Date;
  /** IANA time zone for calendar-day boundaries (e.g. America/Vancouver). */
  timeZone: string;
  /** Optional override; defaults to zoned "today" for `now`. */
  dateKey?: string;
  greetingName: string;
  scheduleItems: ScheduleItem[];
  projectTasks: Array<
    ProjectTask & { project_name?: string | null; customer_id?: string | null }
  >;
  materialOrders: MaterialOrder[];
  invoicesDue: Array<
    SupplierInvoiceRow & {
      supplier_name?: string | null;
      balance?: number;
    }
  >;
  notifications: AppNotification[];
}): TodayAgendaViewModel {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone;
  const dateKey = input.dateKey ?? toZonedDateKey(now, timeZone);
  const items: TodayAgendaItem[] = [];

  for (const raw of input.scheduleItems) {
    const row = normalizeScheduleItem(raw);
    const itemDate =
      dateKeyFromIsoInTimeZone(row.scheduled_start, timeZone) ??
      (row.all_day
        ? dateKeyFromIsoInTimeZone(row.created_at, timeZone)
        : null);
    if (itemDate !== dateKey) continue;
    if (row.status === "cancelled") continue;

    const link = resolveScheduleHref(row);
    items.push({
      id: `schedule:${row.id}`,
      kind: "schedule",
      taskType: row.task_type,
      title: row.title,
      subtitle: row.notes,
      status: deriveScheduleStatus(row, now),
      priority: row.priority,
      scheduledStart: row.all_day ? null : row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      allDay: row.all_day || !row.scheduled_start,
      dateKey: itemDate,
      href: link.href,
      hrefLabel: link.hrefLabel,
      meta: {
        projectId: row.project_id,
        supplierId: row.supplier_id,
        customerId: row.customer_id,
        materialOrderId: row.material_order_id,
      },
    });
  }

  for (const task of input.projectTasks) {
    if (!task.due_date) continue;
    const isCompleted = task.status === "completed";
    const isDueToday = task.due_date === dateKey;
    const isPastDue = task.due_date < dateKey && !isCompleted;
    if (!isDueToday && !isPastDue) continue;

    const status: TodayAgendaItem["status"] = isCompleted
      ? "completed"
      : isPastDue || task.status === "overdue"
        ? "overdue"
        : task.status === "in_progress"
          ? "in_progress"
          : "todo";

    const projectLabel = task.project_name?.trim() || "Project task";
    const subtitle = isPastDue
      ? `${projectLabel} · due ${task.due_date}`
      : projectLabel;

    const projectHref = resolveProjectHref(task.customer_id, task.project_id);

    items.push({
      id: `task:${task.id}`,
      kind: "project_task",
      taskType: "project_task",
      title: task.title,
      subtitle,
      status,
      priority: resolveAgendaPriority(task.priority),
      scheduledStart: null,
      scheduledEnd: null,
      allDay: true,
      dateKey: isPastDue ? dateKey : task.due_date,
      href: projectHref,
      hrefLabel: projectHref ? "Open project" : null,
      meta: {
        projectId: task.project_id,
        projectName: task.project_name,
        customerId: task.customer_id,
      },
    });
  }

  for (const order of input.materialOrders) {
    const readyDate = order.availability_date || order.required_by_date;
    // Today + past-due unreceived pickups/deliveries
    if (!readyDate || readyDate > dateKey) continue;
    if (order.materials_received_at) continue;

    const type = materialTaskType(order.delivery_option);
    const time =
      order.availability_time?.trim() && order.availability_date === readyDate
        ? `${order.availability_date}T${normalizeTime(order.availability_time)}`
        : null;

    const orderHref =
      resolveOrderMaterialsHref(order.customer_id, order.project_id) ??
      (order.supplier_id ? `/dashboard/suppliers/${order.supplier_id}` : null);

    const isPast = readyDate < dateKey;
    items.push({
      id: `material:${order.id}`,
      kind: "material",
      taskType: type,
      title: `${scheduleTaskTypeLabel(type)} — ${order.supplier_name || "Supplier"}`,
      subtitle: isPast
        ? `${order.project_name || order.branch_location || "Materials"} · ready ${readyDate}`
        : order.project_name || order.branch_location || null,
      status: isPast ? "overdue" : "todo",
      priority: isPast ? "high" : "medium",
      scheduledStart: time,
      scheduledEnd: null,
      allDay: !time,
      dateKey: isPast ? dateKey : readyDate,
      href: orderHref,
      hrefLabel: orderHref
        ? orderHref.includes("/order-materials")
          ? "Open order"
          : "Open supplier"
        : null,
      meta: {
        projectId: order.project_id,
        projectName: order.project_name,
        supplierId: order.supplier_id,
        supplierName: order.supplier_name,
        customerId: order.customer_id,
        materialOrderId: order.id,
      },
    });
  }

  for (const invoice of input.invoicesDue) {
    if (!invoice.due_date || invoice.due_date > dateKey) continue;
    if (invoice.status !== "confirmed") continue;
    const balance = Number(invoice.balance);
    if (Number.isFinite(balance) && balance <= 0.009) continue;

    const isPast = invoice.due_date < dateKey;
    items.push({
      id: `payment:${invoice.id}`,
      kind: "payment",
      taskType: "payment_reminder",
      title: `Payment due — ${invoice.supplier_name || "Supplier"}`,
      subtitle: isPast
        ? `${invoice.invoice_number || "Invoice"} · due ${invoice.due_date}`
        : invoice.invoice_number,
      status: isPast ? "overdue" : "todo",
      priority: isPast ? "high" : "medium",
      scheduledStart: null,
      scheduledEnd: null,
      allDay: true,
      dateKey: isPast ? dateKey : invoice.due_date,
      href: `/dashboard/suppliers/${invoice.supplier_id}`,
      hrefLabel: "Open supplier",
      meta: {
        supplierId: invoice.supplier_id,
        supplierName: invoice.supplier_name,
        amount: Number.isFinite(balance) ? balance : Number(invoice.amount) || 0,
      },
    });
  }

  items.sort(sortAgenda);

  const openTimed = items.filter(
    (item) =>
      item.status !== "completed" &&
      item.status !== "cancelled" &&
      item.scheduledStart &&
      new Date(item.scheduledStart).getTime() >= now.getTime()
  );
  const upNext = (openTimed.length > 0 ? openTimed : items.filter((i) => i.status !== "completed")).slice(0, 3);

  const weekStartKey = startOfWeekMondayDateKey(dateKey, timeZone);
  const weekCounts = countItemsByDateKey({
    timeZone,
    scheduleItems: input.scheduleItems,
    projectTasks: input.projectTasks,
    materialOrders: input.materialOrders,
    invoicesDue: input.invoicesDue,
  });

  const week: TodayWeekDay[] = Array.from({ length: 7 }, (_, index) => {
    const key = addDaysToDateKey(weekStartKey, index);
    const noon = zonedDateTimeToUtc(key, "12:00:00", timeZone);
    return {
      dateKey: key,
      label: String(Number(key.slice(8, 10))),
      weekday: noon.toLocaleDateString("en-CA", {
        timeZone,
        weekday: "short",
      }),
      isToday: key === dateKey,
      itemCount: weekCounts.get(key) ?? 0,
    };
  });

  const completedToday = items.filter((i) => i.status === "completed").length;
  const openToday = items.filter(
    (i) => i.status !== "completed" && i.status !== "cancelled"
  ).length;
  const payments = items.filter((i) => i.kind === "payment");
  const pickups = items.filter(
    (i) => i.taskType === "pickup" || i.taskType === "delivery"
  );
  const overdueCount = items.filter((i) => i.status === "overdue").length;
  const highPriorityCount = items.filter(
    (i) =>
      i.priority === "high" &&
      i.status !== "completed" &&
      i.status !== "cancelled"
  ).length;

  const summary: TodaySummary = {
    totalToday: items.length,
    completedToday,
    openToday,
    paymentsDueCount: payments.length,
    paymentsDueAmount: payments.reduce(
      (sum, item) => sum + (Number(item.meta?.amount) || 0),
      0
    ),
    pickupsCount: pickups.length,
    overdueCount,
    highPriorityCount,
  };

  const alerts = [...input.notifications]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8);

  const briefLines = buildBriefLines({
    greetingName: input.greetingName,
    summary,
    upNext,
    items,
    timeZone,
  });

  return {
    dateKey,
    timeZone,
    greetingName: input.greetingName,
    briefLines,
    items,
    upNext,
    week,
    alerts,
    summary,
  };
}

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  // Best-effort parse "2:30 PM"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "09:00:00";
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}:00`;
}

function countItemsByDateKey(input: {
  timeZone: string;
  scheduleItems: ScheduleItem[];
  projectTasks: Array<ProjectTask>;
  materialOrders: MaterialOrder[];
  invoicesDue: Array<SupplierInvoiceRow & { balance?: number }>;
}): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (key: string | null | undefined) => {
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  for (const row of input.scheduleItems) {
    if (row.status === "cancelled") continue;
    bump(dateKeyFromIsoInTimeZone(row.scheduled_start, input.timeZone));
  }
  for (const task of input.projectTasks) {
    bump(task.due_date);
  }
  for (const order of input.materialOrders) {
    if (order.materials_received_at) continue;
    bump(order.availability_date || order.required_by_date);
  }
  for (const invoice of input.invoicesDue) {
    if (invoice.status !== "confirmed") continue;
    const balance = Number(invoice.balance);
    if (Number.isFinite(balance) && balance <= 0.009) continue;
    bump(invoice.due_date);
  }

  return counts;
}

function buildBriefLines(input: {
  greetingName: string;
  summary: TodaySummary;
  upNext: TodayAgendaItem[];
  items: TodayAgendaItem[];
  timeZone: string;
}): string[] {
  const name = input.greetingName || "there";
  const open = input.summary.openToday;
  const done = input.summary.completedToday;

  let agendaLine: string;
  if (open === 0 && done > 0) {
    agendaLine = `Your open agenda is clear — ${done} item${
      done === 1 ? "" : "s"
    } already done.`;
  } else if (open === 0) {
    agendaLine = "Your agenda is clear for today.";
  } else if (done > 0) {
    agendaLine = `You have ${open} open item${
      open === 1 ? "" : "s"
    } on the agenda, and ${done} already done.`;
  } else {
    agendaLine = `You have ${open} open item${
      open === 1 ? "" : "s"
    } on the agenda.`;
  }

  const lines = [
    `Good day, ${name}. Here's your brief for today.`,
    agendaLine,
  ];

  if (input.summary.overdueCount > 0) {
    lines.push(
      `You have ${input.summary.overdueCount} overdue item${
        input.summary.overdueCount === 1 ? "" : "s"
      } to clear.`
    );
  }
  if (input.summary.paymentsDueCount > 0) {
    lines.push(
      `${input.summary.paymentsDueCount} supplier payment${
        input.summary.paymentsDueCount === 1 ? "" : "s"
      } due today.`
    );
  }
  if (input.summary.pickupsCount > 0) {
    lines.push(
      `${input.summary.pickupsCount} pickup or delivery to watch.`
    );
  }

  const next = input.upNext[0];
  if (next) {
    const when = next.scheduledStart
      ? formatAgendaTime(next.scheduledStart, input.timeZone)
      : "today";
    lines.push(`Up next: ${next.title} at ${when}.`);
  } else if (open === 0 && done === 0) {
    lines.push("A good day to catch up or plan ahead.");
  }

  return lines;
}

export function formatAgendaMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAgendaTime(
  iso: string | null | undefined,
  timeZone?: string
): string {
  if (!iso) return "All day";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "All day";
  return date.toLocaleTimeString("en-CA", {
    ...(timeZone ? { timeZone } : {}),
    hour: "numeric",
    minute: "2-digit",
  });
}
