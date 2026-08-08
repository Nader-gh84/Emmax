import type { Metadata } from "next";
import Link from "next/link";
import { EmployeeDetailsPage } from "@/components/employees/employee-details-page";
import { buildEmployeeDetailsViewModel } from "@/lib/employee-details";
import { backfillLabourInvoicesForEmployee } from "@/lib/labour-invoice";
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

/** Always run backfill on load — do not cache a pre-invoice empty state. */
export const dynamic = "force-dynamic";

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

  // Backfill: attach every unlinked hourly time entry to a pay-period invoice
  // (same idea as supplier detail backfill for confirmed material orders).
  const backfill = await backfillLabourInvoicesForEmployee(
    supabase,
    employeeRow.id
  );

  if (!backfill.ok) {
    console.error(
      "[EmployeeDetails] labour invoice backfill failed:",
      backfill.error
    );
  } else if (backfill.attached > 0) {
    console.info(
      `[EmployeeDetails] backfilled ${backfill.attached} time entr${
        backfill.attached === 1 ? "y" : "ies"
      } for employee ${employeeRow.id}`
    );
  } else if (backfill.reason) {
    console.info(
      `[EmployeeDetails] backfill skipped (${backfill.reason}) for employee ${employeeRow.id}`
    );
  }

  let backfillNotice: string | null = null;
  if (backfill.reason === "missing_pay_rate") {
    backfillNotice =
      "Set an hourly pay rate for this employee to generate labour invoices from logged time.";
  } else if (backfill.reason === "salary_employee_skipped") {
    backfillNotice =
      "Labour invoices are created for hourly employees only (salary payroll comes later).";
  } else if (!backfill.ok && backfill.error) {
    backfillNotice = backfill.error.includes(
      "backfill_labour_invoices_for_employee"
    )
      ? "Could not backfill labour invoices. Run migration 038_labour_invoice_backfill.sql in Supabase."
      : `Labour invoice backfill failed: ${backfill.error}`;
  }

  // Prefer a plain select — avoid failing the whole list if the projects embed
  // is missing from the PostgREST schema cache after migration.
  const {
    data: invoiceData,
    error: invoicesError,
  } = await supabase
    .from("labour_invoices")
    .select("*")
    .eq("employee_id", employeeRow.id)
    .order("invoice_date", { ascending: false });

  const { data: paymentData, error: paymentsError } = await supabase
    .from("labour_payments")
    .select("*")
    .eq("employee_id", employeeRow.id)
    .order("payment_date", { ascending: false });

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

  const invoiceRows = (invoiceData as LabourInvoiceRow[] | null) ?? [];
  const paymentRows = ((paymentData as LabourPaymentRow[] | null) ?? []).map(
    (row) => ({ ...row, amount: Number(row.amount) || 0 })
  );

  const projectIds = Array.from(
    new Set(
      invoiceRows
        .map((row) => row.project_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const projectNames: Record<string, string> = {};
  if (projectIds.length > 0) {
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, project_name")
      .in("id", projectIds);
    for (const project of (projectData as
      | { id: string; project_name: string | null }[]
      | null) ?? []) {
      projectNames[project.id] =
        project.project_name?.trim() || "Untitled project";
    }
  }

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

  const invoices: LabourInvoiceRow[] = invoiceRows.map((row) => ({
    ...row,
    amount: Number(row.amount) || 0,
    status:
      row.status === "confirmed" ? "confirmed" : "pending_confirmation",
  }));

  const details = buildEmployeeDetailsViewModel({
    employee: employeeRow,
    invoices,
    payments: paymentRows,
    allocations: allocationRows,
    projectNames,
  });

  return (
    <EmployeeDetailsPage employee={details} backfillNotice={backfillNotice} />
  );
}
