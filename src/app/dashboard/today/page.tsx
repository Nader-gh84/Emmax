import type { Metadata } from "next";
import { cookies } from "next/headers";
import { TodayPage } from "@/components/today/today-page";
import { TodayTimezoneBootstrap } from "@/components/today/today-timezone-bootstrap";
import {
  enrichSupplierInvoices,
  type SupplierInvoiceRow,
  type SupplierPaymentAllocationRow,
} from "@/lib/supplier-accounting";
import {
  USER_TIMEZONE_COOKIE,
  addDaysToDateKey,
  isValidTimeZone,
  startOfWeekMondayDateKey,
  toZonedDateKey,
  zonedDateTimeToUtc,
} from "@/lib/local-date";
import { buildTodayAgenda } from "@/lib/today-agenda";
import type { TodayVoiceProjectCandidate } from "@/lib/today-voice-command";
import { createClient } from "@/lib/supabase/server";
import type { MaterialOrder } from "@/types/material-order";
import type { AppNotification } from "@/types/notification";
import type { ProjectTask } from "@/types/project-operations";
import type { ScheduleItem } from "@/types/schedule-item";

export const metadata: Metadata = {
  title: "Today",
};

function getFirstName(
  fullName: string | null | undefined,
  email: string | null | undefined
) {
  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0];
  }
  if (email) {
    const local = email.split("@")[0] ?? "";
    const segment = local.split(/[._-]/)[0] ?? "";
    if (segment) {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  }
  return "there";
}

type TaskRow = ProjectTask & {
  projects?: {
    project_name?: string | null;
    customer_id?: string | null;
  } | null;
};

type ScheduleRow = ScheduleItem & {
  projects?: {
    project_name?: string | null;
    customer_id?: string | null;
  } | null;
};

type ProjectRow = {
  id: string;
  project_name: string | null;
  customer_id: string | null;
  status: string | null;
  customers?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export default async function TodayRoute() {
  const cookieStore = cookies();
  const rawTz = cookieStore.get(USER_TIMEZONE_COOKIE)?.value;
  const timeZone = rawTz ? decodeURIComponent(rawTz) : null;

  if (!isValidTimeZone(timeZone)) {
    return <TodayTimezoneBootstrap />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const todayKey = toZonedDateKey(now, timeZone);
  const weekStartKey = startOfWeekMondayDateKey(todayKey, timeZone);
  const weekEndKey = addDaysToDateKey(weekStartKey, 7);
  const lookbackKey = addDaysToDateKey(todayKey, -30);
  const weekStartMs = zonedDateTimeToUtc(weekStartKey, "00:00:00", timeZone).getTime();
  const weekEndMs = zonedDateTimeToUtc(weekEndKey, "00:00:00", timeZone).getTime();

  let greetingName = "there";
  let scheduleItems: ScheduleItem[] = [];
  let projectTasks: Array<
    ProjectTask & { project_name?: string | null; customer_id?: string | null }
  > = [];
  let materialOrders: MaterialOrder[] = [];
  let invoicesDue: Array<
    SupplierInvoiceRow & { supplier_name?: string | null; balance?: number }
  > = [];
  let notifications: AppNotification[] = [];
  let projects: TodayVoiceProjectCandidate[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("business_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    greetingName = getFirstName(profile?.full_name, user.email);

    const [
      scheduleResult,
      tasksResult,
      materialsResult,
      invoicesResult,
      allocationsResult,
      suppliersResult,
      notificationsResult,
      projectsResult,
    ] = await Promise.all([
      supabase
        .from("schedule_items")
        .select("*, projects(project_name, customer_id)")
        .eq("user_id", user.id)
        .order("scheduled_start", { ascending: true })
        .limit(300),
      supabase
        .from("tasks")
        .select("*, projects(project_name, customer_id)")
        .eq("user_id", user.id)
        .or(
          `due_date.eq.${todayKey},and(due_date.lt.${todayKey},due_date.gte.${lookbackKey},status.neq.completed)`
        ),
      supabase
        .from("material_orders")
        .select("*")
        .eq("user_id", user.id)
        .or(
          `and(availability_date.lte.${todayKey},availability_date.gte.${lookbackKey}),and(required_by_date.lte.${todayKey},required_by_date.gte.${lookbackKey})`
        ),
      supabase
        .from("supplier_invoices")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .lte("due_date", todayKey)
        .gte("due_date", lookbackKey),
      supabase
        .from("supplier_payment_allocations")
        .select("*")
        .eq("user_id", user.id),
      supabase
        .from("suppliers")
        .select("id, supplier_name")
        .eq("user_id", user.id),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("projects")
        .select(
          "id, project_name, customer_id, status, customers(first_name, last_name)"
        )
        .eq("user_id", user.id)
        .in("status", ["active", "on_hold"])
        .order("project_name", { ascending: true })
        .limit(100),
    ]);

    if (scheduleResult.error) {
      console.error(
        "[Today] schedule_items query failed (run migration 041?):",
        scheduleResult.error.message
      );
    }
    if (tasksResult.error) {
      console.error("[Today] tasks query failed:", tasksResult.error.message);
    }
    if (materialsResult.error) {
      console.error(
        "[Today] material_orders query failed:",
        materialsResult.error.message
      );
    }
    if (invoicesResult.error) {
      console.error(
        "[Today] supplier_invoices query failed:",
        invoicesResult.error.message
      );
    }

    scheduleItems = ((scheduleResult.data as ScheduleRow[] | null) ?? [])
      .map((row) => {
        const { projects, ...item } = row;
        return {
          ...item,
          customer_id: item.customer_id ?? projects?.customer_id ?? null,
        } satisfies ScheduleItem;
      })
      .filter((row) => {
        if (!row.scheduled_start) return Boolean(row.all_day);
        const t = new Date(row.scheduled_start).getTime();
        if (Number.isNaN(t)) return false;
        return t >= weekStartMs && t < weekEndMs;
      });

    projectTasks = ((tasksResult.data as TaskRow[] | null) ?? []).map((row) => {
      const { projects, ...task } = row;
      return {
        ...task,
        project_name: projects?.project_name ?? null,
        customer_id: projects?.customer_id ?? null,
      };
    });

    materialOrders = (materialsResult.data as MaterialOrder[] | null) ?? [];

    const supplierNames = Object.fromEntries(
      (
        (suppliersResult.data as
          | { id: string; supplier_name: string }[]
          | null) ?? []
      ).map((row) => [row.id, row.supplier_name])
    );

    const invoiceRows =
      (invoicesResult.data as SupplierInvoiceRow[] | null) ?? [];
    const allocations =
      (allocationsResult.data as SupplierPaymentAllocationRow[] | null) ?? [];

    const enriched = enrichSupplierInvoices({
      invoices: invoiceRows,
      allocations,
      today: todayKey,
    });

    invoicesDue = enriched.map((inv) => {
      const raw = invoiceRows.find((row) => row.id === inv.id)!;
      return {
        ...raw,
        supplier_name: supplierNames[raw.supplier_id] ?? null,
        balance: inv.balance,
      };
    });

    notifications =
      (notificationsResult.data as AppNotification[] | null) ?? [];

    if (projectsResult.error) {
      console.error(
        "[Today] projects query failed:",
        projectsResult.error.message
      );
    }

    projects = ((projectsResult.data as ProjectRow[] | null) ?? []).map(
      (row) => {
        const first = row.customers?.first_name?.trim() ?? "";
        const last = row.customers?.last_name?.trim() ?? "";
        const customerName = `${first} ${last}`.trim() || null;
        return {
          id: row.id,
          projectName: row.project_name?.trim() || "Untitled project",
          customerId: row.customer_id,
          customerName,
          status: row.status || "active",
        } satisfies TodayVoiceProjectCandidate;
      }
    );
  }

  const agenda = buildTodayAgenda({
    now,
    timeZone,
    dateKey: todayKey,
    greetingName,
    scheduleItems,
    projectTasks,
    materialOrders,
    invoicesDue,
    notifications,
  });

  return (
    <TodayPage
      agenda={agenda}
      scheduleItems={scheduleItems}
      projects={projects}
      userId={user?.id ?? ""}
    />
  );
}
