import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCustomerProjectFinancials,
  rollupCustomerOutstanding,
  type CustomerProjectFinancial,
} from "@/lib/customer-financials";
import type { MaterialOrder } from "@/types/material-order";
import {
  isProjectStatus,
  resolveProjectDisplayName,
  type Project,
} from "@/types/project";
import {
  isChangeOrderStatus,
  isCostPaymentStatus,
  isExpenseBillingStatus,
  isExpenseKind,
  type ChangeOrder,
  type ProjectExpense,
  type ProjectPayment,
  type TimeEntry,
} from "@/types/project-operations";

type ProjectRow = Project & {
  quotes?: {
    project_name?: string | null;
    quote_number?: string | null;
  } | null;
};

function normalizeExpense(row: ProjectExpense): ProjectExpense {
  const billing = String(row.billing_status ?? "");
  const kind = String(row.expense_kind ?? "");
  const payment = String(row.payment_status ?? "");
  return {
    ...row,
    amount: Number(row.amount) || 0,
    billing_status: isExpenseBillingStatus(billing)
      ? billing
      : "pending_review",
    expense_kind: isExpenseKind(kind) ? kind : "extra_purchase",
    payment_status: isCostPaymentStatus(payment) ? payment : "unpaid",
  };
}

function normalizeTimeEntry(row: TimeEntry): TimeEntry {
  const payment = String(row.payment_status ?? "");
  return {
    ...row,
    hours: Number(row.hours) || 0,
    payment_status: isCostPaymentStatus(payment) ? payment : "unpaid",
  };
}

function normalizeChangeOrder(row: ChangeOrder): ChangeOrder {
  const status = row.status as string;
  return {
    ...row,
    amount: Number(row.amount) || 0,
    status: isChangeOrderStatus(status) ? status : "pending",
  };
}

function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type CustomerFinancialRollup = {
  customerId: string;
  projectCount: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    status: string;
    contractValue: number;
    customerPayments: number;
    outstandingCustomerBalance: number;
    totalProjectCost: number;
    grossProfit: number;
    paymentStatus: "paid" | "partial" | "outstanding" | "overpaid";
  }>;
  /** Same rollup as Customer Detail Financial tab. */
  totals: {
    contractValue: number;
    customerPayments: number;
    outstanding: number;
    totalCosts: number;
    grossProfit: number;
  };
  /** Same as rollupCustomerOutstanding (null when nothing owed). */
  outstanding: {
    totalOutstanding: number;
    projectCount: number;
  } | null;
};

function paymentStatusFor(
  row: CustomerProjectFinancial
): CustomerFinancialRollup["projects"][number]["paymentStatus"] {
  if (row.outstandingCustomerBalance < 0) return "overpaid";
  if (row.outstandingCustomerBalance === 0) return "paid";
  if (row.customerPayments > 0) return "partial";
  return "outstanding";
}

function rollupTotals(financials: CustomerProjectFinancial[]) {
  return financials.reduce(
    (acc, row) => ({
      contractValue: acc.contractValue + row.contractValue,
      customerPayments: acc.customerPayments + row.customerPayments,
      outstanding: acc.outstanding + Math.max(0, row.outstandingCustomerBalance),
      totalCosts: acc.totalCosts + row.totalProjectCost,
      grossProfit: acc.grossProfit + row.grossProfit,
    }),
    {
      contractValue: 0,
      customerPayments: 0,
      outstanding: 0,
      totalCosts: 0,
      grossProfit: 0,
    }
  );
}

/**
 * Load customer financials using the same queries + aggregation as
 * Customer Detail (`buildCustomerProjectFinancials` / `rollupCustomerOutstanding`).
 */
export async function loadCustomerFinancialRollup(
  supabase: SupabaseClient,
  userId: string,
  customerId: string
): Promise<
  { ok: true; data: CustomerFinancialRollup } | { ok: false; error: string }
> {
  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select("*, quotes(project_name, quote_number)")
    .eq("user_id", userId)
    .eq("customer_id", customerId)
    .order("start_date", { ascending: false });

  if (projectsError) {
    return {
      ok: false,
      error: `Failed to load customer projects: ${projectsError.message}`,
    };
  }

  const rawRows = (projectRows as ProjectRow[] | null) ?? [];
  const projects: Project[] = rawRows.map((row) => {
    const { quotes, ...project } = row;
    return {
      ...project,
      project_name: resolveProjectDisplayName(row.project_name, quotes),
      status: isProjectStatus(row.status) ? row.status : "active",
      value: Number(row.value) || 0,
      deposit_amount: Number(row.deposit_amount) || 0,
    };
  });

  const projectIds = projects.map((p) => p.id).filter(Boolean);

  let paymentRows: ProjectPayment[] = [];
  let expenseRows: ProjectExpense[] = [];
  let materialOrderRows: MaterialOrder[] = [];
  let timeEntryRows: TimeEntry[] = [];
  let changeOrderRows: ChangeOrder[] = [];

  if (projectIds.length > 0) {
    const [
      paymentsResult,
      expensesResult,
      ordersResult,
      timeResult,
      changeOrdersResult,
    ] = await Promise.all([
      supabase
        .from("project_payments")
        .select("*")
        .eq("user_id", userId)
        .in("project_id", projectIds)
        .order("payment_date", { ascending: false }),
      supabase
        .from("project_expenses")
        .select("*")
        .eq("user_id", userId)
        .in("project_id", projectIds),
      supabase
        .from("material_orders")
        .select("*")
        .eq("user_id", userId)
        .in("project_id", projectIds),
      supabase
        .from("time_entries")
        .select("*, employees(id, full_name, role, pay_rate, pay_type)")
        .eq("user_id", userId)
        .in("project_id", projectIds),
      supabase
        .from("change_orders")
        .select("*")
        .eq("user_id", userId)
        .in("project_id", projectIds),
    ]);

    if (paymentsResult.error) {
      return {
        ok: false,
        error: `Failed to load project payments: ${paymentsResult.error.message}`,
      };
    }
    if (expensesResult.error) {
      return {
        ok: false,
        error: `Failed to load project expenses: ${expensesResult.error.message}`,
      };
    }
    if (ordersResult.error) {
      return {
        ok: false,
        error: `Failed to load material orders: ${ordersResult.error.message}`,
      };
    }
    if (timeResult.error) {
      return {
        ok: false,
        error: `Failed to load time entries: ${timeResult.error.message}`,
      };
    }
    if (changeOrdersResult.error) {
      return {
        ok: false,
        error: `Failed to load change orders: ${changeOrdersResult.error.message}`,
      };
    }

    paymentRows = ((paymentsResult.data as ProjectPayment[] | null) ?? []).map(
      (row) => ({ ...row, amount: Number(row.amount) || 0 })
    );
    expenseRows = ((expensesResult.data as ProjectExpense[] | null) ?? []).map(
      (row) => normalizeExpense(row)
    );
    materialOrderRows = (ordersResult.data as MaterialOrder[] | null) ?? [];
    timeEntryRows = ((timeResult.data as TimeEntry[] | null) ?? []).map((row) =>
      normalizeTimeEntry(row)
    );
    changeOrderRows = (
      (changeOrdersResult.data as ChangeOrder[] | null) ?? []
    ).map((row) => normalizeChangeOrder(row));
  }

  const financials = buildCustomerProjectFinancials({
    projects,
    payments: paymentRows,
    expenses: expenseRows,
    materialOrders: materialOrderRows,
    timeEntries: timeEntryRows,
    changeOrders: changeOrderRows,
  });

  const outstanding = rollupCustomerOutstanding(financials);
  const totals = rollupTotals(financials);

  return {
    ok: true,
    data: {
      customerId,
      projectCount: financials.length,
      projects: financials.map((row) => ({
        projectId: row.projectId,
        projectName: row.projectName,
        status: row.status,
        contractValue: money(row.contractValue),
        customerPayments: money(row.customerPayments),
        outstandingCustomerBalance: money(row.outstandingCustomerBalance),
        totalProjectCost: money(row.totalProjectCost),
        grossProfit: money(row.grossProfit),
        paymentStatus: paymentStatusFor(row),
      })),
      totals: {
        contractValue: money(totals.contractValue),
        customerPayments: money(totals.customerPayments),
        outstanding: money(totals.outstanding),
        totalCosts: money(totals.totalCosts),
        grossProfit: money(totals.grossProfit),
      },
      outstanding: outstanding
        ? {
            totalOutstanding: money(outstanding.totalOutstanding),
            projectCount: outstanding.projectCount,
          }
        : null,
    },
  };
}
