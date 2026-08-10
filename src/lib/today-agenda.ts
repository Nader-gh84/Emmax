import type { MaterialOrder } from "@/types/material-order";
import type { AppNotification } from "@/types/notification";
import type { ProjectTask } from "@/types/project-operations";
import {
  isScheduleItemStatus,
  isScheduleTaskType,
  scheduleTaskTypeLabel,
  type ScheduleItem,
  type ScheduleTaskType,
} from "@/types/schedule-item";
import type { SupplierInvoiceRow } from "@/lib/supplier-accounting";

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
};

export type TodayAgendaViewModel = {
  dateKey: string;
  greetingName: string;
  briefLines: string[];
  items: TodayAgendaItem[];
  upNext: TodayAgendaItem[];
  week: TodayWeekDay[];
  alerts: AppNotification[];
  summary: TodaySummary;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar YYYY-MM-DD for a Date. */
export function toLocalDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

function dateKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    // Already a date-only string?
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    return null;
  }
  return toLocalDateKey(date);
}

function normalizeScheduleItem(row: ScheduleItem): ScheduleItem {
  return {
    ...row,
    task_type: isScheduleTaskType(String(row.task_type))
      ? row.task_type
      : "other",
    status: isScheduleItemStatus(String(row.status)) ? row.status : "todo",
    notes: row.notes ?? null,
    all_day: Boolean(row.all_day),
  };
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
  const dateKey = toLocalDateKey(now);
  const items: TodayAgendaItem[] = [];

  for (const raw of input.scheduleItems) {
    const row = normalizeScheduleItem(raw);
    const itemDate =
      dateKeyFromIso(row.scheduled_start) ??
      (row.all_day ? dateKeyFromIso(row.created_at) : null);
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

  const weekStart = startOfWeekMonday(now);
  const weekCounts = countItemsByDateKey({
    scheduleItems: input.scheduleItems,
    projectTasks: input.projectTasks,
    materialOrders: input.materialOrders,
    invoicesDue: input.invoicesDue,
  });

  const week: TodayWeekDay[] = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    const key = toLocalDateKey(day);
    return {
      dateKey: key,
      label: String(day.getDate()),
      weekday: day.toLocaleDateString("en-CA", { weekday: "short" }),
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
  });

  return {
    dateKey,
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
  return `${pad2(hours)}:${minutes}:00`;
}

function countItemsByDateKey(input: {
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
    bump(dateKeyFromIso(row.scheduled_start));
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
      ? new Date(next.scheduledStart).toLocaleTimeString("en-CA", {
          hour: "numeric",
          minute: "2-digit",
        })
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

export function formatAgendaTime(iso: string | null | undefined): string {
  if (!iso) return "All day";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "All day";
  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}
