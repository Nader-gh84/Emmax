function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Email sent to assigned employees when a project is started. */
export function buildEmployeeProjectStartedEmailHtml(input: {
  companyName: string;
  employeeName: string;
  projectName: string;
  customerName: string;
  address: string;
  startDate: string;
}): string {
  const company = escapeHtml(input.companyName.trim() || "EmaX Contractor");
  const employee = escapeHtml(input.employeeName.trim() || "Team member");
  const project = escapeHtml(input.projectName.trim() || "Project");
  const customer = escapeHtml(input.customerName.trim() || "Customer");
  const address = escapeHtml(input.address.trim() || "—");
  const startDate = escapeHtml(input.startDate.trim() || "—");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:20px 24px;background:#0f172a;color:#ffffff;">
          <p style="margin:0;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.8;">Project assignment</p>
          <h1 style="margin:8px 0 0;font-size:20px;font-weight:600;">${company}</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
            Hi ${employee},
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
            You have been assigned to a project that is now starting. Please review the details below.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;width:140px;">Project</td>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:600;">${project}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Customer</td>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;">${customer}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">Address</td>
              <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;">${address}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Start date</td>
              <td style="padding:10px 0;color:#0f172a;">${startDate}</td>
            </tr>
          </table>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
            If you have questions about this assignment, contact your project manager.
          </p>
        </div>
      </div>
      <p style="margin:16px 8px 0;font-size:12px;color:#94a3b8;text-align:center;">
        Sent via EmaX
      </p>
    </div>
  </body>
</html>`;
}
