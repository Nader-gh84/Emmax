import { NextResponse } from "next/server";
import {
  appendEmCallMessage,
  getEmCallSession,
} from "@/lib/em-call/session-store";
import { runEmCallTurnWithTools } from "@/lib/em-call/tools/run-turn";
import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  sessionId?: string;
  transcript?: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local",
        },
        { status: 500 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const sessionId = body.sessionId?.trim() ?? "";
    const transcript = body.transcript?.trim() ?? "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }
    if (!transcript) {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 }
      );
    }

    const session = getEmCallSession(sessionId, user.id);
    if (!session) {
      return NextResponse.json(
        { error: "Session expired or not found. Start a new Em Call." },
        { status: 404 }
      );
    }

    appendEmCallMessage(session, { role: "user", content: transcript });

    try {
      const result = await runEmCallTurnWithTools({
        apiKey,
        session,
        supabase,
        userId: user.id,
      });

      appendEmCallMessage(session, {
        role: "assistant",
        content: result.reply,
      });

      return NextResponse.json({
        sessionId: session.id,
        reply: result.reply,
        usedTools: result.usedTools,
        toolNames: result.toolNames,
        turnCount: session.messages.filter((m) => m.role === "user").length,
      });
    } catch (err) {
      // Roll back the user turn on model/tool failure so retries don't double-append
      const last = session.messages[session.messages.length - 1];
      if (last?.role === "user" && last.content === transcript) {
        session.messages.pop();
      }
      throw err;
    }
  } catch (error) {
    console.error("Em Call turn error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process Em Call turn",
      },
      { status: 500 }
    );
  }
}
