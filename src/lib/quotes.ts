import {
  MaterialItem,
  Quote,
  StoredMaterial,
  calculateQuoteTotals,
  materialsToStored,
  splitCustomerName,
  storedToMaterials,
} from "@/types/quote";

export type CustomerSelectionMode = "existing" | "new";

export interface QuoteWizardState {
  quoteId: string | null;
  transcript: string;
  materials: MaterialItem[];
  taxRate: number;
  customerMode: CustomerSelectionMode;
  selectedCustomerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
}

export function quoteToWizardState(quote: Quote): QuoteWizardState {
  return {
    quoteId: quote.id,
    transcript: quote.transcript ?? "",
    materials:
      quote.materials?.length > 0
        ? storedToMaterials(quote.materials as StoredMaterial[])
        : [],
    taxRate: Number(quote.tax_rate),
    customerMode: quote.customer_id ? "existing" : "new",
    selectedCustomerId: quote.customer_id,
    customerName: quote.customer_name ?? "",
    customerEmail: quote.customer_email ?? "",
    customerPhone: quote.customer_phone ?? "",
    projectName: quote.project_name ?? "",
    notes: quote.notes ?? "",
    validityDays: quote.validity_days,
  };
}

export function buildQuoteRecordPayload(
  state: QuoteWizardState,
  userId: string,
  status: "draft" | "sent",
  customerId: string | null,
  options: {
    sentAt?: string | null;
    pdfUrl?: string | null;
    includePdfUrl?: boolean;
  } = {}
) {
  const opts = options ?? {};
  const { subtotal, tax, grandTotal } = calculateQuoteTotals(
    state.materials,
    state.taxRate
  );

  const payload: Record<string, unknown> = {
    customer_id: customerId,
    customer_name: state.customerName.trim() || null,
    customer_email: state.customerEmail.trim() || null,
    customer_phone: state.customerPhone.trim() || null,
    project_name: state.projectName.trim() || null,
    notes: state.notes.trim() || null,
    materials: materialsToStored(state.materials),
    tax_rate: sanitizeNumeric(state.taxRate),
    validity_days: sanitizeInteger(state.validityDays, 30),
    subtotal: sanitizeNumeric(subtotal),
    tax: sanitizeNumeric(tax),
    grand_total: sanitizeNumeric(grandTotal),
    status,
    transcript: state.transcript.trim() || null,
    updated_at: new Date().toISOString(),
    sent_at:
      status === "sent"
        ? opts.sentAt ?? new Date().toISOString()
        : null,
  };

  if (opts.includePdfUrl) {
    payload.pdf_url = opts.pdfUrl ?? null;
  }

  return payload;
}

export function buildQuoteInsertPayload(
  state: QuoteWizardState,
  userId: string,
  status: "draft" | "sent",
  customerId: string | null,
  options: {
    sentAt?: string | null;
    pdfUrl?: string | null;
  } = {}
) {
  return {
    user_id: userId,
    ...buildQuoteRecordPayload(state, userId, status, customerId, {
      ...options,
      includePdfUrl: true,
    }),
  };
}

function sanitizeNumeric(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function sanitizeInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
}

export function buildNewCustomerPayload(state: QuoteWizardState) {
  const { first_name, last_name } = splitCustomerName(state.customerName);

  return {
    first_name: first_name || "Customer",
    last_name: last_name || "",
    email: state.customerEmail.trim() || null,
    phone: state.customerPhone.trim() || null,
    address: null,
    notes: null,
  };
}
