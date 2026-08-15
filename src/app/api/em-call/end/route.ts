import { NextResponse } from "next/server";
import { deleteEmCallSession } from "@/lib/em-call/session-store";
import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  sessionId?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const sessionId = body.sessionId?.trim() ?? "";

    if (sessionId) {
      deleteEmCallSession(sessionId, user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Em Call end error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to end Em Call",
      },
      { status: 500 }
    );
  }
}
