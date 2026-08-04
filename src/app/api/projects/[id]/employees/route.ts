import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/errors";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function PUT(
  request: Request,
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

    const body = (await request.json()) as { employeeIds?: unknown };
    const employeeIds = Array.isArray(body.employeeIds)
      ? body.employeeIds
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(isUuid)
      : [];

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError) {
      logSupabaseError("PUT /api/projects/[id]/employees.project", projectError, {
        projectId,
      });
      return NextResponse.json(
        { error: "Failed to verify project" },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (employeeIds.length > 0) {
      const { data: ownedEmployees, error: ownedError } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .in("id", employeeIds);

      if (ownedError) {
        logSupabaseError(
          "PUT /api/projects/[id]/employees.employees",
          ownedError,
          { projectId }
        );
        const missing =
          ownedError.code === "42P01" ||
          ownedError.code === "PGRST205" ||
          ownedError.message?.includes("employees");
        return NextResponse.json(
          {
            error: missing
              ? "Employees table missing. Run migration 030_employees_and_project_assignments.sql in Supabase."
              : "Failed to verify employees",
          },
          { status: 500 }
        );
      }

      const ownedIds = new Set(
        ((ownedEmployees as { id: string }[] | null) ?? []).map((row) => row.id)
      );
      if (employeeIds.some((id) => !ownedIds.has(id))) {
        return NextResponse.json(
          { error: "One or more employees were not found" },
          { status: 400 }
        );
      }
    }

    const { error: deleteError } = await supabase
      .from("project_employees")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (deleteError) {
      logSupabaseError("PUT /api/projects/[id]/employees.delete", deleteError, {
        projectId,
      });
      const missing =
        deleteError.code === "42P01" ||
        deleteError.code === "PGRST205" ||
        deleteError.message?.includes("project_employees");
      return NextResponse.json(
        {
          error: missing
            ? "Assignments table missing. Run migration 030_employees_and_project_assignments.sql in Supabase."
            : "Failed to clear previous assignments",
        },
        { status: 500 }
      );
    }

    if (employeeIds.length > 0) {
      const rows = employeeIds.map((employeeId) => ({
        user_id: user.id,
        project_id: projectId,
        employee_id: employeeId,
      }));

      const { error: insertError } = await supabase
        .from("project_employees")
        .insert(rows);

      if (insertError) {
        logSupabaseError(
          "PUT /api/projects/[id]/employees.insert",
          insertError,
          { projectId }
        );
        return NextResponse.json(
          { error: "Failed to save employee assignments" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      employeeIds,
    });
  } catch (error) {
    console.error("[PUT /api/projects/[id]/employees]", error);
    return NextResponse.json(
      { error: "Unexpected error saving assignments" },
      { status: 500 }
    );
  }
}
