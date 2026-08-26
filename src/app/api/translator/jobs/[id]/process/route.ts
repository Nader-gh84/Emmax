import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TranscriptJobService } from "@/lib/translator/job-service";
import { TranslatorError } from "@/lib/translator/errors";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const service = new TranscriptJobService(supabase);
    const job = await service.processJob(user.id, context.params.id);
    return NextResponse.json({ job });
  } catch (error) {
    console.error("[translator/jobs/:id/process]", error);
    if (error instanceof TranslatorError) {
      // Job row already marked failed inside the service when possible.
      return NextResponse.json(
        { error: error.message, code: error.code, retryable: error.retryable },
        { status: 422 }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Processing failed",
      },
      { status: 500 }
    );
  }
}
