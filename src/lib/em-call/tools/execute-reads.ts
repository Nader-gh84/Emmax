import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enrichSupplierInvoices,
  enrichSupplierPayments,
  computeSupplierAccountSummary,
  type SupplierInvoiceRow,
  type SupplierPaymentAllocationRow,
  type SupplierPaymentRow,
} from "@/lib/supplier-accounting";
import {
  USER_TIMEZONE_COOKIE,
  addDaysToDateKey,
  isValidTimeZone,
  toZonedDateKey,
} from "@/lib/local-date";
import { buildTodayAgenda, formatAgendaTime, buildDailySummarySentence } from "@/lib/today-agenda";
import { getCustomerDisplayName } from "@/types/customer";
import { resolveProjectDisplayName } from "@/types/project";
import {
  computeFinancialSummary,
  computeTaskCompletionPercent,
  type ProjectExpense,
  type ProjectPayment,
  type ProjectTask,
  type TimeEntry,
} from "@/types/project-operations";
import type { MaterialOrder } from "@/types/material-order";
import type { ScheduleItem } from "@/types/schedule-item";
import type { AppNotification } from "@/types/notification";
import type { EmCallReadToolName } from "@/lib/em-call/tools/definitions";
import { loadCustomerFinancialRollup } from "@/lib/em-call/tools/customer-financial-rollup";
import { formatSupabaseError } from "@/lib/em-call/tool-log";
import {
  resolveEntityQuery,
  type EntityCandidate,
  type EntityKind,
} from "@/lib/entity-resolve";

type ToolCtx = {
  supabase: SupabaseClient;
  userId: string;
};

function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Models often pass project_id/customer_id instead of the schema's `id`. */
function resolveScopedId(
  args: Record<string, unknown>,
  scope: string
): { id: string; source: string; receivedKeys: string[] } {
  const receivedKeys = Object.keys(args);
  const asString = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  const direct = asString(args.id);
  if (direct) return { id: direct, source: "id", receivedKeys };

  if (scope === "project") {
    const projectId = asString(args.project_id);
    if (projectId) {
      return { id: projectId, source: "project_id", receivedKeys };
    }
  }
  if (scope === "customer") {
    const customerId = asString(args.customer_id);
    if (customerId) {
      return { id: customerId, source: "customer_id", receivedKeys };
    }
  }
  if (scope === "supplier") {
    const supplierId = asString(args.supplier_id);
    if (supplierId) {
      return { id: supplierId, source: "supplier_id", receivedKeys };
    }
  }

  return { id: "", source: "missing", receivedKeys };
}

function toolError(
  message: string,
  extras?: Record<string, unknown>
): { error: string; debug: Record<string, unknown> } {
  return { error: message, debug: extras ?? {} };
}

function resolveUserTimeZone(): string {
  const raw = cookies().get(USER_TIMEZONE_COOKIE)?.value;
  const tz = raw ? decodeURIComponent(raw) : null;
  if (isValidTimeZone(tz)) return tz;
  return "UTC";
}

async function loadEntityCandidates(
  ctx: ToolCtx,
  kind: EntityKind
): Promise<EntityCandidate[]> {
  if (kind === "customer") {
    const { data } = await ctx.supabase
      .from("customers")
      .select("id, first_name, last_name, email")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []).map((row) => ({
      id: String(row.id),
      kind,
      label: getCustomerDisplayName({
        first_name: String(row.first_name ?? ""),
        last_name: String(row.last_name ?? ""),
      }),
      meta: row.email ? String(row.email) : null,
    }));
  }

  if (kind === "supplier") {
    const { data } = await ctx.supabase
      .from("suppliers")
      .select("id, supplier_name, contact_person")
      .eq("user_id", ctx.userId)
      .order("supplier_name", { ascending: true })
      .limit(200);
    return (data ?? []).map((row) => ({
      id: String(row.id),
      kind,
      label: String(row.supplier_name ?? ""),
      meta: row.contact_person ? String(row.contact_person) : null,
    }));
  }

  if (kind === "employee") {
    const { data } = await ctx.supabase
      .from("employees")
      .select("id, full_name, role")
      .eq("user_id", ctx.userId)
      .order("full_name", { ascending: true })
      .limit(200);
    return (data ?? []).map((row) => ({
      id: String(row.id),
      kind,
      label: String(row.full_name ?? ""),
      meta: row.role ? String(row.role) : null,
    }));
  }

  // project
  const { data } = await ctx.supabase
    .from("projects")
    .select(
      "id, project_name, status, customers(first_name, last_name), quotes(project_name, quote_number)"
    )
    .eq("user_id", ctx.userId)
    .order("updated_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((row) => {
    const customers = row.customers as
      | { first_name?: string | null; last_name?: string | null }
      | { first_name?: string | null; last_name?: string | null }[]
      | null;
    const customer = Array.isArray(customers) ? customers[0] : customers;
    const customerName = customer
      ? getCustomerDisplayName({
          first_name: String(customer.first_name ?? ""),
          last_name: String(customer.last_name ?? ""),
        })
      : null;
    const quotes = row.quotes as
      | { project_name?: string | null; quote_number?: string | null }
      | { project_name?: string | null; quote_number?: string | null }[]
      | null;
    const quote = Array.isArray(quotes) ? quotes[0] : quotes;
    const label = resolveProjectDisplayName(String(row.project_name ?? ""), quote);
    return {
      id: String(row.id),
      kind: "project" as const,
      label,
      meta: [customerName, row.status].filter(Boolean).join(" · ") || null,
    };
  });
}

async function toolResolveEntity(
  ctx: ToolCtx,
  args: { kind?: string; query?: string; limit?: number }
) {
  const kindRaw = String(args.kind ?? "").trim();
  const query = String(args.query ?? "").trim();
  const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
  const allowed = ["customer", "supplier", "project", "employee", "any"] as const;

  if (!query || !(allowed as readonly string[]).includes(kindRaw)) {
    return { error: "kind and query are required" };
  }

  const kind = kindRaw as EntityKind | "any";
  const kindsToLoad: EntityKind[] =
    kind === "any"
      ? ["customer", "supplier", "project", "employee"]
      : [kind];

  const candidateLists = await Promise.all(
    kindsToLoad.map((k) => loadEntityCandidates(ctx, k))
  );
  const candidates = candidateLists.flat();

  // When a specific kind is weak, also score other kinds (e.g. project named after a person).
  let crossKindCandidates: EntityCandidate[] | undefined;
  if (kind !== "any") {
    const otherKinds = (
      ["customer", "supplier", "project", "employee"] as EntityKind[]
    ).filter((k) => k !== kind);
    const otherLists = await Promise.all(
      otherKinds.map((k) => loadEntityCandidates(ctx, k))
    );
    crossKindCandidates = otherLists.flat();
  }

  const resolved = resolveEntityQuery(query, candidates, {
    kind,
    optionLimit: limit,
    crossKindCandidates,
  });

  return {
    kind,
    query,
    needs_clarification: resolved.needs_clarification,
    reason: resolved.reason,
    clarification: resolved.clarification,
    match: resolved.match
      ? {
          id: resolved.match.id,
          kind: resolved.match.kind,
          label: resolved.match.label,
          meta: resolved.match.meta,
          score: resolved.match.score,
        }
      : null,
    options: resolved.options.map((o) => ({
      id: o.id,
      kind: o.kind,
      label: o.label,
      meta: o.meta,
      score: o.score,
    })),
    available:
      resolved.reason === "below_floor" || resolved.reason === "no_candidates"
        ? resolved.available.slice(0, 20).map((a) => ({
            id: a.id,
            kind: a.kind,
            label: a.label,
          }))
        : undefined,
  };
}

async function toolGetTodayAgenda(
  ctx: ToolCtx,
  args: { date_key?: string }
) {
  const timeZone = resolveUserTimeZone();
  const now = new Date();
  const todayKey = toZonedDateKey(now, timeZone);
  const dateKey =
    typeof args.date_key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date_key)
      ? args.date_key
      : todayKey;
  const lookbackKey = addDaysToDateKey(dateKey, -30);

  const [scheduleResult, tasksResult, materialsResult, notificationsResult] =
    await Promise.all([
      ctx.supabase
        .from("schedule_items")
        .select("*, projects(project_name, customer_id)")
        .eq("user_id", ctx.userId)
        .order("scheduled_start", { ascending: true })
        .limit(300),
      ctx.supabase
        .from("tasks")
        .select("*, projects(project_name, customer_id)")
        .eq("user_id", ctx.userId)
        .or(
          `due_date.eq.${dateKey},and(due_date.lt.${dateKey},due_date.gte.${lookbackKey},status.neq.completed)`
        ),
      ctx.supabase
        .from("material_orders")
        .select("*")
        .eq("user_id", ctx.userId)
        .or(
          `and(availability_date.lte.${dateKey},availability_date.gte.${lookbackKey}),and(required_by_date.lte.${dateKey},required_by_date.gte.${lookbackKey})`
        ),
      ctx.supabase
        .from("notifications")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const scheduleItems = (scheduleResult.data ?? []) as ScheduleItem[];
  const projectTasks = (tasksResult.data ?? []) as Array<
    ProjectTask & { project_name?: string | null; customer_id?: string | null }
  >;
  const materialOrders = (materialsResult.data ?? []) as MaterialOrder[];
  const notifications = (notificationsResult.data ?? []) as AppNotification[];

  const agenda = buildTodayAgenda({
    now,
    timeZone,
    dateKey,
    greetingName: "there",
    scheduleItems,
    projectTasks: projectTasks.map((t) => ({
      ...t,
      project_name:
        (t as { projects?: { project_name?: string | null } }).projects
          ?.project_name ?? t.project_name,
      customer_id:
        (t as { projects?: { customer_id?: string | null } }).projects
          ?.customer_id ?? t.customer_id,
    })),
    materialOrders,
    invoicesDue: [],
    notifications,
  });

  const openItems = agenda.items.filter(
    (i) => i.status !== "completed" && i.status !== "cancelled"
  );
  const next = openItems.find((i) => i.scheduledStart) ?? openItems[0] ?? null;

  return {
    dateKey: agenda.dateKey,
    timeZone,
    summary: buildDailySummarySentence(agenda.summary, timeZone),
    itemCount: agenda.items.length,
    openCount: openItems.length,
    next: next
      ? {
          title: next.title,
          timeLabel: formatAgendaTime(next.scheduledStart),
          taskType: next.taskType,
          subtitle: next.subtitle,
        }
      : null,
    items: openItems.slice(0, 12).map((i) => ({
      title: i.title,
      timeLabel: formatAgendaTime(i.scheduledStart),
      taskType: i.taskType,
      status: i.status,
      subtitle: i.subtitle,
      priority: i.priority,
    })),
  };
}

async function toolListProjects(
  ctx: ToolCtx,
  args: {
    status?: string;
    customer_id?: string;
    query?: string;
    limit?: number;
  }
) {
  const limit = Math.min(40, Math.max(1, Number(args.limit) || 20));
  let q = ctx.supabase
    .from("projects")
    .select(
      "id, project_name, status, value, customer_id, customers(first_name, last_name)"
    )
    .eq("user_id", ctx.userId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (args.customer_id) {
    q = q.eq("customer_id", args.customer_id);
  }

  if (args.status === "open") {
    q = q.in("status", ["active", "in_progress", "on_hold"]);
  } else if (
    args.status &&
    ["active", "in_progress", "completed", "on_hold"].includes(args.status)
  ) {
    q = q.eq("status", args.status);
  }

  const { data, error } = await q;
  if (error) return { error: error.message };

  let rows = data ?? [];
  if (args.query?.trim()) {
    const needle = args.query.trim().toLowerCase();
    rows = rows.filter((row) => {
      const customers = row.customers as
        | { first_name?: string; last_name?: string }
        | null;
      const name = resolveProjectDisplayName(String(row.project_name ?? ""));
      const customerName = customers
        ? getCustomerDisplayName({
            first_name: String(customers.first_name ?? ""),
            last_name: String(customers.last_name ?? ""),
          })
        : "";
      return (
        name.toLowerCase().includes(needle) ||
        customerName.toLowerCase().includes(needle)
      );
    });
  }

  return {
    projects: rows.slice(0, limit).map((row) => {
      const customers = row.customers as
        | { first_name?: string; last_name?: string }
        | null;
      return {
        id: row.id,
        name: resolveProjectDisplayName(String(row.project_name ?? "")),
        status: row.status,
        value: money(Number(row.value ?? 0)),
        customerId: row.customer_id,
        customerName: customers
          ? getCustomerDisplayName({
              first_name: String(customers.first_name ?? ""),
              last_name: String(customers.last_name ?? ""),
            })
          : null,
      };
    }),
  };
}

async function assertOwnedProject(ctx: ToolCtx, projectId: string) {
  // quotes.grand_total is the real column — NOT quotes.total (that select fails
  // the entire embed and was previously swallowed as "Project not found").
  const { data, error } = await ctx.supabase
    .from("projects")
    .select(
      "id, project_name, status, value, start_date, end_date, address, deposit_amount, customer_id, notes, customers(first_name, last_name), quotes(project_name, quote_number, grand_total)"
    )
    .eq("user_id", ctx.userId)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    return {
      project: null,
      error: `Failed to load project: ${formatSupabaseError(error)}`,
      supabase: {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
    };
  }
  if (!data) {
    return {
      project: null,
      error: "Project not found",
      supabase: null,
    };
  }
  return { project: data, error: null, supabase: null };
}

async function toolGetProject(ctx: ToolCtx, args: { project_id?: string }) {
  const projectId = String(args.project_id ?? "").trim();
  if (!projectId) return { error: "project_id is required" };

  const owned = await assertOwnedProject(ctx, projectId);
  if (owned.error || !owned.project) {
    return toolError(owned.error ?? "Project not found", {
      projectId,
      supabase: owned.supabase,
    });
  }
  const project = owned.project;

  const [tasksResult, assignmentsResult, timeResult] = await Promise.all([
    ctx.supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, assigned_employee_id, employees(full_name)")
      .eq("user_id", ctx.userId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    ctx.supabase
      .from("project_employees")
      .select("employee_id, employees(id, full_name, role)")
      .eq("project_id", projectId),
    ctx.supabase
      .from("time_entries")
      .select("hours, employees(full_name)")
      .eq("user_id", ctx.userId)
      .eq("project_id", projectId),
  ]);

  if (tasksResult.error) {
    return toolError(
      `Failed to load tasks: ${formatSupabaseError(tasksResult.error)}`,
      { supabase: tasksResult.error }
    );
  }
  if (assignmentsResult.error) {
    return toolError(
      `Failed to load project employees: ${formatSupabaseError(assignmentsResult.error)}`,
      { supabase: assignmentsResult.error }
    );
  }
  if (timeResult.error) {
    return toolError(
      `Failed to load time entries: ${formatSupabaseError(timeResult.error)}`,
      { supabase: timeResult.error }
    );
  }

  const tasks = (tasksResult.data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    priority?: string | null;
    due_date?: string | null;
    employees?: { full_name?: string } | null;
  }>;

  const openTasks = tasks.filter((t) => t.status !== "completed");
  const hoursLogged = (timeResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.hours ?? 0),
    0
  );

  const customers = project.customers as
    | { first_name?: string; last_name?: string }
    | null;
  const quotes = project.quotes as
    | {
        project_name?: string | null;
        quote_number?: string | null;
        grand_total?: number;
      }
    | null;

  return {
    id: project.id,
    name: resolveProjectDisplayName(String(project.project_name ?? ""), quotes),
    status: project.status,
    value: money(Number(project.value ?? quotes?.grand_total ?? 0)),
    startDate: project.start_date,
    endDate: project.end_date,
    address: project.address,
    customerName: customers
      ? getCustomerDisplayName({
          first_name: String(customers.first_name ?? ""),
          last_name: String(customers.last_name ?? ""),
        })
      : null,
    taskCompletionPercent: computeTaskCompletionPercent(tasks),
    openTaskCount: openTasks.length,
    openTasks: openTasks.slice(0, 10).map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority ?? null,
      dueDate: t.due_date ?? null,
      assignee: t.employees?.full_name ?? null,
    })),
    assignedEmployees: (assignmentsResult.data ?? []).map((row) => {
      const emp = row.employees as
        | { id?: string; full_name?: string; role?: string }
        | null;
      return {
        id: emp?.id ?? row.employee_id,
        name: emp?.full_name ?? "Employee",
        role: emp?.role ?? null,
      };
    }),
    hoursLogged: money(hoursLogged),
  };
}

async function toolGetCustomer(ctx: ToolCtx, args: { customer_id?: string }) {
  const customerId = String(args.customer_id ?? "").trim();
  if (!customerId) return { error: "customer_id is required" };

  const { data: customer, error: customerError } = await ctx.supabase
    .from("customers")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", customerId)
    .maybeSingle();

  if (customerError) {
    return { error: `Failed to load customer: ${customerError.message}` };
  }
  if (!customer) return { error: "Customer not found" };

  const rollup = await loadCustomerFinancialRollup(
    ctx.supabase,
    ctx.userId,
    customerId
  );
  if (!rollup.ok) return { error: rollup.error };

  const outstandingTotal = rollup.data.outstanding?.totalOutstanding ?? 0;
  const paymentStatus =
    outstandingTotal > 0
      ? "has_outstanding_balance"
      : rollup.data.totals.customerPayments > 0
        ? "paid_up"
        : rollup.data.projectCount > 0
          ? "no_payments_recorded"
          : "no_projects";

  return {
    id: customer.id,
    name: getCustomerDisplayName({
      first_name: String(customer.first_name ?? ""),
      last_name: String(customer.last_name ?? ""),
    }),
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    address: customer.address ?? null,
    customerType: customer.customer_type,
    paymentStatus,
    outstandingBalance: money(outstandingTotal),
    contractValue: rollup.data.totals.contractValue,
    customerPayments: rollup.data.totals.customerPayments,
    projects: rollup.data.projects.map((p) => ({
      id: p.projectId,
      name: p.projectName,
      status: p.status,
      value: p.contractValue,
      paymentStatus: p.paymentStatus,
      outstanding: p.outstandingCustomerBalance,
      paymentsReceived: p.customerPayments,
    })),
  };
}

async function toolGetSupplier(ctx: ToolCtx, args: { supplier_id?: string }) {
  const supplierId = String(args.supplier_id ?? "").trim();
  if (!supplierId) return { error: "supplier_id is required" };

  const { data: supplier, error: supplierError } = await ctx.supabase
    .from("suppliers")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", supplierId)
    .maybeSingle();

  if (supplierError) {
    return { error: `Failed to load supplier: ${supplierError.message}` };
  }
  if (!supplier) return { error: "Supplier not found" };

  const timeZone = resolveUserTimeZone();
  const todayKey = toZonedDateKey(new Date(), timeZone);

  const [invoicesResult, paymentsResult, allocationsResult] = await Promise.all([
    ctx.supabase
      .from("supplier_invoices")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("supplier_id", supplierId),
    ctx.supabase
      .from("supplier_payments")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("supplier_id", supplierId),
    ctx.supabase
      .from("supplier_payment_allocations")
      .select("*")
      .eq("user_id", ctx.userId),
  ]);

  if (invoicesResult.error) {
    return {
      error: `Failed to load supplier invoices: ${invoicesResult.error.message}`,
    };
  }
  if (paymentsResult.error) {
    return {
      error: `Failed to load supplier payments: ${paymentsResult.error.message}`,
    };
  }
  if (allocationsResult.error) {
    return {
      error: `Failed to load supplier payment allocations: ${allocationsResult.error.message}`,
    };
  }

  const invoices = enrichSupplierInvoices({
    invoices: (invoicesResult.data ?? []) as SupplierInvoiceRow[],
    allocations: (allocationsResult.data ?? []) as SupplierPaymentAllocationRow[],
    today: todayKey,
  });
  const payments = enrichSupplierPayments(
    (paymentsResult.data ?? []) as SupplierPaymentRow[]
  );
  const summary = computeSupplierAccountSummary({
    supplier: {
      credit_limit:
        supplier.credit_limit != null ? Number(supplier.credit_limit) : null,
      minimum_monthly_payment:
        supplier.minimum_monthly_payment != null
          ? Number(supplier.minimum_monthly_payment)
          : null,
    },
    invoices,
    payments,
    today: todayKey,
  });

  return {
    id: supplier.id,
    name: supplier.supplier_name,
    email: supplier.email,
    phone: supplier.phone,
    contactPerson: supplier.contact_person,
    location: supplier.location,
    outstandingBalance: money(summary.outstandingBalance),
    totalPurchases: money(summary.totalPurchases),
    totalPaid: money(summary.totalPaid),
    overdueAmount: money(summary.overdueAmount),
    invoiceCount: invoices.length,
    recentInvoices: invoices.slice(0, 5).map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      amount: money(inv.amount),
      dueDate: inv.dueDate,
      status: inv.status,
      balance: money(inv.balance),
    })),
  };
}

async function loadProjectFinancialInputs(ctx: ToolCtx, projectId: string) {
  const owned = await assertOwnedProject(ctx, projectId);
  if (owned.error || !owned.project) {
    return {
      ok: false as const,
      error: owned.error ?? "Project not found",
      supabase: owned.supabase,
    };
  }
  const project = owned.project;

  // Same source tables as Project Detail / Customer Detail Financial tab.
  const [payments, expenses, materialOrders, timeEntries, changeOrders] =
    await Promise.all([
      ctx.supabase
        .from("project_payments")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("project_id", projectId),
      ctx.supabase
        .from("project_expenses")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("project_id", projectId),
      ctx.supabase
        .from("material_orders")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("project_id", projectId),
      ctx.supabase
        .from("time_entries")
        .select("*, employees(id, full_name, role, pay_rate, pay_type)")
        .eq("user_id", ctx.userId)
        .eq("project_id", projectId),
      ctx.supabase
        .from("change_orders")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("project_id", projectId),
    ]);

  if (payments.error) {
    return {
      ok: false as const,
      error: `Failed to load project payments: ${formatSupabaseError(payments.error)}`,
      supabase: payments.error,
    };
  }
  if (expenses.error) {
    return {
      ok: false as const,
      error: `Failed to load project expenses: ${formatSupabaseError(expenses.error)}`,
      supabase: expenses.error,
    };
  }
  if (materialOrders.error) {
    return {
      ok: false as const,
      error: `Failed to load material orders: ${formatSupabaseError(materialOrders.error)}`,
      supabase: materialOrders.error,
    };
  }
  if (timeEntries.error) {
    return {
      ok: false as const,
      error: `Failed to load time entries: ${formatSupabaseError(timeEntries.error)}`,
      supabase: timeEntries.error,
    };
  }
  if (changeOrders.error) {
    return {
      ok: false as const,
      error: `Failed to load change orders: ${formatSupabaseError(changeOrders.error)}`,
      supabase: changeOrders.error,
    };
  }

  const quotes = project.quotes as { grand_total?: number } | null;
  const quoteAmount = Number(project.value ?? quotes?.grand_total ?? 0);

  return {
    ok: true as const,
    project,
    summary: computeFinancialSummary({
      quoteAmount,
      depositAmount: Number(project.deposit_amount ?? 0),
      payments: (payments.data ?? []) as ProjectPayment[],
      expenses: (expenses.data ?? []) as ProjectExpense[],
      materialOrders: (materialOrders.data ?? []) as MaterialOrder[],
      timeEntries: (timeEntries.data ?? []) as TimeEntry[],
      changeOrders: (changeOrders.data ?? []) as Array<{
        amount: number;
        status: string;
      }>,
    }),
  };
}

async function toolGetFinancialSummary(
  ctx: ToolCtx,
  args: Record<string, unknown>
) {
  const scope = String(args.scope ?? "").trim();
  const resolved = resolveScopedId(args, scope);
  const id = resolved.id;

  if (scope === "customer") {
    if (!id) {
      return toolError(
        "id (customer_id) is required for customer scope",
        { receivedKeys: resolved.receivedKeys, params: args }
      );
    }

    const { data: customer, error: customerError } = await ctx.supabase
      .from("customers")
      .select("id, first_name, last_name")
      .eq("user_id", ctx.userId)
      .eq("id", id)
      .maybeSingle();

    if (customerError) {
      return toolError(
        `Failed to load customer: ${formatSupabaseError(customerError)}`,
        { supabase: customerError, id, idSource: resolved.source }
      );
    }
    if (!customer) {
      return toolError("Customer not found", {
        id,
        idSource: resolved.source,
      });
    }

    const rollup = await loadCustomerFinancialRollup(
      ctx.supabase,
      ctx.userId,
      id
    );
    if (!rollup.ok) {
      return toolError(rollup.error, { id, idSource: resolved.source });
    }

    const customerName = getCustomerDisplayName({
      first_name: String(customer.first_name ?? ""),
      last_name: String(customer.last_name ?? ""),
    });

    return {
      scope: "customer",
      customerId: id,
      customerName,
      projectCount: rollup.data.projectCount,
      contractValue: rollup.data.totals.contractValue,
      customerPayments: rollup.data.totals.customerPayments,
      outstandingCustomerBalance: rollup.data.totals.outstanding,
      totalProjectCost: rollup.data.totals.totalCosts,
      grossProfit: rollup.data.totals.grossProfit,
      projectsWithBalance: rollup.data.outstanding?.projectCount ?? 0,
      projects: rollup.data.projects.map((p) => ({
        projectId: p.projectId,
        projectName: p.projectName,
        status: p.status,
        contractValue: p.contractValue,
        customerPayments: p.customerPayments,
        outstandingCustomerBalance: p.outstandingCustomerBalance,
        totalProjectCost: p.totalProjectCost,
        grossProfit: p.grossProfit,
        paymentStatus: p.paymentStatus,
      })),
    };
  }

  if (scope === "project") {
    if (!id) {
      return toolError(
        "id (project_id) is required for project scope",
        { receivedKeys: resolved.receivedKeys, params: args }
      );
    }
    const loaded = await loadProjectFinancialInputs(ctx, id);
    if (!loaded.ok) {
      return toolError(loaded.error, {
        id,
        idSource: resolved.source,
        supabase: loaded.supabase,
      });
    }
    const { project, summary } = loaded;
    const quotes = project.quotes as
      | { project_name?: string | null; quote_number?: string | null }
      | null;
    return {
      scope: "project",
      projectId: project.id,
      projectName: resolveProjectDisplayName(
        String(project.project_name ?? ""),
        quotes
      ),
      // Same fields Project Detail Financial Summary uses via computeFinancialSummary.
      contractValue: money(summary.contractValue),
      revisedContractValue: money(summary.revisedContractValue),
      customerPayments: money(summary.customerPayments),
      outstandingCustomerBalance: money(summary.outstandingCustomerBalance),
      unpaidSupplierCosts: money(summary.unpaidSupplierCosts),
      unpaidLabourCost: money(summary.unpaidLabourCost),
      accountsPayable: money(summary.accountsPayable),
      cashFlow: money(summary.cashFlow),
      grossProfit: money(summary.grossProfit),
      totalProjectCost: money(summary.totalProjectCost),
    };
  }

  if (scope === "supplier") {
    if (!id) {
      return toolError(
        "id (supplier_id) is required for supplier scope",
        { receivedKeys: resolved.receivedKeys, params: args }
      );
    }
    return toolGetSupplier(ctx, { supplier_id: id });
  }

  if (scope === "portfolio") {
    const { data: projects, error: projectsError } = await ctx.supabase
      .from("projects")
      .select("id, project_name, status, value")
      .eq("user_id", ctx.userId)
      .in("status", ["active", "in_progress", "on_hold"])
      .limit(40);

    if (projectsError) {
      return toolError(
        `Failed to load projects: ${formatSupabaseError(projectsError)}`,
        { supabase: projectsError }
      );
    }

    let outstandingCustomer = 0;
    let unpaidSupplier = 0;
    let unpaidLabour = 0;
    let grossProfit = 0;
    const projectSummaries: Array<{
      id: string;
      name: string;
      outstandingCustomerBalance: number;
      grossProfit: number;
    }> = [];
    const loadErrors: string[] = [];

    for (const p of projects ?? []) {
      const loaded = await loadProjectFinancialInputs(ctx, String(p.id));
      if (!loaded.ok) {
        loadErrors.push(`${p.id}: ${loaded.error}`);
        continue;
      }
      outstandingCustomer += loaded.summary.outstandingCustomerBalance;
      unpaidSupplier += loaded.summary.unpaidSupplierCosts;
      unpaidLabour += loaded.summary.unpaidLabourCost;
      grossProfit += loaded.summary.grossProfit;
      projectSummaries.push({
        id: String(p.id),
        name: resolveProjectDisplayName(String(p.project_name ?? "")),
        outstandingCustomerBalance: money(
          loaded.summary.outstandingCustomerBalance
        ),
        grossProfit: money(loaded.summary.grossProfit),
      });
    }

    if ((projects ?? []).length > 0 && projectSummaries.length === 0) {
      return toolError(
        `Failed to load portfolio financials: ${loadErrors[0] ?? "unknown error"}`,
        { loadErrors }
      );
    }

    return {
      scope: "portfolio",
      openProjectCount: (projects ?? []).length,
      outstandingCustomerBalance: money(outstandingCustomer),
      unpaidSupplierCosts: money(unpaidSupplier),
      unpaidLabourCost: money(unpaidLabour),
      accountsPayable: money(unpaidSupplier + unpaidLabour),
      grossProfit: money(grossProfit),
      projects: projectSummaries.slice(0, 12),
    };
  }

  return toolError("scope must be customer, project, supplier, or portfolio", {
    receivedScope: scope,
    params: args,
  });
}

export async function executeEmCallReadTool(
  ctx: ToolCtx,
  name: EmCallReadToolName,
  rawArgs: string
): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { error: "Invalid tool arguments JSON" };
  }

  switch (name) {
    case "resolve_entity":
      return toolResolveEntity(ctx, args as { kind?: string; query?: string; limit?: number });
    case "get_today_agenda":
      return toolGetTodayAgenda(ctx, args as { date_key?: string });
    case "list_projects":
      return toolListProjects(
        ctx,
        args as {
          status?: string;
          customer_id?: string;
          query?: string;
          limit?: number;
        }
      );
    case "get_project":
      return toolGetProject(ctx, args as { project_id?: string });
    case "get_customer":
      return toolGetCustomer(ctx, args as { customer_id?: string });
    case "get_supplier":
      return toolGetSupplier(ctx, args as { supplier_id?: string });
    case "get_financial_summary":
      return toolGetFinancialSummary(ctx, args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
