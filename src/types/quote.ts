import { generateId } from "@/lib/id";

export interface MaterialItem {
  id: string;
  item: string;
  brand: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface LabourItem {
  id: string;
  description: string;
  hours: number;
  rate: number;
}

export interface TranscribeResponse {
  transcript: string;
  materials: Omit<MaterialItem, "id">[];
  labourItems: Omit<LabourItem, "id">[];
  scopeOfWork: string;
}

export interface QuoteFormData {
  transcript: string;
  materials: MaterialItem[];
  taxRate: number;
  scopeOfWork: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectName: string;
  notes: string;
  validityDays: number;
}

export function createMaterialItem(
  partial: Partial<MaterialItem> = {}
): MaterialItem {
  return {
    id: generateId(),
    item: partial.item ?? "",
    brand: partial.brand ?? "",
    quantity: partial.quantity ?? 1,
    unit: partial.unit ?? "each",
    unitPrice: partial.unitPrice ?? 0,
  };
}

export function createLabourItem(
  partial: Partial<LabourItem> = {}
): LabourItem {
  return {
    id: generateId(),
    description: partial.description ?? "",
    hours: partial.hours ?? 1,
    rate: partial.rate ?? 0,
  };
}

export function materialLineTotal(item: MaterialItem): number {
  return item.quantity * item.unitPrice;
}

export function labourLineTotal(item: LabourItem): number {
  return item.hours * item.rate;
}

export function calculateQuoteTotals(
  materials: MaterialItem[],
  taxRate: number
) {
  const subtotal = materials.reduce(
    (sum, item) => sum + materialLineTotal(item),
    0
  );
  const tax = subtotal * (taxRate / 100);
  const grandTotal = subtotal + tax;

  return { subtotal, tax, grandTotal };
}

export type DiscountMode = "amount" | "percent";

export function calculateVoiceQuoteTotals({
  materials,
  labourItems,
  gstRate,
  pstRate,
  discountMode,
  discountAmount,
  discountPercent,
}: {
  materials: MaterialItem[];
  labourItems: LabourItem[];
  gstRate: number;
  pstRate: number;
  discountMode: DiscountMode;
  discountAmount: number;
  discountPercent: number;
}) {
  const materialsTotal = materials.reduce(
    (sum, item) => sum + materialLineTotal(item),
    0
  );
  const labourTotal = labourItems.reduce(
    (sum, item) => sum + labourLineTotal(item),
    0
  );
  const subtotal = materialsTotal + labourTotal;
  const discountApplied =
    discountMode === "percent"
      ? subtotal * (sanitizeNumeric(discountPercent) / 100)
      : sanitizeNumeric(discountAmount);
  const taxable = Math.max(subtotal - discountApplied, 0);
  const gst = taxable * (sanitizeNumeric(gstRate) / 100);
  const pst = taxable * (sanitizeNumeric(pstRate) / 100);
  const grandTotal = taxable + gst + pst;

  return {
    materialsTotal,
    labourTotal,
    subtotal,
    discountApplied,
    taxable,
    gst,
    pst,
    grandTotal,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount);
}

export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export type QuoteStatus = "draft" | "sent" | "accepted";

export interface StoredMaterial {
  item: string;
  brand?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface StoredLabourItem {
  description: string;
  hours: number;
  rate: number;
}

export interface Quote {
  id: string;
  user_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  project_name: string | null;
  notes: string | null;
  materials: StoredMaterial[];
  labour_items?: StoredLabourItem[];
  tax_rate: number;
  gst_rate?: number;
  pst_rate?: number;
  discount_amount?: number;
  discount_percent?: number;
  quote_number?: string | null;
  valid_until?: string | null;
  price_display_mode?: "detailed" | "merged";
  validity_days: number;
  subtotal: number;
  tax: number;
  grand_total: number;
  status: QuoteStatus;
  transcript: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  pdf_url: string | null;
  confirmation_token: string;
  confirmed_at: string | null;
}

export function materialsToStored(materials: MaterialItem[]): StoredMaterial[] {
  return materials.map(({ item, brand, quantity, unit, unitPrice }) => ({
    item,
    brand: brand?.trim() || undefined,
    quantity: sanitizeNumeric(quantity),
    unit,
    unitPrice: sanitizeNumeric(unitPrice),
  }));
}

export function labourToStored(labourItems: LabourItem[]): StoredLabourItem[] {
  return labourItems.map(({ description, hours, rate }) => ({
    description,
    hours: sanitizeNumeric(hours),
    rate: sanitizeNumeric(rate),
  }));
}

function sanitizeNumeric(value: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function storedToMaterials(stored: StoredMaterial[]): MaterialItem[] {
  return stored.map((material) =>
    createMaterialItem({
      item: material.item ?? "",
      brand: material.brand ?? "",
      quantity: sanitizeNumeric(material.quantity ?? 1),
      unit: material.unit ?? "each",
      unitPrice: sanitizeNumeric(material.unitPrice ?? 0),
    })
  );
}

export function splitCustomerName(fullName: string): {
  first_name: string;
  last_name: string;
} {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { first_name: "", last_name: "" };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

export function formatQuoteDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
