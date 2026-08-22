import type { Metadata } from "next";
import Link from "next/link";
import { ProjectDetailPage } from "@/components/projects/project-detail-page";
import { mapQuoteToPreInvoiceCard } from "@/lib/pre-invoices";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDisplayName, type Customer } from "@/types/customer";
import type { Employee } from "@/types/employee";
import type { MaterialOrder } from "@/types/material-order";
import {
  asProjectMaterials,
  formatProjectDate,
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
  type ProjectActivity,
  type ProjectExpense,
  type ProjectPayment,
  type ProjectTask,
  type TimeEntry,
  normalizeTimeEntryRow,
} from "@/types/project-operations";
import type { Quote } from "@/types/quote";

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
  return normalizeTimeEntryRow(row);
}

function normalizeChangeOrder(row: ChangeOrder): ChangeOrder {
  const status = row.status as string;
  return {
    ...row,
    amount: Number(row.amount) || 0,
    status: isChangeOrderStatus(status) ? status : "pending",
  };
}

export const metadata: Metadata = {
  title: "Project Details",
};

type ProjectRow = Project & {
  quotes?: Quote | null;
};

export default async function ProjectDetailRoute({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  const customerIdParam = params.id?.trim() ?? "";
  const projectId = params.projectId?.trim() ?? "";
  const supabase = createClient();

  const [
    { data: projectData },
    { data: orderRows },
    { data: taskRows },
    { data: expenseRows },
    { data: paymentRows },
    { data: timeRows },
    { data: activityRows },
    { data: assignmentRows },
    { data: employeeRows },
    { data: changeOrderRows },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*, quotes(*)")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("material_orders")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*, employees(id, full_name, role)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_expenses")
      .select("*")
      .eq("project_id", projectId)
      .order("expense_date", { ascending: false }),
    supabase
      .from("project_payments")
      .select("*")
      .eq("project_id", projectId)
      .order("payment_date", { ascending: false }),
    supabase
      .from("time_entries")
      .select("*, employees(id, full_name, role, pay_rate, pay_type)")
      .eq("project_id", projectId)
      .order("entry_date", { ascending: false }),
    supabase
      .from("project_activity")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("project_employees")
      .select("employee_id, employees(*)")
      .eq("project_id", projectId),
    supabase
      .from("employees")
      .select("id, full_name")
      .order("full_name", { ascending: true }),
    supabase
      .from("change_orders")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  const projectRow = projectData as ProjectRow | null;

  if (!projectRow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Project not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          This project may have been deleted, or the link is invalid.
        </p>
        <Link
          href="/dashboard/projects"
          className="mt-6 text-sm font-semibold text-accent hover:text-blue-400"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  const customerId =
    (projectRow.customer_id?.trim() || customerIdParam).trim() ||
    customerIdParam;

  let customerRow: Customer | null = null;
  if (customerId) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();
    customerRow = (data as Customer | null) ?? null;
  }

  if (
    customerIdParam &&
    projectRow.customer_id &&
    projectRow.customer_id !== customerIdParam
  ) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Project not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          This project does not belong to the selected customer.
        </p>
        <Link
          href={`/dashboard/customers/${customerIdParam}`}
          className="mt-6 text-sm font-semibold text-accent hover:text-blue-400"
        >
          Back to Customer
        </Link>
      </div>
    );
  }

  const linkedQuote = (projectRow.quotes as Quote | null) ?? null;
  const projectName = resolveProjectDisplayName(
    projectRow.project_name,
    linkedQuote
  );
  const status =
    typeof projectRow.status === "string" && isProjectStatus(projectRow.status)
      ? projectRow.status
      : "active";
  const startDateConfirmed = Boolean(projectRow.start_date_confirmed);
  const materialOrders = (orderRows as MaterialOrder[] | null) ?? [];
  const materialOrder = materialOrders[0] ?? null;
  const customerName = customerRow
    ? getCustomerDisplayName(customerRow)
    : "Customer";
  const displayAddress =
    projectRow.address?.trim() || customerRow?.address?.trim() || "—";

  const quoteAmount =
    Number(projectRow.value) || Number(linkedQuote?.grand_total) || 0;
  const depositAmount = Number(projectRow.deposit_amount) || 0;

  // Workflow steps from quote heuristics (accepted projects always have a quote).
  const workflowCard = mapQuoteToPreInvoiceCard(
    linkedQuote ??
      ({
        id: projectRow.quote_id || projectRow.id,
        user_id: projectRow.user_id,
        customer_id: projectRow.customer_id,
        customer_name: customerName,
        customer_email: null,
        customer_phone: null,
        project_name: projectName,
        notes: projectRow.notes,
        materials: asProjectMaterials(projectRow.materials),
        labour_items: [],
        tax_rate: 0.05,
        validity_days: 30,
        subtotal: quoteAmount,
        tax: 0,
        grand_total: quoteAmount,
        status: "accepted",
        transcript: null,
        created_at: projectRow.created_at,
        updated_at: projectRow.updated_at,
        sent_at: null,
        pdf_url: null,
        confirmation_token: "",
        confirmed_at: projectRow.created_at,
      } as Quote),
    projectRow,
    materialOrder
  );

  const assignedEmployees: Employee[] = (
    (assignmentRows as
      | { employee_id: string; employees: Employee | Employee[] | null }[]
      | null) ?? []
  )
    .map((row) => {
      const emp = Array.isArray(row.employees)
        ? row.employees[0]
        : row.employees;
      return emp ?? null;
    })
    .filter((emp): emp is Employee => Boolean(emp));

  const shortId = projectRow.id.replace(/-/g, "").slice(0, 8).toUpperCase();

  return (
    <ProjectDetailPage
      projectId={projectRow.id}
      customerId={customerId || customerIdParam}
      projectName={projectName}
      customerName={customerName}
      customerPhone={customerRow?.phone?.trim() || "—"}
      address={displayAddress}
      createdLabel={formatProjectDate(
        linkedQuote?.confirmed_at ||
          linkedQuote?.created_at ||
          projectRow.created_at
      )}
      quoteAmount={quoteAmount}
      depositAmount={depositAmount}
      description={
        projectRow.notes?.trim() || linkedQuote?.notes?.trim() || ""
      }
      projectType={projectRow.project_type?.trim() || "Project"}
      projectManager={projectRow.project_manager?.trim() || "Unassigned"}
      internalProjectNumber={
        linkedQuote?.quote_number?.trim() ||
        (shortId ? `PRJ-${shortId}` : "—")
      }
      quoteId={projectRow.quote_id || linkedQuote?.id || null}
      quotePdfPath={linkedQuote?.pdf_url ?? null}
      quoteStatus={linkedQuote?.status ?? null}
      projectStatus={status}
      startDateConfirmed={startDateConfirmed}
      rawStartDate={
        startDateConfirmed && projectRow.start_date
          ? String(projectRow.start_date)
          : projectRow.start_date
            ? String(projectRow.start_date)
            : null
      }
      rawEndDate={projectRow.end_date ? String(projectRow.end_date) : null}
      materialOrder={materialOrder}
      materialOrders={materialOrders}
      projectMaterials={asProjectMaterials(projectRow.materials)}
      workflowSteps={workflowCard.steps}
      workflowActionLabel={
        workflowCard.steps.find((s) => s.state === "active")?.actionLabel ??
        null
      }
      workflowNextText={workflowCard.nextActionText}
      initialTasks={(taskRows as ProjectTask[] | null) ?? []}
      initialExpenses={((expenseRows as ProjectExpense[] | null) ?? []).map(
        (row) => normalizeExpense(row)
      )}
      initialPayments={((paymentRows as ProjectPayment[] | null) ?? []).map(
        (row) => ({ ...row, amount: Number(row.amount) || 0 })
      )}
      initialTimeEntries={((timeRows as TimeEntry[] | null) ?? []).map(
        (row) => normalizeTimeEntry(row)
      )}
      initialChangeOrders={((changeOrderRows as ChangeOrder[] | null) ?? []).map(
        (row) => normalizeChangeOrder(row)
      )}
      initialActivities={(activityRows as ProjectActivity[] | null) ?? []}
      assignedEmployees={assignedEmployees}
      allEmployees={
        ((employeeRows as Pick<Employee, "id" | "full_name">[] | null) ??
          []) as Pick<Employee, "id" | "full_name">[]
      }
    />
  );
}
