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

function supabaseErrorPayload(
  error: { message?: string; code?: string; details?: string; hint?: string },
  fallback: string
) {
  return {
    error: fallback,
    supabase: {
      message: error.message ?? null,
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    },
  };
}

/**
 * POST /api/projects/[id]/start
 * Sets project status to in_progress after start-date + materials checks,
 * then best-effort notifies assigned employees and logs activity.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const projectId = params.id?.trim() ?? "";
  console.info("[POST /api/projects/[id]/start] begin", { projectId });

  try {
    if (!isUuid(projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[POST /api/projects/[id]/start] auth.getUser failed", {
        projectId,
        message: authError.message,
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Select only columns required for the start gate. Avoid optional overview
    // columns like `address` here — if migration 029 wasn't applied, an explicit
    // select of missing columns returns 500 ("Failed to load project").
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        "id, project_name, customer_id, start_date, start_date_confirmed, status"
      )
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError) {
      logSupabaseError("POST /api/projects/[id]/start.project", projectError, {
        projectId,
        userId: user.id,
      });
      const hint =
        projectError.message?.includes("start_date_confirmed") ||
        projectError.code === "42703"
          ? " A required projects column is missing — run migration 021_project_start_flow.sql (and 029 if address is needed)."
          : "";
      return NextResponse.json(
        {
          ...supabaseErrorPayload(
            projectError,
            `Failed to load project.${hint}`
          ),
        },
        { status: 500 }
      );
    }

    if (!project) {
      console.warn("[POST /api/projects/[id]/start] project not found", {
        projectId,
        userId: user.id,
      });
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

    if (project.status === "completed") {
      return NextResponse.json(
        { error: "This project is already completed" },
        { status: 400 }
      );
    }

    if (!project.start_date_confirmed) {
      return NextResponse.json(
        { error: "Set a project start date before starting the project" },
        { status: 400 }
      );
    }

    // Prefer the latest order; use limit(1) + maybeSingle to avoid PGRST116
    // when multiple material_orders exist for one project.
    const { data: order, error: orderError } = await supabase
      .from("material_orders")
      .select("id, status, materials_received_at, created_at")
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
        supabaseErrorPayload(orderError, "Failed to verify materials status"),
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
        previousStatus: project.status,
      });
      const hint =
        error.message?.includes("in_progress") || error.code === "23514"
          ? " Run migration 021_project_start_flow.sql in Supabase so status may be in_progress."
          : "";
      return NextResponse.json(
        supabaseErrorPayload(error, `Failed to start project.${hint}`),
        { status: 500 }
      );
    }

    if (!data) {
      console.error(
        "[POST /api/projects/[id]/start] update returned no row",
        { projectId, userId: user.id }
      );
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.info("[POST /api/projects/[id]/start] status updated", {
      projectId,
      status: data.status,
    });

    // Notify assigned employees + activity — best-effort only.
    // Start must remain successful even if email / activity / related tables fail.
    let emailsSent = 0;
    const emailErrors: string[] = [];
    let projectAddress: string | null = null;

    try {
      const { data: overviewRow, error: overviewError } = await supabase
        .from("projects")
        .select("address")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (overviewError) {
        // Optional column — do not fail start.
        console.warn(
          "[POST /api/projects/[id]/start] optional address select failed",
          overviewError.message
        );
      } else if (typeof overviewRow?.address === "string") {
        projectAddress = overviewRow.address;
      }
    } catch (overviewCatch) {
      console.warn(
        "[POST /api/projects/[id]/start] optional address select threw",
        overviewCatch
      );
    }

    try {
      const [{ data: assignmentRows, error: assignmentError }, customerResult, profileResult] =
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
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from("business_profiles")
            .select("company_name")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

      if (assignmentError) {
        logSupabaseError(
          "POST /api/projects/[id]/start.assignments",
          assignmentError,
          { projectId }
        );
        emailErrors.push(
          `Could not load assigned employees: ${assignmentError.message}`
        );
      }

      if (customerResult.error) {
        console.warn(
          "[POST /api/projects/[id]/start] customer lookup failed",
          customerResult.error.message
        );
      }

      if (profileResult.error) {
        console.warn(
          "[POST /api/projects/[id]/start] profile lookup failed",
          profileResult.error.message
        );
      }

      const customerRow = customerResult.data;
      const profile = profileResult.data;

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
          console.warn(
            "[POST /api/projects/[id]/start] RESEND_API_KEY missing; skipping emails"
          );
          emailErrors.push("RESEND_API_KEY is not configured");
        } else {
          const customerName = customerRow
            ? `${customerRow.first_name ?? ""} ${customerRow.last_name ?? ""}`.trim()
            : "Customer";
          const address =
            (projectAddress && projectAddress.trim()) ||
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
            try {
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
                console.error(
                  "[POST /api/projects/[id]/start] resend send failed",
                  {
                    projectId,
                    employeeId: employee.id,
                    message: sendError.message,
                  }
                );
                emailErrors.push(
                  sendError.message || `Failed to email ${employee.full_name}`
                );
              } else {
                emailsSent += 1;
              }
            } catch (sendCatch) {
              console.error(
                "[POST /api/projects/[id]/start] resend send threw",
                {
                  projectId,
                  employeeId: employee.id,
                  error: sendCatch,
                }
              );
              emailErrors.push(
                sendCatch instanceof Error
                  ? sendCatch.message
                  : `Failed to email ${employee.full_name}`
              );
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

    // Activity is optional — never roll back start if project_activity is missing (031).
    await logProjectActivity(supabase, {
      userId: user.id,
      projectId,
      activityType: "project_started",
      description: "Project started",
    });

    console.info("[POST /api/projects/[id]/start] success", {
      projectId,
      status: data.status,
      emailsSent,
      emailErrorCount: emailErrors.length,
    });

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
    console.error("[POST /api/projects/[id]/start] unhandled", {
      projectId,
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start project",
      },
      { status: 500 }
    );
  }
}
