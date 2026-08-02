function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildMaterialOrderRequestEmailHtml(input: {
  companyName: string;
  projectName: string;
  customerName: string;
  notes?: string;
  requiredByDate?: string;
  materials: Array<{
    name: string;
    brand?: string;
    quantity: number;
    unit: string;
  }>;
  confirmUrl: string;
}): string {
  const company = escapeHtml(input.companyName.trim() || "EmaX Contractor");
  const project = escapeHtml(input.projectName.trim() || "Project");
  const customer = escapeHtml(input.customerName.trim() || "Customer");
  const notes = (input.notes ?? "").trim();
  const requiredBy = (input.requiredByDate ?? "").trim();
  const safeUrl = escapeHtml(input.confirmUrl);

  const rows =
    input.materials.length > 0
      ? input.materials
          .map((material) => {
            const item = escapeHtml(material.name?.trim() || "Material");
            const brand = escapeHtml(material.brand?.trim() || "—");
            const quantity = escapeHtml(String(material.quantity));
            const unit = escapeHtml(material.unit?.trim() || "ea");
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
          <p style="margin:0;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.8;">Materials order</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:600;">${company}</h1>
          <p style="margin:8px 0 0;font-size:14px;opacity:0.85;">Project: ${project} · Customer: ${customer}</p>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
            Please review the materials list below and confirm when these items will be ready for pickup or delivery.
          </p>
          ${
            requiredBy
              ? `<p style="margin:0 0 16px;font-size:14px;color:#475569;"><strong>Required by:</strong> ${escapeHtml(requiredBy)}</p>`
              : ""
          }
          ${
            notes
              ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;"><strong>Order notes:</strong><br />${escapeHtml(notes).replace(/\n/g, "<br />")}</p>`
              : ""
          }
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
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
            <tr>
              <td align="center">
                <a href="${safeUrl}" style="display:inline-block;background-color:#3B82F6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;">
                  Confirm Availability
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
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">Sent via EmaX</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function buildMaterialsConfirmedEmailHtml(input: {
  supplierName: string;
  projectName: string;
  availabilityDate: string;
  availabilityTime: string;
  branchLocation: string;
  dashboardUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Materials Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color:#0F172A;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:bold;color:#ffffff;">Materials Ready</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#475569;line-height:1.6;">
                <strong style="color:#0f172a;">${escapeHtml(input.supplierName)}</strong> confirmed materials for
                <strong style="color:#0f172a;">${escapeHtml(input.projectName || "your project")}</strong>.
              </p>
              <p style="margin:0 0 8px;font-size:16px;color:#475569;line-height:1.6;">
                Ready on <strong style="color:#3B82F6;">${escapeHtml(input.availabilityDate)}</strong>
                at <strong style="color:#3B82F6;">${escapeHtml(input.availabilityTime)}</strong>
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.6;">
                Location: <strong style="color:#0f172a;">${escapeHtml(input.branchLocation)}</strong>
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;background-color:#3B82F6;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;">
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
