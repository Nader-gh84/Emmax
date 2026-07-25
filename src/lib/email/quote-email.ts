import {
  calculateQuoteTotals,
  formatCurrency,
  materialLineTotal,
} from "@/types/quote";

export interface QuoteEmailItem {
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface QuoteEmailData {
  customerName: string;
  customerEmail: string;
  projectName: string;
  notes?: string;
  validityDays: number;
  taxRate: number;
  materials: QuoteEmailItem[];
}

export function buildQuoteEmailHtml(data: QuoteEmailData): string {
  const { subtotal, tax, grandTotal } = calculateQuoteTotals(
    data.materials.map((m, i) => ({
      id: String(i),
      ...m,
    })),
    data.taxRate
  );

  const materialRows = data.materials
    .map(
      (item) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${escapeHtml(item.item)}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#475569;text-align:center;">${item.quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#475569;text-align:center;">${escapeHtml(item.unit)}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:right;">${formatCurrency(materialLineTotal({ id: "", ...item }))}</td>
      </tr>`
    )
    .join("");

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
          <!-- Header -->
          <tr>
            <td style="background-color:#0F172A;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:bold;color:#ffffff;">
                Ema<span style="color:#3B82F6;">X</span>
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">Professional Quote</p>
            </td>
          </tr>

          <!-- Body -->
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

              <!-- Materials Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background-color:#f8fafc;">
                    <th style="padding:12px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Item</th>
                    <th style="padding:12px;text-align:center;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Qty</th>
                    <th style="padding:12px;text-align:center;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Unit</th>
                    <th style="padding:12px;text-align:right;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${materialRows}
                </tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding:8px 0;color:#64748b;font-size:14px;">Subtotal</td>
                  <td style="padding:8px 0;color:#0f172a;font-size:14px;text-align:right;">${formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#64748b;font-size:14px;">Tax (${data.taxRate}%)</td>
                  <td style="padding:8px 0;color:#0f172a;font-size:14px;text-align:right;">${formatCurrency(tax)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0;border-top:2px solid #0F172A;color:#0f172a;font-size:18px;font-weight:bold;">Grand Total</td>
                  <td style="padding:12px 0 0;border-top:2px solid #0F172A;color:#3B82F6;font-size:18px;font-weight:bold;text-align:right;">${formatCurrency(grandTotal)}</td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">
                If you have any questions, simply reply to this email. We look forward to working with you.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:13px;color:#64748b;">
                This quote is valid for <strong style="color:#0f172a;">${data.validityDays} days</strong> from the date of issue.
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">
                Sent via EmaX — AI-powered quotes for Canadian tradespeople
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
