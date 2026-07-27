import type { MaterialItem } from "@/types/quote";

export interface QuotePdfInput {
  materials: MaterialItem[];
  taxRate: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  projectName?: string;
  notes?: string;
  validityDays?: number;
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
      taxRate: input.taxRate,
      materials: serializeMaterials(input.materials),
      allowDraftPlaceholders: input.allowDraftPlaceholders ?? false,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to generate PDF");
  }

  return response.blob();
}

export function downloadPdfBlob(blob: Blob, filename = "quote.pdf") {
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
