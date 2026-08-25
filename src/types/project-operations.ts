import type { Employee } from "@/types/employee";
import {
  normalizeTimeEntrySource,
  type TimeEntrySource,
} from "@/types/labour-quoting";
import type { AgendaPriority } from "@/types/schedule-item";

export type { TimeEntrySource } from "@/types/labour-quoting";

export type TaskStatus = "todo" | "in_progress" | "completed" | "overdue";

export interface ProjectTask {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  assigned_employee_id: string | null;
  status: TaskStatus;
  /** Present after migration 042; treat missing as medium until then. */
  priority?: AgendaPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  employees?: Pick<Employee, "id" | "full_name" | "role"> | null;
}

export interface ProjectExpense {
  id: string;
  user_id: string;
  project_id: string;
  expense_date: string;
  store_name: string;
  description: string;
  amount: number;
  receipt_url: string | null;
  /** How this expense relates to customer billing. Default: pending_review. */
  billing_status: ExpenseBillingStatus;
  /** Whether cash has been paid out. Default: unpaid. */
  payment_status: CostPaymentStatus;
  /** extra_purchase vs other_expense (permits, fuel, etc.). */
  expense_kind: ExpenseKind;
  created_at: string;
}

export type ExpenseBillingStatus =
  | "add_to_change_order"
  | "included_in_customer_billing"
  | "company_cost"
  | "pending_review";

export type ExpenseKind = "extra_purchase" | "other_expense";

/** Paid/unpaid flag for costs (expenses, material orders, time entries). */
export type CostPaymentStatus = "paid" | "unpaid";

export type ProjectPaymentType = "customer_payment" | "supplier_payment";

export interface ProjectPayment {
  id: string;
  user_id: string;
  project_id: string;
  payment_type: ProjectPaymentType;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  employee_id: string;
  hours: number;
  entry_date: string;
  notes: string | null;
  /** Whether labour for this entry has been paid out. Default: unpaid. */
  payment_status: CostPaymentStatus;
  /**
   * quote_estimate = Create Quote planned hours (cost / margin only).
   * actual = job-logged hours (payroll / labour invoices only).
   * Default actual for legacy rows.
   */
  entry_source: TimeEntrySource;
  /** Quote that wrote a quote_estimate row; null for actual. */
  quote_id?: string | null;
  /** Employee pay_rate frozen at write time (esp. estimates). */
  pay_rate_snapshot?: number | null;
  created_at: string;
  employees?: Pick<
    Employee,
    "id" | "full_name" | "role" | "pay_rate" | "pay_type"
  > | null;
}

/** Normalize DB/legacy time entry rows for app use. */
export function normalizeTimeEntryRow(row: TimeEntry): TimeEntry {
  const payment = String(row.payment_status ?? "");
  const snapshot =
    row.pay_rate_snapshot == null ? null : Number(row.pay_rate_snapshot);
  return {
    ...row,
    hours: Number(row.hours) || 0,
    payment_status: payment === "paid" ? "paid" : "unpaid",
    entry_source: normalizeTimeEntrySource(row.entry_source),
    quote_id: row.quote_id ?? null,
    pay_rate_snapshot:
      snapshot != null && Number.isFinite(snapshot) ? snapshot : null,
  };
}

export type ChangeOrderStatus = "pending" | "approved" | "rejected";

export interface ChangeOrder {
  id: string;
  user_id: string;
  project_id: string;
  description: string;
  amount: number;
  status: ChangeOrderStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectActivity {
  id: string;
  user_id: string;
  project_id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (
    value === "todo" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "overdue"
  );
}

export function isExpenseBillingStatus(
  value: string
): value is ExpenseBillingStatus {
  return (
    value === "add_to_change_order" ||
    value === "included_in_customer_billing" ||
    value === "company_cost" ||
    value === "pending_review"
  );
}

export function isExpenseKind(value: string): value is ExpenseKind {
  return value === "extra_purchase" || value === "other_expense";
}

export function isCostPaymentStatus(value: string): value is CostPaymentStatus {
  return value === "paid" || value === "unpaid";
}

export function isChangeOrderStatus(value: string): value is ChangeOrderStatus {
  return (
    value === "pending" || value === "approved" || value === "rejected"
  );
}

/** Completion % from tasks — 0 when no tasks exist. */
export function computeTaskCompletionPercent(tasks: { status: string }[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

function asMoney(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeBillingStatus(
  value: string | null | undefined
): ExpenseBillingStatus {
  const candidate = value ?? "";
  return isExpenseBillingStatus(candidate) ? candidate : "pending_review";
}

function normalizeExpenseKind(value: string | null | undefined): ExpenseKind {
  const candidate = value ?? "";
  return isExpenseKind(candidate) ? candidate : "extra_purchase";
}

export function normalizePaymentStatus(
  value: string | null | undefined
): CostPaymentStatus {
  const candidate = value ?? "";
  return isCostPaymentStatus(candidate) ? candidate : "unpaid";
}

/** Line total for a material order (qty × unitCost). Tax not included. */
export function computeMaterialOrderTotal(order: {
  materials?:
    | {
        quantity?: number | null;
        unitCost?: number | null;
        unit_cost?: number | null;
        /** @deprecated Legacy conflated field — fallback only. */
        unitPrice?: number | null;
        unit_price?: number | null;
      }[]
    | null;
}): number {
  if (!Array.isArray(order.materials)) return 0;
  return order.materials.reduce((sum, line) => {
    const qty = asMoney(line.quantity);
    const unit = asMoney(
      line.unitCost ?? line.unit_cost ?? line.unitPrice ?? line.unit_price ?? 0
    );
    return sum + qty * unit;
  }, 0);
}

export type FinancialSummaryMaterialOrder = {
  payment_status?: string | null;
  materials?:
    | {
        quantity?: number | null;
        unitCost?: number | null;
        unit_cost?: number | null;
        unitPrice?: number | null;
        unit_price?: number | null;
      }[]
    | null;
};

export type FinancialSummaryTimeEntry = {
  hours: number;
  payment_status?: string | null;
  /** Prefer actual; fall back to quote_estimate when no actuals yet. */
  entry_source?: TimeEntrySource | string | null;
  pay_rate_snapshot?: number | null;
  employees?: {
    pay_rate?: number | null;
    pay_type?: string | null;
  } | null;
  /** Fallback rate when join is missing (e.g. employee_id lookup). */
  hourlyRate?: number | null;
};

export type FinancialSummaryExpense = {
  amount: number;
  billing_status?: string | null;
  payment_status?: string | null;
  expense_kind?: string | null;
};

export type FinancialSummaryChangeOrder = {
  amount: number;
  status: string;
};

/**
 * Full project accounting summary.
 *
 * Revenue: Contract Value + approved Change Orders → Revised Contract Value
 * Costs: Supplier (material orders) + Extra Purchases + Labour + Other Expenses
 *   (pending_review expenses excluded until resolved)
 * Cash: Customer Payments − Total Money Paid Out
 * Labour uses employees.pay_rate when pay_type is hourly; salary → $0 for now.
 * Outstanding Customer Balance may be negative (overpayment).
 */
export function computeFinancialSummary(input: {
  /** Accepted quote amount (Contract Value). */
  quoteAmount: number;
  depositAmount?: number;
  payments: Pick<ProjectPayment, "payment_type" | "amount">[];
  expenses: FinancialSummaryExpense[];
  changeOrders?: FinancialSummaryChangeOrder[];
  materialOrders?: FinancialSummaryMaterialOrder[];
  timeEntries?: FinancialSummaryTimeEntry[];
}) {
  const contractValue = asMoney(input.quoteAmount);
  const depositAmount = asMoney(input.depositAmount);

  const changeOrdersAmount = (input.changeOrders ?? [])
    .filter((row) => row.status === "approved")
    .reduce((sum, row) => sum + asMoney(row.amount), 0);

  const revisedContractValue = contractValue + changeOrdersAmount;

  const customerPayments = (input.payments ?? [])
    .filter((p) => p.payment_type === "customer_payment")
    .reduce((sum, p) => sum + asMoney(p.amount), 0);

  // Legacy optional — not used in paid-out / AP (material_orders.payment_status is source of truth).
  const legacySupplierPayments = (input.payments ?? [])
    .filter((p) => p.payment_type === "supplier_payment")
    .reduce((sum, p) => sum + asMoney(p.amount), 0);

  // Allow negative when customer has overpaid.
  const outstandingCustomerBalance = revisedContractValue - customerPayments;

  let supplierCosts = 0;
  let paidSupplierCosts = 0;
  let unpaidSupplierCosts = 0;
  for (const order of input.materialOrders ?? []) {
    const total = computeMaterialOrderTotal(order);
    supplierCosts += total;
    if (normalizePaymentStatus(order.payment_status) === "paid") {
      paidSupplierCosts += total;
    } else {
      unpaidSupplierCosts += total;
    }
  }

  let extraPurchases = 0;
  let otherExpenses = 0;
  let paidExtraPurchases = 0;
  let unpaidExtraPurchases = 0;
  let paidOtherExpenses = 0;
  let unpaidOtherExpenses = 0;
  let pendingReviewCount = 0;
  let pendingReviewAmount = 0;

  for (const raw of input.expenses ?? []) {
    const amount = asMoney(raw.amount);
    const billing = normalizeBillingStatus(raw.billing_status);
    const kind = normalizeExpenseKind(raw.expense_kind);
    const paid = normalizePaymentStatus(raw.payment_status) === "paid";

    if (billing === "pending_review") {
      pendingReviewCount += 1;
      pendingReviewAmount += amount;
      continue;
    }

    if (kind === "other_expense") {
      otherExpenses += amount;
      if (paid) paidOtherExpenses += amount;
      else unpaidOtherExpenses += amount;
    } else {
      // extra_purchase — includes company_cost / add_to_change_order /
      // included_in_customer_billing (cost side only; revenue via change_orders).
      extraPurchases += amount;
      if (paid) paidExtraPurchases += amount;
      else unpaidExtraPurchases += amount;
    }
  }

  let labourCost = 0;
  let paidLabourCost = 0;
  let unpaidLabourCost = 0;

  for (const entry of input.timeEntries ?? []) {
    const hours = asMoney(entry.hours);
    const payType = entry.employees?.pay_type ?? "hourly";
    const rate =
      payType === "salary"
        ? 0
        : asMoney(
            entry.employees?.pay_rate ?? entry.hourlyRate ?? 0
          );
    const cost = hours * rate;
    labourCost += cost;
    if (normalizePaymentStatus(entry.payment_status) === "paid") {
      paidLabourCost += cost;
    } else {
      unpaidLabourCost += cost;
    }
  }

  const totalProjectCost =
    supplierCosts + extraPurchases + labourCost + otherExpenses;
  const grossProfit = revisedContractValue - totalProjectCost;
  const profitMargin =
    revisedContractValue === 0
      ? 0
      : (grossProfit / revisedContractValue) * 100;

  const totalMoneyPaidOut =
    paidSupplierCosts +
    paidExtraPurchases +
    paidLabourCost +
    paidOtherExpenses;

  const cashFlow = customerPayments - totalMoneyPaidOut;

  const accountsPayable =
    unpaidSupplierCosts +
    unpaidExtraPurchases +
    unpaidLabourCost +
    unpaidOtherExpenses;

  const netReceivablePosition = outstandingCustomerBalance - accountsPayable;

  const depositStatus =
    depositAmount <= 0
      ? "Not Required"
      : customerPayments >= depositAmount
        ? "Paid"
        : customerPayments > 0
          ? "Partial"
          : "Not Paid";

  return {
    // Revenue
    contractValue,
    changeOrdersAmount,
    revisedContractValue,
    // Customer payments
    customerPayments,
    outstandingCustomerBalance,
    // Project costs
    supplierCosts,
    extraPurchases,
    labourCost,
    otherExpenses,
    totalProjectCost,
    // Profit
    grossProfit,
    profitMargin,
    // Cash
    totalMoneyPaidOut,
    cashFlow,
    paidSupplierCosts,
    paidExtraPurchases,
    paidLabourCost,
    paidOtherExpenses,
    // Obligations
    accountsPayable,
    unpaidSupplierCosts,
    unpaidExtraPurchases,
    unpaidLabourCost,
    unpaidOtherExpenses,
    netReceivablePosition,
    // Review queue
    pendingReviewCount,
    pendingReviewAmount,
    // Deposit (display helper)
    depositAmount,
    depositStatus,
    // Legacy / aliases (transition helpers for older UI)
    legacySupplierPayments,
    quoteAmount: contractValue,
    paidByCustomer: customerPayments,
    /** @deprecated use outstandingCustomerBalance (not clamped) */
    totalDue: outstandingCustomerBalance,
    paidToSuppliers: paidSupplierCosts,
    totalCosts: totalProjectCost,
    /** @deprecated use cashFlow */
    netPosition: cashFlow,
  };
}

export function computeProgressDates(input: {
  startDate: string | null;
  endDate: string | null;
}) {
  const start = input.startDate
    ? new Date(
        input.startDate.includes("T")
          ? input.startDate
          : `${input.startDate}T00:00:00`
      )
    : null;
  const end = input.endDate
    ? new Date(
        input.endDate.includes("T")
          ? input.endDate
          : `${input.endDate}T00:00:00`
      )
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!start || Number.isNaN(start.getTime())) {
    return {
      totalDays: null as number | null,
      daysPassed: null as number | null,
      daysRemaining: null as number | null,
      workingDaysLeft: null as number | null,
    };
  }

  const endOrToday = end && !Number.isNaN(end.getTime()) ? end : null;
  const totalDays = endOrToday
    ? Math.max(
        1,
        Math.round((endOrToday.getTime() - start.getTime()) / 86400000) + 1
      )
    : null;
  const daysPassed = Math.max(
    0,
    Math.round((today.getTime() - start.getTime()) / 86400000)
  );
  const daysRemaining = endOrToday
    ? Math.max(
        0,
        Math.round((endOrToday.getTime() - today.getTime()) / 86400000)
      )
    : null;

  let workingDaysLeft: number | null = null;
  if (endOrToday && endOrToday >= today) {
    workingDaysLeft = 0;
    const cursor = new Date(today);
    while (cursor <= endOrToday) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) workingDaysLeft += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (endOrToday) {
    workingDaysLeft = 0;
  }

  return { totalDays, daysPassed, daysRemaining, workingDaysLeft };
}
