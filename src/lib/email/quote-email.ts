import {
  calculateVoiceQuoteTotals,
  formatCurrency,
  labourLineTotal,
  materialLineTotal,
  type DiscountMode,
} from "@/types/quote";
import type { PriceDisplayMode } from "@/lib/quotes";

export interface QuoteEmailItem {
  item: string;
  brand: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface QuoteEmailLabourItem {
  description: string;
  hours: number;
  rate: number;
}

export interface QuoteEmailData {
  customerName: string;
  customerEmail: string;
  projectName: string;
  notes?: string;
  validityDays: number;
  validUntil?: string | null;
  taxRate: number;
  gstRate?: number;
  pstRate?: number;
  discountMode?: DiscountMode;
  discountAmount?: number;
  discountPercent?: number;
  priceDisplayMode?: PriceDisplayMode;
  quoteNumber?: string | null;
  materials: QuoteEmailItem[];
  labourItems?: QuoteEmailLabourItem[];
  acceptUrl?: string;
}

function toMaterialItems(data: QuoteEmailData) {
  return data.materials.map((item, index) => ({
    id: `m-${index}`,
    unitCost: 0,
    ...item,
  }));
}

function toLabourItems(data: QuoteEmailData) {
  return (data.labourItems ?? []).map((item, index) => ({
    id: `l-${index}`,
    ...item,
  }));
}

function computeTotals(data: QuoteEmailData) {
  const gstRate = data.gstRate ?? data.taxRate ?? 0;
  const pstRate = data.pstRate ?? 0;
  return calculateVoiceQuoteTotals({
    materials: toMaterialItems(data),
    labourItems: toLabourItems(data),
    gstRate,
    pstRate,
    discountMode: data.discountMode ?? "amount",
    discountAmount: data.discountAmount ?? 0,
    discountPercent: data.discountPercent ?? 0,
  });
}

function buildDisplayRows(data: QuoteEmailData) {
  const mode = data.priceDisplayMode ?? "detailed";
  const materials = toMaterialItems(data);
  const labour = toLabourItems(data);

  if (mode === "merged" && materials.length > 0) {
    const materialsTotal = materials.reduce(
      (sum, item) => sum + materialLineTotal(item),
      0
    );
    return {
      materialRows: [
        {
          item: "Materials (combined)",
          brand: "—",
          quantity: 1,
          unit: "lot",
          unitPrice: materialsTotal,
          total: materialsTotal,
        },
      ],
      labourRows: labour.map((item) => ({
        item: item.description,
        brand: "Labour",
        quantity: item.hours,
        unit: "hour",
        unitPrice: item.rate,
        total: labourLineTotal(item),
      })),
    };
  }

  return {
    materialRows: materials.map((item) => ({
      item: item.item,
      brand: item.brand || "—",
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      total: materialLineTotal(item),
    })),
    labourRows: labour.map((item) => ({
      item: item.description,
      brand: "Labour",
      quantity: item.hours,
      unit: "hour",
      unitPrice: item.rate,
      total: labourLineTotal(item),
    })),
  };
}

export function buildQuoteEmailHtml(data: QuoteEmailData): string {
  const totals = computeTotals(data);
  const { materialRows, labourRows } = buildDisplayRows(data);
  const rows = [...materialRows, ...labourRows];

  const materialTableRows = rows
    .map(
      (item) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${escapeHtml(item.item)}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#475569;text-align:center;">${escapeHtml(item.brand)}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#475569;text-align:center;">${item.quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#475569;text-align:center;">${escapeHtml(item.unit)}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:right;">${formatCurrency(item.total)}</td>
      </tr>`
    )
    .join("");

  const gstRate = data.gstRate ?? data.taxRate ?? 0;
  const pstRate = data.pstRate ?? 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote from EmaX</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color:#0F172A;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:bold;color:#ffffff;">
                Ema<span style="color:#3B82F6;">X</span>
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">Professional Quote${data.quoteNumber ? ` · ${escapeHtml(data.quoteNumber)}` : ""}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:16px;color:#475569;">Hello ${escapeHtml(data.customerName)},</p>
              <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.6;">
                Thank you for your interest. Please find your quote${data.projectName ? ` for <strong style="color:#0f172a;">${escapeHtml(data.projectName)}</strong>` : ""} below.
              </p>

              ${
                data.notes
                  ? `
              <div style="background-color:#f8fafc;border-left:4px solid #3B82F6;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Scope of Work</p>
                <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${escapeHtml(data.notes)}</p>
              </div>`
                  : ""
              }

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background-color:#f8fafc;">
                    <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Item</th>
                    <th style="padding:12px;text-align:center;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Brand</th>
                    <th style="padding:12px;text-align:center;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Qty</th>
                    <th style="padding:12px;text-align:center;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Unit</th>
                    <th style="padding:12px;text-align:right;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${materialTableRows}
                </tbody>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#64748b;">Materials</td>
                  <td style="padding:4px 0;font-size:14px;color:#0f172a;text-align:right;">${formatCurrency(totals.materialsTotal)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#64748b;">Labour</td>
                  <td style="padding:4px 0;font-size:14px;color:#0f172a;text-align:right;">${formatCurrency(totals.labourTotal)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#64748b;">Subtotal</td>
                  <td style="padding:4px 0;font-size:14px;color:#0f172a;text-align:right;">${formatCurrency(totals.subtotal)}</td>
                </tr>
                ${
                  totals.discountApplied > 0
                    ? `<tr>
                  <td style="padding:4px 0;font-size:14px;color:#64748b;">Discount</td>
                  <td style="padding:4px 0;font-size:14px;color:#0f172a;text-align:right;">-${formatCurrency(totals.discountApplied)}</td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#64748b;">GST (${gstRate}%)</td>
                  <td style="padding:4px 0;font-size:14px;color:#0f172a;text-align:right;">${formatCurrency(totals.gst)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:#64748b;">PST (${pstRate}%)</td>
                  <td style="padding:4px 0;font-size:14px;color:#0f172a;text-align:right;">${formatCurrency(totals.pst)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;font-size:18px;font-weight:700;color:#0f172a;border-top:2px solid #e2e8f0;">Grand Total</td>
                  <td style="padding:12px 0 0;font-size:18px;font-weight:700;color:#3B82F6;text-align:right;border-top:2px solid #e2e8f0;">${formatCurrency(totals.grandTotal)}</td>
                </tr>
              </table>

              ${buildAcceptQuoteSection(data.acceptUrl ?? "")}

              <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
                This quote is valid for ${data.validityDays} days${data.validUntil ? ` (until ${escapeHtml(data.validUntil)})` : ""}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeAcceptUrl(url: string | undefined): url is string {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:")) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function buildAcceptQuoteSection(acceptUrl: string): string {
  if (!isSafeAcceptUrl(acceptUrl)) {
    return "";
  }

  const safeUrl = escapeHtml(acceptUrl);

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" style="display:inline-block;background-color:#3B82F6;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 32px;border-radius:10px;">
                      Accept This Quote
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:12px;">
                    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
                      Click above to confirm and accept this quote online.
                    </p>
                    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;word-break:break-all;">
                      Or copy this link: ${safeUrl}
                    </p>
                  </td>
                </tr>
              </table>`;
}

export function buildQuoteAcceptedEmailHtml({
  customerName,
  projectName,
  grandTotal,
  dashboardUrl,
}: {
  customerName: string;
  projectName: string;
  grandTotal: string;
  dashboardUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Accepted</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color:#0F172A;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;color:#ffffff;">Quote Accepted</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#475569;line-height:1.6;">
                Great news — <strong style="color:#0f172a;">${escapeHtml(customerName)}</strong> accepted your quote${projectName ? ` for <strong style="color:#0f172a;">${escapeHtml(projectName)}</strong>` : ""}.
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.6;">
                Total: <strong style="color:#3B82F6;">${escapeHtml(grandTotal)}</strong>
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background-color:#3B82F6;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;">
                      View in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
