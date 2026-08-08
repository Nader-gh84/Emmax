import type { Metadata } from "next";
import Link from "next/link";
import { EmployeeDetailsPage } from "@/components/employees/employee-details-page";
import { buildEmployeeDetailsViewModel } from "@/lib/employee-details";
import { ensureLabourInvoiceForTimeEntry } from "@/lib/labour-invoice";
import type {
  LabourInvoiceRow,
  LabourPaymentAllocationRow,
  LabourPaymentRow,
} from "@/lib/labour-accounting";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/types/employee";
import { isEmployeePayPeriodType, isEmployeePayType } from "@/types/employee";

export const metadata: Metadata = {
  title: "Employee Details",
};

type InvoiceQueryRow = LabourInvoiceRow & {
  projects?: {
    project_name?: string | null;
  } | null;
};

function normalizeEmployee(row: Record<string, unknown>): Employee {
  const payType = String(row.pay_type ?? "hourly");
  const payPeriod = String(row.pay_period_type ?? "biweekly");
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    full_name: String(row.full_name ?? ""),
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    role: (row.role as string | null) ?? null,
    hire_date: (row.hire_date as string | null) ?? null,
    pay_rate:
      row.pay_rate == null || row.pay_rate === ""
        ? null
        : Number(row.pay_rate) || 0,
    pay_type: isEmployeePayType(payType) ? payType : "hourly",
    pay_period_type: isEmployeePayPeriodType(payPeriod)
      ? payPeriod
      : "biweekly",
    address_street: (row.address_street as string | null) ?? null,
    address_city: (row.address_city as string | null) ?? null,
    address_province: (row.address_province as string | null) ?? null,
    address_postal: (row.address_postal as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export default async function EmployeeDetailsRoute({
  params,
}: {
  params: { id: string };
}) {
  const employeeId = params.id?.trim() ?? "";
  const supabase = createClient();

  let employeeRow: Employee | null = null;

  if (employeeId) {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .maybeSingle();
    employeeRow = data
      ? normalizeEmployee(data as Record<string, unknown>)
      : null;
  }

  if (!employeeRow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Employee not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          This employee may have been deleted, or the link is invalid.
        </p>
        <Link
          href="/dashboard/settings?section=employees"
          className="mt-6 text-sm font-semibold text-accent hover:text-blue-400"
        >
          Back to Employees
        </Link>
      </div>
    );
  }

  // Backfill: attach unlinked hourly time entries to pay-period invoices.
  const { data: timeEntries, error: timeEntriesError } = await supabase
    .from("time_entries")
    .select("id")
    .eq("employee_id", employeeRow.id);

  if (timeEntriesError) {
    console.error(
      "[EmployeeDetails] time_entries query failed:",
      timeEntriesError.message
    );
  }

  const entryIds = ((timeEntries as { id: string }[] | null) ?? []).map(
    (row) => row.id
  );

  if (entryIds.length > 0) {
    const { data: linkedRows } = await supabase
      .from("labour_invoice_time_entries")
      .select("time_entry_id")
      .in("time_entry_id", entryIds);

    const linked = new Set(
      (
        (linkedRows as { time_entry_id: string }[] | null) ?? []
      ).map((row) => row.time_entry_id)
    );

    const missing = entryIds.filter((id) => !linked.has(id));
    for (const entryId of missing) {
      await ensureLabourInvoiceForTimeEntry(supabase, entryId);
    }
  }

  const [
    { data: invoiceData, error: invoicesError },
    { data: paymentData, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from("labour_invoices")
      .select("*, projects(project_name)")
      .eq("employee_id", employeeRow.id)
      .order("invoice_date", { ascending: false }),
    supabase
      .from("labour_payments")
      .select("*")
      .eq("employee_id", employeeRow.id)
      .order("payment_date", { ascending: false }),
  ]);

  if (invoicesError) {
    console.error(
      "[EmployeeDetails] labour_invoices query failed (run migration 037?):",
      invoicesError.message
    );
  }
  if (paymentsError) {
    console.error(
      "[EmployeeDetails] labour_payments query failed (run migration 037?):",
      paymentsError.message
    );
  }

  const invoiceRows = (invoiceData as InvoiceQueryRow[] | null) ?? [];
  const paymentRows = ((paymentData as LabourPaymentRow[] | null) ?? []).map(
    (row) => ({ ...row, amount: Number(row.amount) || 0 })
  );

  const invoiceIds = invoiceRows.map((row) => row.id);
  let allocationRows: LabourPaymentAllocationRow[] = [];
  if (invoiceIds.length > 0) {
    const { data: allocationData, error: allocationsError } = await supabase
      .from("labour_payment_allocations")
      .select("*")
      .in("labour_invoice_id", invoiceIds);

    if (allocationsError) {
      console.error(
        "[EmployeeDetails] labour_payment_allocations query failed:",
        allocationsError.message
      );
    }
    allocationRows = (
      (allocationData as LabourPaymentAllocationRow[] | null) ?? []
    ).map((row) => ({
      ...row,
      amount_applied: Number(row.amount_applied) || 0,
    }));
  }

  const projectNames: Record<string, string> = {};
  for (const row of invoiceRows) {
    if (!row.project_id) continue;
    const name = row.projects?.project_name?.trim();
    projectNames[row.project_id] = name || "Untitled project";
  }

  const invoices: LabourInvoiceRow[] = invoiceRows.map((row) => {
    const { projects: _projects, ...invoice } = row;
    return {
      ...invoice,
      amount: Number(invoice.amount) || 0,
      status:
        invoice.status === "confirmed" ? "confirmed" : "pending_confirmation",
    };
  });

  const details = buildEmployeeDetailsViewModel({
    employee: employeeRow,
    invoices,
    payments: paymentRows,
    allocations: allocationRows,
    projectNames,
  });

  return <EmployeeDetailsPage employee={details} />;
}
