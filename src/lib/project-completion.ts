import type { MaterialOrder } from "@/types/material-order";
import {
  computeFinancialSummary,
  type ChangeOrder,
  type ProjectExpense,
  type ProjectPayment,
  type ProjectTask,
  type TimeEntry,
} from "@/types/project-operations";

export type ProjectCompletionItemId =
  | "tasks"
  | "materials"
  | "customer_paid"
  | "expenses_reviewed";

export type ProjectCompletionItem = {
  id: ProjectCompletionItemId;
  label: string;
  complete: boolean;
};

export type ProjectCompletionChecklist = {
  items: ProjectCompletionItem[];
  allComplete: boolean;
  remainingCount: number;
};

/**
 * Live project completion checklist (4 conditions).
 * Supplier invoice + labour payment checks deferred until those accounting
 * flows are designed. Documents check also deferred.
 *
 * Empty tasks / expenses pass vacuously. Materials Ready requires at least
 * one order with materials_received_at. Customer balance passes when
 * outstandingCustomerBalance <= 0 (paid or overpaid).
 */
export function computeProjectCompletionChecklist(input: {
  tasks: ProjectTask[];
  materialOrders: MaterialOrder[];
  payments: ProjectPayment[];
  expenses: ProjectExpense[];
  changeOrders?: ChangeOrder[];
  /** Optional — still passed through for financial summary consistency. */
  timeEntries?: TimeEntry[];
  quoteAmount: number;
  depositAmount?: number;
}): ProjectCompletionChecklist {
  const tasksComplete =
    input.tasks.length === 0 ||
    input.tasks.every((task) => task.status === "completed");

  const materialsReceived = input.materialOrders.some((order) =>
    Boolean(order.materials_received_at)
  );

  const summary = computeFinancialSummary({
    quoteAmount: input.quoteAmount,
    depositAmount: input.depositAmount,
    payments: input.payments,
    expenses: input.expenses,
    materialOrders: input.materialOrders,
    timeEntries: input.timeEntries,
    changeOrders: input.changeOrders,
  });

  const customerPaid = summary.outstandingCustomerBalance <= 0;
  const expensesReviewed = summary.pendingReviewCount === 0;

  const items: ProjectCompletionItem[] = [
    {
      id: "tasks",
      label: "All project tasks completed",
      complete: tasksComplete,
    },
    {
      id: "materials",
      label: "All required materials received",
      complete: materialsReceived,
    },
    {
      id: "customer_paid",
      label: "Customer has paid the full project balance",
      complete: customerPaid,
    },
    {
      id: "expenses_reviewed",
      label: "All extra purchases reviewed (billing status set)",
      complete: expensesReviewed,
    },
  ];

  const remainingCount = items.filter((item) => !item.complete).length;

  return {
    items,
    allComplete: remainingCount === 0,
    remainingCount,
  };
}
