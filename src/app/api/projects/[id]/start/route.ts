import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildEmployeeProjectStartedEmailHtml } from "@/lib/email/employee-assignment-email";
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
        "id, project_name, customer_id, start_date, start_date_confirmed, status, address, notes"
      )
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError) {
      logSupabaseError("POST /api/projects/[id]/start.project", projectError, {
        projectId,
      });
      return NextResponse.json(
        { error: "Failed to load project" },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status === "in_progress") {
      return NextResponse.json({
        success: true,
        alreadyStarted: true,
        status: "in_progress",
        emailsSent: 0,
      });
    }

    if (!project.start_date_confirmed) {
      return NextResponse.json(
        { error: "Set a project start date before starting the project" },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("material_orders")
      .select("id, status, materials_received_at")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      logSupabaseError("POST /api/projects/[id]/start.order", orderError, {
        projectId,
      });
      return NextResponse.json(
        { error: "Failed to verify materials status" },
        { status: 500 }
      );
    }

    if (!order || order.status !== "confirmed" || !order.materials_received_at) {
      return NextResponse.json(
        {
          error: "Mark materials as received before starting the project",
        },
        { status: 400 }
      );
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("projects")
      .update({
        status: "in_progress",
        updated_at: updatedAt,
      })
      .eq("id", projectId)
      .eq("user_id", user.id)
      .select("id, status, start_date, start_date_confirmed")
      .maybeSingle();

    if (error) {
      logSupabaseError("POST /api/projects/[id]/start.update", error, {
        projectId,
      });
      const hint =
        error.message?.includes("in_progress") || error.code === "23514"
          ? " Run migration 021_project_start_flow.sql in Supabase."
          : "";
      return NextResponse.json(
        { error: `Failed to start project.${hint}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Notify assigned employees (best-effort — start still succeeds if email fails).
    let emailsSent = 0;
    const emailErrors: string[] = [];

    try {
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

      if (recipients.length > 0) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          emailErrors.push("RESEND_API_KEY is not configured");
        } else {
          const customerName = customerRow
            ? `${customerRow.first_name ?? ""} ${customerRow.last_name ?? ""}`.trim()
            : "Customer";
          const address =
            (typeof project.address === "string" && project.address.trim()) ||
            (typeof customerRow?.address === "string" &&
              customerRow.address.trim()) ||
            "—";
          const companyName =
            profile?.company_name?.trim() || "EmaX Contractor";
          const projectName =
            project.project_name?.trim() || "Untitled project";
          const startDate = formatProjectDate(
            (data.start_date as string | null) || project.start_date
          );

          const resend = new Resend(apiKey);
          const fromEmail =
            process.env.RESEND_FROM_EMAIL ?? "EmaX <onboarding@resend.dev>";

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
              subject: `Project started: ${projectName}`,
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
        }
      }
    } catch (notifyError) {
      console.error(
        "[POST /api/projects/[id]/start.notifyEmployees]",
        notifyError
      );
      emailErrors.push("Failed to notify assigned employees");
    }

    return NextResponse.json({
      success: true,
      alreadyStarted: false,
      status: data.status,
      startDate: data.start_date,
      startDateConfirmed: data.start_date_confirmed,
      emailsSent,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
    });
  } catch (error) {
    console.error("[POST /api/projects/[id]/start]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start project",
      },
      { status: 500 }
    );
  }
}
