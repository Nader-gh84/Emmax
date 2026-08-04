import type { Employee } from "@/types/employee";

export type TaskStatus = "todo" | "in_progress" | "completed" | "overdue";

export interface ProjectTask {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  assigned_employee_id: string | null;
  status: TaskStatus;
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
  created_at: string;
  employees?: Pick<
    Employee,
    "id" | "full_name" | "role" | "pay_rate" | "pay_type"
  > | null;
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

/**
 * Financial summary helpers.
 *
 * Net Position = Total Paid by Customer − Total Costs
 * (cash net to date). Outstanding AR is shown separately as Total Due.
 * Total Costs = Paid to Suppliers + Extra Purchases (labor shown on Team card).
 */
export function computeFinancialSummary(input: {
  quoteAmount: number;
  depositAmount: number;
  payments: Pick<ProjectPayment, "payment_type" | "amount">[];
  expenses: Pick<ProjectExpense, "amount">[];
}) {
  const quoteAmount = Number(input.quoteAmount) || 0;
  const depositAmount = Number(input.depositAmount) || 0;
  const paidByCustomer = input.payments
    .filter((p) => p.payment_type === "customer_payment")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paidToSuppliers = input.payments
    .filter((p) => p.payment_type === "supplier_payment")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const extraPurchases = input.expenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );
  const totalCosts = paidToSuppliers + extraPurchases;
  const totalDue = Math.max(0, quoteAmount - paidByCustomer);
  const netPosition = paidByCustomer - totalCosts;
  const depositStatus =
    depositAmount <= 0
      ? "Not Required"
      : paidByCustomer >= depositAmount
        ? "Paid"
        : paidByCustomer > 0
          ? "Partial"
          : "Not Paid";

  return {
    quoteAmount,
    depositAmount,
    depositStatus,
    paidByCustomer,
    totalDue,
    paidToSuppliers,
    extraPurchases,
    totalCosts,
    netPosition,
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
