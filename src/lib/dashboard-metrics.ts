/**
 * Live metrics for /dashboard (Today's Workspace).
 * No mock fallbacks — empty accounts show zeros / "—".
 */

export type DashboardCustomerPreview = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  projectLabel: string | null;
  status: "Active" | "Inactive";
  initials: string;
  href: string;
};

export type DashboardMetrics = {
  customersTotal: number;
  customersActive: number;
  customersNewThisMonth: number;
  suppliersTotal: number;
  ordersOpen: number;
  quotesTotal: number;
  projectsActive: number;
  projectsOnHold: number;
  projectsCompleted: number;
  employeesTotal: number;
  taxRateLabel: string;
  validityLabel: string;
  profileLabel: string;
  scheduleToday: number;
  scheduleThisWeek: number;
  nextUpLabel: string;
  recentCustomers: DashboardCustomerPreview[];
};

export function emptyDashboardMetrics(): DashboardMetrics {
  return {
    customersTotal: 0,
    customersActive: 0,
    customersNewThisMonth: 0,
    suppliersTotal: 0,
    ordersOpen: 0,
    quotesTotal: 0,
    projectsActive: 0,
    projectsOnHold: 0,
    projectsCompleted: 0,
    employeesTotal: 0,
    taxRateLabel: "—",
    validityLabel: "—",
    profileLabel: "—",
    scheduleToday: 0,
    scheduleThisWeek: 0,
    nextUpLabel: "—",
    recentCustomers: [],
  };
}

export function startOfUtcMonth(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );
}

export function startOfLocalDay(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(now = new Date()): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
}

/** Monday 00:00 local → Sunday 23:59:59.999 local (ISO-ish week for agenda). */
export function localWeekBounds(now = new Date()): { start: Date; end: Date } {
  const day = now.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset,
    0,
    0,
    0,
    0
  );
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function formatNextUpTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
