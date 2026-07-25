import { generateId } from "@/lib/id";

export interface MaterialItem {
  id: string;
  item: string;
  brand: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface TranscribeResponse {
  transcript: string;
  materials: Omit<MaterialItem, "id">[];
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

export function materialLineTotal(item: MaterialItem): number {
  return item.quantity * item.unitPrice;
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
