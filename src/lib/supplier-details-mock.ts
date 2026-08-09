import {
  computeAveragePaymentDays,
  computeSupplierAccountSummary,
  enrichSupplierInvoices,
  enrichSupplierPayments,
  paymentTermsLabel,
  type EnrichedSupplierInvoice,
  type EnrichedSupplierPayment,
  type SupplierAccountSummary,
  type SupplierInvoiceBillingStatus,
  type SupplierInvoiceRow,
  type SupplierPaymentAllocationRow,
  type SupplierPaymentRow,
} from "@/lib/supplier-accounting";
import type { Supplier } from "@/types/supplier";

export type SupplierDetailsTab =
  | "invoices"
  | "payments"
  | "statements"
  | "documents"
  | "notes";

export type SupplierInvoiceStatus = SupplierInvoiceBillingStatus;

export type SupplierInvoice = EnrichedSupplierInvoice;

export type SupplierPayment = EnrichedSupplierPayment;

export type SupplierDocument = {
  id: string;
  name: string;
  kind: "invoice" | "statement" | "receipt" | "other";
  uploadedAt: string;
  sizeLabel: string;
  typeLabel: string;
};

export type SupplierDetailsViewModel = {
  id: string;
  name: string;
  status: "active" | "inactive";
  phone: string | null;
  email: string | null;
  address: string | null;
  contactPerson: string | null;
  paymentTerms: string;
  defaultAccountNumber: string;
  notes: string;
  /** Storage path in supplier-logos bucket. */
  logoUrl: string | null;
  summary: SupplierAccountSummary;
  invoices: SupplierInvoice[];
  payments: SupplierPayment[];
  /** Documents vault not built yet — always empty for now. */
  documents: SupplierDocument[];
};

export const SUPPLIER_DETAILS_TABS: {
  id: SupplierDetailsTab;
  label: string;
}[] = [
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "statements", label: "Statements" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
];

export function buildSupplierDetailsViewModel(input: {
  supplier: Supplier;
  invoices: SupplierInvoiceRow[];
  payments: SupplierPaymentRow[];
  allocations: SupplierPaymentAllocationRow[];
  projectNames?: Record<string, string>;
  customerNames?: Record<string, string>;
}): SupplierDetailsViewModel {
  const invoices = enrichSupplierInvoices({
    invoices: input.invoices,
    allocations: input.allocations,
    projectNames: input.projectNames,
    customerNames: input.customerNames,
  });
  const payments = enrichSupplierPayments(input.payments);
  const summary = computeSupplierAccountSummary({
    supplier: input.supplier,
    invoices,
    payments,
  });
  summary.averagePaymentDays = computeAveragePaymentDays({
    invoices,
    allocations: input.allocations,
    payments: input.payments,
  });

  return {
    id: input.supplier.id,
    name: input.supplier.supplier_name,
    status: "active",
    phone: input.supplier.phone,
    email: input.supplier.email,
    address: input.supplier.location,
    contactPerson: input.supplier.contact_person,
    paymentTerms: paymentTermsLabel(input.supplier.payment_terms_type),
    defaultAccountNumber:
      input.supplier.default_account_number?.trim() || "—",
    notes: input.supplier.notes?.trim() || "No notes yet.",
    logoUrl: input.supplier.logo_url?.trim() || null,
    summary,
    invoices,
    payments,
    documents: [],
  };
}

export function formatSupplierMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSupplierDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getSupplierInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || "?";
}

export function supplierInvoiceStatusLabel(
  status: SupplierInvoiceStatus
): string {
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

export function supplierInvoiceStatusClass(
  status: SupplierInvoiceStatus
): string {
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
