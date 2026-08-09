import type { Metadata } from "next";
import { TodayPage } from "@/components/today/today-page";
import {
  enrichSupplierInvoices,
  type SupplierInvoiceRow,
  type SupplierPaymentAllocationRow,
} from "@/lib/supplier-accounting";
import { buildTodayAgenda, toLocalDateKey } from "@/lib/today-agenda";
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

export default async function TodayRoute() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const todayKey = toLocalDateKey(new Date());
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekStartKey = toLocalDateKey(weekStart);
  const weekEndKey = toLocalDateKey(weekEnd);

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
    ] = await Promise.all([
      supabase
        .from("schedule_items")
        .select("*")
        .eq("user_id", user.id)
        .order("scheduled_start", { ascending: true })
        .limit(300),
      supabase
        .from("tasks")
        .select("*, projects(project_name, customer_id)")
        .eq("user_id", user.id)
        .gte("due_date", weekStartKey)
        .lt("due_date", weekEndKey),
      supabase
        .from("material_orders")
        .select("*")
        .eq("user_id", user.id)
        .or(
          `availability_date.eq.${todayKey},required_by_date.eq.${todayKey}`
        ),
      supabase
        .from("supplier_invoices")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .eq("due_date", todayKey),
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
        .order("created_at", { ascending: false })
        .limit(12),
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

    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekEnd.getTime();
    scheduleItems = ((scheduleResult.data as ScheduleItem[] | null) ?? []).filter(
      (row) => {
        if (!row.scheduled_start) return Boolean(row.all_day);
        const t = new Date(row.scheduled_start).getTime();
        if (Number.isNaN(t)) return false;
        return t >= weekStartMs && t < weekEndMs;
      }
    );

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
  }

  const agenda = buildTodayAgenda({
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
      userId={user?.id ?? ""}
    />
  );
}
