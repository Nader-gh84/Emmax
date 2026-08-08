import type { Supplier, SupplierPaymentTermsType } from "@/types/supplier";

export type SupplierInvoiceDbStatus =
  | "pending_confirmation"
  | "confirmed";

/** Row from public.supplier_invoices */
export type SupplierInvoiceRow = {
  id: string;
  user_id: string;
  supplier_id: string;
  project_id: string | null;
  material_order_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  status: SupplierInvoiceDbStatus;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Row from public.supplier_payments */
export type SupplierPaymentRow = {
  id: string;
  user_id: string;
  supplier_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
};

/** Row from public.supplier_payment_allocations */
export type SupplierPaymentAllocationRow = {
  id: string;
  user_id: string;
  payment_id: string;
  invoice_id: string;
  amount_applied: number;
  created_at: string;
};

export type SupplierInvoiceBillingStatus =
  | "pending_confirmation"
  | "paid"
  | "partial"
  | "unpaid"
  | "overdue";

export type EnrichedSupplierInvoice = {
  id: string;
  invoiceNumber: string;
  projectId: string | null;
  projectName: string;
  customerName: string;
  materialOrderId: string | null;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  dbStatus: SupplierInvoiceDbStatus;
  /** Display/filter status (pending_confirmation or computed billing). */
  status: SupplierInvoiceBillingStatus;
};

export type EnrichedSupplierPayment = {
  id: string;
  paymentNumber: string;
  method: string;
  amount: number;
  paidAt: string;
  notes: string | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
};

export type CreditLimitStatus = "none" | "ok" | "approaching" | "over";

export type SupplierAccountSummary = {
  totalPurchases: number;
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
  creditLimit: number | null;
  creditStatus: CreditLimitStatus;
  creditUtilization: number | null;
  minimumMonthlyPayment: number | null;
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

export function paymentTermsLabel(
  terms: SupplierPaymentTermsType | string | null | undefined
): string {
  switch (terms) {
    case "net_15":
      return "Net 15";
    case "net_30":
      return "Net 30";
    case "monthly_minimum":
      return "Monthly minimum";
    case "none":
      return "None";
    default:
      return "Net 30";
  }
}

/**
 * Paid amount for one invoice from allocations.
 */
export function sumAllocationsForInvoice(
  invoiceId: string,
  allocations: Pick<SupplierPaymentAllocationRow, "invoice_id" | "amount_applied">[]
): number {
  return allocations
    .filter((row) => row.invoice_id === invoiceId)
    .reduce((sum, row) => sum + asMoney(row.amount_applied), 0);
}

export function computeInvoiceBillingStatus(input: {
  dbStatus: SupplierInvoiceDbStatus;
  amount: number;
  paid: number;
  dueDate: string;
  today?: string;
}): SupplierInvoiceBillingStatus {
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

export function enrichSupplierInvoices(input: {
  invoices: SupplierInvoiceRow[];
  allocations: SupplierPaymentAllocationRow[];
  projectNames?: Record<string, string>;
  customerNames?: Record<string, string>;
  today?: string;
}): EnrichedSupplierInvoice[] {
  const today = input.today ?? todayUtcDateString();

  return [...input.invoices]
    .map((row) => {
      const amount = asMoney(row.amount);
      const paid =
        row.status === "confirmed"
          ? sumAllocationsForInvoice(row.id, input.allocations)
          : 0;
      const balance =
        row.status === "confirmed" ? Math.max(0, amount - paid) : amount;
      const projectId = row.project_id;
      const projectName =
        (projectId && input.projectNames?.[projectId]) || "—";
      const customerName =
        (projectId && input.customerNames?.[projectId]) || "—";

      return {
        id: row.id,
        invoiceNumber: row.invoice_number,
        projectId,
        projectName,
        customerName,
        materialOrderId: row.material_order_id,
        invoiceDate: row.invoice_date,
        dueDate: row.due_date,
        amount,
        paid,
        balance,
        dbStatus: row.status,
        status: computeInvoiceBillingStatus({
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

export function enrichSupplierPayments(
  payments: SupplierPaymentRow[]
): EnrichedSupplierPayment[] {
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

export function computeCreditStatus(
  outstanding: number,
  creditLimit: number | null | undefined
): { status: CreditLimitStatus; utilization: number | null } {
  if (creditLimit == null || creditLimit <= 0) {
    return { status: "none", utilization: null };
  }
  const utilization = outstanding / creditLimit;
  if (outstanding >= creditLimit) {
    return { status: "over", utilization };
  }
  if (utilization >= 0.8) {
    return { status: "approaching", utilization };
  }
  return { status: "ok", utilization };
}

/**
 * Supplier account rollups.
 * Unconfirmed invoices are excluded from purchases / outstanding / overdue.
 */
export function computeSupplierAccountSummary(input: {
  supplier: Pick<
    Supplier,
    "credit_limit" | "minimum_monthly_payment"
  >;
  invoices: EnrichedSupplierInvoice[];
  payments: EnrichedSupplierPayment[];
  today?: string;
}): SupplierAccountSummary {
  const today = input.today ?? todayUtcDateString();
  const thisMonth = monthKeyUtc(today);

  const confirmed = input.invoices.filter(
    (inv) => inv.dbStatus === "confirmed"
  );
  const pendingReviewCount = input.invoices.filter(
    (inv) => inv.dbStatus === "pending_confirmation"
  ).length;

  const totalPurchases = confirmed.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = input.payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = totalPurchases - totalPaid;

  const overdueAmount = confirmed
    .filter((inv) => inv.dueDate < today && inv.balance > 0.009)
    .reduce((sum, inv) => sum + inv.balance, 0);

  // Prefer non-negative current slice of outstanding for the donut.
  const currentOutstanding = Math.max(0, outstandingBalance - overdueAmount);

  const lastPayment = input.payments[0] ?? null;

  const creditLimit =
    input.supplier.credit_limit != null
      ? asMoney(input.supplier.credit_limit)
      : null;
  const credit = computeCreditStatus(
    Math.max(0, outstandingBalance),
    creditLimit
  );

  const minimumMonthlyPayment =
    input.supplier.minimum_monthly_payment != null
      ? asMoney(input.supplier.minimum_monthly_payment)
      : null;

  const paidThisMonth = input.payments
    .filter((p) => monthKeyUtc(p.paidAt) === thisMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalPurchases,
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
    creditLimit,
    creditStatus: credit.status,
    creditUtilization: credit.utilization,
    minimumMonthlyPayment,
    paidThisMonth,
  };
}

/**
 * Average days from invoice_date to the latest allocation payment_date
 * for fully paid confirmed invoices.
 */
export function computeAveragePaymentDays(input: {
  invoices: EnrichedSupplierInvoice[];
  allocations: SupplierPaymentAllocationRow[];
  payments: SupplierPaymentRow[];
}): number | null {
  const paymentDateById = new Map(
    input.payments.map((p) => [p.id, p.payment_date])
  );

  const days: number[] = [];
  for (const inv of input.invoices) {
    if (inv.dbStatus !== "confirmed" || inv.status !== "paid") continue;

    const related = input.allocations.filter((a) => a.invoice_id === inv.id);
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
export function planFifoAllocations(input: {
  paymentAmount: number;
  invoices: EnrichedSupplierInvoice[];
}): { invoiceId: string; amountApplied: number }[] {
  let remaining = asMoney(input.paymentAmount);
  if (remaining <= 0) return [];

  const open = input.invoices
    .filter(
      (inv) => inv.dbStatus === "confirmed" && inv.balance > 0.009
    )
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
