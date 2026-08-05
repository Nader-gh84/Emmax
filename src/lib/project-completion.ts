import type { MaterialOrder } from "@/types/material-order";
import {
  computeFinancialSummary,
  normalizePaymentStatus,
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
  | "suppliers_paid"
  | "labour_paid"
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
 * Live project completion checklist (6 conditions; documents deferred).
 *
 * Empty collections: tasks / supplier orders / time entries / expenses pass
 * vacuously when there is nothing incomplete. Materials Ready requires at
 * least one order with materials_received_at. Customer balance passes when
 * outstandingCustomerBalance <= 0 (paid or overpaid).
 */
export function computeProjectCompletionChecklist(input: {
  tasks: ProjectTask[];
  materialOrders: MaterialOrder[];
  payments: ProjectPayment[];
  expenses: ProjectExpense[];
  changeOrders?: ChangeOrder[];
  timeEntries: TimeEntry[];
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

  const suppliersPaid =
    input.materialOrders.length === 0 ||
    input.materialOrders.every(
      (order) => normalizePaymentStatus(order.payment_status) === "paid"
    );

  const labourPaid =
    input.timeEntries.length === 0 ||
    input.timeEntries.every(
      (entry) => normalizePaymentStatus(entry.payment_status) === "paid"
    );

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
      id: "suppliers_paid",
      label: "All supplier invoices have been paid",
      complete: suppliersPaid,
    },
    {
      id: "labour_paid",
      label: "All employee labour costs have been paid",
      complete: labourPaid,
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
