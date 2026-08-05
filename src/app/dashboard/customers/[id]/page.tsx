import type { Metadata } from "next";
import Link from "next/link";
import { CustomerDetailsPage } from "@/components/customers/customer-details-page";
import { buildMockCustomerDetails } from "@/lib/customer-details-mock";
import {
  buildCustomerPaymentList,
  buildCustomerProjectFinancials,
  rollupCustomerOutstanding,
} from "@/lib/customer-financials";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDisplayName, type Customer } from "@/types/customer";
import type { MaterialOrder } from "@/types/material-order";
import {
  isPlaceholderProjectName,
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

export const metadata: Metadata = {
  title: "Customer Details",
};

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

export default async function CustomerDetailsRoute({
  params,
}: {
  params: { id: string };
}) {
  const customerId = params.id?.trim() ?? "";
  const supabase = createClient();

  let customerRow: Customer | null = null;

  if (customerId) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();
    customerRow = (data as Customer | null) ?? null;
  }

  if (!customerRow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Customer not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          This customer may have been deleted, or the link is invalid.
        </p>
        <Link
          href="/dashboard/customers"
          className="mt-6 text-sm font-semibold text-accent hover:text-blue-400"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select("*, quotes(project_name, quote_number)")
    .eq("customer_id", customerRow.id)
    .order("start_date", { ascending: false });

  if (projectsError) {
    console.error(
      "[CustomerDetails] projects query failed (run migration 018/019?):",
      projectsError.message
    );
  }

  const rawRows = (projectRows as ProjectRow[] | null) ?? [];

  // Backfill placeholder project names from the linked quote when available.
  for (const row of rawRows) {
    const displayName = resolveProjectDisplayName(row.project_name, row.quotes);
    if (
      !row.id ||
      !isPlaceholderProjectName(row.project_name) ||
      isPlaceholderProjectName(displayName)
    ) {
      continue;
    }

    const { error: healError } = await supabase
      .from("projects")
      .update({
        project_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (healError) {
      console.error(
        "[CustomerDetails] failed to backfill project_name:",
        healError.message
      );
    } else {
      row.project_name = displayName;
    }
  }

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
        .in("project_id", projectIds)
        .order("payment_date", { ascending: false }),
      supabase
        .from("project_expenses")
        .select("*")
        .in("project_id", projectIds),
      supabase
        .from("material_orders")
        .select("*")
        .in("project_id", projectIds),
      supabase
        .from("time_entries")
        .select("*, employees(id, full_name, role, pay_rate, pay_type)")
        .in("project_id", projectIds),
      supabase
        .from("change_orders")
        .select("*")
        .in("project_id", projectIds),
    ]);

    if (paymentsResult.error) {
      console.error(
        "[CustomerDetails] project_payments query failed:",
        paymentsResult.error.message
      );
    }
    if (expensesResult.error) {
      console.error(
        "[CustomerDetails] project_expenses query failed:",
        expensesResult.error.message
      );
    }
    if (ordersResult.error) {
      console.error(
        "[CustomerDetails] material_orders query failed:",
        ordersResult.error.message
      );
    }
    if (timeResult.error) {
      console.error(
        "[CustomerDetails] time_entries query failed:",
        timeResult.error.message
      );
    }
    if (changeOrdersResult.error) {
      console.error(
        "[CustomerDetails] change_orders query failed:",
        changeOrdersResult.error.message
      );
    }

    paymentRows = ((paymentsResult.data as ProjectPayment[] | null) ?? []).map(
      (row) => ({ ...row, amount: Number(row.amount) || 0 })
    );
    expenseRows = (
      (expensesResult.data as ProjectExpense[] | null) ?? []
    ).map((row) => normalizeExpense(row));
    materialOrderRows =
      (ordersResult.data as MaterialOrder[] | null) ?? [];
    timeEntryRows = ((timeResult.data as TimeEntry[] | null) ?? []).map(
      (row) => normalizeTimeEntry(row)
    );
    changeOrderRows = (
      (changeOrdersResult.data as ChangeOrder[] | null) ?? []
    ).map((row) => normalizeChangeOrder(row));
  }

  const projectFinancials = buildCustomerProjectFinancials({
    projects,
    payments: paymentRows,
    expenses: expenseRows,
    materialOrders: materialOrderRows,
    timeEntries: timeEntryRows,
    changeOrders: changeOrderRows,
  });

  const paymentList = buildCustomerPaymentList({
    projects,
    payments: paymentRows,
  });

  const outstanding = rollupCustomerOutstanding(projectFinancials);

  const details = buildMockCustomerDetails({
    id: customerRow.id,
    firstName: customerRow.first_name,
    lastName: customerRow.last_name,
    email: customerRow.email,
    phone: customerRow.phone,
    address: customerRow.address,
    notes: customerRow.notes,
    createdAt: customerRow.created_at,
  });

  details.fullName = getCustomerDisplayName(customerRow);
  details.counts.projects = projects.length;
  details.counts.financial = projects.length;
  details.counts.payments = paymentList.length;
  details.outstanding = outstanding;

  return (
    <CustomerDetailsPage
      customer={details}
      projects={projects}
      projectFinancials={projectFinancials}
      customerPayments={paymentList}
      addressPlaceholder={customerRow.address}
    />
  );
}
