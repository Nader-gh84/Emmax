import { NextResponse } from "next/server";
import {
  appendEmCallMessage,
  getEmCallSession,
  openAiMessagesFromSession,
} from "@/lib/em-call/session-store";
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 220,
        messages: openAiMessagesFromSession(session),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      // Roll back the user turn on model failure so retries don't double-append
      const last = session.messages[session.messages.length - 1];
      if (last?.role === "user" && last.content === transcript) {
        session.messages.pop();
      }
      return NextResponse.json(
        { error: "Em Call reply failed", details },
        { status: 500 }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Empty reply from model" },
        { status: 500 }
      );
    }

    appendEmCallMessage(session, { role: "assistant", content: reply });

    return NextResponse.json({
      sessionId: session.id,
      reply,
      turnCount: session.messages.filter((m) => m.role === "user").length,
    });
  } catch (error) {
    console.error("Em Call turn error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process Em Call turn",
      },
      { status: 500 }
    );
  }
}
