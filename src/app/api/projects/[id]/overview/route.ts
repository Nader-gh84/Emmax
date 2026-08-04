import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/errors";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

interface OverviewUpdateBody {
  description?: string;
  address?: string;
  projectType?: string;
  projectManager?: string;
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

    const body = (await request.json()) as OverviewUpdateBody;
    const description = body.description?.trim() ?? "";
    const address = body.address?.trim() ?? "";
    const projectType = body.projectType?.trim() ?? "";
    const projectManager = body.projectManager?.trim() ?? "";

    if (!description) {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 }
      );
    }

    if (!projectType) {
      return NextResponse.json(
        { error: "Project type is required." },
        { status: 400 }
      );
    }

    if (!projectManager) {
      return NextResponse.json(
        { error: "Project manager is required." },
        { status: 400 }
      );
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("projects")
      .update({
        notes: description,
        address: address || null,
        project_type: projectType,
        project_manager: projectManager,
        updated_at: updatedAt,
      })
      .eq("id", projectId)
      .eq("user_id", user.id)
      .select(
        "id, notes, address, project_type, project_manager, updated_at"
      )
      .maybeSingle();

    if (error) {
      logSupabaseError("PATCH /api/projects/[id]/overview", error, {
        projectId,
      });
      const missingColumn =
        error.message?.includes("project_type") ||
        error.message?.includes("project_manager") ||
        error.code === "42703";
      const hint = missingColumn
        ? " Run migration 029_project_overview_fields.sql in Supabase."
        : "";
      return NextResponse.json(
        { error: `Failed to save project overview.${hint}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      description: data.notes ?? "",
      address: data.address ?? "",
      projectType: data.project_type ?? "",
      projectManager: data.project_manager ?? "",
    });
  } catch (error) {
    console.error("[PATCH /api/projects/[id]/overview]", error);
    return NextResponse.json(
      { error: "Unexpected error saving project overview." },
      { status: 500 }
    );
  }
}
