import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TranscriptJobService } from "@/lib/translator/job-service";
import { TranslatorError } from "@/lib/translator/errors";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = new TranscriptJobService(supabase);
    const job = await service.getJob(user.id, context.params.id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("[translator/jobs/:id GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("transcription_jobs")
      .delete()
      .eq("id", context.params.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[translator/jobs/:id DELETE]", error);
    if (error instanceof TranslatorError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete job" },
      { status: 500 }
    );
  }
}
