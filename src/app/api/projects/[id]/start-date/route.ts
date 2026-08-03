import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/errors";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function PATCH(
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

    const body = (await request.json()) as { startDate?: string };
    const startDate = body.startDate?.trim() ?? "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json(
        { error: "startDate must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("projects")
      .update({
        start_date: startDate,
        start_date_confirmed: true,
        updated_at: updatedAt,
      })
      .eq("id", projectId)
      .eq("user_id", user.id)
      .select("id, start_date, start_date_confirmed, status")
      .maybeSingle();

    if (error) {
      logSupabaseError("PATCH /api/projects/[id]/start-date", error, {
        projectId,
      });
      const hint =
        error.message?.includes("start_date_confirmed") ||
        error.code === "42703"
          ? " Run migration 021_project_start_flow.sql in Supabase."
          : "";
      return NextResponse.json(
        { error: `Failed to update start date.${hint}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      startDate: data.start_date,
      startDateConfirmed: data.start_date_confirmed,
      status: data.status,
    });
  } catch (error) {
    console.error("[PATCH /api/projects/[id]/start-date]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update start date",
      },
      { status: 500 }
    );
  }
}
