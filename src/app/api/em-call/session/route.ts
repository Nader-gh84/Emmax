import { NextResponse } from "next/server";
import {
  buildEmCallGreeting,
  getEmCallFirstName,
} from "@/lib/em-call/greeting";
import { buildEmCallSystemPrompt } from "@/lib/em-call/prompt";
import {
  appendEmCallMessage,
  createEmCallSession,
} from "@/lib/em-call/session-store";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("business_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const fullName =
      typeof profile?.full_name === "string" ? profile.full_name : null;
    const greetingName = getEmCallFirstName(fullName, user.email);

    const session = createEmCallSession({
      userId: user.id,
      greetingName,
      systemPrompt: buildEmCallSystemPrompt(greetingName),
    });

    const greeting = buildEmCallGreeting(greetingName);
    appendEmCallMessage(session, { role: "assistant", content: greeting });

    return NextResponse.json({
      sessionId: session.id,
      greetingName,
      greeting,
    });
  } catch (error) {
    console.error("Em Call session error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start Em Call",
      },
      { status: 500 }
    );
  }
}
