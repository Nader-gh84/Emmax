import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TranscriptJobService } from "@/lib/translator/job-service";
import { TranslatorError } from "@/lib/translator/errors";
import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_BYTES,
} from "@/types/translator";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAcceptedUpload(file: File): boolean {
  const name = file.name.toLowerCase();
  if (ACCEPTED_UPLOAD_EXTENSIONS.some((ext) => name.endsWith(ext))) return true;
  return (
    file.type.startsWith("audio/") ||
    file.type.startsWith("video/") ||
    file.type === "application/octet-stream"
  );
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = new TranscriptJobService(supabase);
    const jobs = await service.listJobs(user.id);
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("[translator/jobs GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const contentType = request.headers.get("content-type") || "";
    const service = new TranscriptJobService(supabase);

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const sourceUrl = String(form.get("sourceUrl") || "").trim() || null;
      const existingJobId =
        String(form.get("jobId") || "").trim() || null;

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Please choose an audio or video file to upload." },
          { status: 400 }
        );
      }
      if (!isAcceptedUpload(file)) {
        return NextResponse.json(
          {
            error:
              "Unsupported file type. Try MP3, M4A, WAV, MP4, MOV, or WEBM.",
          },
          { status: 400 }
        );
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "File must be 500 MB or smaller." },
          { status: 400 }
        );
      }
      if (file.size < 256) {
        return NextResponse.json(
          { error: "The uploaded file is too small or empty." },
          { status: 400 }
        );
      }

      const job = await service.createFromUpload({
        userId: user.id,
        file,
        sourceUrl,
        existingJobId,
      });

      return NextResponse.json({ job });
    }

    const body = await request.json();
    const sourceUrl = String(body.sourceUrl || "").trim();
    if (!sourceUrl) {
      return NextResponse.json(
        { error: "Paste a video or audio link first." },
        { status: 400 }
      );
    }

    const job = await service.createFromUrl(user.id, sourceUrl);
    return NextResponse.json({ job });
  } catch (error) {
    console.error("[translator/jobs POST]", error);
    if (error instanceof TranslatorError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create transcript job",
      },
      { status: 500 }
    );
  }
}
