import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
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

const MIGRATION_SQL_HINT =
  "Run migration 029_project_overview_fields.sql in the Supabase SQL Editor, then run: NOTIFY pgrst, 'reload schema';";

function isMissingOverviewColumnError(error: PostgrestError): boolean {
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const message = (error.message || "").toLowerCase();
  return (
    message.includes("project_type") ||
    message.includes("project_manager") ||
    (message.includes("address") && message.includes("column")) ||
    message.includes("schema cache")
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

    // Confirm the row exists and belongs to this user (RLS + explicit user_id).
    const { data: existing, error: existingError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      logSupabaseError("PATCH /api/projects/[id]/overview.lookup", existingError, {
        projectId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Failed to load project before saving." },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Project not found or you do not have permission to update it.",
        },
        { status: 404 }
      );
    }

    // Full update: notes (description) + overview columns from migration 029.
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
      .select("id, notes, address, project_type, project_manager, updated_at")
      .maybeSingle();

    if (error) {
      logSupabaseError("PATCH /api/projects/[id]/overview", error, {
        projectId,
        userId: user.id,
      });

      if (isMissingOverviewColumnError(error)) {
        // Still persist description to the existing `notes` column so Save
        // is not a total no-op while migration 029 is pending.
        const { data: notesOnly, error: notesError } = await supabase
          .from("projects")
          .update({
            notes: description,
            updated_at: updatedAt,
          })
          .eq("id", projectId)
          .eq("user_id", user.id)
          .select("id, notes")
          .maybeSingle();

        if (notesError || !notesOnly) {
          if (notesError) {
            logSupabaseError(
              "PATCH /api/projects/[id]/overview.notesFallback",
              notesError,
              { projectId }
            );
          }
          return NextResponse.json(
            {
              error: `Failed to save project overview. ${MIGRATION_SQL_HINT}`,
              code: error.code ?? null,
            },
            { status: 500 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            partial: true,
            description: notesOnly.notes ?? description,
            address: "",
            projectType: "",
            projectManager: "",
            error: `Description was saved, but address / project type / project manager need new columns. ${MIGRATION_SQL_HINT}`,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: `Failed to save project overview${
            error.message ? `: ${error.message}` : "."
          }`,
          code: error.code ?? null,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Update did not apply. Check that the projects UPDATE RLS policy allows your user (auth.uid() = user_id).",
        },
        { status: 404 }
      );
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
