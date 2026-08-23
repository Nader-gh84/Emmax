import { WorkspaceHome } from "@/components/dashboard/workspace-home";
import {
  customerInitials,
  emptyDashboardMetrics,
  endOfLocalDay,
  formatNextUpTime,
  localWeekBounds,
  startOfLocalDay,
  startOfUtcMonth,
  type DashboardCustomerPreview,
  type DashboardMetrics,
} from "@/lib/dashboard-metrics";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDisplayName } from "@/types/customer";
import { resolveProjectDisplayName } from "@/types/project";

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

async function countExact(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
  label: string
): Promise<number> {
  const { count, error } = await query;
  if (error) {
    console.error(`[Dashboard] ${label} failed:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metrics: DashboardMetrics = emptyDashboardMetrics();
  let firstName = "there";

  if (user) {
    const monthStartIso = startOfUtcMonth().toISOString();
    const dayStart = startOfLocalDay();
    const dayEnd = endOfLocalDay();
    const week = localWeekBounds();

    const [
      profileResult,
      customersTotal,
      customersNewThisMonth,
      suppliersTotal,
      quotesTotal,
      projectsActive,
      projectsOnHold,
      projectsCompleted,
      employeesTotal,
      ordersOpen,
      scheduleToday,
      scheduleThisWeek,
      nextUpResult,
      recentCustomersResult,
      openProjectsResult,
    ] = await Promise.all([
      supabase
        .from("business_profiles")
        .select(
          "full_name, default_tax_rate, default_validity_days, onboarding_completed"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      countExact(
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        "customers total"
      ),
      countExact(
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", monthStartIso),
        "customers new this month"
      ),
      countExact(
        supabase
          .from("suppliers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        "suppliers total"
      ),
      countExact(
        supabase
          .from("quotes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        "quotes total"
      ),
      countExact(
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active"),
        "projects active"
      ),
      countExact(
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "on_hold"),
        "projects on hold"
      ),
      countExact(
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed"),
        "projects completed"
      ),
      countExact(
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        "employees total"
      ),
      countExact(
        supabase
          .from("material_orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "sent"),
        "orders open"
      ),
      countExact(
        supabase
          .from("schedule_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("scheduled_start", dayStart.toISOString())
          .lte("scheduled_start", dayEnd.toISOString())
          .neq("status", "cancelled"),
        "schedule today"
      ),
      countExact(
        supabase
          .from("schedule_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("scheduled_start", week.start.toISOString())
          .lte("scheduled_start", week.end.toISOString())
          .neq("status", "cancelled"),
        "schedule this week"
      ),
      supabase
        .from("schedule_items")
        .select("scheduled_start")
        .eq("user_id", user.id)
        .gte("scheduled_start", new Date().toISOString())
        .lte("scheduled_start", dayEnd.toISOString())
        .neq("status", "cancelled")
        .order("scheduled_start", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("customers")
        .select(
          "id, first_name, last_name, email, phone, address, created_at, projects(id, project_name, status, quotes(project_name, quote_number))"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("projects")
        .select("customer_id, status")
        .eq("user_id", user.id)
        .in("status", ["active", "in_progress", "on_hold"])
        .not("customer_id", "is", null),
    ]);

    firstName = getFirstName(
      profileResult.data?.full_name,
      user.email
    );

    metrics.customersTotal = customersTotal;
    metrics.customersNewThisMonth = customersNewThisMonth;
    metrics.suppliersTotal = suppliersTotal;
    metrics.quotesTotal = quotesTotal;
    metrics.projectsActive = projectsActive;
    metrics.projectsOnHold = projectsOnHold;
    metrics.projectsCompleted = projectsCompleted;
    metrics.employeesTotal = employeesTotal;
    metrics.ordersOpen = ordersOpen;
    metrics.scheduleToday = scheduleToday;
    metrics.scheduleThisWeek = scheduleThisWeek;
    metrics.nextUpLabel = formatNextUpTime(
      nextUpResult.data?.scheduled_start as string | undefined
    );

    const tax = Number(profileResult.data?.default_tax_rate);
    metrics.taxRateLabel = Number.isFinite(tax) ? `${tax}%` : "—";
    const validity = Number(profileResult.data?.default_validity_days);
    metrics.validityLabel = Number.isFinite(validity) ? `${validity}d` : "—";
    if (profileResult.data == null) {
      metrics.profileLabel = "—";
    } else {
      metrics.profileLabel = profileResult.data.onboarding_completed
        ? "Complete"
        : "Incomplete";
    }

    const activeCustomerIds = new Set<string>();
    for (const row of openProjectsResult.data ?? []) {
      if (row.customer_id) activeCustomerIds.add(row.customer_id as string);
    }
    metrics.customersActive = activeCustomerIds.size;

    if (recentCustomersResult.error) {
      console.error(
        "[Dashboard] recent customers failed:",
        recentCustomersResult.error.message
      );
    } else {
      const previews: DashboardCustomerPreview[] = (
        recentCustomersResult.data ?? []
      ).map((row) => {
        const name = getCustomerDisplayName({
          first_name: row.first_name ?? "",
          last_name: row.last_name ?? "",
        });
        const projects = (row.projects ?? []) as Array<{
          id: string;
          project_name: string | null;
          status: string;
          quotes?: {
            project_name?: string | null;
            quote_number?: string | null;
          } | null;
        }>;
        const open = projects.find((p) =>
          ["active", "in_progress", "on_hold"].includes(p.status)
        );
        const latest = open ?? projects[0] ?? null;
        const projectLabel = latest
          ? resolveProjectDisplayName(latest.project_name, latest.quotes)
          : null;
        const isActive = projects.some((p) =>
          ["active", "in_progress", "on_hold"].includes(p.status)
        );

        return {
          id: row.id as string,
          name: name || "Customer",
          email: (row.email as string | null) ?? null,
          phone: (row.phone as string | null) ?? null,
          location: (row.address as string | null)?.trim() || null,
          projectLabel,
          status: isActive ? "Active" : "Inactive",
          initials: customerInitials(name || "Customer"),
          href: `/dashboard/customers/${row.id}`,
        };
      });
      metrics.recentCustomers = previews;
    }
  }

  return <WorkspaceHome firstName={firstName} metrics={metrics} />;
}
