import {
  calculateVoiceQuoteTotals,
  labourLineTotal,
  materialLineTotal,
} from "@/types/quote";
import type { QuotePdfData } from "@/lib/pdf/quote-pdf-types";
import {
  DEFAULT_QUOTE_TEMPLATE,
  normalizeQuoteTemplate,
  type QuoteTemplateId,
} from "@/lib/pdf/quote-templates";

export interface CompanyBrandingForPdf {
  companyName: string;
  tagline: string;
  fullName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  country: string;
  quoteTemplate: QuoteTemplateId;
}

export const EMPTY_COMPANY_BRANDING: CompanyBrandingForPdf = {
  companyName: "",
  tagline: "",
  fullName: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  country: "",
  quoteTemplate: DEFAULT_QUOTE_TEMPLATE,
};

export function formatCompanyAddress(branding: CompanyBrandingForPdf): string {
  return [branding.address, branding.city, branding.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

export function buildPdfLineRows(data: QuotePdfData) {
  const materials = data.materials.map((item, index) => ({
    id: `m-${index}`,
    ...item,
  }));
  const labour = (data.labourItems ?? []).map((item, index) => ({
    id: `l-${index}`,
    ...item,
  }));
  const mode = data.priceDisplayMode ?? "detailed";

  const materialRows =
    mode === "merged" && materials.length > 0
      ? [
          {
            item: "Materials (combined)",
            brand: "—",
            quantity: 1,
            unit: "lot",
            unitPrice: materials.reduce(
              (sum, item) => sum + materialLineTotal(item),
              0
            ),
            total: materials.reduce(
              (sum, item) => sum + materialLineTotal(item),
              0
            ),
            kind: "material" as const,
          },
        ]
      : materials.map((item) => ({
          item: item.item,
          brand: item.brand || "—",
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: materialLineTotal(item),
          kind: "material" as const,
        }));

  const labourRows = labour.map((item) => ({
    item: item.description,
    brand: "Labour",
    quantity: item.hours,
    unit: "hour",
    unitPrice: item.rate,
    total: labourLineTotal(item),
    kind: "labour" as const,
  }));

  return [...materialRows, ...labourRows];
}

export function computePdfTotals(data: QuotePdfData) {
  const gstRate = data.gstRate ?? data.taxRate ?? 0;
  const pstRate = data.pstRate ?? 0;
  return calculateVoiceQuoteTotals({
    materials: data.materials.map((item, index) => ({
      id: `m-${index}`,
      ...item,
    })),
    labourItems: (data.labourItems ?? []).map((item, index) => ({
      id: `l-${index}`,
      ...item,
    })),
    gstRate,
    pstRate,
    discountMode: data.discountMode ?? "amount",
    discountAmount: data.discountAmount ?? 0,
    discountPercent: data.discountPercent ?? 0,
  });
}

export function resolveQuoteDateLabel(validUntil?: string | null): {
  issued: string;
  validUntil: string;
} {
  const issued = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const validUntilLabel = validUntil
    ? new Date(
        validUntil.includes("T") ? validUntil : `${validUntil}T00:00:00`
      ).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
  return { issued, validUntil: validUntilLabel };
}

export function brandingFromProfileRow(
  row: Record<string, unknown> | null | undefined
): CompanyBrandingForPdf {
  if (!row) return { ...EMPTY_COMPANY_BRANDING };
  return {
    companyName: String(row.company_name ?? "").trim(),
    tagline: String(row.tagline ?? "").trim(),
    fullName: String(row.full_name ?? "").trim(),
    email: String(row.email ?? "").trim(),
    phone: String(row.phone ?? "").trim(),
    website: String(row.website ?? "").trim(),
    address: String(row.address ?? "").trim(),
    city: String(row.city ?? "").trim(),
    country: String(row.country ?? "").trim(),
    quoteTemplate: normalizeQuoteTemplate(row.quote_template),
  };
}
