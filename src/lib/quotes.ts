import {
  DiscountMode,
  LabourItem,
  MaterialItem,
  Quote,
  StoredLabourItem,
  StoredMaterial,
  calculateVoiceQuoteTotals,
  labourToStored,
  materialsToStored,
  splitCustomerName,
  storedToMaterials,
  createLabourItem,
} from "@/types/quote";

export type CustomerSelectionMode = "existing" | "new";
export type PriceDisplayMode = "detailed" | "merged";

export interface QuoteWizardState {
  quoteId: string | null;
  quoteNumber: string | null;
  transcript: string;
  materials: MaterialItem[];
  labourItems: LabourItem[];
  taxRate: number;
  gstRate: number;
  pstRate: number;
  discountMode: DiscountMode;
  discountAmount: number;
  discountPercent: number;
  customerMode: CustomerSelectionMode;
  selectedCustomerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
  validUntil: string | null;
  priceDisplayMode: PriceDisplayMode;
}

export function storedToLabourItems(
  stored: StoredLabourItem[] = []
): LabourItem[] {
  return stored.map((item) =>
    createLabourItem({
      description: item.description ?? "",
      hours: Number(item.hours) || 0,
      rate: Number(item.rate) || 0,
    })
  );
}

export function quoteToWizardState(quote: Quote): QuoteWizardState {
  const gstRate = Number(quote.gst_rate ?? 5);
  const pstRate = Number(quote.pst_rate ?? 7);
  const discountAmount = Number(quote.discount_amount ?? 0);
  const discountPercent = Number(quote.discount_percent ?? 0);

  return {
    quoteId: quote.id,
    quoteNumber: quote.quote_number ?? null,
    transcript: quote.transcript ?? "",
    materials:
      quote.materials?.length > 0
        ? storedToMaterials(quote.materials as StoredMaterial[])
        : [],
    labourItems: storedToLabourItems(
      (quote.labour_items as StoredLabourItem[] | undefined) ?? []
    ),
    taxRate: Number(quote.tax_rate ?? gstRate + pstRate),
    gstRate,
    pstRate,
    discountMode: discountPercent > 0 && discountAmount <= 0 ? "percent" : "amount",
    discountAmount,
    discountPercent,
    customerMode: quote.customer_id ? "existing" : "new",
    selectedCustomerId: quote.customer_id,
    customerName: quote.customer_name ?? "",
    customerEmail: quote.customer_email ?? "",
    customerPhone: quote.customer_phone ?? "",
    projectName: quote.project_name ?? "",
    notes: quote.notes ?? "",
    validityDays: quote.validity_days,
    validUntil: quote.valid_until ?? null,
    priceDisplayMode: quote.price_display_mode ?? "detailed",
  };
}

function daysUntil(validUntil: string | null, fallback: number): number {
  if (!validUntil) return fallback;
  const target = new Date(`${validUntil}T00:00:00`);
  if (Number.isNaN(target.getTime())) return fallback;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
  const totals = calculateVoiceQuoteTotals({
    materials: state.materials,
    labourItems: state.labourItems,
    gstRate: state.gstRate,
    pstRate: state.pstRate,
    discountMode: state.discountMode,
    discountAmount: state.discountAmount,
    discountPercent: state.discountPercent,
  });
  const validityDays = daysUntil(state.validUntil, state.validityDays || 30);
  const taxTotal = totals.gst + totals.pst;

  const payload: Record<string, unknown> = {
    customer_id: customerId,
    customer_name: state.customerName.trim() || null,
    customer_email: state.customerEmail.trim() || null,
    customer_phone: state.customerPhone.trim() || null,
    project_name: state.projectName.trim() || null,
    notes: state.notes.trim() || null,
    materials: materialsToStored(state.materials),
    labour_items: labourToStored(state.labourItems),
    tax_rate: sanitizeNumeric(state.gstRate + state.pstRate),
    gst_rate: sanitizeNumeric(state.gstRate),
    pst_rate: sanitizeNumeric(state.pstRate),
    discount_amount:
      state.discountMode === "amount"
        ? sanitizeNumeric(state.discountAmount)
        : 0,
    discount_percent:
      state.discountMode === "percent"
        ? sanitizeNumeric(state.discountPercent)
        : 0,
    validity_days: sanitizeInteger(validityDays, 30),
    valid_until: state.validUntil || null,
    price_display_mode: state.priceDisplayMode,
    subtotal: sanitizeNumeric(totals.subtotal),
    tax: sanitizeNumeric(taxTotal),
    grand_total: sanitizeNumeric(totals.grandTotal),
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

  // Keep TypeScript quiet about unused userId in update payloads.
  void userId;

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

export function defaultValidUntil(days = 30): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatValidUntilLabel(validUntil: string | null): string {
  if (!validUntil) return "Not set";
  const date = new Date(`${validUntil}T00:00:00`);
  if (Number.isNaN(date.getTime())) return validUntil;
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
