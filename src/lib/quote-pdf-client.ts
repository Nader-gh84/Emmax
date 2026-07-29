import type { DiscountMode, LabourItem, MaterialItem } from "@/types/quote";
import type { PriceDisplayMode } from "@/lib/quotes";

export interface QuotePdfInput {
  materials: MaterialItem[];
  labourItems?: LabourItem[];
  taxRate: number;
  gstRate?: number;
  pstRate?: number;
  discountMode?: DiscountMode;
  discountAmount?: number;
  discountPercent?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  projectName?: string;
  notes?: string;
  validityDays?: number;
  validUntil?: string | null;
  priceDisplayMode?: PriceDisplayMode;
  quoteNumber?: string | null;
  allowDraftPlaceholders?: boolean;
}

function serializeMaterials(materials: MaterialItem[]) {
  return materials.map(({ item, brand, quantity, unit, unitPrice }) => ({
    item,
    brand,
    quantity,
    unit,
    unitPrice,
  }));
}

function serializeLabour(labourItems: LabourItem[] = []) {
  return labourItems.map(({ description, hours, rate }) => ({
    description,
    hours,
    rate,
  }));
}

export async function fetchQuotePdfBlob(input: QuotePdfInput): Promise<Blob> {
  const response = await fetch("/api/generate-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: input.customerName ?? "",
      customerEmail: input.customerEmail ?? "",
      customerPhone: input.customerPhone ?? "",
      projectName: input.projectName ?? "",
      notes: input.notes ?? "",
      validityDays: input.validityDays ?? 30,
      validUntil: input.validUntil ?? null,
      taxRate: input.taxRate,
      gstRate: input.gstRate,
      pstRate: input.pstRate,
      discountMode: input.discountMode ?? "amount",
      discountAmount: input.discountAmount ?? 0,
      discountPercent: input.discountPercent ?? 0,
      priceDisplayMode: input.priceDisplayMode ?? "detailed",
      quoteNumber: input.quoteNumber ?? null,
      materials: serializeMaterials(input.materials),
      labourItems: serializeLabour(input.labourItems),
      allowDraftPlaceholders: input.allowDraftPlaceholders ?? false,
    }),
  });

  if (!response.ok) {
    let message = "Failed to generate PDF";
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // Non-JSON error body
    }
    throw new Error(message);
  }

  return response.blob();
}

export function downloadPdfBlob(blob: Blob, filename = "quote.pdf") {
  // Local browser download only — never pass this blob URL to email or storage.
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function isSmsSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function openSmsWithQuoteMessage(
  grandTotalLabel: string,
  phone?: string
) {
  const body = encodeURIComponent(
    `Your quote from EmaX: ${grandTotalLabel}. Reply if you have any questions.`
  );
  const target = phone?.trim()
    ? `sms:${phone.trim()}?body=${body}`
    : `sms:?body=${body}`;
  window.location.href = target;
}

export function openMailtoQuote(customerEmail: string, projectName: string) {
  const subject = encodeURIComponent(
    `Quote${projectName.trim() ? ` — ${projectName.trim()}` : ""}`
  );
  const body = encodeURIComponent(
    "Please find your quote attached or request a PDF copy."
  );
  window.location.href = `mailto:${customerEmail.trim()}?subject=${subject}&body=${body}`;
}
