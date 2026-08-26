import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  TranscriptJobService,
  buildExportText,
} from "@/lib/translator/job-service";
import { TranscriptPdfDocument } from "@/lib/translator/transcript-pdf";
import type { ExportMode } from "@/types/translator";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODES: ExportMode[] = [
  "original",
  "english",
  "persian",
  "english_persian",
];

export async function GET(
  request: Request,
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

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "txt").toLowerCase();
    const mode = (searchParams.get("mode") || "english_persian") as ExportMode;

    if (!MODES.includes(mode)) {
      return NextResponse.json({ error: "Invalid export mode" }, { status: 400 });
    }

    const service = new TranscriptJobService(supabase);
    const job = await service.getJob(user.id, context.params.id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.status !== "completed") {
      return NextResponse.json(
        { error: "Export is available after processing completes." },
        { status: 400 }
      );
    }

    const safeTitle = (job.media_title || "transcript")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(0, 80);

    if (format === "pdf") {
      const buffer = await renderToBuffer(
        TranscriptPdfDocument({ job, mode })
      );
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
        },
      });
    }

    const text = buildExportText(job, mode);
    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.txt"`,
      },
    });
  } catch (error) {
    console.error("[translator/jobs/:id/export]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
