import { NextResponse } from "next/server";
import { detectPlatform, platformLabel, requiresUploadFallback } from "@/lib/translator/platform";
import { isValidHttpUrl } from "@/lib/translator/platform";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sourceUrl = String(body.sourceUrl || "").trim();

    if (!sourceUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    if (!isValidHttpUrl(sourceUrl)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const platform = detectPlatform(sourceUrl);
    return NextResponse.json({
      platform,
      label: platformLabel(platform),
      needsUpload: requiresUploadFallback(platform) || platform === "other" || platform === "podcast",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}
