export interface SupplierMaterialLine {
  item: string;
  brand: string;
  quantity: number;
  unit: string;
}

export function buildDefaultSupplierMessage(
  companyName: string,
  ownerFullName: string
): string {
  const company = companyName.trim() || "our company";
  const owner = ownerFullName.trim() || "the owner";

  return [
    "Hello,",
    "",
    `I am ${company}'s agent. Please provide pricing for the following materials.`,
    "",
    `For final confirmation, please double-check with Mr./Ms. ${owner} (Owner) and reply directly to this email with your quote and any pricing file attached.`,
    "",
    "Thank you.",
  ].join("\n");
}

export function formatSupplierMaterialsPlain(
  materials: SupplierMaterialLine[]
): string {
  if (materials.length === 0) {
    return "(No materials listed)";
  }

  return materials
    .map((material) => {
      const brand = material.brand?.trim() ? ` · ${material.brand.trim()}` : "";
      const item = material.item?.trim() || "Material";
      return `- ${material.quantity} ${material.unit} ${item}${brand}`;
    })
    .join("\n");
}

/** Materials-only list for suppliers — never includes labour or prices. */
export function toSupplierMaterialLines(
  materials: Array<{
    item: string;
    brand?: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
  }>
): SupplierMaterialLine[] {
  return materials.map((material) => ({
    item: material.item,
    brand: material.brand ?? "",
    quantity: material.quantity,
    unit: material.unit,
  }));
}

export function buildSupplierRequestEmailHtml(input: {
  messageBody: string;
  materials: SupplierMaterialLine[];
  projectName?: string;
  companyName?: string;
  acknowledgeUrl?: string;
}): string {
  const projectLabel = input.projectName?.trim() || "";
  const companyLabel = input.companyName?.trim() || "EmaX";
  const messageHtml = escapeHtml(input.messageBody).replace(/\n/g, "<br />");
  const ackSection = buildAcknowledgeSection(input.acknowledgeUrl);

  const rows =
    input.materials.length > 0
      ? input.materials
          .map((material) => {
            const item = escapeHtml(material.item?.trim() || "Material");
            const brand = escapeHtml(material.brand?.trim() || "—");
            const quantity = escapeHtml(String(material.quantity));
            const unit = escapeHtml(material.unit?.trim() || "each");
            return `<tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${item}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">${brand}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:right;">${quantity}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;">${unit}</td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="4" style="padding:12px;color:#64748b;">No materials listed</td></tr>`;

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:20px 24px;background:#0f172a;color:#ffffff;">
          <p style="margin:0;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.8;">Material pricing request</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:600;">${escapeHtml(companyLabel)}</h1>
          ${
            projectLabel
              ? `<p style="margin:8px 0 0;font-size:14px;opacity:0.85;">Project: ${escapeHtml(projectLabel)}</p>`
              : ""
          }
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">${messageHtml}</p>
          <h2 style="margin:0 0 12px;font-size:15px;color:#0f172a;">Materials list</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #cbd5e1;color:#64748b;font-weight:600;">Description</th>
                <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #cbd5e1;color:#64748b;font-weight:600;">Brand</th>
                <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #cbd5e1;color:#64748b;font-weight:600;">Qty</th>
                <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #cbd5e1;color:#64748b;font-weight:600;">Unit</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${ackSection}
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">Sent via EmaX · Pricing not included — please reply with your quote.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function buildAcknowledgeSection(acknowledgeUrl?: string): string {
  const url = acknowledgeUrl?.trim() ?? "";
  if (!url || (!url.startsWith("https://") && !url.startsWith("http://"))) {
    return "";
  }

  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return "";
  }

  const safeUrl = escapeHtml(url);

  return `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;margin-bottom:8px;">
            <tr>
              <td align="center">
                <a href="${safeUrl}" style="display:inline-block;background-color:#3B82F6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;">
                  I received this — pricing coming soon
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:12px;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;word-break:break-all;">
                  Or open this link: ${safeUrl}
                </p>
              </td>
            </tr>
          </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
