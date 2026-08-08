import {
  computeLabourAccountSummary,
  computeLabourAveragePaymentDays,
  enrichLabourInvoices,
  enrichLabourPayments,
  payPeriodLabel,
  type EnrichedLabourInvoice,
  type EnrichedLabourPayment,
  type LabourAccountSummary,
  type LabourInvoiceBillingStatus,
  type LabourInvoiceRow,
  type LabourPaymentAllocationRow,
  type LabourPaymentRow,
} from "@/lib/labour-accounting";
import {
  formatEmployeeAddress,
  formatPayRate,
  type Employee,
} from "@/types/employee";

export type EmployeeDetailsTab = "invoices" | "payments" | "notes";

export type LabourInvoiceStatus = LabourInvoiceBillingStatus;

export type LabourInvoice = EnrichedLabourInvoice;

export type LabourPayment = EnrichedLabourPayment;

export type EmployeeDetailsViewModel = {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hireDate: string | null;
  payRateLabel: string;
  payPeriodLabel: string;
  payType: Employee["pay_type"];
  notes: string;
  summary: LabourAccountSummary;
  invoices: LabourInvoice[];
  payments: LabourPayment[];
};

export const EMPLOYEE_DETAILS_TABS: {
  id: EmployeeDetailsTab;
  label: string;
}[] = [
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "notes", label: "Notes" },
];

export function buildEmployeeDetailsViewModel(input: {
  employee: Employee;
  invoices: LabourInvoiceRow[];
  payments: LabourPaymentRow[];
  allocations: LabourPaymentAllocationRow[];
  projectNames?: Record<string, string>;
}): EmployeeDetailsViewModel {
  const invoices = enrichLabourInvoices({
    invoices: input.invoices,
    allocations: input.allocations,
    projectNames: input.projectNames,
  });
  const payments = enrichLabourPayments(input.payments);
  const summary = computeLabourAccountSummary({ invoices, payments });
  summary.averagePaymentDays = computeLabourAveragePaymentDays({
    invoices,
    allocations: input.allocations,
    payments: input.payments,
  });

  const address = formatEmployeeAddress(input.employee);

  return {
    id: input.employee.id,
    name: input.employee.full_name,
    role: input.employee.role,
    phone: input.employee.phone,
    email: input.employee.email,
    address: address || null,
    hireDate: input.employee.hire_date,
    payRateLabel: formatPayRate(
      input.employee.pay_rate,
      input.employee.pay_type
    ),
    payPeriodLabel: payPeriodLabel(input.employee.pay_period_type),
    payType: input.employee.pay_type,
    notes: "No notes yet.",
    summary,
    invoices,
    payments,
  };
}

export function formatEmployeeMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatEmployeeDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getEmployeeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || "?";
}

export function labourInvoiceStatusLabel(status: LabourInvoiceStatus): string {
  switch (status) {
    case "pending_confirmation":
      return "Pending review";
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    case "unpaid":
      return "Unpaid";
    case "overdue":
      return "Overdue";
  }
}

export function labourInvoiceStatusClass(status: LabourInvoiceStatus): string {
  switch (status) {
    case "pending_confirmation":
      return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
    case "paid":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "partial":
      return "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
    case "unpaid":
      return "bg-slate-500/15 text-slate-300 ring-slate-500/30";
    case "overdue":
      return "bg-red-500/15 text-red-300 ring-red-500/30";
  }
}
