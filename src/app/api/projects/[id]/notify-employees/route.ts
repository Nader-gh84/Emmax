import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildEmployeeProjectStartedEmailHtml } from "@/lib/email/employee-assignment-email";
import { logProjectActivity } from "@/lib/project-activity";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/errors";
import { formatProjectDate } from "@/types/project";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Re-send assignment emails without changing project status. */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id?.trim() ?? "";
    if (!isUuid(projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        "id, project_name, customer_id, start_date, start_date_confirmed, status"
      )
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError) {
      logSupabaseError(
        "POST /api/projects/[id]/notify-employees.project",
        projectError,
        { projectId }
      );
      return NextResponse.json(
        {
          error: "Failed to load project",
          supabase: {
            message: projectError.message,
            code: projectError.code,
            details: projectError.details,
            hint: projectError.hint,
          },
        },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status !== "in_progress" && project.status !== "completed") {
      return NextResponse.json(
        {
          error:
            "Notify is available after the project has been started (in progress).",
        },
        { status: 400 }
      );
    }

    const [{ data: assignmentRows }, { data: customerRow }, { data: profile }] =
      await Promise.all([
        supabase
          .from("project_employees")
          .select("employee_id, employees(id, full_name, email)")
          .eq("project_id", projectId)
          .eq("user_id", user.id),
        project.customer_id
          ? supabase
              .from("customers")
              .select("first_name, last_name, address")
              .eq("id", project.customer_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("business_profiles")
          .select("company_name")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

    type AssignmentRow = {
      employee_id: string;
      employees:
        | { id: string; full_name: string; email: string | null }
        | { id: string; full_name: string; email: string | null }[]
        | null;
    };

    const recipients = ((assignmentRows as AssignmentRow[] | null) ?? [])
      .map((row) => {
        const employee = Array.isArray(row.employees)
          ? row.employees[0]
          : row.employees;
        return employee;
      })
      .filter(
        (
          employee
        ): employee is { id: string; full_name: string; email: string | null } =>
          Boolean(employee?.email && isValidEmail(employee.email.trim()))
      );

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        emailsSent: 0,
        message:
          "No assigned employees with a valid email. Add emails in Advance Setting → Employees, then assign them here.",
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const customerName = customerRow
      ? `${customerRow.first_name ?? ""} ${customerRow.last_name ?? ""}`.trim()
      : "Customer";

    let projectAddress: string | null = null;
    try {
      const { data: overviewRow } = await supabase
        .from("projects")
        .select("address")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (typeof overviewRow?.address === "string") {
        projectAddress = overviewRow.address;
      }
    } catch {
      // Optional column — ignore.
    }

    const address =
      (projectAddress && projectAddress.trim()) ||
      (typeof customerRow?.address === "string" && customerRow.address.trim()) ||
      "—";
    const companyName = profile?.company_name?.trim() || "EmaX Contractor";
    const projectName = project.project_name?.trim() || "Untitled project";
    const startDate = formatProjectDate(project.start_date);

    const resend = new Resend(apiKey);
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? "EmaX <onboarding@resend.dev>";

    let emailsSent = 0;
    const emailErrors: string[] = [];

    for (const employee of recipients) {
      const html = buildEmployeeProjectStartedEmailHtml({
        companyName,
        employeeName: employee.full_name,
        projectName,
        customerName: customerName || "Customer",
        address,
        startDate,
      });

      const { error: sendError } = await resend.emails.send({
        from: fromEmail,
        to: [employee.email!.trim()],
        subject: `Project assignment: ${projectName}`,
        html,
      });

      if (sendError) {
        emailErrors.push(
          sendError.message || `Failed to email ${employee.full_name}`
        );
      } else {
        emailsSent += 1;
      }
    }

    await logProjectActivity(supabase, {
      userId: user.id,
      projectId,
      activityType: "employees_notified",
      description: `Sent assignment notification to ${emailsSent} employee(s)`,
    });

    return NextResponse.json({
      success: true,
      emailsSent,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
    });
  } catch (error) {
    console.error("[POST /api/projects/[id]/notify-employees]", error);
    return NextResponse.json(
      { error: "Unexpected error notifying employees" },
      { status: 500 }
    );
  }
}
