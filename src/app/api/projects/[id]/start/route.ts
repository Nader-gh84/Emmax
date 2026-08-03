import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/errors";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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
      .select("id, start_date_confirmed, status")
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
          error:
            "Mark materials as received before starting the project",
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

    return NextResponse.json({
      success: true,
      alreadyStarted: false,
      status: data.status,
      startDate: data.start_date,
      startDateConfirmed: data.start_date_confirmed,
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
