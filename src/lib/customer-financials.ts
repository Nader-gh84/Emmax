import type { Project } from "@/types/project";
import {
  computeFinancialSummary,
  type ChangeOrder,
  type ProjectExpense,
  type ProjectPayment,
  type TimeEntry,
} from "@/types/project-operations";
import type { MaterialOrder } from "@/types/material-order";

export type CustomerProjectFinancial = {
  projectId: string;
  projectName: string;
  status: Project["status"];
  contractValue: number;
  customerPayments: number;
  outstandingCustomerBalance: number;
  totalProjectCost: number;
  grossProfit: number;
};

export type CustomerPaymentListItem = {
  id: string;
  projectId: string;
  projectName: string;
  paymentType: ProjectPayment["payment_type"];
  amount: number;
  paymentDate: string;
  notes: string | null;
};

export type CustomerOutstandingBalance = {
  /** Sum of positive outstanding balances only (money still owed). */
  totalOutstanding: number;
  /** Projects with outstandingCustomerBalance > 0. */
  projectCount: number;
};

function groupByProjectId<T extends { project_id?: string | null }>(
  rows: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.project_id;
    if (!key) continue;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/**
 * Build per-project financial summaries for a customer using the same
 * computeFinancialSummary logic as Project Detail.
 */
export function buildCustomerProjectFinancials(input: {
  projects: Project[];
  payments: ProjectPayment[];
  expenses: ProjectExpense[];
  materialOrders: MaterialOrder[];
  timeEntries: TimeEntry[];
  changeOrders: ChangeOrder[];
}): CustomerProjectFinancial[] {
  const paymentsByProject = groupByProjectId(input.payments);
  const expensesByProject = groupByProjectId(input.expenses);
  const ordersByProject = groupByProjectId(input.materialOrders);
  const timeByProject = groupByProjectId(input.timeEntries);
  const changeOrdersByProject = groupByProjectId(input.changeOrders);

  return input.projects.map((project) => {
    const quoteAmount = Number(project.value) || 0;
    const summary = computeFinancialSummary({
      quoteAmount,
      depositAmount: Number(project.deposit_amount) || 0,
      payments: paymentsByProject.get(project.id) ?? [],
      expenses: expensesByProject.get(project.id) ?? [],
      materialOrders: ordersByProject.get(project.id) ?? [],
      timeEntries: timeByProject.get(project.id) ?? [],
      changeOrders: changeOrdersByProject.get(project.id) ?? [],
    });

    return {
      projectId: project.id,
      projectName: project.project_name?.trim() || "Untitled project",
      status: project.status,
      contractValue: summary.contractValue,
      customerPayments: summary.customerPayments,
      outstandingCustomerBalance: summary.outstandingCustomerBalance,
      totalProjectCost: summary.totalProjectCost,
      grossProfit: summary.grossProfit,
    };
  });
}

/**
 * Customer-level outstanding: sum only positive project balances.
 * Overpaid projects (negative balance) are excluded from the total and count.
 */
export function rollupCustomerOutstanding(
  financials: CustomerProjectFinancial[]
): CustomerOutstandingBalance | null {
  let totalOutstanding = 0;
  let projectCount = 0;

  for (const row of financials) {
    if (row.outstandingCustomerBalance > 0) {
      totalOutstanding += row.outstandingCustomerBalance;
      projectCount += 1;
    }
  }

  if (totalOutstanding <= 0 || projectCount === 0) {
    return null;
  }

  return { totalOutstanding, projectCount };
}

export function buildCustomerPaymentList(input: {
  projects: Project[];
  payments: ProjectPayment[];
}): CustomerPaymentListItem[] {
  const nameById = new Map(
    input.projects.map((p) => [
      p.id,
      p.project_name?.trim() || "Untitled project",
    ])
  );

  return [...input.payments]
    .map((payment) => ({
      id: payment.id,
      projectId: payment.project_id,
      projectName: nameById.get(payment.project_id) || "Unknown project",
      paymentType: payment.payment_type,
      amount: Number(payment.amount) || 0,
      paymentDate: payment.payment_date,
      notes: payment.notes,
    }))
    .sort((a, b) => {
      const byDate = String(b.paymentDate).localeCompare(String(a.paymentDate));
      if (byDate !== 0) return byDate;
      return a.projectName.localeCompare(b.projectName);
    });
}
