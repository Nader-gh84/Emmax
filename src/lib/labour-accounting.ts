import type { EmployeePayPeriodType } from "@/types/employee";
import { formatPayPeriodType } from "@/types/employee";

export type LabourInvoiceDbStatus =
  | "pending_confirmation"
  | "confirmed";

/** Row from public.labour_invoices */
export type LabourInvoiceRow = {
  id: string;
  user_id: string;
  employee_id: string;
  project_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  amount: number;
  status: LabourInvoiceDbStatus;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Row from public.labour_payments */
export type LabourPaymentRow = {
  id: string;
  user_id: string;
  employee_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
};

/** Row from public.labour_payment_allocations */
export type LabourPaymentAllocationRow = {
  id: string;
  user_id: string;
  payment_id: string;
  labour_invoice_id: string;
  amount_applied: number;
  created_at: string;
};

export type LabourInvoiceBillingStatus =
  | "pending_confirmation"
  | "paid"
  | "partial"
  | "unpaid"
  | "overdue";

export type EnrichedLabourInvoice = {
  id: string;
  invoiceNumber: string;
  projectId: string | null;
  projectName: string;
  periodStart: string;
  periodEnd: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  dbStatus: LabourInvoiceDbStatus;
  status: LabourInvoiceBillingStatus;
};

export type EnrichedLabourPayment = {
  id: string;
  paymentNumber: string;
  method: string;
  amount: number;
  paidAt: string;
  notes: string | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
};

export type LabourAccountSummary = {
  totalLabourCost: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueAmount: number;
  currentOutstanding: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  totalInvoices: number;
  confirmedInvoiceCount: number;
  pendingReviewCount: number;
  totalPayments: number;
  averagePaymentDays: number | null;
  paidThisMonth: number;
};

function asMoney(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthKeyUtc(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function payPeriodLabel(
  value: EmployeePayPeriodType | string | null | undefined
): string {
  return formatPayPeriodType(value);
}

export function sumAllocationsForLabourInvoice(
  invoiceId: string,
  allocations: Pick<
    LabourPaymentAllocationRow,
    "labour_invoice_id" | "amount_applied"
  >[]
): number {
  return allocations
    .filter((row) => row.labour_invoice_id === invoiceId)
    .reduce((sum, row) => sum + asMoney(row.amount_applied), 0);
}

export function computeLabourInvoiceBillingStatus(input: {
  dbStatus: LabourInvoiceDbStatus;
  amount: number;
  paid: number;
  dueDate: string;
  today?: string;
}): LabourInvoiceBillingStatus {
  if (input.dbStatus === "pending_confirmation") {
    return "pending_confirmation";
  }

  const amount = asMoney(input.amount);
  const paid = asMoney(input.paid);
  const balance = Math.max(0, amount - paid);
  const today = input.today ?? todayUtcDateString();

  if (balance <= 0.009) return "paid";
  if (paid > 0.009) return "partial";
  if (input.dueDate < today) return "overdue";
  return "unpaid";
}

export function enrichLabourInvoices(input: {
  invoices: LabourInvoiceRow[];
  allocations: LabourPaymentAllocationRow[];
  projectNames?: Record<string, string>;
  today?: string;
}): EnrichedLabourInvoice[] {
  const today = input.today ?? todayUtcDateString();

  return [...input.invoices]
    .map((row) => {
      const amount = asMoney(row.amount);
      const paid =
        row.status === "confirmed"
          ? sumAllocationsForLabourInvoice(row.id, input.allocations)
          : 0;
      const balance =
        row.status === "confirmed" ? Math.max(0, amount - paid) : amount;
      const projectId = row.project_id;
      const projectName =
        (projectId && input.projectNames?.[projectId]) ||
        (projectId ? "Untitled project" : "Multiple / —");

      return {
        id: row.id,
        invoiceNumber: row.invoice_number,
        projectId,
        projectName: projectId ? projectName : "Multiple projects",
        periodStart: row.period_start,
        periodEnd: row.period_end,
        invoiceDate: row.invoice_date,
        dueDate: row.due_date,
        amount,
        paid,
        balance,
        dbStatus: row.status,
        status: computeLabourInvoiceBillingStatus({
          dbStatus: row.status,
          amount,
          paid,
          dueDate: row.due_date,
          today,
        }),
      };
    })
    .sort((a, b) => {
      const byDate = b.invoiceDate.localeCompare(a.invoiceDate);
      if (byDate !== 0) return byDate;
      return b.invoiceNumber.localeCompare(a.invoiceNumber);
    });
}

export function enrichLabourPayments(
  payments: LabourPaymentRow[]
): EnrichedLabourPayment[] {
  return [...payments]
    .map((row) => {
      const short = row.id.replace(/-/g, "").slice(0, 6).toUpperCase();
      return {
        id: row.id,
        paymentNumber: row.reference_number?.trim() || `PMT-${short}`,
        method: row.payment_method?.trim() || "—",
        amount: asMoney(row.amount),
        paidAt: row.payment_date,
        notes: row.notes,
        hasReceipt: Boolean(row.receipt_url?.trim()),
        receiptUrl: row.receipt_url,
      };
    })
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

/**
 * Employee labour account rollups.
 * Unconfirmed invoices are excluded from labour cost / outstanding / overdue.
 */
export function computeLabourAccountSummary(input: {
  invoices: EnrichedLabourInvoice[];
  payments: EnrichedLabourPayment[];
  today?: string;
}): LabourAccountSummary {
  const today = input.today ?? todayUtcDateString();
  const thisMonth = monthKeyUtc(today);

  const confirmed = input.invoices.filter(
    (inv) => inv.dbStatus === "confirmed"
  );
  const pendingReviewCount = input.invoices.filter(
    (inv) => inv.dbStatus === "pending_confirmation"
  ).length;

  const totalLabourCost = confirmed.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = totalLabourCost - totalPaid;

  const overdueAmount = confirmed
    .filter((inv) => inv.dueDate < today && inv.balance > 0.009)
    .reduce((sum, inv) => sum + inv.balance, 0);

  const currentOutstanding = Math.max(0, outstandingBalance - overdueAmount);
  const lastPayment = input.payments[0] ?? null;

  const paidThisMonth = input.payments
    .filter((p) => monthKeyUtc(p.paidAt) === thisMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalLabourCost,
    totalPaid,
    outstandingBalance,
    overdueAmount: Math.max(0, overdueAmount),
    currentOutstanding,
    lastPaymentDate: lastPayment?.paidAt ?? null,
    lastPaymentAmount: lastPayment?.amount ?? null,
    totalInvoices: input.invoices.length,
    confirmedInvoiceCount: confirmed.length,
    pendingReviewCount,
    totalPayments: input.payments.length,
    averagePaymentDays: null,
    paidThisMonth,
  };
}

export function computeLabourAveragePaymentDays(input: {
  invoices: EnrichedLabourInvoice[];
  allocations: LabourPaymentAllocationRow[];
  payments: LabourPaymentRow[];
}): number | null {
  const paymentDateById = new Map(
    input.payments.map((p) => [p.id, p.payment_date])
  );

  const days: number[] = [];
  for (const inv of input.invoices) {
    if (inv.dbStatus !== "confirmed" || inv.status !== "paid") continue;

    const related = input.allocations.filter(
      (a) => a.labour_invoice_id === inv.id
    );
    if (related.length === 0) continue;

    let latest: string | null = null;
    for (const alloc of related) {
      const d = paymentDateById.get(alloc.payment_id);
      if (!d) continue;
      if (!latest || d > latest) latest = d;
    }
    if (!latest) continue;

    const start = new Date(`${inv.invoiceDate}T00:00:00Z`).getTime();
    const end = new Date(`${latest}T00:00:00Z`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      continue;
    }
    days.push(Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }

  if (days.length === 0) return null;
  return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
}

/**
 * FIFO allocation plan for an unapplied payment against confirmed invoices
 * with remaining balance (oldest due_date, then invoice_date).
 */
export function planLabourFifoAllocations(input: {
  paymentAmount: number;
  invoices: EnrichedLabourInvoice[];
}): { invoiceId: string; amountApplied: number }[] {
  let remaining = asMoney(input.paymentAmount);
  if (remaining <= 0) return [];

  const open = input.invoices
    .filter((inv) => inv.dbStatus === "confirmed" && inv.balance > 0.009)
    .sort((a, b) => {
      const byDue = a.dueDate.localeCompare(b.dueDate);
      if (byDue !== 0) return byDue;
      return a.invoiceDate.localeCompare(b.invoiceDate);
    });

  const plan: { invoiceId: string; amountApplied: number }[] = [];
  for (const inv of open) {
    if (remaining <= 0.009) break;
    const apply = Math.min(remaining, inv.balance);
    if (apply <= 0.009) continue;
    plan.push({ invoiceId: inv.id, amountApplied: asMoney(apply) });
    remaining = asMoney(remaining - apply);
  }
  return plan;
}
